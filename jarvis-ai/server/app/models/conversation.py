from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default="New Conversation", max_length=120)


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str


class MessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)
    action: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str
    content: str
    action: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str


class ProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    voice_enabled: bool = True
    auto_speak: bool = True
