from typing import List, Optional
from pydantic import BaseModel


class ReportChunkResponse(BaseModel):
    id: int
    report_id: int
    page_number: int
    chunk_index: int
    content: str
    embedding: Optional[List[float]] = None

    class Config:
        from_attributes = True
