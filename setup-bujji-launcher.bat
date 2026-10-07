@echo off
title BUJJI Desktop Protocol Setup
echo ============================================================
echo   Setting up BUJJI One-Click Web Launcher Protocol
echo ============================================================
echo.
set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

echo Registering bujji:// protocol for: %CURRENT_DIR%
reg add "HKCU\Software\Classes\bujji" /ve /d "URL:BUJJI Protocol" /f >nul
reg add "HKCU\Software\Classes\bujji" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\bujji\shell\open\command" /ve /d "cmd.exe /c cd /d \"%CURRENT_DIR%\" && py main.py desktop" /f >nul

echo.
echo [SUCCESS] Protocol bujji:// registered successfully!
echo You can now click [Voice ^& Conversational Intelligence] on the website
echo and it will automatically open py main.py desktop!
echo.
pause
