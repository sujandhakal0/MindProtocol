"""
routers/auth.py
----------------
Authentication endpoints using Supabase Auth.

Endpoints:
  POST /auth/register  — Create a new user account
  POST /auth/login     — Log in and receive a JWT access token
  POST /auth/logout    — Invalidate the current session

── BIDHUR (Frontend Contract) ────────────────────────────────────────
Register:
  Fetch: POST /auth/register
  Body:  { email, password, username }
  On 201: navigate to "email verification pending" screen

Login:
  Fetch: POST /auth/login
  Body:  { email, password }
  On 200: store access_token in SecureStore (Expo), store user_id
  Include token in all subsequent requests:
    headers: { Authorization: `Bearer ${access_token}` }

Logout:
  Fetch: POST /auth/logout
  Headers: { Authorization: Bearer <token> }
  On 200: clear token from SecureStore, navigate to login screen
──────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field
from services.supabase_client import supabase
from utils.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Request / Response models ──────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(min_length=2, max_length=50)


class RegisterResponse(BaseModel):
    user_id: str
    email: str
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


# ── Endpoints ──────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest):
    """
    Create a new MindProtocol account via Supabase Auth.

    Supabase automatically triggers the on_auth_user_created trigger
    which inserts a corresponding row into the public.profiles table
    with the username from user_metadata.

    The user will receive a confirmation email before they can log in
    (Supabase email verification is enabled by default).
    """
    try:
        result = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                # Stored in auth.users.raw_user_meta_data
                # The trigger reads this to populate profiles.username
                "data": {"username": data.username}
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )

    if result.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. The email may already be in use.",
        )

    return RegisterResponse(
        user_id=str(result.user.id),
        email=result.user.email,
        message="Registration successful. Please verify your email.",
    )


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(data: LoginRequest):
    """
    Authenticate a user and return a Supabase JWT access token.

    The access_token must be included in the Authorization header of
    all subsequent requests:
        Authorization: Bearer <access_token>
    """
    try:
        result = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )

    if result.session is None or result.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return LoginResponse(
        access_token=result.session.access_token,
        token_type="bearer",
        user_id=str(result.user.id),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(user_id: str = Depends(get_current_user)):
    """
    Sign the current user out and invalidate their Supabase session.

    The frontend should clear the token from local storage on receipt of 200.
    """
    try:
        supabase.auth.sign_out()
    except Exception as e:
        # Non-fatal — token may already be expired
        pass

    return {"message": "Logged out successfully."}
