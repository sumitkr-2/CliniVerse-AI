from typing import List
from sqlalchemy.orm import Session
from app.models.chat import ChatMessage


class ChatMessageRepository:
    @staticmethod
    def get_recent_messages(db: Session, user_id: int, limit: int = 15) -> List[ChatMessage]:
        """Retrieves user's recent chat messages ordered chronologically."""
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .all()
        )
        return list(reversed(messages))

    @staticmethod
    def create(db: Session, user_id: int, role: str, content: str) -> ChatMessage:
        """Saves a new chat message to history."""
        db_obj = ChatMessage(user_id=user_id, role=role, content=content)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def clear_history(db: Session, user_id: int) -> None:
        """Deletes all conversation history for the specified user."""
        db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete(
            synchronize_session=False
        )
        db.commit()
