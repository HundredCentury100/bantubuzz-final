@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\campaign-application-workflow"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_campaign_application_workflow.tar.gz"

cls
echo ========================================
echo   BantuBuzz Campaign Application Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the campaign application workflow batch:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - campaign publish/application/proposal backend updates
echo   - campaign cart campaign_proposals foreign-key migration
echo   - server-side flask db upgrade and py_compile
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_campaign_application_workflow.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_campaign_application_workflow_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_campaign_application_workflow_backup_$TS.tar.gz backend/app/routes/campaigns.py backend/app/routes/campaign_cart.py backend/app/models/campaign_cart.py backend/migrations/versions/202606041700_fix_campaign_cart_proposal_fk.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/routes backend/app/models backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\routes\campaigns.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaigns.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\campaign_cart.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaign_cart.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\campaign_cart.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/campaign_cart.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606041700_fix_campaign_cart_proposal_fk.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606041700_fix_campaign_cart_proposal_fk.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, migrating DB, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_campaign_application_workflow.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_campaign_application_workflow.tar.gz; cd backend; source venv/bin/activate; export FLASK_APP=run.py; flask db upgrade; python -m py_compile app/routes/campaigns.py app/routes/campaign_cart.py app/models/campaign_cart.py migrations/versions/202606041700_fix_campaign_cart_proposal_fk.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Campaign application workflow deployed
echo ========================================
echo.
echo Manual checks:
echo   - Brand Publish for Applications opens the targeting confirmation screen
echo   - Confirm and Publish changes campaign status to Active
echo   - Creator Explore Opportunities shows matching active campaigns only
echo   - Campaign cards show red application deadline and milestone count
echo   - Creator Apply modal locks deliverables and accepts proposed due dates
echo   - Brand Applications tab shows pending count and Add to Cart moves creator to Awaiting Payment
echo   - Rejected applications leave the pending review list
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
