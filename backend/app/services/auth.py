from sqlalchemy.orm import Session
from jose import JWTError
from app.schemas.user import UserCreate, Token
from app.repository.user import UserRepository
from app.core.exceptions import AppException
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token


class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserCreate):
        existing = UserRepository.get_by_email(db, user_in.email)
        if existing:
            raise AppException("A user with this email already exists", status_code=400, code="EMAIL_EXISTS")
        return UserRepository.create(db, user_in)

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str):
        user = UserRepository.get_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            raise AppException("Incorrect email or password", status_code=400, code="INVALID_CREDENTIALS")
        if not user.is_active:
            raise AppException("User account is disabled", status_code=400, code="USER_DISABLED")
        return user

    @staticmethod
    def create_tokens(user_id: int) -> Token:
        return Token(
            access_token=create_access_token(user_id),
            refresh_token=create_refresh_token(user_id),
            token_type="bearer"
        )

    @staticmethod
    def refresh_token(db: Session, refresh_token: str) -> Token:
        try:
            payload = decode_token(refresh_token)
            token_type = payload.get("type")
            if token_type != "refresh":
                raise AppException("Invalid token type for refresh operation", status_code=401, code="INVALID_TOKEN")
            user_id = payload.get("sub")
            if not user_id:
                raise AppException("Token payload is missing subject identifier", status_code=401, code="INVALID_TOKEN")
        except JWTError:
            raise AppException("Refresh token is invalid or expired", status_code=401, code="EXPIRED_TOKEN")

        user = UserRepository.get_by_id(db, int(user_id))
        if not user:
            raise AppException("User associated with this token does not exist", status_code=401, code="USER_NOT_FOUND")
        if not user.is_active:
            raise AppException("User associated with this token is disabled", status_code=401, code="USER_DISABLED")

        return AuthService.create_tokens(user.id)
