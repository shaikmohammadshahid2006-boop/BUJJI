@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" py main.py desktop %*
) else (
    start "" python main.py desktop %*
)
