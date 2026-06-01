@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\thunzi-story-messaging"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_thunzi_story_messaging.tar.gz"

cls
echo ========================================
echo   BantuBuzz Thunzi Story + Messaging Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the latest changes:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - backend/app/routes/portfolio.py
echo   - backend/app/routes/messages.py
echo   - backend/app/routes/internal.py
echo   - backend/app/routes/billing.py
echo   - backend/app/routes/bookings.py
echo   - backend/app/routes/collaborations.py
echo   - backend/app/routes/creators.py
echo   - backend/app/__init__.py
echo   - backend/app/celery_app.py
echo   - backend/app/models/collaboration.py
echo   - backend/app/services/product_notifications.py
echo   - backend/app/services/payment_service.py
echo   - backend/app/services/post_metrics_service.py
echo   - backend/app/models/milestone_deliverable.py
echo   - backend/app/tasks/collaboration_tasks.py
echo   - backend/app/tasks/platform_sync.py
echo   - messaging-service/server.js
echo   - server-side py_compile for uploaded backend files
echo   - Gunicorn, messaging service, Celery if configured, and Apache restart
echo   - local and public health checks
echo.
echo No database migration or backfill will run.
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_thunzi_story_messaging.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_thunzi_story_messaging_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_thunzi_story_messaging_backup_$TS.tar.gz backend/app/__init__.py backend/app/celery_app.py backend/app/routes/portfolio.py backend/app/routes/messages.py backend/app/routes/internal.py backend/app/routes/billing.py backend/app/routes/bookings.py backend/app/routes/collaborations.py backend/app/routes/creators.py backend/app/services/product_notifications.py backend/app/services/payment_service.py backend/app/services/post_metrics_service.py backend/app/models/collaboration.py backend/app/models/milestone_deliverable.py backend/app/tasks/collaboration_tasks.py backend/app/tasks/platform_sync.py messaging-service/server.js frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/routes backend/app/services backend/app/models backend/app/tasks messaging-service frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend route files...
scp "%ROOT%\backend\app\routes\portfolio.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/portfolio.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\messages.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/messages.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\internal.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/internal.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\billing.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/billing.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\bookings.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/bookings.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/collaborations.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\creators.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/creators.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\celery_app.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/celery_app.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\collaboration.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/collaboration.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\product_notifications.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/product_notifications.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\payment_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/payment_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\post_metrics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/post_metrics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\milestone_deliverable.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/milestone_deliverable.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\collaboration_tasks.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/collaboration_tasks.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\platform_sync.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/platform_sync.py
if errorlevel 1 goto fail
scp "%ROOT%\messaging-service\server.js" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/messaging-service/server.js
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_thunzi_story_messaging.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_thunzi_story_messaging.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/__init__.py app/celery_app.py app/routes/portfolio.py app/routes/messages.py app/routes/internal.py app/routes/billing.py app/routes/bookings.py app/routes/collaborations.py app/routes/creators.py app/services/product_notifications.py app/services/payment_service.py app/services/post_metrics_service.py app/models/collaboration.py app/models/milestone_deliverable.py app/tasks/collaboration_tasks.py app/tasks/platform_sync.py; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; (pm2 restart messaging-service 2>/dev/null || pm2 restart bantubuzz-messaging 2>/dev/null || true); (systemctl restart celery 2>/dev/null || true); (systemctl restart celerybeat 2>/dev/null || true); (pm2 restart celery 2>/dev/null || true); (pm2 restart celery-beat 2>/dev/null || true); systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Thunzi story + messaging deployment finished
echo ========================================
echo.
echo Manual checks:
echo   - Success story post URL fetches stats from ThunziAI
echo   - Key Result appears below the success story description
echo   - Collaboration live post form asks for platform first
echo   - Facebook collaboration posts accept numeric/original Post IDs
echo   - Brands I've Worked With only shows completed collaborations
echo   - Package Book Now sends brands through cart checkout
echo   - Message input is usable on mobile and desktop even while Socket.IO reconnects
echo   - Starting a conversation sends through the REST fallback if the socket is offline
echo   - Creator and brand product notifications create in-app notifications and emails
echo   - Message notifications work through both Flask REST and Node Socket.IO paths
echo   - Delivery metrics auto-sync every 4 hours; manual Sync button is hidden
echo   - Billing page opens past/upcoming invoices for collaborations and campaigns
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
