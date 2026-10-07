import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.dependencies import get_current_user
from app.models.assistant import AssistantCommandRequest, AssistantCommandResponse
from app.services.assistant_service import AssistantService

logger = logging.getLogger("jarvis.api.assistant")
router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/command", response_model=AssistantCommandResponse)
async def process_assistant_command(
    request: AssistantCommandRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Core Jarvis command endpoint.
    Processes natural language commands or voice transcripts, executes safe web actions,
    and returns structured instructions to the web UI.
    """
    user_id = current_user["user_id"]
    try:
        response = AssistantService.handle_command(
            user_id=user_id,
            message=request.message,
            conversation_id=request.conversation_id
        )
        return response
    except Exception as e:
        logger.error(f"Error processing assistant command: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Jarvis could not process that command at this moment, sir."
        )
