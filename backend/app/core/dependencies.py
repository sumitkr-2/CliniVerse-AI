from typing import Dict
from fastapi import Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.core.database import get_db
from app.core.exceptions import AppException
from app.core.security import decode_token
from app.repository.user import UserRepository
from app.models.user import User

# Re-export get_db for cleaner imports across endpoint files
get_db = get_db

# Security Scheme for extracting Authorization: Bearer <token>
reusable_oauth2 = HTTPBearer(auto_error=False)


def get_pagination(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Limit of items returned")
) -> Dict[str, int]:
    """Dependency injection helper for pagination parameters."""
    return {"skip": skip, "limit": limit}


def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(reusable_oauth2),
    db: Session = Depends(get_db)
) -> User:
    """Dependency injection helper to validate JWT access token and return current User."""
    if not token:
        raise AppException(
            "Authentication credentials were not provided",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED"
        )
        
    try:
        payload = decode_token(token.credentials)
        token_type = payload.get("type")
        if token_type != "access":
            raise AppException(
                "Invalid token type, access token expected",
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_TOKEN"
            )
        user_id = payload.get("sub")
        if not user_id:
            raise AppException(
                "Token subject identifier is missing",
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_TOKEN"
            )
    except JWTError:
        raise AppException(
            "Authentication token is invalid or expired",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="EXPIRED_TOKEN"
        )

    user = UserRepository.get_by_id(db, int(user_id))
    if not user:
        raise AppException(
            "User associated with this token does not exist",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="USER_NOT_FOUND"
        )
    if not user.is_active:
        raise AppException(
            "User associated with this token is disabled",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="USER_DISABLED"
        )

    return user
