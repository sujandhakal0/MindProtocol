import logging
from supabase import Client
from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)


class JournalRetriever:
    """
    LangChain-style retriever that fetches semantically similar
    past journal entries for a given user.
    """

    def __init__(self, db: Client, top_k: int = 3):
        self.vector_store = VectorStore(db)
        self.top_k = top_k

    async def get_relevant_context(
        self, user_id: str, query_text: str
    ) -> list[str]:
        """
        Retrieve the most semantically similar past journal entries.
        Returns a list of text strings to inject into the LLM prompt.
        """
        try:
            results = await self.vector_store.search_similar(
                user_id=user_id,
                query_text=query_text,
                top_k=self.top_k,
            )
            logger.info(
                f"Retrieved {len(results)} past journal entries for user {user_id}"
            )
            return results
        except Exception as e:
            logger.warning(f"RAG retrieval failed: {e}")
            return []
