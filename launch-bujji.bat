@echo off
title BUJJI Desktop Voice Assistant
cd /d "%~dp0"

echo ============================================================
echo         BUJJI Voice & Conversational Intelligence
echo ============================================================
echo [INFO] Working folder: %CD%
echo [OK] Using Python: "C:\Users\shaik\AppData\Local\Programs\Python\Python313\python.exe"

"C:\Users\shaik\AppData\Local\Programs\Python\Python313\python.exe" main.py desktop

if %ERRORLEVEL% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] BUJJI Desktop exited with code %ERRORLEVEL%.
    echo ============================================================
    pause
)
