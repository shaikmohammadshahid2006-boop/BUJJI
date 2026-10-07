"""
jarvis-ai/server/app/services/briefing_service.py
Morning Briefing & Proactive 2.0 engine for JARVIS.
Ported from Mark LV actions/proactive.py and main.py startup briefing.
"""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Dict, Any

from app.services.memory_service import MemoryService
from app.services.system_service import SystemService
from app.core.action_executor import execute_web_search

logger = logging.getLogger("jarvis.briefing")


class BriefingService:
    @classmethod
    def generate_briefing(cls) -> Dict[str, Any]:
        """
        Assembles a comprehensive Morning / Daily Briefing matching Mark LV:
        - Time & greeting
        - Memory context (active projects / goals)
        - News headlines via web search
        - Hardware health summary
        """
        now = datetime.now()
        hour = now.hour
        time_str = now.strftime("%A, %B %d, %Y at %I:%M %p")

        if 5 <= hour < 12:
            greeting = "Good morning, sir."
        elif 12 <= hour < 17:
            greeting = "Good afternoon, sir."
        elif 17 <= hour < 22:
            greeting = "Good evening, sir."
        else:
            greeting = "Greetings in the late hour, sir."

        # 1. Fetch memory context
        memory = MemoryService.load_memory()
        user_name = memory.get("identity", {}).get("name", {}).get("value") or "Commander"
        projects = memory.get("projects", {})
        active_projects_list = [f"{k.replace('_', ' ')}: {v.get('value')}" for k, v in projects.items() if isinstance(v, dict)]

        # 2. Get system telemetry
        metrics = SystemService.get_metrics()
        telemetry_summary = f"System integrity stands at CPU {metrics['cpu_percent']}%, RAM {metrics['ram_percent']}%, uptime {metrics['uptime']}."

        # 3. Get top headline news
        news_summary = ""
        news_results = []
        try:
            summary, results = execute_web_search("top global technology news headlines", max_results=3)
            if results:
                news_results = results[:3]
                titles = [r.get("title", "") for r in news_results]
                news_summary = "In global tech intelligence: " + "; ".join(titles) + "."
        except Exception as e:
            logger.warning(f"Error fetching briefing news: {e}")

        # Assemble speech and text
        briefing_text = [
            f"{greeting} It is {time_str}.",
            f"Diagnostics indicate all core cloud subsystems are active. {telemetry_summary}"
        ]

        if active_projects_list:
            briefing_text.append(f"Regarding your active objectives: {', '.join(active_projects_list[:2])}.")

        if news_summary:
            briefing_text.append(news_summary)

        briefing_text.append("All operational protocols stand ready for your instruction.")

        full_message = "\n\n".join(briefing_text)

        return {
            "message": full_message,
            "headline_news": news_results,
            "system_telemetry": metrics,
            "timestamp": time_str,
            "user_name": user_name
        }
