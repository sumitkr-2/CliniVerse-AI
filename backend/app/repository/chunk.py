from typing import List
from sqlalchemy.orm import Session
from app.models.chunk import ReportChunk


class ReportChunkRepository:
    @staticmethod
    def get_by_report(db: Session, report_id: int) -> List[ReportChunk]:
        return db.query(ReportChunk).filter(ReportChunk.report_id == report_id).order_by(ReportChunk.page_number, ReportChunk.chunk_index).all()

    @staticmethod
    def create_bulk(db: Session, report_id: int, chunks: List[dict]) -> List[ReportChunk]:
        db_objs = [
            ReportChunk(
                report_id=report_id,
                page_number=chunk["page_number"],
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                embedding=chunk.get("embedding")
            )
            for chunk in chunks
        ]
        db.bulk_save_objects(db_objs)
        db.commit()
        return db.query(ReportChunk).filter(ReportChunk.report_id == report_id).all()

    @staticmethod
    def delete_by_report(db: Session, report_id: int) -> None:
        db.query(ReportChunk).filter(ReportChunk.report_id == report_id).delete(synchronize_session=False)
        db.commit()

    @staticmethod
    def update_chunk_embedding(db: Session, chunk_id: int, embedding: List[float]) -> None:
        """Saves a generated float vector embedding to a specific chunk record."""
        db.query(ReportChunk).filter(ReportChunk.id == chunk_id).update({"embedding": embedding})
        db.commit()
