from fastapi import Depends, HTTPException, Request
from app.config import Settings, get_settings
from app.db.supabase_client import get_supabase_client
from supabase import Client


def get_db(settings: Settings = Depends(get_settings)) -> Client:
    """Dependency to get Supabase client."""
    return get_supabase_client(settings.supabase_url, settings.supabase_key)


def get_settings_dep() -> Settings:
    return get_settings()


# Placeholder rate limiter — replace with redis-based limiter in production
class RateLimiter:
    def __init__(self, max_requests: int = 100):
        self.max_requests = max_requests
        self._store: dict = {}

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        self._store[client_ip] = self._store.get(client_ip, 0) + 1
        if self._store[client_ip] > self.max_requests:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")


rate_limiter = RateLimiter()
