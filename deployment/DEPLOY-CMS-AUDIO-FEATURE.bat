@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\deploy-cms-audio-feature.sh"
set "ARCHIVE=%TEMP%\bantubuzz-cms-audio-feature.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found at %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Audio deployment script not found.
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-audio-feature-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy BantuBuzz CMS Audio Feature Only
echo ============================================================
echo.
echo This deploys only the files changed for article audio.
echo.
echo It will:
echo   - Upload 10 CMS audio-related files
echo   - Install ffmpeg and espeak-ng
echo   - Configure open-source TTS fallback
echo   - Typecheck and rebuild the CMS
echo   - Restart the CMS and content worker
echo.
echo It will NOT:
echo   - Replace the whole CMS source
echo   - Run migrations or seed content
echo   - Change PostgreSQL, Apache, SSL, users, or media
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Verifying local CMS audio changes...
pushd "%CMS_ROOT%"
call npm.cmd run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Packaging only required files...
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%CMS_ROOT%" ^
    ".env.example" ^
    "apps/web/payload.config.ts" ^
    "apps/web/src/app/(payload)/admin/importMap.js" ^
    "apps/web/src/components/admin/GenerateAudioButton.tsx" ^
    "apps/web/src/lib/admin-auth.ts" ^
    "docs/implementation-status.md" ^
    "packages/core/src/content.ts" ^
    "packages/core/src/env.ts" ^
    "packages/integrations/src/tts.ts" ^
    "workers/content/src/index.ts"
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading targeted audio release...
echo PASSWORD PROMPT: NEW VPS %SERVER%
scp "%ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing audio release and restarting services...
echo PASSWORD PROMPT: NEW VPS %SERVER%
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%SERVER% "bash /tmp/deploy-cms-audio-feature.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_AUDIO_DEPLOY_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

del /q "%ARCHIVE%" 2>nul

echo.
echo ============================================================
echo CMS audio feature deployed successfully
echo ============================================================
echo.
echo Open a saved post at:
echo https://app.bantubuzz.com/admin
echo.
echo Then click Generate Audio.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
echo.
echo ============================================================
echo CMS audio feature deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
