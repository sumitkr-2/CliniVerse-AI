import logging
from typing import Optional, Generator
from sqlalchemy.orm import Session
from app.services.pdf_processor import PDFProcessorService
from app.services.vector_store import VectorStoreService
from app.services.gemini_service import GeminiService
from app.repository.chunk import ReportChunkRepository
from app.repository.report import ReportRepository
from app.repository.chat import ChatMessageRepository
from app.prompts.clinical_prompts import CLINICAL_SUMMARY_PROMPT, CLINICAL_FOLLOWUP_PROMPT

logger = logging.getLogger("app.rag")


class RAGService:
    @classmethod
    def index_report(cls, db: Session, report_id: int, file_path: str, user_id: int) -> int:
        """Executes full PDF ingestion pipeline: PDF -> Extract -> Chunk -> Embedding -> ChromaDB."""
        # 1. Extract text and generate embeddings in a bulk operation
        chunks = PDFProcessorService.process_pdf(db, report_id, file_path, generate_embeddings=True)
        logger.info(f"PDF processed: {len(chunks)} chunks generated for report_id={report_id}")

        # 2. Fetch updated chunk models from PostgreSQL database
        db_chunks = ReportChunkRepository.get_by_report(db, report_id)

        # 3. Synchronize vector embeddings and metadata to ChromaDB Vector Store
        VectorStoreService.upsert_chunks(
            report_id=report_id,
            user_id=user_id,
            chunks=db_chunks
        )
        logger.info(f"Upserted {len(db_chunks)} chunks to ChromaDB for user_id={user_id}")

        # 4. Mark the report as processed and update chunk count
        report = ReportRepository.get_by_id(db, report_id)
        if report:
            report.is_processed = True
            report.chunk_count = len(chunks)
            db.commit()
            db.refresh(report)

        return len(chunks)

    @classmethod
    def answer_query(
        cls,
        db: Session,
        user_id: int,
        query: str,
        limit: int = 4,
        report_id: Optional[int] = None,
        mode: Optional[str] = None
    ) -> Generator[str, None, None]:
        """Retrieves context, fetches chat history, and streams answer from Gemini 2.5 Flash."""
        
        # 1. Save user query to history
        ChatMessageRepository.create(db, user_id=user_id, role="user", content=query)
        
        # 2. Semantic similarity lookup in ChromaDB scoped to current user_id
        search_results = VectorStoreService.similarity_search(
            user_id=user_id,
            query_text=query,
            limit=10 if report_id else limit
        )
        logger.info(f"Vector search returned {len(search_results)} results for user_id={user_id}")

        # Filter by report ID if provided
        if report_id:
            search_results = [
                chunk for chunk in search_results
                if chunk["metadata"].get("report_id") == report_id
            ]

        # 3. Extract plain text content from top matching chunks
        context_chunks = [chunk["content"] for chunk in search_results[:limit]]
        context_str = "\n\n".join(context_chunks) if context_chunks else "No relevant medical report context was found."

        # 4. Fetch recent chat history
        history_msgs = ChatMessageRepository.get_recent_messages(db, user_id=user_id, limit=10)
        chat_history_str = ""
        for msg in history_msgs:
            role_name = "User" if msg.role == "user" else "Assistant"
            # Exclude current question (which was just saved to db) to prevent repetition
            if msg.role == "user" and msg.content == query:
                continue
            chat_history_str += f"{role_name}: {msg.content}\n"

        # 5. Build prompt based on whether it is initial summary or follow-up
        if mode == "summary" or (not chat_history_str and not context_chunks):
            # For summary, prioritize report text
            prompt = CLINICAL_SUMMARY_PROMPT.format(context=context_str)
        else:
            # For conversational follow-up, send report context, history, and current question
            prompt = CLINICAL_FOLLOWUP_PROMPT.format(
                context=context_str,
                chat_history=chat_history_str or "No previous history.",
                question=query
            )

        # 6. Stream generated answer tokens from Gemini
        logger.info("Starting Gemini stream generation")
        full_response = ""
        try:
            for token in GeminiService.generate_content_stream(prompt):
                full_response += token
                yield token
            
            # Save assistant response to history
            ChatMessageRepository.create(db, user_id=user_id, role="assistant", content=full_response)
        except Exception as e:
            err_msg = f"\n\n⚠️ Error streaming response: {str(e)}"
            logger.error(err_msg)
            yield err_msg
