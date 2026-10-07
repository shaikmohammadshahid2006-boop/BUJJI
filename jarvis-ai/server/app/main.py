import os
import sys
import logging
from pathlib import Path

# Ensure server root is in sys.path regardless of where this script is executed from
_SERVER_ROOT = str(Path(__file__).resolve().parent.parent)
if _SERVER_ROOT not in sys.path:
    sys.path.insert(0, _SERVER_ROOT)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config import settings
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.assistant import router as assistant_router
from app.api.conversations import router as conversations_router
from app.api.system import router as system_router
from app.api.memory import router as memory_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("jarvis.server")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="JARVIS Full-Stack Web AI Assistant Backend Service",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None
)

# ── Secure CORS Configuration ───────────────────────────────────────────────
# In development, dynamically permit any local/LAN origin.
# In production, ALLOWED_ORIGINS should only include the deployed frontend domain.
logger.info(f"Configuring CORS with allowed origins: {settings.allowed_origins}")
cors_origin_regex = r"^https?://.*$"
effective_origins = [o for o in settings.allowed_origins if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=effective_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)

# ── Router Registration ──────────────────────────────────────────────────────
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(assistant_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(memory_router, prefix="/api")


# ── Global Safe Error Handling ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Jarvis encountered an internal system error. Please try again later.",
            "path": request.url.path
        }
    )


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "status": "online",
        "docs": "/docs" if settings.environment != "production" else "disabled"
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.port))
    host = os.environ.get("HOST", settings.host)
    uvicorn.run("app.main:app", host=host, port=port, reload=False, app_dir=_SERVER_ROOT)
