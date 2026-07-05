from fastapi import APIRouter, Depends, status, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest
from app.services.auth import AuthService
from app.models.user import User

router = APIRouter()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new User in the database."""
    return AuthService.register_user(db, user_in)


@router.post("/login", response_model=Token)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials and issues access + refresh tokens."""
    user = AuthService.authenticate_user(db, login_in.email, login_in.password)
    return AuthService.create_tokens(user.id)


@router.post("/refresh", response_model=Token)
def refresh_token(
    refresh_token_str: str = Body(..., embed=True, alias="refresh_token"),
    db: Session = Depends(get_db)
):
    """Uses a refresh token to issue a fresh pair of tokens."""
    return AuthService.refresh_token(db, refresh_token_str)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout():
    """Client side logout confirmation (stateless)."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the details of the currently authenticated User."""
    return current_user
