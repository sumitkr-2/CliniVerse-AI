from typing import List, Dict, Any
from app.core.chroma import get_reports_collection
from app.services.embeddings import EmbeddingService
from app.models.chunk import ReportChunk


class VectorStoreService:
    @staticmethod
    def upsert_chunks(report_id: int, user_id: int, chunks: List[ReportChunk]) -> None:
        """Upserts a list of vectorized chunks into the ChromaDB collection with user scoping."""
        collection = get_reports_collection()

        ids = []
        embeddings = []
        metadatas = []
        documents = []

        for chunk in chunks:
            if not chunk.embedding:
                continue
            ids.append(str(chunk.id))
            embeddings.append(chunk.embedding)
            metadatas.append({
                "report_id": report_id,
                "user_id": user_id,
                "page_number": chunk.page_number
            })
            documents.append(chunk.content)

        if ids:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents
            )

    @staticmethod
    def delete_by_report(report_id: int) -> None:
        """Removes all vectorized document segments belonging to a specific report."""
        collection = get_reports_collection()
        collection.delete(where={"report_id": report_id})

    @staticmethod
    def similarity_search(user_id: int, query_text: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Executes a semantic similarity search scoped strictly to the current User's files."""
        collection = get_reports_collection()
        
        # Vectorize query
        query_embedding = EmbeddingService.generate_embedding(query_text)
        if not query_embedding:
            return []

        # Query collection with filter
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where={"user_id": user_id}
        )

        formatted_results = []
        if not results or "ids" not in results or not results["ids"] or len(results["ids"][0]) == 0:
            return formatted_results

        ids = results["ids"][0]
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(ids)

        for i in range(len(ids)):
            formatted_results.append({
                "chunk_id": int(ids[i]),
                "content": documents[i],
                "metadata": metadatas[i],
                "score": float(1.0 - distances[i])  # Normalize distance to similarity score
            })

        return formatted_results
