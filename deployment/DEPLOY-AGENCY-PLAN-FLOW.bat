@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\agency-plan-flow"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_agency_plan_flow.tar.gz"

cls
echo ========================================
echo   BantuBuzz Agency Plan Flow Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the Agency plan flow batch:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - shared Agency subscription entitlement helper
echo   - Agency Dashboard payment gate, setup checklist, and quick links
echo   - subscription payment routing to Agency Dashboard after Agency payment
echo   - Agency plan normalization script
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_agency_plan_flow.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_agency_plan_flow_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_agency_plan_flow_backup_$TS.tar.gz backend/app/routes/admin/payments.py backend/app/routes/subscriptions.py backend/app/routes/workspaces.py backend/app/services/smilepay_service.py backend/app/services/workspace_service.py backend/app/services/agency_subscription_service.py backend/normalize_agency_plan.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/routes/admin backend/app/services frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\services\agency_subscription_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/agency_subscription_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\workspace_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/workspace_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\smilepay_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/smilepay_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\subscriptions.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/subscriptions.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\workspaces.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/workspaces.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\admin\payments.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/admin/payments.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\normalize_agency_plan.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/normalize_agency_plan.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, normalizing plan, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_agency_plan_flow.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_agency_plan_flow.tar.gz; cd backend; source venv/bin/activate; python normalize_agency_plan.py; python -m py_compile app/services/agency_subscription_service.py app/services/workspace_service.py app/services/smilepay_service.py app/routes/subscriptions.py app/routes/workspaces.py app/routes/admin/payments.py normalize_agency_plan.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Agency plan flow deployed
echo ========================================
echo.
echo Manual checks:
echo   - Existing brand can upgrade to Agency with Wallet and lands on /brand/agency
echo   - New Agency signup logs into /brand/agency and sees the subscription gate before workspace tools
echo   - After Agency payment, dashboard shows setup checklist, quick links, and Add Client
echo   - Add Client creates an active workspace within the 10-workspace allowance
echo   - Workspace selector scopes normal brand tools to the selected client
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
