from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.report import Report


class ReportRepository:
    @staticmethod
    def get_by_id(db: Session, report_id: int) -> Optional[Report]:
        return db.query(Report).filter(Report.id == report_id).first()

    @staticmethod
    def get_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 10) -> List[Report]:
        return db.query(Report).filter(Report.user_id == user_id).order_by(Report.uploaded_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, filename: str, file_path: str, file_size: int, content_type: str, user_id: int) -> Report:
        db_obj = Report(
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            content_type=content_type,
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete(db: Session, db_obj: Report) -> None:
        db.delete(db_obj)
        db.commit()
