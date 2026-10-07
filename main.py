"""
JARVIS AI Assistant - Unified Launcher
Connects and launches both the Full-Stack Web Application (FastAPI + Vite)
and the Desktop Voice Assistant (PyQt6 HUD).
"""

import os
import sys
import argparse
import subprocess
import threading
import time
import webbrowser
import runpy
import importlib
import json
from pathlib import Path

# Reconfigure stdout/stderr for legacy Windows consoles
for _stream in ("stdout", "stderr"):
    try:
        _s = getattr(sys, _stream, None)
        if _s is not None and hasattr(_s, "reconfigure"):
            _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Paths
ROOT_DIR = Path(__file__).resolve().parent
JARVIS_DIR = ROOT_DIR / "jarvis-ai"
SERVER_DIR = JARVIS_DIR / "server"
CLIENT_DIR = JARVIS_DIR / "client"


def reset_starting_memory():
    """Initializes memory/long_term.json to a clean, fresh starting state on launch."""
    try:
        fresh_memory = {
            "identity": {
                "shutdown_trigger_word": {
                    "value": "shutdown",
                    "updated": time.strftime("%Y-%m-%d")
                }
            },
            "preferences": {},
            "projects": {},
            "relationships": {},
            "wishes": {},
            "notes": {},
            "sessions": []
        }
        for mem_dir in [JARVIS_DIR / "memory", ROOT_DIR / "memory"]:
            if mem_dir.exists():
                mem_file = mem_dir / "long_term.json"
                mem_file.write_text(json.dumps(fresh_memory, indent=2), encoding="utf-8")
        print("[BUJJI] Initialized fresh neat starting memory.")
    except Exception as e:
        print(f"[BUJJI] Note on memory init: {e}")


def print_banner():
    banner = r"""
========================================================================
            * J.A.R.V.I.S — FULL-STACK & DESKTOP AI SUITE *
========================================================================
  Desktop HUD:     PyQt6 Voice & Vision HUD (MARK LV)
  Backend API:     http://localhost:8000
  Health Check:    http://localhost:8000/api/health
  API Docs:        http://localhost:8000/docs
  Frontend Client: http://localhost:5173
========================================================================
"""
    print(banner)


def run_desktop():
    """Starts the Desktop PyQt6 Assistant."""
    print("\n[JARVIS] Launching Desktop Voice Assistant (Mark LV PyQt6 HUD)...")
    if not (JARVIS_DIR / "main.py").exists():
        print(f"[ERR] Cannot find {JARVIS_DIR / 'main.py'}")
        return

    os.chdir(JARVIS_DIR)
    if str(JARVIS_DIR) not in sys.path:
        sys.path.insert(0, str(JARVIS_DIR))

    try:
        runpy.run_path(str(JARVIS_DIR / "main.py"), run_name="__main__")
    except KeyboardInterrupt:
        print("\n[JARVIS] Desktop assistant stopped.")
    except Exception as e:
        print(f"[ERR] Error launching desktop assistant: {e}")
        import traceback
        traceback.print_exc()


def run_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    """Starts the FastAPI backend service."""
    if str(SERVER_DIR) not in sys.path:
        sys.path.insert(0, str(SERVER_DIR))

    print(f"\n[JARVIS] Starting FastAPI Backend on http://{host}:{port} ...")
    print(f"[JARVIS] Serving endpoints for Web Client at http://localhost:{port}/api\n")
    try:
        import uvicorn
        uvicorn.run("app.main:app", host=host, port=port, reload=reload, app_dir=str(SERVER_DIR))
    except ImportError:
        print("[ERR] 'uvicorn' is not installed. Run: pip install uvicorn fastapi")
        sys.exit(1)
    except Exception as e:
        print(f"[ERR] Failed to start backend server: {e}")
        sys.exit(1)


def run_client():
    """Starts the Vite frontend dev server and opens the browser."""
    print(f"\n[JARVIS] Starting Vite Web Client in {CLIENT_DIR} ...")

    def _open_tab():
        time.sleep(1.8)
        webbrowser.open("http://localhost:5173")

    threading.Thread(target=_open_tab, daemon=True).start()

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    try:
        subprocess.run([npm_cmd, "run", "dev"], cwd=str(CLIENT_DIR), check=True)
    except FileNotFoundError:
        print("[ERR] 'npm' was not found in PATH. Please install Node.js.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[JARVIS] Web client stopped.")


def run_web_suite(host: str = "0.0.0.0", port: int = 8000):
    """Starts both the FastAPI Backend and the Vite Frontend Client, then opens the browser."""
    print_banner()
    print("[JARVIS] Launching Full Web Suite (Backend + Frontend)...")

    # Start backend server in a separate thread
    def start_backend():
        if str(SERVER_DIR) not in sys.path:
            sys.path.insert(0, str(SERVER_DIR))
        import uvicorn
        uvicorn.run("app.main:app", host=host, port=port, reload=False, app_dir=str(SERVER_DIR))

    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()

    time.sleep(1.5)
    print(f"[JARVIS] Backend is running at http://localhost:{port}")
    print(f"[JARVIS] Starting Frontend Vite dev server...\n")

    # Automatically open the browser
    def _open_tab():
        time.sleep(2.0)
        print("[JARVIS] Opening browser to http://localhost:5173 ...")
        webbrowser.open("http://localhost:5173")

    threading.Thread(target=_open_tab, daemon=True).start()

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    try:
        subprocess.run([npm_cmd, "run", "dev"], cwd=str(CLIENT_DIR))
    except KeyboardInterrupt:
        print("\n[JARVIS] Shutting down Web Suite...")
    except FileNotFoundError:
        print("\n[WARN] 'npm' command not found. Backend server is still running at http://localhost:8000.")
        print("Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[JARVIS] Backend stopped.")


def run_diagnostics():
    """Runs health checks on backend, Gemini API key, and environment."""
    print_banner()
    print("[DIAGNOSTICS] Checking system health & connectivity...\n")

    # 1. Check Python version
    print(f"1. Python Version: {sys.version.split()[0]} -> OK")

    # 2. Check Dependencies
    for mod in ["fastapi", "uvicorn", "pydantic", "requests", "google.genai", "PyQt6"]:
        try:
            __import__(mod)
            print(f"2. Dependency '{mod}': Installed -> OK")
        except ImportError:
            print(f"2. Dependency '{mod}': MISSING")

    # 3. Check Gemini API Key
    if str(SERVER_DIR) not in sys.path:
        sys.path.insert(0, str(SERVER_DIR))
    try:
        app_config = importlib.import_module("app.config")
        settings = getattr(app_config, "settings", None)
        key = getattr(settings, "gemini_api_key", "") if settings else ""
        if key:
            masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
            print(f"3. Gemini API Key configured in server/.env: {masked} -> OK")
        else:
            print("3. Gemini API Key: NOT FOUND in server/.env")
    except Exception as e:
        print(f"3. Could not check server config: {e}")

    # 4. Check Backend health endpoint directly
    try:
        from fastapi.testclient import TestClient
        app_module = importlib.import_module("app.main")
        backend_app = getattr(app_module, "app")
        client = TestClient(backend_app)
        res = client.get("/api/health")
        if res.status_code == 200:
            print(f"4. Backend Health Check (/api/health): 200 OK -> {res.json()}")
        else:
            print(f"4. Backend Health Check returned status {res.status_code}")
    except Exception as e:
        print(f"4. Backend test error: {e}")

    print("\n[DIAGNOSTICS] Check complete.")


def show_menu():
    print_banner()
    print("Choose launch option:")
    print("  [1] Desktop Voice Assistant (Mark LV PyQt6 HUD GUI) [Default]")
    print("  [2] Web Suite (Backend Server :8000 + Frontend Browser App :5173)")
    print("  [3] FastAPI Backend Server Only (Port 8000)")
    print("  [4] Frontend Web Client Only (Port 5173)")
    print("  [5] Run System Diagnostics & Connectivity Check")
    print("  [Q] Quit")
    print("=" * 72)

    choice = input("\nEnter choice [1-5] (default: 1 - Desktop HUD): ").strip()
    if choice in ("", "1"):
        run_desktop()
    elif choice == "2":
        run_web_suite()
    elif choice == "3":
        run_server()
    elif choice == "4":
        run_client()
    elif choice == "5":
        run_diagnostics()
    elif choice.lower() in ("q", "quit", "exit"):
        print("Goodbye, sir.")
    else:
        print(f"Unknown option '{choice}'. Launching Desktop HUD.")
        run_desktop()


def main():
    reset_starting_memory()
    parser = argparse.ArgumentParser(
        description="JARVIS AI Assistant - Unified Launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "action",
        nargs="?",
        choices=["desktop", "web", "server", "client", "test", "check", "dev", "menu"],
        help="Action to perform: 'desktop' for HUD GUI, 'web' for full-stack browser app",
    )
    parser.add_argument("--desktop", action="store_true", help="Start Desktop Voice Assistant (PyQt6 HUD)")
    parser.add_argument("--web", "--dev", action="store_true", help="Start Full Web Suite (Backend + Frontend)")
    parser.add_argument("--server", action="store_true", help="Start FastAPI Backend Server only")
    parser.add_argument("--client", action="store_true", help="Start Frontend Web Client only")
    parser.add_argument("--test", "--check", action="store_true", help="Run diagnostics check")
    parser.add_argument("--menu", action="store_true", help="Show interactive menu")
    parser.add_argument("--port", type=int, default=8000, help="Port for FastAPI backend (default: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host for FastAPI backend (default: 0.0.0.0)")

    args = parser.parse_args()

    if args.desktop or args.action == "desktop":
        run_desktop()
    elif args.web or args.action in ("web", "dev"):
        run_web_suite(host=args.host, port=args.port)
    elif args.server or args.action == "server":
        run_server(host=args.host, port=args.port)
    elif args.client or args.action == "client":
        run_client()
    elif args.test or args.action in ("test", "check"):
        run_diagnostics()
    elif args.menu or args.action == "menu":
        show_menu()
    else:
        # Default with no arguments: show menu or launch desktop HUD directly
        if sys.stdin.isatty():
            try:
                show_menu()
            except KeyboardInterrupt:
                print("\nOperation cancelled.")
        else:
            run_desktop()


if __name__ == "__main__":
    main()
