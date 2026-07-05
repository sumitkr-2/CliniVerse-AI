import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, AsyncIterator, List
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.rag import RAGService
from app.repository.chat import ChatMessageRepository

router = APIRouter()

# Dedicated thread pool for LLM work so it never blocks the event loop
_llm_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="llm-worker")


class ChatQueryRequest(BaseModel):
    query: str
    report_id: Optional[int] = None
    mode: Optional[str] = None


class MessageResponse(BaseModel):
    role: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


async def _async_rag_stream(
    db: Session,
    user_id: int,
    query: str,
    report_id: Optional[int],
    mode: Optional[str]
) -> AsyncIterator[str]:
    """
    Wraps the synchronous RAGService.answer_query generator into an async iterator.
    """
    loop = asyncio.get_event_loop()
    q: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()

    def _produce():
        try:
            for chunk in RAGService.answer_query(
                db=db,
                user_id=user_id,
                query=query,
                report_id=report_id,
                mode=mode
            ):
                loop.call_soon_threadsafe(q.put_nowait, chunk)
        except Exception as e:
            loop.call_soon_threadsafe(q.put_nowait, f"\n\n⚠️ Generation error: {str(e)}")
        finally:
            loop.call_soon_threadsafe(q.put_nowait, _SENTINEL)

    loop.run_in_executor(_llm_executor, _produce)

    while True:
        token = await q.get()
        if token is _SENTINEL:
            break
        yield token


@router.post("/ask", status_code=status.HTTP_200_OK)
async def ask_clinical_assistant(
    request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves relevant text segments and streams a clinical answer using RAG with Gemini."""
    return StreamingResponse(
        _async_rag_stream(
            db=db,
            user_id=current_user.id,
            query=request.query,
            report_id=request.report_id,
            mode=request.mode
        ),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/history", response_model=List[dict])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves conversation history for the current user."""
    msgs = ChatMessageRepository.get_recent_messages(db, user_id=current_user.id, limit=30)
    return [
        {
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in msgs
    ]


@router.post("/clear", status_code=status.HTTP_200_OK)
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clears conversation history for the current user."""
    ChatMessageRepository.clear_history(db, user_id=current_user.id)
    return {"message": "Chat history cleared successfully"}
