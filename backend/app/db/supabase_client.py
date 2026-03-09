from supabase import create_client, Client
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase_client(url: str, key: str) -> Client:
    """Return a singleton Supabase client."""
    global _client
    if _client is None:
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables."
            )
        _client = create_client(url, key)
        logger.info("Supabase client initialised.")
    return _client
