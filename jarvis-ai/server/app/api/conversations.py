from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.dependencies import get_current_user
from app.services.supabase_service import SupabaseService
from app.models.conversation import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=List[ConversationResponse])
async def list_user_conversations(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns all previous conversations for the authenticated user, ordered by most recently updated.
    """
    user_id = current_user["user_id"]
    return SupabaseService.list_conversations(user_id=user_id)


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_user_conversation(
    req: ConversationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Initializes a new conversation session for the user.
    """
    user_id = current_user["user_id"]
    title = req.title or "New Conversation"
    return SupabaseService.create_conversation(user_id=user_id, title=title)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_user_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves metadata for a specific conversation belonging to the authenticated user.
    """
    user_id = current_user["user_id"]
    conv = SupabaseService.get_conversation(user_id=user_id, conversation_id=conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied."
        )
    return conv


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_user_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes a conversation and its messages. Scoped to the authenticated user.
    """
    user_id = current_user["user_id"]
    success = SupabaseService.delete_conversation(user_id=user_id, conversation_id=conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied."
        )
    return {"success": True, "message": "Conversation deleted successfully."}


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves chronological message history for a conversation.
    """
    user_id = current_user["user_id"]
    conv = SupabaseService.get_conversation(user_id=user_id, conversation_id=conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied."
        )
    return SupabaseService.list_messages(user_id=user_id, conversation_id=conversation_id)


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def append_conversation_message(
    conversation_id: str,
    msg: MessageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Appends a new message directly to an existing conversation thread.
    """
    user_id = current_user["user_id"]
    conv = SupabaseService.get_conversation(user_id=user_id, conversation_id=conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied."
        )

    return SupabaseService.add_message(
        user_id=user_id,
        conversation_id=conversation_id,
        role=msg.role,
        content=msg.content,
        action=msg.action,
        metadata=msg.metadata
    )
