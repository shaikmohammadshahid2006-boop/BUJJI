from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    NONE = "none"
    OPEN_URL = "open_url"
    SEARCH_WEB = "search_web"
    PLAY_MEDIA = "play_media"
    SHOW_NOTIFICATION = "show_notification"
    COPY_TEXT = "copy_text"
    OPEN_NEW_TAB = "open_new_tab"
    ASK_CONFIRMATION = "ask_confirmation"
    DESKTOP_COMMAND = "desktop_command"
    SYSTEM_TELEMETRY = "system_telemetry"
    MEMORY_VIEW = "memory_view"
    BRIEFING = "briefing"
    UNDO_ACTION = "undo_action"


class AssistantCommandRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="User prompt or voice command")
    conversation_id: Optional[str] = Field(default=None, description="Optional UUID of existing conversation")


class AssistantResponseData(BaseModel):
    url: Optional[str] = None
    query: Optional[str] = None
    media_url: Optional[str] = None
    title: Optional[str] = None
    snippet: Optional[str] = None
    clipboard_text: Optional[str] = None
    notification_title: Optional[str] = None
    notification_body: Optional[str] = None
    prompt_question: Optional[str] = None
    desktop_app: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class AssistantCommandResponse(BaseModel):
    success: bool = True
    message: str
    action: ActionType = ActionType.NONE
    data: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
