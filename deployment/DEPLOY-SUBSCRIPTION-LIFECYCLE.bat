@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\subscription-lifecycle"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_subscription_lifecycle.tar.gz"

cls
echo ========================================
echo   BantuBuzz Subscription Lifecycle Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the subscription lifecycle release:
echo   - monthly/yearly subscription lifecycle fields
echo   - yearly fallback to 10 months pricing
echo   - prorated paid upgrades
echo   - scheduled downgrades at period end
echo   - wallet auto-renewal and retry/downgrade tasks
echo   - 7-day renewal reminder emails
echo   - payment completion consistency across Wallet, SmilePay, Paynow, and bank transfer
echo   - frontend subscription payment/manage updates
echo.
echo This deployment runs flask db upgrade.
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_subscription_lifecycle.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_subscription_lifecycle_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_subscription_lifecycle_backup_$TS.tar.gz backend/app/celery_app.py backend/app/models/subscription.py backend/app/models/subscription_plan.py backend/app/routes/admin/payments.py backend/app/routes/subscriptions.py backend/app/services/email_service.py backend/app/services/payment_service.py backend/app/services/smilepay_service.py backend/app/services/subscription_lifecycle_service.py backend/app/tasks/subscription_tasks.py backend/migrations/versions/202606051200_add_subscription_lifecycle_fields.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes/admin backend/app/services backend/app/tasks backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\celery_app.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/celery_app.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\subscription.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/subscription.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\subscription_plan.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/subscription_plan.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\admin\payments.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/admin/payments.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\subscriptions.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/subscriptions.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\email_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/email_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\payment_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/payment_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\smilepay_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/smilepay_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\subscription_lifecycle_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/subscription_lifecycle_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\subscription_tasks.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/subscription_tasks.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606051200_add_subscription_lifecycle_fields.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606051200_add_subscription_lifecycle_fields.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, migrating, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_subscription_lifecycle.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_subscription_lifecycle.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/celery_app.py app/models/subscription.py app/models/subscription_plan.py app/routes/admin/payments.py app/routes/subscriptions.py app/services/email_service.py app/services/payment_service.py app/services/smilepay_service.py app/services/subscription_lifecycle_service.py app/tasks/subscription_tasks.py migrations/versions/202606051200_add_subscription_lifecycle_fields.py; flask db upgrade; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\"; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; (systemctl restart celery-worker 2>/dev/null || true); (systemctl restart celery-beat 2>/dev/null || true); (systemctl restart celery 2>/dev/null || true); (systemctl restart celerybeat 2>/dev/null || true); (pm2 restart celery 2>/dev/null || true); (pm2 restart celery-beat 2>/dev/null || true); systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Subscription lifecycle deployed
echo ========================================
echo.
echo Manual checks:
echo   - Brand and creator tier plans show monthly/yearly pricing
echo   - Yearly price is 10 months total
echo   - Wallet subscription payment activates plan
echo   - SmilePay subscription payment activates plan after paid status/webhook
echo   - Bank-transfer proof appears for admin and activates after verification
echo   - Upgrade payment shows prorated amount_due where applicable
echo   - Downgrade schedules for current period end
echo   - Past-due subscription shows Pay Now
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
