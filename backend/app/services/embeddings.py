import hashlib
import logging
from typing import List
from app.services.gemini_service import GeminiService
from app.services.cache_service import CacheService

logger = logging.getLogger("app.embeddings")


class EmbeddingService:
    @staticmethod
    def _get_cache_key(text: str) -> str:
        """Generates a unique cache key for a given block of text."""
        h = hashlib.md5(text.encode("utf-8")).hexdigest()
        return f"emb:{h}"

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """Vectorizes a single block of text using Gemini embedding API."""
        if not text:
            return []
        
        # Check cache
        key = cls._get_cache_key(text)
        cached = CacheService.get(key)
        if cached:
            return cached

        try:
            # Generate using Gemini Client
            client = GeminiService.get_client()
            response = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            vector = response.embeddings[0].values
            
            # Save cache (1 day expiration)
            CacheService.set(key, vector, expire_seconds=86400)
            return vector
        except Exception as e:
            logger.error(f"Gemini embedding failed: {e}")
            return []

    @classmethod
    def generate_embeddings_bulk(cls, texts: List[str]) -> List[List[float]]:
        """Vectorizes multiple text blocks in batches using Gemini embedding API."""
        if not texts:
            return []

        results = [None] * len(texts)
        uncached_indices = []
        uncached_texts = []

        # Check cache
        for i, text in enumerate(texts):
            key = cls._get_cache_key(text)
            cached = CacheService.get(key)
            if cached:
                results[i] = cached
            else:
                uncached_indices.append(i)
                uncached_texts.append(text)

        # Batch encode only the uncached texts
        if uncached_texts:
            try:
                client = GeminiService.get_client()
                response = client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=uncached_texts
                )
                embeddings = response.embeddings
                for idx, emb in zip(uncached_indices, embeddings):
                    vector_list = emb.values
                    results[idx] = vector_list
                    # Cache the new vector
                    key = cls._get_cache_key(texts[idx])
                    CacheService.set(key, vector_list, expire_seconds=86400)
            except Exception as e:
                logger.error(f"Gemini bulk embedding failed: {e}")
                # Fallback to zeros if API fails so the process doesn't halt
                for idx in uncached_indices:
                    results[idx] = [0.0] * 768

        return results
