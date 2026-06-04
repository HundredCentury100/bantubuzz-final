@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\collaboration-payment-cart-fixes"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_collaboration_payment_cart_fixes.tar.gz"

cls
echo ========================================
echo   BantuBuzz Collaboration Payment/Cart Fixes
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only this bugfix batch:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - backend email/notification hardening
echo   - backend collaboration progress/live URL counting fixes
echo   - backend wallet cart notification ordering fix
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_collaboration_payment_cart_fixes.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_collaboration_payment_cart_fixes_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_collaboration_payment_cart_fixes_backup_$TS.tar.gz backend/app/models/collaboration.py backend/app/routes/bookings.py backend/app/routes/collaborations.py backend/app/services/email_service.py backend/app/services/product_notifications.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\models\collaboration.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/collaboration.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\bookings.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/bookings.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/collaborations.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\email_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/email_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\product_notifications.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/product_notifications.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_collaboration_payment_cart_fixes.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_collaboration_payment_cart_fixes.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/models/collaboration.py app/routes/bookings.py app/routes/collaborations.py app/services/email_service.py app/services/product_notifications.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Collaboration/payment/cart fixes deployed
echo ========================================
echo.
echo Manual checks:
echo   - Wallet package checkout returns success, deducts once, creates collaborations, and clears cart
echo   - Bank transfer checkout returns success and clears cart after proof upload
echo   - Creators do not see or open package cart
echo   - Submit content, approve content, submit TikTok/Facebook delivery, and mark complete return success
echo   - YES-track progress is 80%% after approval and 100%% only after all live URLs/Post IDs are submitted
echo   - YES-track delivery input starts empty after content approval
echo   - Add Success Story modal does not refresh/clear while typing
echo   - Message and notification timestamps show Just now/m ago correctly
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
