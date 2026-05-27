@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\current-bugfixes"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_dist.tar.gz"

cls
echo ========================================
echo   BantuBuzz Current Bugfix Deployment
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - backend changed files using direct scp
echo   - optional collaboration backfill for verified bank transfers
echo.
echo You will be asked for the SSH password on each ssh/scp step.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/8] Preparing local package folder...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if errorlevel 1 goto fail
if exist "%FRONTEND_TAR%" del "%FRONTEND_TAR%"

echo.
echo [2/8] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto fail

echo.
echo [3/8] Creating frontend tarball from dist contents...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/8] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_dist.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_bugfix_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_bugfix_backup_$TS.tar.gz backend/app/routes/bookings.py backend/app/routes/creators.py backend/app/routes/admin/payments.py backend/scripts/backfill_verified_bank_transfer_collaborations.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/routes/admin backend/scripts frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend files one by one...
scp "%ROOT%\backend\app\routes\bookings.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/bookings.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\creators.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/creators.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\admin\payments.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/admin/payments.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\scripts\backfill_verified_bank_transfer_collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/scripts/backfill_verified_bank_transfer_collaborations.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_dist.tar.gz -C frontend; cd backend; source venv/bin/activate; python -m py_compile app/routes/bookings.py app/routes/creators.py app/routes/admin/payments.py scripts/backfill_verified_bank_transfer_collaborations.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; ps aux | grep '[g]unicorn'; curl -s -i http://localhost:8002/api/health"
if errorlevel 1 goto fail

echo.
set "RUN_BACKFILL=N"
set /p RUN_BACKFILL="Run bank-transfer collaboration backfill now? Type Y then Enter, or just Enter to skip: "
if /I "%RUN_BACKFILL%"=="Y" (
    echo.
    echo [8/8] Running backfill on production...
    ssh %SERVER_USER%@%SERVER_HOST% "cd %REMOTE_ROOT%/backend && source venv/bin/activate && python scripts/backfill_verified_bank_transfer_collaborations.py"
    if errorlevel 1 goto fail
) else (
    echo.
    echo [8/8] Backfill skipped.
)

echo.
echo ========================================
echo   Deployment script finished
echo ========================================
echo.
echo Local packages are in:
echo   %BUILD_DIR%
echo.
echo If the site does not update, check Apache and Gunicorn logs on the server.
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Deployment stopped because a step failed
echo ========================================
echo.
echo Read the error above. No later steps were run after the failure.
pause
exit /b 1
