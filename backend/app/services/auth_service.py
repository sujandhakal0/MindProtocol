"""
auth_service.py
---------------
Handles all authentication logic by delegating to Supabase Auth.

Why Supabase Auth instead of rolling our own?
- Supabase Auth is battle-tested, handles token rotation, email verification,
  password hashing (bcrypt), and session management out of the box.
- We verify tokens locally using the JWT secret (no extra API call per request).
- This keeps latency low while staying secure.

Token flow:
  Register/Login → Supabase issues access_token (JWT) + refresh_token
  Client stores both securely (Keychain on iOS, EncryptedSharedPrefs on Android)
  Every API request → Authorization: Bearer <access_token>
  FastAPI verifies JWT locally using SUPABASE_JWT_SECRET
  Token expires (1 hour default) → client uses refresh_token to get new access_token
"""

import logging
from dataclasses import dataclass
from typing import Optional

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from supabase import Client

from app.config import get_settings

logger = logging.getLogger(__name__)


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class AuthTokens:
    """Returned to client after successful register or login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600  # seconds


@dataclass
class AuthenticatedUser:
    """Extracted from a verified JWT — represents the current request user."""
    user_id: str
    email: str


# ── Core auth operations ──────────────────────────────────────────────────────

async def register_user(db: Client, email: str, password: str) -> AuthTokens:
    """
    Create a new user account via Supabase Auth.

    Supabase automatically:
    - Hashes the password with bcrypt
    - Creates a row in auth.users
    - Optionally sends a confirmation email (configurable in Supabase dashboard)
    - Returns JWT access + refresh tokens immediately

    We then mirror the user into our public.users table for app-level data.
    """
    try:
        response = db.auth.sign_up({"email": email, "password": password})

        if response.user is None:
            raise ValueError(
                "Registration failed. This email may already be registered, "
                "or email confirmation may be required — check your Supabase Auth settings."
            )

        user = response.user
        session = response.session

        if session is None:
            # Email confirmation is enabled in Supabase — user must confirm before logging in
            raise ValueError(
                "Account created but email confirmation is required. "
                "Please check your inbox and confirm before logging in."
            )

        # Mirror user into our public.users table
        # auth.users is internal to Supabase; we need public.users for FK relationships
        _ensure_public_user(db, user_id=user.id, email=email)

        logger.info(f"New user registered: {user.id} ({email})")

        return AuthTokens(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in or 3600,
        )

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise RuntimeError(f"Registration failed: {str(e)}")


async def login_user(db: Client, email: str, password: str) -> AuthTokens:
    """
    Sign in an existing user and return fresh JWT tokens.

    Supabase validates the password against the stored bcrypt hash.
    On success, issues a new access_token + refresh_token pair.
    """
    try:
        response = db.auth.sign_in_with_password({"email": email, "password": password})

        if response.user is None or response.session is None:
            raise ValueError("Invalid email or password.")

        user = response.user
        session = response.session

        # Ensure public.users row exists (handles users created before this system)
        _ensure_public_user(db, user_id=user.id, email=email)

        logger.info(f"User logged in: {user.id} ({email})")

        return AuthTokens(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in or 3600,
        )

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise ValueError("Invalid email or password.")


async def logout_user(db: Client) -> None:
    """
    Sign out the current user.
    Supabase invalidates the refresh token server-side.
    The client should also delete its locally stored tokens.
    """
    try:
        db.auth.sign_out()
        logger.info("User signed out.")
    except Exception as e:
        logger.warning(f"Logout error (non-fatal): {e}")


async def refresh_tokens(db: Client, refresh_token: str) -> AuthTokens:
    """
    Exchange a refresh_token for a new access_token + refresh_token pair.

    Call this when you receive a 401 response from any protected endpoint.
    The old refresh token is invalidated after use (rotation).
    """
    try:
        response = db.auth.refresh_session(refresh_token)

        if response.session is None:
            raise ValueError("Refresh token is invalid or expired. Please log in again.")

        session = response.session
        logger.info("Tokens refreshed successfully.")

        return AuthTokens(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in or 3600,
        )

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise ValueError("Could not refresh session. Please log in again.")


async def get_current_user_profile(db: Client, user_id: str) -> dict:
    """Fetch the public profile of the authenticated user."""
    result = db.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise ValueError("User profile not found.")
    return result.data[0]


# ── JWT verification (called on every protected request) ─────────────────────

def verify_jwt(token: str, jwt_secret: str) -> AuthenticatedUser:
    """
    Verify a Supabase-issued JWT locally using the project JWT secret.

    Accepts jwt_secret as an explicit parameter (injected by the FastAPI
    dependency in dependencies.py) rather than calling get_settings() itself.
    This avoids any risk of the lru_cache returning a stale empty string if
    Settings was instantiated before .env was loaded.

    This runs on EVERY protected API request — it must be fast.
    No network call is made; verification is purely cryptographic (HMAC-SHA256).

    Raises:
        ValueError("TOKEN_EXPIRED")  — caught by get_current_user → 401
        ValueError("TOKEN_INVALID")  — caught by get_current_user → 401
        ValueError("JWT_NOT_CONFIGURED") — caught by get_current_user → 500
    """
    if not jwt_secret:
        raise ValueError(
            "JWT_NOT_CONFIGURED: SUPABASE_JWT_SECRET is missing or empty. "
            "Find it in Supabase Dashboard -> Settings -> API -> JWT Settings -> JWT Secret."
        )

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            # Supabase sets audience to "authenticated" for logged-in users
            audience="authenticated",
        )

        user_id = payload.get("sub")
        email = payload.get("email", "")

        if not user_id:
            raise InvalidTokenError("Token missing sub claim.")

        return AuthenticatedUser(user_id=user_id, email=email)

    except ExpiredSignatureError:
        raise ValueError("TOKEN_EXPIRED: Access token has expired. Use refresh token.")
    except InvalidTokenError as e:
        raise ValueError(f"TOKEN_INVALID: {str(e)}")


# ── Internal helpers ──────────────────────────────────────────────────────────

def _ensure_public_user(db: Client, user_id: str, email: str) -> None:
    """
    Upsert a row in public.users.

    Supabase Auth stores users in auth.users (internal schema).
    Our app's foreign keys reference public.users.
    This function keeps them in sync.

    On INSERT: sets id, email, created_at (updated_at defaults to now() via column default).
    On CONFLICT (id): only updates email and updated_at — created_at is intentionally
    left alone so we don't overwrite the original registration timestamp.
    """
    from datetime import datetime

    now = datetime.utcnow().isoformat()

    try:
        # Two-step approach: try INSERT first, then UPDATE on conflict.
        # This avoids sending updated_at on INSERT (the column default handles it),
        # and avoids sending created_at on UPDATE (we never want to overwrite it).
        result = db.table("users").select("id").eq("id", user_id).execute()

        if not result.data:
            # New user — INSERT (created_at and updated_at use column defaults)
            db.table("users").insert({
                "id": user_id,
                "email": email,
            }).execute()
        else:
            # Existing user — UPDATE only the mutable fields
            db.table("users").update({
                "email": email,
                "updated_at": now,
            }).eq("id", user_id).execute()

    except Exception as e:
        # Non-fatal — log and continue. The auth tokens are still valid.
        logger.warning(f"Could not upsert public.users for {user_id}: {e}")