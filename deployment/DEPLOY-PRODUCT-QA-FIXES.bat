@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\product-qa-fixes"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_product_qa_fixes.tar.gz"

cls
echo ========================================
echo   BantuBuzz Product QA Fixes Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the Product QA bug/enhancement batch:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - billing/invoice, agency signup, delivery notification/reminder, analytics, Thunzi metrics, and messaging unread fixes
echo   - server-side py_compile
echo   - Gunicorn and Apache restart
echo   - local and public health checks
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_product_qa_fixes.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_product_qa_fixes_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_product_qa_fixes_backup_$TS.tar.gz backend/app/celery_app.py backend/app/models/campaign_payment.py backend/app/routes/auth.py backend/app/routes/billing.py backend/app/routes/campaign_payments.py backend/app/routes/messages.py backend/app/routes/portfolio.py backend/app/services/analytics_service.py backend/app/services/post_metrics_service.py backend/app/services/product_notifications.py backend/app/tasks/collaboration_tasks.py backend/app/utils/subscription_helper.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/app/tasks backend/app/utils frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend files...
scp "%ROOT%\backend\app\celery_app.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/celery_app.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\campaign_payment.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/campaign_payment.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\auth.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/auth.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\billing.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/billing.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\campaign_payments.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaign_payments.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\messages.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/messages.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\portfolio.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/portfolio.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\analytics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/analytics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\post_metrics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/post_metrics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\product_notifications.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/product_notifications.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\collaboration_tasks.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/collaboration_tasks.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\utils\subscription_helper.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/utils/subscription_helper.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_product_qa_fixes.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_product_qa_fixes.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/celery_app.py app/models/campaign_payment.py app/routes/auth.py app/routes/billing.py app/routes/campaign_payments.py app/routes/messages.py app/routes/portfolio.py app/services/analytics_service.py app/services/post_metrics_service.py app/services/product_notifications.py app/tasks/collaboration_tasks.py app/utils/subscription_helper.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Product QA fixes deployment finished
echo ========================================
echo.
echo Manual checks:
echo   - Agency registration with blank or selected workspace count succeeds without raw DB error
echo   - Brand Billing loads and collaboration invoices include plan service fee
echo   - Creator Billing shows subscription invoices only
echo   - Delivery submission notifies brand as "Creator submitted delivery"
echo   - Creator sees delivery timer and 12-hour warning copy
echo   - Success Story Fetch Stats works with ThunziAI list/dict responses
echo   - Collaboration analytics syncs per URL/Post ID and appears in brand analytics
echo   - Message badge reflects actual unread count and updates after opening conversations
echo   - No "Unable to load messages" toast appears just from opening the site
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
