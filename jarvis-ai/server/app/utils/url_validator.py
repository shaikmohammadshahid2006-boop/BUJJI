import re
from urllib.parse import urlparse

DANGEROUS_SCHEMES = {
    "javascript",
    "file",
    "data",
    "vbscript",
    "blob",
    "chrome",
    "about",
    "resource",
}

SAFE_SCHEMES = {"http", "https"}


def is_safe_url(url: str | None) -> bool:
    """
    Validates that a URL uses safe protocols and cannot be exploited for XSS,
    local file inclusion, or code injection.
    """
    if not url or not isinstance(url, str):
        return False

    trimmed = url.strip()
    if not trimmed:
        return False

    # Check for dangerous scheme prefix with regex to prevent obfuscation (e.g., java script:)
    lower = trimmed.lower()
    for scheme in DANGEROUS_SCHEMES:
        if re.match(rf"^\s*{scheme}\s*:", lower):
            return False

    try:
        parsed = urlparse(trimmed)
        if parsed.scheme.lower() not in SAFE_SCHEMES:
            return False
        if not parsed.netloc:
            return False
        return True
    except Exception:
        return False


def sanitize_url(url: str | None) -> str | None:
    """
    Returns a valid sanitized URL or None if invalid or dangerous.
    If input lacks a scheme but looks like a valid domain, prepends https://.
    """
    if not url or not isinstance(url, str):
        return None

    cleaned = url.strip()
    if not cleaned:
        return None

    if not cleaned.startswith(("http://", "https://")):
        # Auto-prefix domain
        cleaned = "https://" + cleaned

    if is_safe_url(cleaned):
        return cleaned

    return None
