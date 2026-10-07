from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.assistant import router as assistant_router
from app.api.conversations import router as conversations_router

__all__ = [
    "health_router",
    "auth_router",
    "assistant_router",
    "conversations_router",
]
