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
  Register/Login → Supabase issues access_token (JWT, ES256) + refresh_token
  Client stores both securely (Keychain on iOS, EncryptedSharedPrefs on Android)
  Every API request → Authorization: Bearer <access_token>
  FastAPI verifies JWT using Supabase JWKS public keys (fetched once, cached 1h)
  Token expires (1 hour default) → client uses refresh_token to get new access_token

Algorithm note:
  Newer Supabase projects use ES256 (asymmetric ECDSA P-256).
  Older projects used HS256 (symmetric HMAC-SHA256).
  This code handles BOTH by auto-detecting from the JWT header.
  ES256 → verified against Supabase JWKS public key endpoint
  HS256 → verified against SUPABASE_JWT_SECRET string in .env
"""

import logging
from dataclasses import dataclass
from typing import Optional

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWKClient, PyJWKClientError
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

        # Mirror user into public.users — required for FK relationships.
        # Raises RuntimeError if SUPABASE_KEY is wrong (anon instead of service_role).
        try:
            _ensure_public_user(db, user_id=user.id, email=email)
        except RuntimeError:
            raise  # propagate clearly to the route handler

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

        # Ensure public.users row exists — required for all FK relationships.
        # Raises RuntimeError if SUPABASE_KEY is wrong (anon instead of service_role).
        try:
            _ensure_public_user(db, user_id=user.id, email=email)
        except RuntimeError:
            raise  # propagate clearly to the route handler

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

# ── JWKS client (module-level singleton) ────────────────────────────────────
# PyJWKClient is PyJWT's built-in JWKS fetcher and cache.
# It fetches Supabase's public keys once, caches them (lifespan=3600s),
# and automatically picks the right key by kid on each verification.
# This works across all PyJWT versions >= 2.4.0 with no extra imports.
#
# The client is created lazily on first use (keyed by project URL) so
# tests and local dev don't hit the network at import time.

_jwks_clients: dict[str, PyJWKClient] = {}


def _get_jwks_client(supabase_url: str) -> PyJWKClient:
    """Return a cached PyJWKClient for the given Supabase project URL."""
    if supabase_url not in _jwks_clients:
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_clients[supabase_url] = PyJWKClient(
            jwks_url,
            cache_keys=True,
            cache_jwk_set=True,
            lifespan=3600,  # refresh public keys every hour
        )
        logger.info(f"JWKS client created for {jwks_url}")
    return _jwks_clients[supabase_url]


def verify_jwt(token: str, jwt_secret: str) -> AuthenticatedUser:
    """
    Verify a Supabase-issued JWT. Handles both ES256 and HS256 automatically.

    ES256 (newer Supabase projects — default from mid-2024 onwards):
      - Token header: {"alg": "ES256", "kid": "<uuid>"}
      - Verified using PyJWT's PyJWKClient against Supabase's JWKS endpoint
      - SUPABASE_JWT_SECRET is NOT needed for this path

    HS256 (older Supabase projects):
      - Token header: {"alg": "HS256"}
      - Verified against the SUPABASE_JWT_SECRET string in .env
      - Requires SUPABASE_JWT_SECRET to be set

    The jwt_secret parameter is kept for HS256 compatibility and is injected
    by FastAPI DI from settings.supabase_jwt_secret.

    Raises:
        ValueError("TOKEN_EXPIRED")       -> 401
        ValueError("TOKEN_INVALID")       -> 401
        ValueError("JWT_NOT_CONFIGURED")  -> 500
    """
    # Peek at the header without verifying signature — just to detect algorithm
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception:
        raise ValueError("TOKEN_INVALID: Could not decode token header.")

    alg = unverified_header.get("alg", "")

    try:
        if alg == "ES256":
            # ── Asymmetric path (newer Supabase projects) ─────────────────────
            # PyJWKClient fetches the public key by kid from the JWKS endpoint,
            # caches it, and returns the correct signing key automatically.
            settings = get_settings()
            if not settings.supabase_url:
                raise ValueError(
                    "JWT_NOT_CONFIGURED: SUPABASE_URL is not set. "
                    "Cannot derive JWKS endpoint for ES256 verification."
                )

            try:
                jwks_client = _get_jwks_client(settings.supabase_url)
                signing_key = jwks_client.get_signing_key_from_jwt(token)
            except PyJWKClientError as e:
                raise ValueError(
                    f"TOKEN_INVALID: Could not fetch Supabase public key: {e}. "
                    "Check your SUPABASE_URL and internet connectivity."
                )

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )

        elif alg == "HS256":
            # ── Symmetric path (older Supabase projects) ──────────────────────
            if not jwt_secret:
                raise ValueError(
                    "JWT_NOT_CONFIGURED: SUPABASE_JWT_SECRET is required for HS256 tokens. "
                    "Find it in Supabase Dashboard -> Settings -> API -> JWT Settings."
                )
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

        else:
            raise ValueError(
                f"TOKEN_INVALID: Unsupported JWT algorithm '{alg}'. "
                "Expected ES256 (newer Supabase) or HS256 (older Supabase)."
            )

        user_id = payload.get("sub")
        email = payload.get("email", "")

        if not user_id:
            raise ValueError("TOKEN_INVALID: Token is missing the 'sub' (user ID) claim.")

        return AuthenticatedUser(user_id=user_id, email=email)

    except ExpiredSignatureError:
        raise ValueError("TOKEN_EXPIRED: Access token has expired. Use refresh token.")
    except InvalidTokenError as e:
        raise ValueError(f"TOKEN_INVALID: {str(e)}")
    except ValueError:
        raise  # re-raise our structured errors untouched
    except Exception as e:
        raise ValueError(f"TOKEN_INVALID: Unexpected error during verification: {str(e)}")



# ── Internal helpers ──────────────────────────────────────────────────────────

def _ensure_public_user(db: Client, user_id: str, email: str) -> None:
    """
    Sync the authenticated user into public.users.

    Supabase Auth stores users in auth.users (internal schema).
    Our FK columns reference public.users, so this row must exist
    before any session or journal insert can succeed.

    Requires the SUPABASE_KEY to be the service_role key (not anon).
    The service_role key bypasses RLS, which is needed here because
    this call happens during login — before any auth.uid() session exists.

    If you see error code 42501 (RLS violation), your SUPABASE_KEY is the
    anon key. Fix: Supabase Dashboard → Settings → API → service_role key.
    """
    from datetime import datetime

    now = datetime.utcnow().isoformat()

    try:
        result = db.table("users").select("id").eq("id", user_id).execute()

        if not result.data:
            db.table("users").insert({
                "id": user_id,
                "email": email,
            }).execute()
            logger.info(f"Created public.users row for {user_id}")
        else:
            db.table("users").update({
                "email": email,
                "updated_at": now,
            }).eq("id", user_id).execute()

    except Exception as e:
        error_str = str(e)
        # Code 42501 = RLS violation — this is always the wrong key being used
        if "42501" in error_str:
            logger.error(
                f"RLS blocked public.users write for {user_id}. "
                "This means SUPABASE_KEY is the anon key, not service_role. "
                "Fix: Supabase Dashboard → Settings → API → service_role → copy to .env SUPABASE_KEY"
            )
            raise RuntimeError(
                "Server misconfiguration: SUPABASE_KEY must be the service_role key, not anon. "
                "See server logs for instructions."
            )
        # Any other error — log and re-raise so the caller returns a proper 503
        logger.error(f"Failed to sync public.users for {user_id}: {e}")
        raise RuntimeError(f"Could not create user profile: {e}")