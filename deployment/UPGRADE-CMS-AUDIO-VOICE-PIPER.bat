@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\upgrade-cms-audio-voice-piper.sh"
set "ARCHIVE=%TEMP%\bantubuzz-cms-piper-voice.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS repo not found:
    echo %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Remote Piper voice setup script not found:
    echo %REMOTE_SCRIPT%
    pause
    exit /b 1
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-audio-piper-voice-%SERVER%-%TIMESTAMP%.txt"

set "VOICE_NAME=en_US-lessac-medium"
set "PIPER_MODEL_URL=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
set "PIPER_CONFIG_URL=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
set "REGENERATE_SLUG=how-to-turn-your-influence-into-income"

echo ============================================================
echo Upgrade BantuBuzz CMS Article Audio Voice
echo ============================================================
echo.
echo Server: %SSH_USER%@%SERVER%
echo Voice:  %VOICE_NAME% ^(female Piper neural voice^)
echo.
echo This will:
echo   - Upload only the CMS audio regeneration CLI change
echo   - Install Piper TTS and the female voice model
echo   - Configure /etc/bantubuzz/cms.env to use TTS_PROVIDER=piper
echo   - Smoke-test MP3 generation
echo   - Restart the CMS worker
echo   - Regenerate audio for:
echo     %REGENERATE_SLUG%
echo.
echo It will not run migrations, seed content, touch PostgreSQL data,
echo change Apache, or replace CMS media.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Verifying local CMS audio voice changes...
pushd "%CMS_ROOT%" >nul
call npm --workspace workers/content run typecheck
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [2/4] Creating targeted CMS audio voice archive...
if exist "%ARCHIVE%" del "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%CMS_ROOT%" ^
    "workers/content/package.json" ^
    "workers/content/src/regenerate-audio.ts"
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading voice upgrade files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
scp "%ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing Piper voice and regenerating article audio...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=60 ^
    %SSH_USER%@%SERVER% "VOICE_NAME='%VOICE_NAME%' PIPER_MODEL_URL='%PIPER_MODEL_URL%' PIPER_CONFIG_URL='%PIPER_CONFIG_URL%' REGENERATE_SLUG='%REGENERATE_SLUG%' bash /tmp/upgrade-cms-audio-voice-piper.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_AUDIO_PIPER_VOICE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo CMS Piper voice upgrade completed
echo ============================================================
echo.
echo Open:
echo https://bantubuzz.com/blog/%REGENERATE_SLUG%
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo CMS Piper voice upgrade failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH and tar are required.
pause
exit /b 1
