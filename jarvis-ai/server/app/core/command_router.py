import re
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional
from app.models.assistant import ActionType
from app.core.action_executor import (
    scrape_youtube_video_url,
    execute_web_search,
    build_weather_action,
    build_flight_action,
)
from app.utils.url_validator import sanitize_url

COMMON_SITES = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "github": "https://www.github.com",
    "reddit": "https://www.reddit.com",
    "twitter": "https://x.com",
    "x": "https://x.com",
    "linkedin": "https://www.linkedin.com",
    "netflix": "https://www.netflix.com",
    "spotify": "https://open.spotify.com",
    "instagram": "https://www.instagram.com",
    "facebook": "https://www.facebook.com",
    "amazon": "https://www.amazon.com",
    "gmail": "https://mail.google.com",
    "chatgpt": "https://chatgpt.com",
    "wikipedia": "https://www.wikipedia.org",
    "stackoverflow": "https://stackoverflow.com",
}

DESKTOP_APPS = {
    "notepad", "calculator", "calc", "terminal", "powershell", "cmd",
    "explorer", "file explorer", "task manager", "settings", "word",
    "excel", "powerpoint", "blender", "figma", "obsidian", "steam",
    "vlc", "vscode", "visual studio code", "code"
}


class CommandRouter:
    """
    Intelligent command router that interprets user queries, distinguishes between
    direct web actions, desktop requests, and AI queries.
    """

    @staticmethod
    def route_command(user_input: str) -> Optional[Dict[str, Any]]:
        text = user_input.strip()
        lower = text.lower()

        # 0. MORNING BRIEFING & PROACTIVE BRIEF
        if re.search(r"\b(morning briefing|daily brief|daily briefing|status brief|briefing)\b", lower):
            from app.services.briefing_service import BriefingService
            briefing = BriefingService.generate_briefing()
            return {
                "message": briefing["message"],
                "action": ActionType.BRIEFING,
                "data": briefing
            }

        # 0.1 SYSTEM TELEMETRY & HARDWARE MONITOR (actions/system_monitor.py)
        if re.search(r"\b(system status|system monitor|hardware status|telemetry|cpu usage|ram usage|how is the pc|computer status)\b", lower):
            from app.services.system_service import SystemService
            metrics = SystemService.get_metrics()
            report = SystemService.format_status_report()
            return {
                "message": report,
                "action": ActionType.SYSTEM_TELEMETRY,
                "data": metrics
            }

        # 0.2 RECALLABLE MEMORY INSPECTION & RECALL (memory/memory_manager.py)
        if re.search(r"\b(what do you remember about me|show my memory|show memory|memory status)\b", lower):
            from app.services.memory_service import MemoryService
            mem = MemoryService.load_memory()
            formatted = MemoryService.format_memory_for_prompt()
            return {
                "message": f"Accessing stored knowledge records, sir:\n\n{formatted or 'No persistent facts stored yet.'}",
                "action": ActionType.MEMORY_VIEW,
                "data": mem
            }

        remember_match = re.search(r"^(?:remember that|note that|store that)\s+(.+)$", lower)
        if remember_match:
            from app.services.memory_service import MemoryService
            fact = remember_match.group(1).strip()
            # Default to notes or preferences
            MemoryService.store_fact("notes", f"fact_{int(datetime.now().timestamp())}", fact)
            return {
                "message": f"Understood, sir. I have committed that to long-term memory: '{fact}'.",
                "action": ActionType.NONE,
                "data": {"stored_fact": fact}
            }

        recall_match = re.search(r"^(?:recall|search memory for)\s+(.+)$", lower)
        if recall_match:
            from app.services.memory_service import MemoryService
            query = recall_match.group(1).strip()
            hits = MemoryService.search_memory(query)
            if hits:
                lines = [f"Found {len(hits)} memory record(s) matching '{query}':"]
                for h in hits[:4]:
                    lines.append(f"• [{h['category'].title()}] {h['key']}: {h['value']}")
                return {
                    "message": "\n".join(lines),
                    "action": ActionType.NONE,
                    "data": {"results": hits}
                }
            return {
                "message": f"I checked my records for '{query}', but found no matching memory entries, sir.",
                "action": ActionType.NONE,
                "data": {"query": query}
            }

        # 1. TIME & DATE
        if re.search(r"\b(what time is it|current time|tell me the time)\b", lower):
            now = datetime.now()
            time_str = now.strftime("%I:%M %p")
            return {
                "message": f"The current time is {time_str}, sir.",
                "action": ActionType.NONE,
                "data": {"time": time_str}
            }

        if re.search(r"\b(what('s| is) the date|today('s)? date|what day is today)\b", lower):
            now = datetime.now()
            date_str = now.strftime("%A, %B %d, %Y")
            return {
                "message": f"Today is {date_str}, sir.",
                "action": ActionType.NONE,
                "data": {"date": date_str}
            }

        # 2. YOUTUBE PLAY / SEARCH
        # Examples: "play bohemian rhapsody on youtube", "play interstellar theme", "open youtube"
        if lower in ["open youtube", "launch youtube", "go to youtube"]:
            return {
                "message": "Opening YouTube for you now, sir.",
                "action": ActionType.OPEN_URL,
                "data": {"url": "https://www.youtube.com", "title": "YouTube"}
            }

        play_match = re.search(r"^(?:play|watch)\s+(.+?)(?:\s+on youtube)?$", lower)
        if play_match:
            query = play_match.group(1).strip()
            video_url = scrape_youtube_video_url(query)
            return {
                "message": f"Playing '{query}' on YouTube, sir.",
                "action": ActionType.PLAY_MEDIA,
                "data": {
                    "url": sanitize_url(video_url),
                    "query": query,
                    "title": f"YouTube: {query}"
                }
            }

        yt_search_match = re.search(r"^(?:search\s+youtube\s+for|youtube\s+search)\s+(.+)$", lower)
        if yt_search_match:
            query = yt_search_match.group(1).strip()
            video_url = scrape_youtube_video_url(query)
            return {
                "message": f"Searching YouTube for '{query}', sir.",
                "action": ActionType.OPEN_URL,
                "data": {
                    "url": sanitize_url(video_url),
                    "query": query,
                    "title": f"YouTube: {query}"
                }
            }

        # 3. DIRECT WEBSITE OPENING
        # "open github", "go to reddit", "open google.com"
        open_site_match = re.search(r"^(?:open|go to|launch)\s+([a-z0-9\-_\.]+)(?:\.com|\.org|\.net|\.io)?$", lower)
        if open_site_match:
            site_key = open_site_match.group(1).strip()
            if site_key in COMMON_SITES:
                return {
                    "message": f"Opening {site_key.title()}, sir.",
                    "action": ActionType.OPEN_URL,
                    "data": {"url": COMMON_SITES[site_key], "title": site_key.title()}
                }
            elif "." in site_key:
                clean_url = sanitize_url(f"https://{site_key}")
                if clean_url:
                    return {
                        "message": f"Opening {site_key}, sir.",
                        "action": ActionType.OPEN_URL,
                        "data": {"url": clean_url, "title": site_key}
                    }

        # 4. WEATHER
        # "weather in Seattle", "how is the weather in London"
        weather_match = re.search(r"\bweather\s+(?:in|for|at)?\s*([a-zA-Z\s]+)", lower)
        if weather_match:
            city = weather_match.group(1).strip()
            if city and city not in ["today", "now", "like", "outside"]:
                return build_weather_action(city)

        # 5. FLIGHTS
        flight_match = re.search(r"flights?\s+from\s+([a-zA-Z\s]+)\s+to\s+([a-zA-Z\s]+)", lower)
        if flight_match:
            origin = flight_match.group(1).strip()
            dest = flight_match.group(2).strip()
            return build_flight_action(origin, dest)

        # 6. WEB SEARCH
        # "search for x", "google x", "search the web for x"
        search_match = re.search(r"^(?:search\s+(?:the\s+web\s+for|for|google\s+for)?|google)\s+(.+)$", lower)
        if search_match:
            query = search_match.group(1).strip()
            summary, results = execute_web_search(query, max_results=3)
            search_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
            return {
                "message": summary,
                "action": ActionType.SEARCH_WEB,
                "data": {
                    "query": query,
                    "url": sanitize_url(search_url),
                    "results": results
                }
            }

        # 7. DESKTOP-SPECIFIC COMMAND INTERCEPT
        # Protects server integrity while informing the user cleanly
        desktop_match = re.search(r"^(?:open|launch|start)\s+(.+)$", lower)
        if desktop_match:
            app_target = desktop_match.group(1).strip()
            if app_target in DESKTOP_APPS or any(a in app_target for a in DESKTOP_APPS):
                return {
                    "message": (
                        f"Opening desktop application '{app_target}' requires the local JARVIS Desktop Companion Agent. "
                        "Because you are accessing JARVIS via the cloud web dashboard, direct operating system process spawning "
                        "is restricted for your security. Would you like me to find a web-based alternative or launch a related online tool, sir?"
                    ),
                    "action": ActionType.DESKTOP_COMMAND,
                    "data": {
                        "desktop_app": app_target,
                        "status": "desktop_agent_required"
                    }
                }

        system_control_words = ["shutdown computer", "turn off pc", "restart computer", "mute volume", "lock pc", "take screenshot"]
        for cmd in system_control_words:
            if cmd in lower:
                return {
                    "message": (
                        f"Command '{cmd}' is a desktop hardware operation. In this web version, "
                        "operating system controls are separated to protect your environment. "
                        "This command will be routed to your local JARVIS companion agent once paired."
                    ),
                    "action": ActionType.DESKTOP_COMMAND,
                    "data": {"command": cmd, "status": "desktop_agent_required"}
                }

        # No direct routing match -> forward to Jarvis LLM reasoning brain
        return None
