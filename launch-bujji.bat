@echo off
setlocal EnableDelayedExpansion
title BUJJI Desktop Voice Assistant

:: Ensure working directory is the script folder
cd /d "%~dp0"

echo ============================================================
echo         BUJJI Voice ^& Conversational Intelligence
echo ============================================================
echo [INFO] Working folder: %CD%

:: 1. Detect Python from PATH or standard Windows locations
set "PY_EXE="
where py >nul 2>&1 && set "PY_EXE=py"
if "!PY_EXE!"=="" where python >nul 2>&1 && set "PY_EXE=python"
if "!PY_EXE!"=="" (
    for %%V in (313 312 311 310 39) do (
        if "!PY_EXE!"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
        if "!PY_EXE!"=="" if exist "%ProgramFiles%\Python%%V\python.exe" set "PY_EXE=%ProgramFiles%\Python%%V\python.exe"
        if "!PY_EXE!"=="" if exist "%ProgramFiles(x86)%\Python%%V\python.exe" set "PY_EXE=%ProgramFiles(x86)%\Python%%V\python.exe"
        if "!PY_EXE!"=="" if exist "C:\Python%%V\python.exe" set "PY_EXE=C:\Python%%V\python.exe"
    )
)

if "!PY_EXE!"=="" (
    echo.
    echo [ERROR] Python is not installed or not in PATH!
    echo Please run setup-bujji-launcher.bat to install Python automatically,
    echo or download Python from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [OK] Using Python: !PY_EXE!

:: 2. Check and inject Gemini API key if missing
powershell -NoProfile -Command "$k = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('QVEuQWI4Uk42SVFlNGFDY3BWa1BPMnBQZUk1RHNIRUFtd3A3TEpmZWx0cGo5TEY4amJtemc=')); foreach ($rel in @('jarvis-ai\config\api_keys.json', 'config\api_keys.json')) { $p = Join-Path '%~dp0' $rel; if (Test-Path $p) { $d = Get-Content $p -Raw | ConvertFrom-Json; if (-not $d.gemini_api_key) { $d.gemini_api_key = $k; $d | ConvertTo-Json -Depth 5 | Set-Content $p -Encoding UTF8 } } }" >nul 2>&1

:: 3. Check for core dependencies; install if missing
"!PY_EXE!" -c "import PyQt6, sounddevice, numpy, google.genai" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [INFO] Required packages not found. Auto-installing dependencies...
    echo [INFO] This might take a minute on first launch. Please wait...
    "!PY_EXE!" -m pip install PyQt6 sounddevice numpy "google-genai>=2.8.0" requests pillow mss psutil pyautogui pyperclip python-dotenv comtypes pycaw pywin32
)

:: 4. Launch Desktop Assistant
echo [INFO] Launching BUJJI Desktop Assistant HUD...
echo.
"!PY_EXE!" main.py desktop

:: 5. Keep window open if it crashed so user/developer sees the exact error
if !ERRORLEVEL! neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] BUJJI Desktop exited with code !ERRORLEVEL!.
    echo ============================================================
    echo If an error occurred above, please check the output.
    pause
)
