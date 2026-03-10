"""
auth_routes.py
--------------
Authentication endpoints.

PUBLIC endpoints (no token required):
  POST /api/auth/register   → Create account
  POST /api/auth/login      → Sign in, get tokens
  POST /api/auth/refresh    → Exchange refresh token for new access token

PROTECTED endpoints (token required):
  POST /api/auth/logout     → Sign out
  GET  /api/auth/me         → Get your own profile

How the client should use these:
  1. Call /register or /login → store access_token and refresh_token securely
  2. Include header on every request: Authorization: Bearer <access_token>
  3. When you get a 401 with "expired" message → call /refresh
  4. Use the new access_token from the refresh response going forward
"""

import logging
from fastapi import APIRouter, Depends, HTTPException

from app.models.auth_models import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    AuthResponse,
    UserProfileResponse,
    LogoutResponse,
)
from app.services.auth_service import (
    register_user,
    login_user,
    logout_user,
    refresh_tokens,
    get_current_user_profile,
    AuthenticatedUser,
)
from app.dependencies import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Public: Register ──────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=201,
    summary="Create a new user account",
    description="""
Register a new user with email and password.

**Returns:** access_token and refresh_token to use immediately.

**Note:** If your Supabase project has email confirmation enabled, the user
must confirm their email before they can log in. You'll get a 400 error
explaining this. You can disable email confirmation in:
Supabase Dashboard → Authentication → Providers → Email → Confirm email (toggle off)
for development.
""",
)
async def register(body: RegisterRequest, db=Depends(get_db)) -> AuthResponse:
    try:
        tokens = await register_user(db, email=body.email, password=body.password)
        return AuthResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ── Public: Login ─────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Sign in and receive tokens",
    description="""
Sign in with email and password.

**Returns:** A fresh pair of access_token and refresh_token.

Store both tokens securely on the client:
- iOS: Keychain
- Android: EncryptedSharedPreferences
- Web: HttpOnly cookie (not localStorage)

The access_token expires in 1 hour (configurable in Supabase).
When it expires, call /auth/refresh instead of logging in again.
""",
)
async def login(body: LoginRequest, db=Depends(get_db)) -> AuthResponse:
    try:
        tokens = await login_user(db, email=body.email, password=body.password)
        return AuthResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
        )
    except ValueError as e:
        # Always return the same message to prevent email enumeration attacks
        raise HTTPException(status_code=401, detail="Invalid email or password.")


# ── Public: Refresh Token ─────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Get a new access token using your refresh token",
    description="""
Exchange a valid refresh_token for a new access_token + refresh_token pair.

**When to call this:**
- You receive a 401 response with detail containing "expired"
- Proactively before the access_token expires (check the expires_in field)

**Important:** Each refresh token can only be used ONCE (rotation).
After calling this endpoint, discard the old tokens and store the new ones.
""",
)
async def refresh(body: RefreshRequest, db=Depends(get_db)) -> AuthResponse:
    try:
        tokens = await refresh_tokens(db, refresh_token=body.refresh_token)
        return AuthResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ── Protected: Logout ─────────────────────────────────────────────────────────

@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Sign out the current user",
    description="""
Invalidates the current session server-side.

**After calling this:**
- Delete access_token and refresh_token from client storage
- Redirect user to login screen

Requires: `Authorization: Bearer <access_token>` header.
""",
)
async def logout(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db=Depends(get_db),
) -> LogoutResponse:
    await logout_user(db)
    logger.info(f"User {current_user.user_id} logged out.")
    return LogoutResponse()


# ── Protected: Me ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get the current user's profile",
    description="""
Returns the profile of the currently authenticated user.

Useful for:
- Verifying a token is still valid on app startup
- Displaying user info in the app UI

Requires: `Authorization: Bearer <access_token>` header.
""",
)
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db=Depends(get_db),
) -> UserProfileResponse:
    try:
        profile = await get_current_user_profile(db, user_id=current_user.user_id)
        return UserProfileResponse(
            user_id=profile["id"],
            email=profile["email"],
        )
    except ValueError:
        # Profile exists in auth but not in public.users — create it
        return UserProfileResponse(
            user_id=current_user.user_id,
            email=current_user.email,
        )