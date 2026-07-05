import os
import logging
import chromadb
from app.core.config import settings

logger = logging.getLogger("app.chroma")

# Storage directory config (fallback)
CHROMA_PATH = "./chroma_db"
os.makedirs(CHROMA_PATH, exist_ok=True)

# Setup client instance
if settings.CHROMA_HOST:
    logger.info(f"Connecting to standalone ChromaDB at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
    try:
        chroma_client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT
        )
    except Exception as e:
        logger.error(f"Failed to connect to standalone ChromaDB: {e}. Falling back to local database.")
        chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
else:
    logger.info("Using local persistent ChromaDB client.")
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)


def get_reports_collection():
    """Initializes and returns default collection for PDF report chunks."""
    return chroma_client.get_or_create_collection(name="medimind_reports")
