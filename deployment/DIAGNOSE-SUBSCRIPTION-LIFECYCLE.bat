@echo off
setlocal EnableExtensions

set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "REMOTE_BACKEND=%REMOTE_ROOT%/backend"
set "OUT_FILE=%~dp0subscription-lifecycle-diagnostics.txt"

cls
echo ========================================
echo   BantuBuzz Subscription Diagnostics
echo ========================================
echo.
echo This script only reads production state and logs.
echo It does not deploy, migrate, restart, or edit anything.
echo.
echo Output will be saved to:
echo   %OUT_FILE%
echo.
echo You will be asked for the SSH password.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo Collecting diagnostics from %SERVER_USER%@%SERVER_HOST%...
echo This may take a few seconds.
echo.

ssh %SERVER_USER%@%SERVER_HOST% "echo '===== HOST AND TIME ====='; hostname; date; echo; echo '===== BACKEND DIRECTORY ====='; cd %REMOTE_BACKEND% 2>&1 && pwd && ls -la | head -80; echo; echo '===== MIGRATION FILES AROUND FAILURE ====='; cd %REMOTE_BACKEND% 2>&1 && ls -1 migrations/versions 2>&1 | grep -E '202606041700|202606051000|202606051200' || true; echo; echo '===== ALEMBIC CURRENT ====='; cd %REMOTE_BACKEND% 2>&1 && source venv/bin/activate 2>&1 && flask db current 2>&1; echo; echo '===== ALEMBIC HEADS ====='; cd %REMOTE_BACKEND% 2>&1 && source venv/bin/activate 2>&1 && flask db heads 2>&1; echo; echo '===== APP IMPORT TEST ====='; cd %REMOTE_BACKEND% 2>&1 && source venv/bin/activate 2>&1 && python -c \"from app import create_app; app=create_app(); print('create_app ok')\" 2>&1; echo; echo '===== PYTHON COMPILE DEPLOYED LIFECYCLE FILES ====='; cd %REMOTE_BACKEND% 2>&1 && source venv/bin/activate 2>&1 && python -m py_compile app/celery_app.py app/models/subscription.py app/models/subscription_plan.py app/routes/admin/payments.py app/routes/subscriptions.py app/services/email_service.py app/services/payment_service.py app/services/smilepay_service.py app/services/subscription_lifecycle_service.py app/tasks/subscription_tasks.py migrations/versions/202606051200_add_subscription_lifecycle_fields.py 2>&1; echo; echo '===== GUNICORN PROCESSES ====='; ps aux | grep '[g]unicorn' || true; echo; echo '===== PORT 8002 LISTENER ====='; (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep 8002 || true; echo; echo '===== LOCAL HEALTH ====='; curl -s -i --max-time 10 http://localhost:8002/api/health 2>&1; echo; echo '===== PUBLIC HEALTH ====='; curl -L -s -i --max-time 15 https://bantubuzz.com/api/health 2>&1; echo; echo '===== APACHE STATUS ====='; systemctl status apache2 --no-pager -l 2>&1 | head -80; echo; echo '===== CELERY SERVICE CANDIDATES ====='; systemctl list-units --type=service --all --no-pager 2>&1 | grep -Ei 'celery|beat|worker' || true; echo; echo '===== PM2 STATUS ====='; pm2 status 2>&1 || true; echo; echo '===== RECENT GUNICORN ERROR LOG ====='; cd %REMOTE_BACKEND% 2>&1 && tail -180 gunicorn_error.log 2>&1; echo; echo '===== RECENT APACHE ERROR LOG ====='; tail -120 /var/log/apache2/error.log 2>&1; echo; echo '===== RECENT CELERY LOGS IF SYSTEMD SERVICES EXIST ====='; journalctl -u celery -u celerybeat -u celery-worker -u celery-beat --no-pager -n 120 2>&1 || true" > "%OUT_FILE%" 2>&1

if errorlevel 1 goto fail

echo.
echo ========================================
echo   Diagnostics collected
echo ========================================
echo.
echo Paste the contents of this file back here:
echo   %OUT_FILE%
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Diagnostics failed or SSH was cancelled
echo ========================================
echo.
echo Partial output, if any, is here:
echo   %OUT_FILE%
echo.
pause
exit /b 1
