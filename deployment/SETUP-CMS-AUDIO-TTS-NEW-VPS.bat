@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\setup-cms-audio.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Remote audio setup script not found:
    echo %REMOTE_SCRIPT%
    pause
    exit /b 1
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-audio-tts-setup-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Setup BantuBuzz CMS Audio TTS on New VPS
echo ============================================================
echo.
echo Server: %SSH_USER%@%SERVER%
echo.
echo This will:
echo   - Install ffmpeg and espeak-ng
echo   - Configure open-source TTS env values in /etc/bantubuzz/cms.env
echo   - Use Piper if a piper binary and model are already present
echo   - Fall back to espeak-ng if Piper is not ready
echo   - Start the CMS content worker so Generate Audio jobs run
echo.
echo Optional Piper model:
echo   Leave the next prompts empty to use espeak-ng for now.
echo.
set /p "PIPER_MODEL_URL=Optional Piper .onnx model URL: "
set /p "PIPER_CONFIG_URL=Optional Piper .onnx.json config URL: "

for /f "usebackq delims=" %%i in (`powershell.exe -NoProfile -Command "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:PIPER_MODEL_URL))"`) do set "PIPER_MODEL_URL_B64=%%i"
for /f "usebackq delims=" %%i in (`powershell.exe -NoProfile -Command "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:PIPER_CONFIG_URL))"`) do set "PIPER_CONFIG_URL_B64=%%i"

echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/2] Uploading audio setup script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/setup-cms-audio.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Installing and configuring CMS audio TTS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%SERVER% "PIPER_MODEL_URL=$(printf '%%s' '%PIPER_MODEL_URL_B64%' | base64 -d) PIPER_CONFIG_URL=$(printf '%%s' '%PIPER_CONFIG_URL_B64%' | base64 -d) bash /tmp/setup-cms-audio.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_AUDIO_SETUP_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo CMS audio TTS setup completed
echo ============================================================
echo.
echo Next:
echo   1. Deploy the CMS code if you have not already.
echo   2. Open https://app.bantubuzz.com/admin
echo   3. Open a saved post and click Generate Audio.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo CMS audio TTS setup failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client is required.
pause
exit /b 1
