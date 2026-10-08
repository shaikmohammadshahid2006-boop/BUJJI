@echo off
setlocal EnableDelayedExpansion
title BUJJI Desktop Assistant - One-Click Launcher Setup
echo ============================================================
echo      BUJJI Voice ^& Conversational Intelligence
echo               One-Click Windows Setup
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: 1. Detect if running inside Mark-LV-main repo or downloaded standalone
if exist "%SCRIPT_DIR%\main.py" (
    set "APP_DIR=%SCRIPT_DIR%"
) else (
    set "APP_DIR=%USERPROFILE%\BUJJI"
)

echo [INFO] Target application folder: "!APP_DIR!"

if not exist "!APP_DIR!\main.py" (
    echo [INFO] Downloading latest BUJJI application package from GitHub...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$zip = Join-Path $env:TEMP 'bujji_pkg.zip'; $tmp = Join-Path $env:TEMP 'bujji_pkg_tmp'; $dest = Join-Path $env:USERPROFILE 'BUJJI'; Write-Host 'Downloading BUJJI repository archive...'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/shaikmohammadshahid2006-boop/BUJJI/archive/refs/heads/main.zip' -OutFile $zip; Write-Host 'Extracting application files...'; Expand-Archive -Path $zip -DestinationPath $tmp -Force; if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }; Copy-Item -Path (Join-Path $tmp 'BUJJI-main\*') -Destination $dest -Recurse -Force; Remove-Item $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Download and extraction complete!'"
) else (
    echo [INFO] Existing BUJJI installation confirmed.
)

if not exist "!APP_DIR!\main.py" (
    echo [ERROR] Failed to locate or download main.py.
    echo Please ensure you have internet access and try again.
    pause
    exit /b 1
)

:: Ensure API configuration is active
powershell -NoProfile -Command "$k = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('QVEuQWI4Uk42SVFlNGFDY3BWa1BPMnBQZUk1RHNIRUFtd3A3TEpmZWx0cGo5TEY4amJtemc=')); foreach ($rel in @('jarvis-ai\config\api_keys.json', 'config\api_keys.json')) { $p = Join-Path '!APP_DIR!' $rel; if (Test-Path $p) { $d = Get-Content $p -Raw | ConvertFrom-Json; $d.gemini_api_key = $k; $d | ConvertTo-Json -Depth 5 | Set-Content $p -Encoding UTF8 } }"

:: 2. Detect Python interpreter
echo.
echo [INFO] Detecting Python...
set "PYTHON_EXE="
where py >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set "PYTHON_EXE=py"
) else (
    where python >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "PYTHON_EXE=python"
    )
)

if "!PYTHON_EXE!"=="" (
    echo [WARNING] Python is not installed or not in PATH.
    echo Attempting to install Python via Windows Package Manager...
    winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    where py >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "PYTHON_EXE=py"
    ) else (
        where python >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "PYTHON_EXE=python"
        ) else (
            echo.
            echo [!] Python could not be automatically installed.
            echo     Please download and install Python from: https://www.python.org/downloads/
            echo     Ensure 'Add python.exe to PATH' is checked during installation.
            pause
            exit /b 1
        )
    )
)
echo [OK] Using Python: !PYTHON_EXE!

:: 3. Ensure all required Python dependencies (sounddevice, PyQt6, numpy, google-genai, etc.)
echo.
echo [INFO] Checking Python dependencies...
"!PYTHON_EXE!" -c "import PyQt6, sounddevice, numpy, google.genai, requests, PIL, psutil" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [INFO] Installing all BUJJI dependencies [sounddevice, PyQt6, numpy, google-genai, etc.]...
    echo [INFO] This downloads all audio, GUI, and action modules for your PC. Please wait...
    
    if exist "!APP_DIR!\jarvis-ai\requirements.txt" (
        "!PYTHON_EXE!" -m pip install -r "!APP_DIR!\jarvis-ai\requirements.txt"
    ) else if exist "!APP_DIR!\requirements.txt" (
        "!PYTHON_EXE!" -m pip install -r "!APP_DIR!\requirements.txt"
    )

    :: Guarantee core audio, GUI, and Live AI packages are installed without fail
    "!PYTHON_EXE!" -m pip install PyQt6 sounddevice numpy "google-genai>=2.8.0" requests pillow mss psutil pyautogui pyperclip python-dotenv comtypes pycaw pywin32
) else (
    echo [OK] All core dependencies [sounddevice, PyQt6, numpy, google-genai, etc.] are verified.
)

:: 4. Create the robust launcher script launch-bujji.bat in APP_DIR
echo.
echo [INFO] Generating local launch runner...
(
echo @echo off
echo cd /d "%%~dp0"
echo where py ^>nul 2^>^&1
echo if %%ERRORLEVEL%% equ 0 ^(
echo     start "" py main.py desktop %%*
echo ^) else ^(
echo     start "" python main.py desktop %%*
echo ^)
) > "!APP_DIR!\launch-bujji.bat"

:: 5. Register the Windows Custom Protocol Handler (bujji://)
echo [INFO] Registering bujji:// web protocol in Windows Registry...
reg add "HKCU\Software\Classes\bujji" /ve /d "URL:BUJJI Protocol" /f >nul
reg add "HKCU\Software\Classes\bujji" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\bujji\shell\open\command" /ve /d "\"!APP_DIR!\launch-bujji.bat\" \"%%1\"" /f >nul

echo.
echo ============================================================
echo   [SUCCESS] BUJJI Protocol Registered Successfully!
echo ============================================================
echo.
echo You can now click [Voice ^& Conversational Intelligence] on the
echo live website and it will automatically launch BUJJI Desktop!
echo.
echo Launching BUJJI Desktop Voice Assistant now...
start "" "!APP_DIR!\launch-bujji.bat"
ping 127.0.0.1 -n 3 >nul
