from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    content_type: str
    uploaded_at: datetime
    user_id: int
    is_processed: bool = False
    chunk_count: int = 0

    class Config:
        from_attributes = True
