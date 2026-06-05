@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "REMOTE_BACKEND=%REMOTE_ROOT%/backend"

cls
echo ========================================
echo   Fix Subscription Lifecycle Mapper Error
echo ========================================
echo.
echo This uploads the fixed subscription_plan.py and restarts Gunicorn/Apache.
echo It also starts celery-worker and celery-beat if those services exist.
echo.
echo You will be asked for the SSH password on each ssh/scp step.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/4] Backing up current production subscription_plan.py...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_BACKEND%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); cp app/models/subscription_plan.py /root/subscription_plan_mapper_fix_backup_$TS.py; echo Backup: /root/subscription_plan_mapper_fix_backup_$TS.py"
if errorlevel 1 goto fail

echo.
echo [2/4] Uploading fixed subscription_plan.py...
scp "%ROOT%\backend\app\models\subscription_plan.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_BACKEND%/app/models/subscription_plan.py
if errorlevel 1 goto fail

echo.
echo [3/4] Verifying mapper configuration and restarting backend...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_BACKEND%; source venv/bin/activate; python -m py_compile app/models/subscription_plan.py; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\"; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; (systemctl restart celery-worker 2>/dev/null || true); (systemctl restart celery-beat 2>/dev/null || true); systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [4/4] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Local health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health; echo; echo 'Celery service status:'; (systemctl is-active celery-worker 2>/dev/null || true); (systemctl is-active celery-beat 2>/dev/null || true)"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Mapper fix deployed
echo ========================================
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Mapper fix failed
echo ========================================
echo.
echo Check the error above. Useful server log:
echo   ssh root@173.212.245.22 "tail -120 /var/www/bantubuzz/backend/gunicorn_error.log"
echo.
pause
exit /b 1
