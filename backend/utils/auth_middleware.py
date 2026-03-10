"""
utils/auth_middleware.py
-------------------------
FastAPI dependency for JWT authentication via Supabase Auth.

Usage in any protected endpoint:
    from utils.auth_middleware import get_current_user

    @router.post("/some-protected-route")
    async def handler(data: SomeModel, user_id: str = Depends(get_current_user)):
        # user_id is the authenticated user's UUID
        ...

The JWT is issued by Supabase when a user logs in. It is verified
here using the SUPABASE_JWT_SECRET from the .env file.
"""

import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET", "")

# HTTPBearer auto-extracts the token from "Authorization: Bearer <token>"
_bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> str:
    """
    FastAPI dependency that validates a Supabase JWT and returns the user_id.

    Raises
    ------
    HTTPException 401 — if the token is missing, expired, or has an invalid signature.
    HTTPException 401 — if the token does not contain a 'sub' claim (user_id).

    Returns
    -------
    str — The authenticated user's UUID (from the 'sub' JWT claim).
    """

    token = credentials.credentials  # Raw JWT string

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            # Supabase JWTs use "authenticated" as the audience
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing the user identifier (sub claim).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
