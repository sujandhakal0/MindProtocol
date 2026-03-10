"""
dependencies.py
---------------
FastAPI dependency injection functions.

The most important one here is `get_current_user`.
It is used as a dependency on every protected route like this:

    @router.post("/morning-checkin")
    async def morning_checkin(
        body: MorningCheckinRequest,
        current_user: AuthenticatedUser = Depends(get_current_user),
        db = Depends(get_db),
    ):
        user_id = current_user.user_id  # always the real, verified user

FastAPI calls get_current_user automatically before the route function runs.
If the token is missing or invalid, it raises HTTP 401 and the route never executes.
"""

import logging
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import Settings, get_settings
from app.db.supabase_client import get_supabase_client
from app.services.auth_service import AuthenticatedUser, verify_jwt
from supabase import Client

logger = logging.getLogger(__name__)

# HTTPBearer extracts the token from "Authorization: Bearer <token>"
# auto_error=False lets us return a cleaner 401 message ourselves
_bearer_scheme = HTTPBearer(auto_error=False)


def get_db(settings: Settings = Depends(get_settings)) -> Client:
    """Dependency to get Supabase client."""
    return get_supabase_client(settings.supabase_url, settings.supabase_key)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """
    Dependency that enforces authentication on any route it is applied to.

    Steps:
    1. Extracts Bearer token from Authorization header
    2. Reads SUPABASE_JWT_SECRET from settings (via FastAPI DI — never cached stale)
    3. Verifies the JWT cryptographically (no network call)
    4. Returns AuthenticatedUser with verified user_id and email
    5. Raises HTTP 401/500 if anything is wrong

    Usage in routes:
        current_user: AuthenticatedUser = Depends(get_current_user)
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Include 'Authorization: Bearer <token>' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Pass the secret explicitly so verify_jwt never calls get_settings() itself.
        # This guarantees FastAPI's DI lifecycle controls when settings are read.
        user = verify_jwt(credentials.credentials, settings.supabase_jwt_secret)
        return user

    except ValueError as e:
        error_str = str(e)

        if "JWT_NOT_CONFIGURED" in error_str:
            # Misconfiguration — tell the developer clearly
            logger.error(
                "SUPABASE_JWT_SECRET is not set. "
                "Add it to your .env file: "
                "Supabase Dashboard -> Settings -> API -> JWT Settings -> JWT Secret"
            )
            raise HTTPException(
                status_code=500,
                detail=(
                    "Server misconfiguration: SUPABASE_JWT_SECRET is not set. "
                    "See server logs for instructions."
                ),
            )

        if "TOKEN_EXPIRED" in error_str:
            raise HTTPException(
                status_code=401,
                detail="Access token expired. Call POST /api/auth/refresh to get a new one.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        raise HTTPException(
            status_code=401,
            detail="Invalid or malformed token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except Exception as e:
        logger.error(f"Unexpected auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error.")


# Placeholder rate limiter — replace with a Redis-backed solution for production
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