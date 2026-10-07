from typing import Dict, Any


class SpeechService:
    """
    Speech utility metadata service.
    Provides speech synthesis configurations and voice settings.
    """

    @staticmethod
    def get_speech_defaults() -> Dict[str, Any]:
        return {
            "browser_tts_recommended": True,
            "default_rate": 1.0,
            "default_pitch": 0.95,
            "preferred_voices": [
                "Google UK English Male",
                "Microsoft George - English (United Kingdom)",
                "Daniel",
                "en-GB"
            ]
        }
