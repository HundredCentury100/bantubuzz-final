@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "OLD_SERVER=173.212.245.22"
set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "OLD_CAPTURE_SCRIPT=%ROOT%\deployment\vps\capture-old-platform.sh"
set "NEW_RESTORE_SCRIPT=%ROOT%\deployment\vps\restore-platform-on-new-vps.sh"
set "WORK_DIR=%TEMP%\bantubuzz-platform-migration"
set "DATA_ARCHIVE=%WORK_DIR%\bantubuzz-platform-production-data.tar.gz"
set "BACKEND_ARCHIVE=%WORK_DIR%\bantubuzz-platform-backend.tar.gz"
set "FRONTEND_ARCHIVE=%WORK_DIR%\bantubuzz-platform-frontend.tar.gz"
set "MESSAGING_ARCHIVE=%WORK_DIR%\bantubuzz-platform-messaging.tar.gz"

for %%F in ("%OLD_CAPTURE_SCRIPT%" "%NEW_RESTORE_SCRIPT%") do (
    if not exist "%%~F" (
        echo ERROR: Required migration script not found:
        echo %%~F
        pause
        exit /b 1
    )
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
mkdir "%WORK_DIR%"

for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\platform-migration-%OLD_SERVER%-to-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Full Platform Migration
echo ============================================================
echo.
echo OLD production VPS: %SSH_USER%@%OLD_SERVER%
echo NEW combined VPS:   %SSH_USER%@%NEW_SERVER%
echo.
echo This migration will:
echo   - Copy the complete production PostgreSQL platform database
echo   - Copy all backend uploaded files
echo   - Carry over production provider configuration and auth secrets
echo   - Deploy the CURRENT local backend, frontend, and messaging code
echo   - Run any newer Alembic migrations on the restored database
echo   - Start backend, messaging, Celery worker, and Celery beat on the new VPS
echo   - Preserve the Payload CMS, its database, and app.bantubuzz.com
echo.
echo This migration will NOT:
echo   - Change DNS
echo   - Stop or modify the old production services
echo   - Replace or reset the CMS database
echo   - Expose environment secrets in the report
echo.
echo IMPORTANT:
echo This is a live snapshot. New activity on the OLD VPS after the snapshot
echo will not exist on the NEW VPS. Run a final synchronized cutover before
echo changing DNS.
echo.
echo Every password prompt is preceded by the VPS name and IP address.
echo Report: %REPORT%
echo.
pause

echo.
echo [1/11] Verifying local source...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

pushd "%ROOT%"
backend\venv\Scripts\python.exe -m py_compile backend\run.py backend\celery_worker.py
if errorlevel 1 goto :failed_popd
node --check messaging-service\server.js
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/11] Packaging current local platform source...
tar -czf "%BACKEND_ARCHIVE%" ^
    --exclude=venv ^
    --exclude=.env ^
    --exclude=.env.production ^
    --exclude=uploads ^
    --exclude=__pycache__ ^
    --exclude=*.pyc ^
    -C "%ROOT%\backend" .
if errorlevel 1 goto :failed

tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

tar -czf "%MESSAGING_ARCHIVE%" ^
    --exclude=node_modules ^
    --exclude=.env ^
    --exclude=.env.production ^
    --exclude=*.log ^
    -C "%ROOT%\messaging-service" .
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo Uploading the read-only production capture script.
echo ============================================================
scp "%OLD_CAPTURE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/capture-old-platform.sh
if errorlevel 1 goto :failed

echo.
echo [3/11] Capturing production database, uploads, and configuration...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo This creates a consistent PostgreSQL dump and uploads archive.
echo It does not stop the live platform.
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/capture-old-platform.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_OLD_PLATFORM_CAPTURE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [4/11] Downloading protected production archive...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo Downloading database, uploads, and environment archive.
echo ============================================================
scp %SSH_USER%@%OLD_SERVER%:/tmp/bantubuzz-platform-production-data.tar.gz "%DATA_ARCHIVE%"
if errorlevel 1 goto :failed

echo.
echo [5/11] Running new-VPS readiness checks...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo Verifying PostgreSQL, Redis, CMS, directories, and free disk.
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new %SSH_USER%@%NEW_SERVER% ^
    "set -e; systemctl is-active postgresql redis-server bantubuzz-cms.service; test -s /etc/bantubuzz/platform.env; test -s /etc/bantubuzz/messaging.env; test -s /etc/bantubuzz/cms.env; test -s /root/bantubuzz-provisioning-secrets.txt; test $(df -Pk /var | awk 'NR==2 {print $4}') -gt 2097152; curl -fsS http://127.0.0.1:3010/admin >/dev/null; echo BANTUBUZZ_NEW_VPS_PREFLIGHT_PASS"
if errorlevel 1 goto :failed

echo.
echo [6/11] Uploading production data to the new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo Uploading the protected production archive.
echo ============================================================
scp "%DATA_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:/tmp/bantubuzz-platform-production-data.tar.gz
if errorlevel 1 goto :failed

echo.
echo [7/11] Uploading current application source...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo Uploading backend, frontend, messaging, and service definitions.
echo ============================================================
scp ^
    "%BACKEND_ARCHIVE%" ^
    "%FRONTEND_ARCHIVE%" ^
    "%MESSAGING_ARCHIVE%" ^
    "%NEW_RESTORE_SCRIPT%" ^
    "%ROOT%\deployment\vps\bantubuzz-backend.service" ^
    "%ROOT%\deployment\vps\bantubuzz-messaging.service" ^
    "%ROOT%\deployment\vps\bantubuzz-celery-worker.service" ^
    "%ROOT%\deployment\vps\bantubuzz-celery-beat.service" ^
    "%ROOT%\deployment\vps\bantubuzz-platform-staging.conf" ^
    %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [8/11] Restoring and starting the platform on the new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo This replaces ONLY the new VPS platform database and platform files.
echo The Payload CMS and its database are preserved.
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=40 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/restore-platform-on-new-vps.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%' -Append; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_PLATFORM_RESTORE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [9/11] Verifying service status and listening ports...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo Final server-side verification.
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new %SSH_USER%@%NEW_SERVER% ^
    "set -e; systemctl --no-pager --full status bantubuzz-backend.service bantubuzz-messaging.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service bantubuzz-cms.service | sed -n '1,90p'; ss -lntp | grep -E ':(3002|3010|8002) '; curl -fsS http://127.0.0.1:8002/api/health; echo; curl -fsS http://127.0.0.1:3002/health; echo"
if errorlevel 1 goto :failed

echo.
echo [10/11] Removing temporary archives from both VPS servers...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo Removing the temporary migration archive only.
echo ============================================================
ssh %SSH_USER%@%OLD_SERVER% "rm -f /tmp/capture-old-platform.sh /tmp/bantubuzz-platform-production-data.tar.gz"
if errorlevel 1 goto :failed

echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo Removing uploaded temporary archives and scripts only.
echo ============================================================
ssh %SSH_USER%@%NEW_SERVER% "rm -f /tmp/bantubuzz-platform-production-data.tar.gz /tmp/bantubuzz-platform-backend.tar.gz /tmp/bantubuzz-platform-frontend.tar.gz /tmp/bantubuzz-platform-messaging.tar.gz /tmp/restore-platform-on-new-vps.sh /tmp/bantubuzz-backend.service /tmp/bantubuzz-messaging.service /tmp/bantubuzz-celery-worker.service /tmp/bantubuzz-celery-beat.service /tmp/bantubuzz-platform-staging.conf"
if errorlevel 1 goto :failed

echo.
echo [11/11] Removing sensitive local migration artifacts...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"

echo.
echo ============================================================
echo Platform migration completed successfully
echo ============================================================
echo.
echo The full production platform now exists on %NEW_SERVER%.
echo Staging URL: http://%NEW_SERVER%
echo The old VPS is still live and DNS has NOT been changed.
echo Do not change DNS yet: data will diverge while users continue using
echo the old VPS. The next operation must be the final cutover sync.
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
echo Platform migration stopped because a step failed
echo ============================================================
echo.
echo The old production platform was not stopped.
echo The CMS database was not intentionally modified.
echo Sensitive local migration files remain at:
echo %WORK_DIR%
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH and tar are required.
echo Install OpenSSH Client and ensure tar.exe is available.
pause
exit /b 1
