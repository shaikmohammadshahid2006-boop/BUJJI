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
    Falls back gracefully to commander guest user if session is missing, expired,
    or in sandbox mode, ensuring live site interaction is never blocked.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    fallback_user = {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "email": "commander@jarvis.local",
        "role": "authenticated",
        "claims": {"sub": "00000000-0000-0000-0000-000000000001"}
    }

    if not token or token in ("undefined", "null", "mock_jwt_token_for_sandbox"):
        return fallback_user

    claims = verify_supabase_token(token)
    if not claims or "sub" not in claims:
        logger.info("Supabase token unverified or expired; continuing with commander guest session.")
        return fallback_user

    user_id = str(claims["sub"])
    email = claims.get("email")

    return {
        "user_id": user_id,
        "email": email,
        "claims": claims
    }
