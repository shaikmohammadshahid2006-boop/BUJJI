import logging
from typing import Dict, Any
from fastapi import Header, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import verify_supabase_token

logger = logging.getLogger("jarvis.auth")

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    authorization: str = Header(None)
) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and verifies the Supabase JWT token.
    Never trusts client-supplied user identifiers from URL params or bodies;
    the authenticated user identity is derived strictly from the cryptographically
    verified JWT.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = verify_supabase_token(token)
    if not claims or "sub" not in claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(claims["sub"])
    email = claims.get("email")

    return {
        "user_id": user_id,
        "email": email,
        "claims": claims
    }
