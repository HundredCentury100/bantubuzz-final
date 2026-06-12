@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "RESTORE_SCRIPT=%ROOT%\deployment\vps\restore-platform-on-new-vps.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%RESTORE_SCRIPT%" (
    echo ERROR: Restore script not found:
    echo %RESTORE_SCRIPT%
    pause
    exit /b 1
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\platform-migration-resume-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Resume BantuBuzz Platform Migration
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This resumes from the restore step after the PostgreSQL dump
echo permission failure. It will:
echo   - Reuse migration and application archives already on the new VPS
echo   - Restore the production platform database
echo   - Apply current Alembic migrations
echo   - Start backend, messaging, and Celery services
echo   - Verify Flask, messaging, CMS, and staging health
echo.
echo It will NOT contact the old VPS, repeat the database capture,
echo change DNS, or replace the CMS database.
echo.
echo Report: %REPORT%
echo.
pause

echo.
echo [1/4] Verifying uploaded migration artifacts on the new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new %SSH_USER%@%NEW_SERVER% ^
    "set -e; test -s /tmp/bantubuzz-platform-production-data.tar.gz; test -s /tmp/bantubuzz-platform-backend.tar.gz; test -s /tmp/bantubuzz-platform-frontend.tar.gz; test -s /tmp/bantubuzz-platform-messaging.tar.gz; test -s /tmp/bantubuzz-backend.service; test -s /tmp/bantubuzz-messaging.service; test -s /tmp/bantubuzz-celery-worker.service; test -s /tmp/bantubuzz-celery-beat.service; test -s /tmp/bantubuzz-platform-staging.conf; systemctl is-active postgresql redis-server bantubuzz-cms.service; echo BANTUBUZZ_RESUME_ARTIFACTS_READY"
if errorlevel 1 goto :failed

echo.
echo [2/4] Uploading the corrected restore script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%RESTORE_SCRIPT%" %SSH_USER%@%NEW_SERVER%:/tmp/restore-platform-on-new-vps.sh
if errorlevel 1 goto :failed

echo.
echo [3/4] Restoring the database and starting platform services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo The new VPS platform database will be recreated from the intact dump.
echo The CMS database remains separate and untouched.
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=40 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/restore-platform-on-new-vps.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_PLATFORM_RESTORE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [4/4] Final service verification...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new %SSH_USER%@%NEW_SERVER% ^
    "set -e; systemctl is-active bantubuzz-backend.service bantubuzz-messaging.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service bantubuzz-cms.service; ss -lntp | grep -E ':(3002|3010|8002) '; curl -fsS http://127.0.0.1:8002/api/health; echo; curl -fsS http://127.0.0.1:3002/health; echo; curl -fsS -H 'Host: 13.140.159.150' http://127.0.0.1/api/health; echo"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Platform migration resumed successfully
echo ============================================================
echo.
echo Staging URL: http://%NEW_SERVER%
echo DNS has not been changed and the old VPS remains live.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Migration resume stopped because a step failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
echo The old production VPS and CMS database were not changed.
echo Uploaded migration archives remain on the new VPS for another resume.
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client is required.
pause
exit /b 1
