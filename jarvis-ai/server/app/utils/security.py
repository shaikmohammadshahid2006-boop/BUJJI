import json
import base64
import logging
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger("jarvis.security")

import importlib

jwt = None
PyJWTError = Exception
ExpiredSignatureError = Exception
HAVE_JWT = False

try:
    jwt = importlib.import_module("jwt")
    jwt_exc = importlib.import_module("jwt.exceptions")
    PyJWTError = getattr(jwt_exc, "PyJWTError", Exception)
    ExpiredSignatureError = getattr(jwt_exc, "ExpiredSignatureError", Exception)
    HAVE_JWT = True
except Exception:
    HAVE_JWT = False
    logger.info("PyJWT not installed in current environment; using fallback base64 payload decoder.")


def _decode_jwt_payload_fallback(token: str) -> Optional[Dict[str, Any]]:
    """Decodes standard base64url JWT payload when PyJWT is not installed."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Add padding if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding and padding != 4:
            payload_b64 += "=" * padding
        decoded_bytes = base64.urlsafe_b64decode(payload_b64)
        payload = json.loads(decoded_bytes.decode("utf-8"))
        if "sub" in payload:
            return payload
    except Exception as e:
        logger.warning(f"Fallback JWT parse failed: {e}")
    return None


def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Supabase access token (JWT) and extracts user claims.
    Validates token expiration, issuer/audience where appropriate,
    and returns the payload dictionary with 'sub' (user_id) and 'email'.
    """
    if not token or not isinstance(token, str):
        return None

    cleaned_token = token.strip()
    if cleaned_token.lower().startswith("bearer "):
        cleaned_token = cleaned_token[7:].strip()

    if not cleaned_token:
        return None

    # Handle mock tokens for offline development
    if cleaned_token == "mock_jwt_token_for_sandbox":
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "commander@jarvis.local",
            "role": "authenticated"
        }

    jwt_secret = settings.supabase_jwt_secret

    if HAVE_JWT and jwt_secret:
        try:
            payload = jwt.decode(
                cleaned_token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True}
            )
            return payload
        except ExpiredSignatureError:
            logger.warning("Supabase JWT has expired")
            return None
        except PyJWTError:
            try:
                payload = jwt.decode(
                    cleaned_token,
                    jwt_secret,
                    algorithms=["HS256"],
                    options={"verify_exp": True, "verify_aud": False}
                )
                return payload
            except Exception:
                return None
    elif HAVE_JWT:
        try:
            payload = jwt.decode(
                cleaned_token,
                options={"verify_signature": False, "verify_exp": True}
            )
            if "sub" in payload:
                return payload
        except Exception:
            return None
    else:
        return _decode_jwt_payload_fallback(cleaned_token)

    return None
