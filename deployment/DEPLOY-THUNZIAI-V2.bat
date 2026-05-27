@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\thunziai-v2"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_dist.tar.gz"

cls
echo ========================================
echo   BantuBuzz ThunziAI V2 Deployment
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - ThunziAI backend service, routes, tasks, model, and migration files
echo   - database migration for connected platform scopes
echo   - backend restart and health check
echo.
echo You will be asked for the SSH password on each ssh/scp step.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/9] Preparing local package folder...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if errorlevel 1 goto fail
if exist "%FRONTEND_TAR%" del "%FRONTEND_TAR%"

echo.
echo [2/9] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto fail

echo.
echo [3/9] Creating frontend tarball from dist contents...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/9] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_dist.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/9] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_thunziai_v2_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_thunziai_v2_backup_$TS.tar.gz backend/app/models/connected_platform.py backend/app/routes/platforms.py backend/app/services/post_metrics_service.py backend/app/services/thunzi_service.py backend/app/tasks/platform_sync.py backend/migrations/versions/202605271015_add_scopes_to_connected_platforms.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/app/tasks backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/9] Uploading backend files one by one...
scp "%ROOT%\backend\app\models\connected_platform.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/connected_platform.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\platforms.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/platforms.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\post_metrics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/post_metrics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\thunzi_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/thunzi_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\platform_sync.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/platform_sync.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202605271015_add_scopes_to_connected_platforms.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202605271015_add_scopes_to_connected_platforms.py
if errorlevel 1 goto fail

echo.
echo [7/9] Extracting frontend build...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_dist.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_dist.tar.gz"
if errorlevel 1 goto fail

echo.
echo [8/9] Running backend compile check and database migration...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; python -m py_compile app/models/connected_platform.py app/routes/platforms.py app/services/post_metrics_service.py app/services/thunzi_service.py app/tasks/platform_sync.py migrations/versions/202605271015_add_scopes_to_connected_platforms.py; flask db upgrade"
if errorlevel 1 goto fail

echo.
echo [9/9] Restarting backend, Apache, and checking health...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; ps aux | grep '[g]unicorn'; echo 'Server-side health:'; curl -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   ThunziAI V2 deployment finished
echo ========================================
echo.
echo Local packages are in:
echo   %BUILD_DIR%
echo.
echo Next manual checks:
echo   - Creator platform connections
echo   - Creator profile platform analytics
echo   - Deliverable URL submission and metrics sync
echo   - Brand analytics collaboration view
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
