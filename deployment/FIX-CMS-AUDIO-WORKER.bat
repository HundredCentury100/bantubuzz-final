@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-cms-audio-worker.sh"
set "ARCHIVE=%TEMP%\bantubuzz-cms-audio-worker-fix.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found at %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: CMS audio worker repair script not found.
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-audio-worker-fix-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Fix BantuBuzz CMS Audio Worker
echo ============================================================
echo.
echo This repair will:
echo   - Upload only 7 audio worker and status files
echo   - Show queued and failed audio job diagnostics
echo   - Test TTS, MP3 conversion, S3 upload, and S3 deletion
echo   - Rebuild the CMS and restart CMS plus its content worker
echo   - Show the actual error in Payload if generation fails
echo.
echo It will NOT run migrations, install dependencies, or change
echo PostgreSQL, Apache, SSL, users, media records, or article content.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Verifying local audio worker fix...
pushd "%CMS_ROOT%"
call npm.cmd run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Packaging only required files...
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%CMS_ROOT%" ^
    "apps/web/src/app/(frontend)/api/admin/audio-jobs/[jobId]/route.ts" ^
    "apps/web/src/components/admin/GenerateAudioButton.tsx" ^
    "packages/integrations/src/s3.ts" ^
    "workers/content/package.json" ^
    "workers/content/src/audio-queue-diagnostics.ts" ^
    "workers/content/src/audio-smoke.ts" ^
    "workers/content/src/index.ts"
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading targeted repair...
echo PASSWORD PROMPT: NEW VPS %SERVER%
scp "%ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Diagnosing and repairing production audio...
echo PASSWORD PROMPT: NEW VPS %SERVER%
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%SERVER% "bash /tmp/fix-cms-audio-worker.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_AUDIO_WORKER_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

del /q "%ARCHIVE%" 2>nul

echo.
echo ============================================================
echo CMS audio worker repaired successfully
echo ============================================================
echo.
echo Return to the article, refresh the admin page, and click
echo Generate Audio again. The button will now show live progress.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
echo.
echo ============================================================
echo CMS audio worker repair failed
echo ============================================================
echo.
echo The report contains the exact queue, TTS, storage, or worker error:
echo %REPORT%
echo.
pause
exit /b 1
