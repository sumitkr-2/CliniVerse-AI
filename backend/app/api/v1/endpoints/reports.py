import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination
from app.core.exceptions import AppException, EntityNotFoundError, PermissionDeniedError
from app.models.user import User
from app.models.report import Report
from app.models.chunk import ReportChunk
from app.repository.report import ReportRepository
from app.repository.chunk import ReportChunkRepository
from app.schemas.report import ReportResponse
from app.schemas.chunk import ReportChunkResponse
from app.services.rag import RAGService
from app.services.vector_store import VectorStoreService

router = APIRouter()

# Local upload directory setup
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max limit


@router.get("/stats")
def get_report_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns aggregate statistics for the current user's reports."""
    total_reports = db.query(func.count(Report.id)).filter(Report.user_id == current_user.id).scalar() or 0
    processed_reports = db.query(func.count(Report.id)).filter(
        Report.user_id == current_user.id,
        Report.is_processed == True
    ).scalar() or 0
    total_chunks = db.query(func.sum(Report.chunk_count)).filter(Report.user_id == current_user.id).scalar() or 0
    total_size = db.query(func.sum(Report.file_size)).filter(Report.user_id == current_user.id).scalar() or 0

    return {
        "total_reports": total_reports,
        "processed_reports": processed_reports,
        "pending_reports": total_reports - processed_reports,
        "total_chunks": int(total_chunks),
        "total_size_bytes": int(total_size),
    }


@router.post("/upload", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Uploads a PDF clinical report and records metadata in the database."""
    # Check mime type and extension
    if file.content_type != "application/pdf" and not file.filename.endswith(".pdf"):
        raise AppException("Only PDF files are allowed", status_code=status.HTTP_400_BAD_REQUEST, code="INVALID_FILE_TYPE")

    # Read size to prevent DOS attacks
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise AppException("File exceeds maximum allowed size of 10MB", status_code=status.HTTP_400_BAD_REQUEST, code="FILE_TOO_LARGE")

    # Generate a collision-free filename on physical storage
    safe_filename = f"{current_user.id}_{os.urandom(8).hex()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Store metadata
    report = ReportRepository.create(
        db=db,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        content_type=file.content_type or "application/pdf",
        user_id=current_user.id
    )

    return report


@router.get("", response_model=List[ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    pagination: dict = Depends(get_pagination)
):
    """Retrieves list of clinical reports uploaded by the current User."""
    return ReportRepository.get_by_user(
        db=db,
        user_id=current_user.id,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )


@router.get("/{report_id}/download", response_class=FileResponse)
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves physical file contents of the requested report."""
    report = ReportRepository.get_by_id(db, report_id)
    if not report:
        raise EntityNotFoundError("Report not found")
    if report.user_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to download this report")

    if not os.path.exists(report.file_path):
        raise EntityNotFoundError("Physical file was deleted or cannot be found on disk")

    return FileResponse(
        path=report.file_path,
        filename=report.filename,
        media_type=report.content_type
    )


@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes the PDF file from disk, database metadata record, and ChromaDB vectors."""
    report = ReportRepository.get_by_id(db, report_id)
    if not report:
        raise EntityNotFoundError("Report not found")
    if report.user_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to delete this report")

    # Delete from ChromaDB
    try:
        VectorStoreService.delete_by_report(report.id)
    except Exception:
        # Proceed even if vector DB deletion hits issues
        pass

    # Clear disk space
    if os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception:
            # Log failure but proceed with database deletion
            pass

    # Clear database
    ReportRepository.delete(db, report)
    return {"message": "Report deleted successfully"}


@router.post("/{report_id}/process", response_model=List[ReportChunkResponse], status_code=status.HTTP_200_OK)
def process_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parses, chunks, vectorizes, and indexes the PDF report in ChromaDB (Unified RAG Ingestion)."""
    report = ReportRepository.get_by_id(db, report_id)
    if not report:
        raise EntityNotFoundError("Report not found")
    if report.user_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to process this report")

    if not os.path.exists(report.file_path):
        raise EntityNotFoundError("Physical report file was deleted or cannot be found on disk")

    # Run unified RAG Ingestion pipeline (marks report as processed internally)
    RAGService.index_report(db, report.id, report.file_path, current_user.id)

    # Return chunks
    return ReportChunkRepository.get_by_report(db, report.id)


@router.get("/{report_id}/chunks", response_model=List[ReportChunkResponse])
def get_report_chunks(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all parsed text chunks associated with the requested report."""
    report = ReportRepository.get_by_id(db, report_id)
    if not report:
        raise EntityNotFoundError("Report not found")
    if report.user_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to view chunks for this report")

    return ReportChunkRepository.get_by_report(db, report_id)


@router.post("/{report_id}/vectorize", response_model=List[ReportChunkResponse])
def vectorize_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Executes indexing flow: PDF -> Extract -> Chunk -> Embedding -> ChromaDB."""
    report = ReportRepository.get_by_id(db, report_id)
    if not report:
        raise EntityNotFoundError("Report not found")
    if report.user_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to vectorize this report")

    # Execute full unified indexing pipeline
    RAGService.index_report(db, report.id, report.file_path, current_user.id)

    return ReportChunkRepository.get_by_report(db, report.id)
