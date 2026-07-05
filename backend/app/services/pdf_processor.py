import io
import re
import logging
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor
import fitz  # PyMuPDF
from sqlalchemy.orm import Session
from app.repository.chunk import ReportChunkRepository
from app.services.embeddings import EmbeddingService
from app.core.exceptions import AppException

logger = logging.getLogger("app.pdf_processor")


class PDFProcessorService:
    @staticmethod
    def clean_text(text: str) -> str:
        """Normalizes whitespaces and cleans invalid characters from page text."""
        if not text:
            return ""
        # Collapse multiple spacing, tabulations, and returns into single spaces
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        """Splits text using a sliding window approach with character boundaries."""
        chunks = []
        if not text:
            return chunks

        text_len = len(text)
        start = 0

        # Loop with sliding window
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk = text[start:end]
            chunks.append(chunk)
            
            # Slide window back by overlap amount
            start += (chunk_size - overlap)
            
            # Avoid infinite loops on zero calculations
            if chunk_size <= overlap:
                break

        return chunks

    @staticmethod
    def _ocr_single_page(img_bytes: bytes) -> str:
        """Runs Tesseract OCR on page image bytes."""
        try:
            from PIL import Image
            import pytesseract
            image = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            logger.warning(f"OCR page extraction failed: {e}")
            return ""

    @classmethod
    def ocr_pdf(cls, doc: fitz.Document) -> List[str]:
        """Converts PDF pages into images and runs OCR in parallel."""
        logger.info("Running parallelized OCR for scanned PDF report...")
        page_images_bytes = []
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            page_images_bytes.append(pix.tobytes("png"))

        # Run OCR in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=4) as executor:
            texts = list(executor.map(cls._ocr_single_page, page_images_bytes))
        return texts

    @classmethod
    def process_pdf(cls, db: Session, report_id: int, file_path: str, generate_embeddings: bool = False) -> List[Dict]:
        """Extracts text per page (falls back to parallelized OCR if scanned), chunks, and saves."""
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise AppException(f"Failed to parse PDF document structure: {str(e)}", status_code=400, code="INVALID_PDF")

        all_chunks = []
        try:
            # 1. First attempt native text extraction
            pages_text = []
            for page in doc:
                raw_text = page.get_text("text") or ""
                pages_text.append(raw_text.strip())

            total_len = sum(len(t) for t in pages_text)

            # 2. Check if scanned document (low characters) and run OCR fallback
            if total_len < 150:
                logger.info(f"Report ID {report_id} contains very little native text ({total_len} chars). Triggering OCR.")
                ocr_texts = cls.ocr_pdf(doc)
                pages_text = ocr_texts

            # 3. Clean and chunk page content
            for page_idx, raw_text in enumerate(pages_text):
                page_num = page_idx + 1
                cleaned_text = cls.clean_text(raw_text)

                if not cleaned_text:
                    continue

                page_chunks = cls.chunk_text(cleaned_text)
                for chunk_idx, chunk_content in enumerate(page_chunks):
                    all_chunks.append({
                        "page_number": page_num,
                        "chunk_index": chunk_idx,
                        "content": chunk_content
                    })
        finally:
            doc.close()

        if not all_chunks:
            raise AppException("No printable text contents could be extracted from this PDF report, even after OCR.", status_code=400, code="EMPTY_PDF")

        # 4. Generate vectors if requested
        if generate_embeddings:
            chunk_texts = [c["content"] for c in all_chunks]
            embeddings = EmbeddingService.generate_embeddings_bulk(chunk_texts)
            for idx, emb in enumerate(embeddings):
                all_chunks[idx]["embedding"] = emb

        # Clean existing chunks
        ReportChunkRepository.delete_by_report(db, report_id)

        # Bulk write report text segments
        ReportChunkRepository.create_bulk(db, report_id, all_chunks)

        return all_chunks
