@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\campaign-cart-payments"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_campaign_cart_payments.tar.gz"

cls
echo ========================================
echo   BantuBuzz Campaign Cart Payments Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only this campaign cart/payment batch:
echo   - campaign cart wallet, Smile^&Pay, and bank-transfer payment activation
echo   - campaign cart pro forma invoice PDF download
echo   - paid campaign invoice email attachment
echo   - admin bank-transfer verification for campaign cart payments
echo   - campaign performance aggregation from submitted collaboration post metrics
echo   - campaign auto-complete when all paid collaborations complete
echo   - frontend campaign cart invoice/proof upload/payment modal updates
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_campaign_cart_payments.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_campaign_cart_payments_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_campaign_cart_payments_backup_$TS.tar.gz backend/app/models/campaign_payment.py backend/app/routes/admin/payments.py backend/app/routes/campaign_cart.py backend/app/routes/collaborations.py backend/app/services/campaign_analytics_service.py backend/app/services/email_service.py backend/app/services/smilepay_service.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p frontend backend/app/models backend/app/routes/admin backend/app/services"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\routes\admin\payments.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/admin/payments.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\campaign_payment.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/campaign_payment.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\campaign_cart.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaign_cart.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/collaborations.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\campaign_analytics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/campaign_analytics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\campaign_cart_payment_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/campaign_cart_payment_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\campaign_completion_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/campaign_completion_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\email_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/email_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\smilepay_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/smilepay_service.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_campaign_cart_payments.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_campaign_cart_payments.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/models/campaign_payment.py app/routes/admin/payments.py app/routes/campaign_cart.py app/routes/collaborations.py app/services/campaign_analytics_service.py app/services/campaign_cart_payment_service.py app/services/campaign_completion_service.py app/services/email_service.py app/services/smilepay_service.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Campaign cart payments deployed
echo ========================================
echo.
echo Manual checks:
echo   - Campaign cart empty state buttons open Invite Creators and Browse Packages
echo   - Download Invoice opens selection and downloads pro forma PDF
echo   - Wallet payment activates collaborations and removes paid cart items
echo   - Smile^&Pay payment uses campaign payment id and activates after payment confirmation
echo   - Bank transfer proof upload appears in Admin Payments and activates after admin verification
echo   - Campaign performance tab aggregates submitted post metrics for paid collaborations
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
