import logging
from typing import Optional, Dict, Any, List
from app.core.jarvis import jarvis_instance
from app.services.supabase_service import SupabaseService
from app.models.assistant import AssistantCommandResponse, ActionType

logger = logging.getLogger("jarvis.service")


class AssistantService:
    """
    Coordinates between user requests, conversation history persistence in Supabase,
    and Jarvis core processing.
    """

    @staticmethod
    def handle_command(
        user_id: str,
        message: str,
        conversation_id: Optional[str] = None
    ) -> AssistantCommandResponse:
        clean_msg = message.strip()
        if not clean_msg:
            return AssistantCommandResponse(
                success=False,
                message="Command was empty, sir.",
                action=ActionType.NONE
            )

        # 1. Resolve or create conversation
        active_conv_id = conversation_id
        if not active_conv_id:
            # Auto-generate a title based on the first few words of the command
            preview_title = (clean_msg[:30] + "...") if len(clean_msg) > 30 else clean_msg
            conv = SupabaseService.create_conversation(user_id=user_id, title=preview_title.capitalize())
            active_conv_id = conv["id"]
        else:
            # Validate ownership
            existing = SupabaseService.get_conversation(user_id=user_id, conversation_id=active_conv_id)
            if not existing:
                conv = SupabaseService.create_conversation(user_id=user_id, title="New Conversation")
                active_conv_id = conv["id"]

        # 2. Record user prompt
        SupabaseService.add_message(
            user_id=user_id,
            conversation_id=active_conv_id,
            role="user",
            content=clean_msg
        )

        # 3. Fetch past messages for conversational continuity
        past_msgs = SupabaseService.list_messages(user_id=user_id, conversation_id=active_conv_id)
        history: List[Dict[str, str]] = [
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in past_msgs[-8:]
        ]

        # 4. Run through Jarvis intelligence
        result = jarvis_instance.process_command(clean_msg, conversation_history=history)

        reply_text = result.get("message", "Processed successfully, sir.")
        action = result.get("action", ActionType.NONE)
        data = result.get("data", {})

        # 5. Persist assistant response
        assistant_record = SupabaseService.add_message(
            user_id=user_id,
            conversation_id=active_conv_id,
            role="assistant",
            content=reply_text,
            action=action.value if hasattr(action, "value") else str(action),
            metadata=data
        )

        return AssistantCommandResponse(
            success=True,
            message=reply_text,
            action=action,
            data=data,
            conversation_id=active_conv_id,
            message_id=assistant_record.get("id")
        )
