import logging
import re
from typing import List, Dict, Any, Optional
from app.config import settings
from app.models.assistant import ActionType
from app.core.command_router import CommandRouter
from app.utils.url_validator import sanitize_url

logger = logging.getLogger("jarvis.core")

JARVIS_SYSTEM_PROMPT = """
You are JARVIS, an advanced, highly intelligent AI assistant designed for pair programming, analysis, automation, and general intelligence.
Your voice and personality guidelines:
- You are a trusted, elite operator speaking to someone you respect.
- Address the user respectfully as 'sir' where appropriate.
- Be crisp, articulate, and concrete. State facts, solutions, and assessments first.
- Maintain a steady, calm, composed tone under all situations.
- Humour, if used, is dry understated wit. Never use exclamation marks or cartoonish speech.
- If code is requested, provide clean, idiomatic, and modern code blocks.
- Never claim to have taken an action on the physical host without the user's consent.
"""

# Gemini Model Ladder (order of execution fallback)
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]


class JarvisCore:
    """
    Core Jarvis intelligence engine.
    Orchestrates command routing, system persona, LLM fallback ladder,
    and safe structured action response formulation.
    """

    def __init__(self):
        self.api_key = settings.gemini_api_key

    def process_command(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Processes a user prompt through the Jarvis intelligence pipeline.
        1. Checks CommandRouter for deterministic quick actions (YouTube, search, weather, desktop guards).
        2. If unrouted, queries the Gemini AI ladder with conversational memory.
        3. Formats response and identifies interactive web actions.
        """
        # Step 1: Check Command Router
        routed = CommandRouter.route_command(user_message)
        if routed:
            return {
                "message": routed["message"],
                "action": routed.get("action", ActionType.NONE),
                "data": routed.get("data", {})
            }

        # Step 2: Query Gemini AI ladder
        llm_reply = self._call_gemini_ladder(user_message, conversation_history)
        if llm_reply:
            # Check if reply contains code blocks for copy action
            action = ActionType.NONE
            data: Dict[str, Any] = {}

            code_match = re.search(r"```(?:[a-zA-Z]*)\n([\s\S]+?)\n```", llm_reply)
            if code_match:
                action = ActionType.COPY_TEXT
                data["clipboard_text"] = code_match.group(1).strip()
                data["title"] = "Generated Code"

            # Check if reply recommends a URL
            url_match = re.search(r"https?://[^\s\)\>]+", llm_reply)
            if url_match:
                found_url = sanitize_url(url_match.group(0))
                if found_url and action == ActionType.NONE:
                    data["url"] = found_url

            return {
                "message": llm_reply,
                "action": action,
                "data": data
            }

        # Step 3: Heuristic Fallback if AI service is offline
        return self._generate_offline_response(user_message)

    def _build_system_prompt(self) -> str:
        from app.services.memory_service import MemoryService
        mem_block = MemoryService.format_memory_for_prompt()
        if mem_block:
            return f"{JARVIS_SYSTEM_PROMPT}\n\n=== RECALLED MEMORY OF USER ===\n{mem_block}\n==============================="
        return JARVIS_SYSTEM_PROMPT

    def _call_gemini_ladder(
        self,
        prompt: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Optional[str]:
        """
        Executes prompt across the Mark LV measured 9-model ladder with cooldowns.
        """
        from app.core.gemini_ladder import ModelLadder, SMART
        sys_prompt = self._build_system_prompt()
        return ModelLadder.execute_prompt(
            prompt=prompt,
            system_instruction=sys_prompt,
            history=history,
            ladder_type=SMART,
            api_key=self.api_key or settings.gemini_api_key
        )

    def _generate_offline_response(self, user_message: str) -> Dict[str, Any]:
        """
        Provides intelligent, character-accurate answers if external LLM APIs are unreachable.
        """
        msg = user_message.lower()
        if "hello" in msg or "hi" in msg or "hey jarvis" in msg:
            reply = "Online and at your service, sir. All core web protocols are functional. What is your command?"
        elif "who are you" in msg or "your name" in msg:
            reply = "I am JARVIS — Just A Rather Very Intelligent System. Operating as your cloud AI pair programmer and command interface, sir."
        elif "help" in msg or "what can you do" in msg:
            reply = (
                "I am equipped to execute real-time web actions including searching the internet, "
                "playing YouTube media, querying flight paths, checking weather forecasts, "
                "generating code, and maintaining persistent dialogue memory across your sessions, sir."
            )
        else:
            reply = (
                f"Acknowledged, sir. I have processed your instruction: '{user_message}'. "
                "Please configure GEMINI_API_KEY in your backend server environment for full generative reasoning capabilities."
            )

        return {
            "message": reply,
            "action": ActionType.NONE,
            "data": {}
        }


jarvis_instance = JarvisCore()
