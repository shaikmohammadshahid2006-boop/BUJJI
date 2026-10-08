"""
BUJJI Launcher Generator
Generates a rock-solid launch-bujji.bat specifically tailored to this PC.
"""
import sys
import os
import json
import base64
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent

# 1. Absolute path to the current Python executable
python_exe = sys.executable

# 2. Inject Gemini API key if missing (using utf-8-sig to handle any Windows PowerShell BOMs)
API_KEY_B64 = "QVEuQWI4Uk42SVFlNGFDY3BWa1BPMnBQZUk1RHNIRUFtd3A3TEpmZWx0cGo5TEY4amJtemc="
api_key = base64.b64decode(API_KEY_B64).decode("utf-8")

for rel in ["jarvis-ai/config/api_keys.json", "config/api_keys.json"]:
    config_file = APP_DIR / rel
    if config_file.exists():
        try:
            content = config_file.read_text(encoding="utf-8-sig")
            data = json.loads(content) if content.strip() else {}
            if not data.get("gemini_api_key"):
                data["gemini_api_key"] = api_key
            if not data.get("os_system"):
                data["os_system"] = "windows"
            config_file.write_text(json.dumps(data, indent=4), encoding="utf-8")
            print(f"[OK] Injected active Gemini key into {rel}")
        except Exception as e:
            print(f"[WARN] Failed to configure {rel}: {e}")

# 3. Create launch-bujji.bat directly pointing to python_exe
bat_lines = [
    "@echo off",
    "title BUJJI Desktop Voice Assistant",
    'cd /d "%~dp0"',
    "",
    "echo ============================================================",
    "echo         BUJJI Voice & Conversational Intelligence",
    "echo ============================================================",
    "echo [INFO] Working folder: %CD%",
    f'echo [OK] Using Python: "{python_exe}"',
    "",
    f'"{python_exe}" main.py desktop',
    "",
    "if %ERRORLEVEL% neq 0 (",
    "    echo.",
    "    echo ============================================================",
    "    echo [ERROR] BUJJI Desktop exited with code %ERRORLEVEL%.",
    "    echo ============================================================",
    "    pause",
    ")",
]

bat_path = APP_DIR / "launch-bujji.bat"
bat_path.write_text("\r\n".join(bat_lines) + "\r\n", encoding="utf-8")
print(f"[SUCCESS] Created tailored runner at {bat_path}")
