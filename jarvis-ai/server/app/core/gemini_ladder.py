"""
jarvis-ai/server/app/core/gemini_ladder.py
Mark LV-grade 9-Model Measured Fallback Ladder with Cooldowns and Deadlines.
Directly ported from Mark LV core/gemini.py architecture.
"""
from __future__ import annotations
import logging
import time
import threading
from typing import Optional, List, Dict, Any
import requests

from app.config import settings

logger = logging.getLogger("jarvis.ladder")

# Ladder categories
FAST = "fast"
SMART = "smart"
SEARCH = "search"

# Measured order of models from Mark LV benchmarks
LADDER_MODELS = {
    FAST: [
        "gemini-2.5-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3-flash-preview",
    ],
    SMART: [
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.6-flash",
        "gemini-3-flash-preview",
        "gemini-flash-latest",
    ],
    SEARCH: [
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
    ],
}

# Cooldown durations (in seconds)
COOLDOWN_QUOTA_SECONDS = 300       # 5 minutes for 429 RESOURCE_EXHAUSTED
COOLDOWN_TIMEOUT_SECONDS = 1800     # 30 minutes for 503 / 504 / DEADLINE_EXCEEDED
COOLDOWN_GONE_SECONDS = 21600       # 6 hours for 404 / 403 / Not supported

DEFAULT_TIMEOUT = 12

_cooldown: Dict[str, float] = {}
_cool_lock = threading.Lock()


def _is_cooling(model: str) -> bool:
    with _cool_lock:
        until = _cooldown.get(model, 0.0)
        if until and time.monotonic() < until:
            return True
        _cooldown.pop(model, None)
        return False


def _cool(model: str, seconds: float) -> None:
    with _cool_lock:
        _cooldown[model] = time.monotonic() + seconds
        logger.warning(f"[ModelLadder] Cooled model '{model}' for {int(seconds)}s.")


def _classify_error_and_cool(model: str, error_msg: str) -> None:
    low = error_msg.lower()
    if "429" in error_msg or "resource_exhausted" in low or "quota" in low:
        _cool(model, COOLDOWN_QUOTA_SECONDS)
    elif "503" in error_msg or "504" in error_msg or "unavailable" in low or "deadline_exceeded" in low or "timeout" in low:
        _cool(model, COOLDOWN_TIMEOUT_SECONDS)
    elif "404" in error_msg or "not found" in low or "permission" in low or "403" in error_msg or "not supported" in low:
        _cool(model, COOLDOWN_GONE_SECONDS)


class ModelLadder:
    """
    Manages the multi-model fallback ladder with dynamic cooldowns,
    ensuring zero stalls and continuous service.
    """

    @classmethod
    def get_active_models(cls, ladder_type: str = SMART) -> List[str]:
        models = LADDER_MODELS.get(ladder_type, LADDER_MODELS[SMART])
        return [m for m in models if not _is_cooling(m)]

    @classmethod
    def get_ladder_status(cls) -> Dict[str, Any]:
        """Telemetry diagnostics of the model ladder rungs."""
        status = {}
        now = time.monotonic()
        for ladder, models in LADDER_MODELS.items():
            status[ladder] = []
            for m in models:
                cooling_until = _cooldown.get(m, 0.0)
                is_cool = cooling_until > now
                remaining = int(cooling_until - now) if is_cool else 0
                status[ladder].append({
                    "model": m,
                    "status": "cooling" if is_cool else "ready",
                    "cooldown_remaining_secs": remaining
                })
        return status

    @classmethod
    def execute_prompt(
        cls,
        prompt: str,
        system_instruction: str,
        history: Optional[List[Dict[str, str]]] = None,
        ladder_type: str = SMART,
        api_key: Optional[str] = None
    ) -> Optional[str]:
        """
        Walks the model ladder until one responds cleanly within timeout.
        """
        key = api_key or settings.gemini_api_key
        if not key:
            logger.info("No GEMINI_API_KEY available for ModelLadder.")
            return None

        # Build message contents
        formatted_messages = []
        if history:
            for turn in history[-6:]:
                role = "user" if turn.get("role") == "user" else "model"
                formatted_messages.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
        formatted_messages.append({"role": "user", "parts": [{"text": prompt}]})

        models_to_try = cls.get_active_models(ladder_type)
        if not models_to_try:
            # If all are cooling, try all regardless
            models_to_try = LADDER_MODELS.get(ladder_type, LADDER_MODELS[SMART])

        # Step 1: Attempt via Google GenAI SDK if installed
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=key)

            for model_name in models_to_try:
                try:
                    logger.info(f"[ModelLadder] Trying SDK rung: {model_name}")
                    contents = prompt if not history else [
                        f"{system_instruction}\n\nUser: {prompt}"
                    ]
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.7,
                            max_output_tokens=1500,
                        )
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as sdk_call_err:
                    err_str = str(sdk_call_err)
                    logger.warning(f"[ModelLadder] SDK rung '{model_name}' failed: {err_str}")
                    _classify_error_and_cool(model_name, err_str)
                    continue
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"[ModelLadder] SDK client initialization failed: {e}")

        # Step 2: Fallback to direct Gemini REST API with strict timeouts
        for model_name in models_to_try:
            try:
                logger.info(f"[ModelLadder] Trying REST rung: {model_name}")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
                payload = {
                    "contents": [{
                        "parts": [{"text": f"{system_instruction}\n\nUser: {prompt}"}]
                    }],
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 1500
                    }
                }
                res = requests.post(url, json=payload, timeout=DEFAULT_TIMEOUT)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {})
                        parts = content.get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                else:
                    err_body = res.text
                    logger.warning(f"[ModelLadder] REST rung '{model_name}' HTTP {res.status_code}: {err_body}")
                    _classify_error_and_cool(model_name, f"{res.status_code} {err_body}")
            except Exception as rest_err:
                err_str = str(rest_err)
                logger.warning(f"[ModelLadder] REST rung '{model_name}' exception: {err_str}")
                _classify_error_and_cool(model_name, err_str)
                continue

        return None
