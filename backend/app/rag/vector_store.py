import logging
from supabase import Client
from app.db.repositories import EmbeddingRepository
from app.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Wrapper around pgvector-backed Supabase table for journal embeddings.
    """

    def __init__(self, db: Client):
        self.repo = EmbeddingRepository(db)

    async def add_journal(self, user_id: str, journal_text: str) -> None:
        """Embed journal text and persist to vector store."""
        embedding = await generate_embedding(journal_text)
        self.repo.store_embedding(
            user_id=user_id,
            embedding=embedding,
            journal_text=journal_text,
        )
        logger.info(f"Journal embedded and stored for user {user_id}")

    async def search_similar(
        self, user_id: str, query_text: str, top_k: int = 3
    ) -> list[str]:
        """Return journal_text strings most similar to query."""
        query_embedding = await generate_embedding(query_text)
        results = self.repo.similarity_search(
            user_id=user_id,
            query_embedding=query_embedding,
            top_k=top_k,
        )
        return [r["journal_text"] for r in results if "journal_text" in r]
