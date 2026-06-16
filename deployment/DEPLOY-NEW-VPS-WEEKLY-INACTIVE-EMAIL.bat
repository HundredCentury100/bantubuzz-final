@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_ROOT=/var/www/bantubuzz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-weekly-inactive-email-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Weekly Inactive Email Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy backend/app/celery_app.py only
echo   - Change "We miss you" email checks to weekly Monday 9 AM
echo   - Restart Celery Beat so the new schedule is active
echo   - Restart Celery Worker and backend for consistency
echo   - Check public and local health endpoints
echo.
echo It will NOT change the database, frontend, CMS, messaging service, or DNS.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/3] Uploading Celery schedule file...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%ROOT%\backend\app\celery_app.py" %SSH_USER%@%NEW_SERVER%:/tmp/celery_app.py
if errorlevel 1 goto :failed

echo.
echo [2/3] Installing file and restarting Celery services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /var/backups/bantubuzz/weekly-inactive-email-before-'$TS; mkdir -p /var/backups/bantubuzz/weekly-inactive-email-before-$TS; cp -a backend/app/celery_app.py /var/backups/bantubuzz/weekly-inactive-email-before-$TS/celery_app.py; install -m 0644 /tmp/celery_app.py backend/app/celery_app.py; chown bantubuzz:www-data backend/app/celery_app.py; cd backend; venv/bin/python -c \"import py_compile; py_compile.compile('app/celery_app.py', cfile='/tmp/celery_app.pyc', doraise=True)\"; rm -f /tmp/celery_app.pyc; systemctl restart bantubuzz-celery-beat.service bantubuzz-celery-worker.service bantubuzz-backend.service; sleep 5; echo 'Celery beat:'; systemctl is-active bantubuzz-celery-beat.service; echo 'Celery worker:'; systemctl is-active bantubuzz-celery-worker.service; echo 'Backend:'; systemctl is-active bantubuzz-backend.service; echo 'Local health:'; curl -fsS http://127.0.0.1:8002/api/health; echo; echo 'Public health:'; curl -fsS https://bantubuzz.com/api/health; echo; rm -f /tmp/celery_app.py; echo BANTUBUZZ_NEW_VPS_WEEKLY_INACTIVE_EMAIL_SUCCESS" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_WEEKLY_INACTIVE_EMAIL_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [3/3] Deployment complete.
echo.
echo ============================================================
echo Weekly inactive email schedule deployed
echo ============================================================
echo.
echo The "We miss you" check now runs Monday at 9 AM.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Weekly inactive email deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH and scp are required.
pause
exit /b 1
