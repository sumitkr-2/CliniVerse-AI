from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import threading

from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging_config import setup_logging
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.core.middleware import RequestLoggingMiddleware
from app.api.v1.router import api_router

# Setup logging configuration
setup_logging(env=settings.ENVIRONMENT, log_level=settings.LOG_LEVEL)

logger = logging.getLogger("app.startup")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware (must be first/early in the stack)
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Request Logging & Timing Middleware
app.add_middleware(RequestLoggingMiddleware)

# Custom Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Central Route inclusion
app.include_router(api_router, prefix=settings.API_V1_STR)


def _prewarm_models():
    """Background thread: eagerly loads SentenceTransformer embedding models at startup."""
    try:
        logger.info("Pre-warming sentence-transformer embedding model...")
        from app.services.embeddings import EmbeddingService
        EmbeddingService.generate_embedding("warm up")
        logger.info("Embedding model ready.")
    except Exception as e:
        logger.warning(f"Embedding model pre-warm failed: {e}")


@app.on_event("startup")
async def startup_event():
    """Initializes tables and kicks off model pre-warming in a non-blocking background thread."""
    try:
        logger.info("Creating database tables if not exist...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized.")
    except Exception as e:
        logger.error(f"Database table initialization failed: {e}")

    thread = threading.Thread(target=_prewarm_models, daemon=True, name="model-prewarm")
    thread.start()
    logger.info("Model pre-warm thread started.")


@app.get("/")
def read_root():
    return {"message": "Welcome to MediMind AI API"}
