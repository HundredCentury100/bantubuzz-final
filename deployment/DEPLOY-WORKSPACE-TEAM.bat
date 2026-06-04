@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\workspace-team"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_workspace_team.tar.gz"

cls
echo ========================================
echo   BantuBuzz Workspace Team Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the workspace team feature changes:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - backend/app/models/client_workspace.py
echo   - backend/app/models/__init__.py
echo   - backend/app/routes/workspaces.py
echo   - backend/app/services/workspace_service.py
echo   - backend/migrations/versions/202606041500_add_workspace_audit_logs.py
echo   - server-side py_compile and flask db upgrade
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_workspace_team.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_workspace_team_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_workspace_team_backup_$TS.tar.gz backend/app/models/client_workspace.py backend/app/models/__init__.py backend/app/routes/workspaces.py backend/app/services/workspace_service.py backend/migrations/versions/202606041500_add_workspace_audit_logs.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend files...
scp "%ROOT%\backend\app\models\client_workspace.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/client_workspace.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\workspaces.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/workspaces.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\workspace_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/workspace_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606041500_add_workspace_audit_logs.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606041500_add_workspace_audit_logs.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_workspace_team.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_workspace_team.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/models/client_workspace.py app/models/__init__.py app/routes/workspaces.py app/services/workspace_service.py migrations/versions/202606041500_add_workspace_audit_logs.py; flask db upgrade; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Workspace team deployment finished
echo ========================================
echo.
echo Manual checks:
echo   - Workspace team page shows seat usage for the current subscription plan
echo   - Free plan cannot invite beyond the owner seat
echo   - Starter, Pro, Premium, and Agency enforce 2, 3, 5, and 10 total seats
echo   - Pending invitations expire after 7 days and count toward the limit while pending
echo   - Removing a member immediately removes workspace access
echo   - Team audit log records invite, accept, cancel, add, role update, and removal events
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
