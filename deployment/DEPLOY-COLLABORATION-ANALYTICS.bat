@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"

cls
echo ========================================
echo   BantuBuzz Collaboration Analytics Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the backend collaboration post URL analytics release:
echo   - backend/app/routes/collaborations.py
echo   - backend/app/services/analytics_service.py
echo   - backend/app/services/post_metrics_service.py
echo   - server-side py_compile
echo   - Gunicorn and Apache restart
echo   - local and public health checks
echo.
echo No frontend build, database migration, or backfill will run.
echo.
echo You will be asked for the SSH password on each ssh/scp step.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/5] Backing up current production backend files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_collab_analytics_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_collab_analytics_backup_$TS.tar.gz backend/app/routes/collaborations.py backend/app/services/analytics_service.py backend/app/services/post_metrics_service.py; mkdir -p backend/app/routes backend/app/services"
if errorlevel 1 goto fail

echo.
echo [2/5] Uploading backend files one by one...
scp "%ROOT%\backend\app\routes\collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/collaborations.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\analytics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/analytics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\post_metrics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/post_metrics_service.py
if errorlevel 1 goto fail

echo.
echo [3/5] Compiling changed backend files on production...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; python -m py_compile app/routes/collaborations.py app/services/analytics_service.py app/services/post_metrics_service.py"
if errorlevel 1 goto fail

echo.
echo [4/5] Restarting backend and Apache...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [5/5] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Collaboration analytics deploy finished
echo ========================================
echo.
echo Manual checks:
echo   - Creator can paste a social post URL inside a collaboration
echo   - URL submit response includes parsed platform/post_id
echo   - Brand collaboration analytics page loads overall metrics
echo   - Individual collaboration analytics shows deliverable metrics after Thunzi sync
echo.
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
