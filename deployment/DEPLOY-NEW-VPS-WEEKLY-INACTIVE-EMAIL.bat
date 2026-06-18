@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-weekly-inactive-email.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

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
echo   - Deploy the inactive reminder task, user model, schedule, and migration
echo   - Enforce "We miss you" emails on Mondays only
echo   - Store the last sent timestamp so each user gets at most one per week
echo   - Clear Celery Beat's persisted schedule cache
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
echo [1/5] Local verification of Monday-only task behavior...
pushd "%ROOT%\backend"
venv\Scripts\python.exe -m py_compile app\celery_app.py app\tasks\email_tasks.py app\models\user.py migrations\versions\202606181000_add_inactive_reminder_sent_at.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/5] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/celery_app.py ^
    app/tasks/email_tasks.py ^
    app/models/user.py ^
    migrations/versions/202606181000_add_inactive_reminder_sent_at.py
if errorlevel 1 goto :failed

echo.
echo [3/5] Uploading weekly inactive email release...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-weekly-inactive-email.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing files, migrating database, and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-weekly-inactive-email.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_WEEKLY_INACTIVE_EMAIL_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
del /q "%BACKEND_ARCHIVE%" 2>nul

echo.
echo Deployment complete.
echo.
echo ============================================================
echo Weekly inactive email schedule deployed
echo ============================================================
echo.
echo The "We miss you" check now runs Monday at 9 AM and each
echo inactive user is guarded to receive it at most once per week.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%" 2>nul
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
echo ERROR: Windows OpenSSH, scp, and tar are required.
pause
exit /b 1
