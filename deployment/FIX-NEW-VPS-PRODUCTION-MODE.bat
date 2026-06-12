@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "APP_INIT=%ROOT%\backend\app\__init__.py"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%APP_INIT%" (
    echo ERROR: Backend application factory not found:
    echo %APP_INIT%
    pause
    exit /b 1
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-production-mode-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Fix BantuBuzz Production Mode on New VPS
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This uploads the corrected Flask application factory, verifies that
echo FLASK_ENV=production selects ProductionConfig, then restarts backend
echo and Celery services. The database, uploads, frontend, CMS, and DNS
echo are not changed.
echo.
pause

echo.
echo [1/3] Uploading corrected application factory...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%APP_INIT%" %SSH_USER%@%NEW_SERVER%:/tmp/bantubuzz-app-init.py
if errorlevel 1 goto :failed

echo.
echo [2/3] Installing, validating, and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "set -e; install -o bantubuzz -g www-data -m 0644 /tmp/bantubuzz-app-init.py /var/www/bantubuzz/backend/app/__init__.py; cd /var/www/bantubuzz/backend; venv/bin/python -m py_compile app/__init__.py; FLASK_ENV=production venv/bin/python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); assert app.debug is False, 'Production config was not selected'; app.app_context().push(); configure_mappers(); print('Production config and mapper validation OK')\"; systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service; for i in $(seq 1 45); do curl -fsS http://127.0.0.1:8002/api/health >/dev/null && break; sleep 2; done; curl -fsS http://127.0.0.1:8002/api/health; echo; systemctl is-active bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service; journalctl -u bantubuzz-backend.service --since '-3 minutes' --no-pager | grep 'Environment: Production' | tail -1; rm -f /tmp/bantubuzz-app-init.py; echo BANTUBUZZ_PRODUCTION_MODE_FIX_SUCCESS" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_PRODUCTION_MODE_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [3/3] Verifying the IP staging endpoint...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh %SSH_USER%@%NEW_SERVER% "set -e; curl -fsS -H 'Host: 13.140.159.150' http://127.0.0.1/api/health; echo; systemctl is-active bantubuzz-cms.service bantubuzz-messaging.service"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo New VPS is running the backend in Production mode
echo ============================================================
echo.
echo Staging URL: http://%NEW_SERVER%
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Production-mode fix failed
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
