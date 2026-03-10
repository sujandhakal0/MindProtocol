"""
auth_models.py
--------------
Pydantic models for all authentication endpoints.
Strict validation happens here before any business logic runs.
"""

from pydantic import BaseModel, EmailStr, Field


# ── Request Models ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="A valid email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Minimum 8 characters",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123!",
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123!",
            }
        }


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1, description="The refresh token from login/register")

    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            }
        }


# ── Response Models ───────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    """Returned after successful register or login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token lifetime in seconds (default: 3600 = 1 hour)")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 3600,
            }
        }


class UserProfileResponse(BaseModel):
    """Public user profile returned by /auth/me."""
    user_id: str
    email: str

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
            }
        }


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully."
