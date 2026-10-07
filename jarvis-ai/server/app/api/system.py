"""
jarvis-ai/server/app/api/system.py
Hardware telemetry, Model Ladder status, and Desktop JARVIS launcher endpoints.
"""
import os
import sys
import subprocess
import logging
from pathlib import Path
from fastapi import APIRouter
try:
    import psutil
except ImportError:
    psutil = None

from app.services.system_service import SystemService
from app.services.briefing_service import BriefingService
from app.core.gemini_ladder import ModelLadder

logger = logging.getLogger("jarvis.system")
router = APIRouter(prefix="/system", tags=["System & Telemetry"])

REPO_ROOT = Path(__file__).resolve().parents[4]
MAIN_PY = REPO_ROOT / "main.py"


def _is_desktop_running() -> bool:
    """Checks if main.py desktop application is currently running (excluding server process)."""
    if not psutil:
        return False
    current_pid = os.getpid()
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info.get('pid') == current_pid:
                    continue
                name = (proc.info.get('name') or '').lower()
                if 'python' in name:
                    cmdline = proc.info.get('cmdline') or []
                    cmd_str = " ".join(cmdline).lower()
                    is_desktop = (
                        "jarvis-ai\\main.py" in cmd_str
                        or "jarvis-ai/main.py" in cmd_str
                        or "desktop" in cmd_str
                    )
                    is_web_or_server = any(w in cmd_str for w in [" web", " server", " client", "uvicorn"])
                    if is_desktop and not is_web_or_server:
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass
    return False


@router.get("/metrics")
async def get_system_metrics():
    """Returns real-time CPU, RAM, Disk, and system uptime telemetry."""
    return {
        "success": True,
        "metrics": SystemService.get_metrics(),
        "summary": SystemService.format_status_report()
    }


@router.get("/ladder")
async def get_model_ladder_status():
    """Returns real-time status of all Gemini model rungs and cooldown timers."""
    return {
        "success": True,
        "ladder": ModelLadder.get_ladder_status()
    }


@router.get("/briefing")
async def get_morning_briefing():
    """Generates the Mark LV Morning Briefing on demand."""
    return {
        "success": True,
        "briefing": BriefingService.generate_briefing()
    }


@router.get("/desktop-status")
async def get_desktop_status():
    """Returns whether main.py desktop assistant is running."""
    running = _is_desktop_running()
    return {
        "running": running,
        "status": "online" if running else "offline"
    }


@router.post("/launch-desktop")
async def launch_desktop_main():
    """
    Launches py main.py as a separate desktop process with its own console/GUI window.
    """
    if _is_desktop_running():
        return {
            "success": True,
            "running": True,
            "message": "JARVIS Desktop HUD (main.py) is already running, sir."
        }

    if not MAIN_PY.exists():
        return {
            "success": False,
            "running": False,
            "message": f"main.py script not found at {MAIN_PY}"
        }

    try:
        if sys.platform == "win32":
            subprocess.Popen(["cmd.exe", "/c", "start", "py", "main.py", "desktop"], cwd=str(REPO_ROOT), shell=True)
        else:
            subprocess.Popen([sys.executable, str(MAIN_PY), "desktop"], cwd=str(REPO_ROOT))
        logger.info(f"Launched desktop application: {MAIN_PY}")
        return {
            "success": True,
            "running": True,
            "message": "JARVIS Desktop HUD (main.py) initialized successfully, sir."
        }
    except Exception as e:
        logger.error(f"Failed to launch main.py: {e}", exc_info=True)
        return {
            "success": False,
            "running": False,
            "message": f"Failed to launch desktop application: {e}"
        }
