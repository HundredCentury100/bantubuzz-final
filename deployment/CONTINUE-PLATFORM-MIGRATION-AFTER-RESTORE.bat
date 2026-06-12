@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CONTINUE_SCRIPT=%ROOT%\deployment\vps\continue-platform-after-restore.sh"
set "BRIDGE_MIGRATION=%ROOT%\backend\migrations\versions\05a90a92435c_production_schema_bridge.py"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

for %%F in ("%CONTINUE_SCRIPT%" "%BRIDGE_MIGRATION%") do (
    if not exist "%%~F" (
        echo ERROR: Required file not found:
        echo %%~F
        pause
        exit /b 1
    )
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\platform-migration-continue-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Continue BantuBuzz Migration After Database Restore
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo The production database, uploads, source, environment, and dependencies
echo are already restored. This continuation will only:
echo   - Repair the missing production Alembic revision
echo   - Apply pending migrations
echo   - Validate SQLAlchemy mappings
echo   - Install and start platform services
echo   - Verify the staging platform and CMS
echo.
echo It will not contact the old VPS, restore the database again,
echo reinstall dependencies, change DNS, or modify the CMS database.
echo.
echo Report: %REPORT%
echo.
pause

echo.
echo [1/3] Uploading Alembic bridge and continuation files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp ^
    "%BRIDGE_MIGRATION%" ^
    "%CONTINUE_SCRIPT%" ^
    "%ROOT%\deployment\vps\bantubuzz-backend.service" ^
    "%ROOT%\deployment\vps\bantubuzz-messaging.service" ^
    "%ROOT%\deployment\vps\bantubuzz-celery-worker.service" ^
    "%ROOT%\deployment\vps\bantubuzz-celery-beat.service" ^
    "%ROOT%\deployment\vps\bantubuzz-platform-staging.conf" ^
    %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [2/3] Installing the bridge and completing migration...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%NEW_SERVER% "set -e; install -m 0644 /tmp/05a90a92435c_production_schema_bridge.py /var/www/bantubuzz/backend/migrations/versions/05a90a92435c_production_schema_bridge.py; chown bantubuzz:www-data /var/www/bantubuzz/backend/migrations/versions/05a90a92435c_production_schema_bridge.py; bash /tmp/continue-platform-after-restore.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_PLATFORM_CONTINUE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [3/3] Removing continuation files from /tmp...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh %SSH_USER%@%NEW_SERVER% "rm -f /tmp/05a90a92435c_production_schema_bridge.py /tmp/continue-platform-after-restore.sh /tmp/bantubuzz-backend.service /tmp/bantubuzz-messaging.service /tmp/bantubuzz-celery-worker.service /tmp/bantubuzz-celery-beat.service /tmp/bantubuzz-platform-staging.conf"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Platform migration completed successfully
echo ============================================================
echo.
echo Staging URL: http://%NEW_SERVER%
echo DNS remains unchanged and the old production VPS remains live.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Migration continuation stopped because a step failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
echo The restored database and uploaded archives remain available.
echo The old VPS and CMS database were not changed.
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client is required.
pause
exit /b 1
