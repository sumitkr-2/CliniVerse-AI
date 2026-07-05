import json
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "MediMind AI"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"
    
    # Database
    DATABASE_URL: str
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = []

    # JWT Config
    JWT_SECRET_KEY: str = "production_ready_super_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Gemini Config
    GEMINI_API_KEY: Optional[str] = None

    # Standalone ChromaDB Config
    CHROMA_HOST: Optional[str] = None
    CHROMA_PORT: int = 8000

    # Redis Config
    REDIS_URL: Optional[str] = None

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
