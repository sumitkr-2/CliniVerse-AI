from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.vector_store import VectorStoreService

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
def search_clinical_reports(
    query: str = Query(..., min_length=1, description="Semantic search query string"),
    limit: int = Query(5, ge=1, le=50, description="Maximum search results to return"),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Executes a semantic vector similarity search across all processed PDF reports of the current User."""
    return VectorStoreService.similarity_search(
        user_id=current_user.id,
        query_text=query,
        limit=limit
    )
