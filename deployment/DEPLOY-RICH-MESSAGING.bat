@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\rich-messaging"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_rich_messaging.tar.gz"

cls
echo ========================================
echo   BantuBuzz Rich Messaging Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the rich messaging release:
echo   - text, image, file, and content-link messages
echo   - read receipts with read_at timestamps
echo   - optional web push subscriptions for new message notifications
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - changed Flask messaging files and migration
echo   - changed Node Socket.IO messaging service
echo   - backend dependency install for pywebpush
echo   - Gunicorn, PM2 messaging service, and Apache restart
echo   - local/public health checks
echo.
echo Note: mobile push requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and
echo VAPID_SUBJECT in the backend environment. Without them, messaging still works
echo and push sending is skipped safely.
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_rich_messaging.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_rich_messaging_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_rich_messaging_backup_$TS.tar.gz backend/app/config.py backend/app/models/__init__.py backend/app/models/message.py backend/app/models/push_subscription.py backend/app/routes/messages.py backend/app/services/product_notifications.py backend/app/services/push_service.py backend/app/utils/websocket_helper.py backend/requirements.txt backend/migrations/versions/202606051000_add_rich_messaging_and_push.py messaging-service/server.js frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json frontend/message-push-sw.js; mkdir -p backend/app/models backend/app/routes backend/app/services backend/app/utils backend/migrations/versions messaging-service frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend and messaging files...
scp "%ROOT%\backend\app\config.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/config.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\message.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/message.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\push_subscription.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/push_subscription.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\messages.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/messages.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\product_notifications.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/product_notifications.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\push_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/push_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\utils\websocket_helper.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/utils/websocket_helper.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\requirements.txt" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/requirements.txt
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606051000_add_rich_messaging_and_push.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606051000_add_rich_messaging_and_push.py
if errorlevel 1 goto fail
scp "%ROOT%\messaging-service\server.js" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/messaging-service/server.js
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, installing backend dependency, migrating, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json frontend/message-push-sw.js; tar -xzf /tmp/bantubuzz_frontend_rich_messaging.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_rich_messaging.tar.gz; cd backend; source venv/bin/activate; pip install -r requirements.txt; python -m py_compile app/config.py app/models/__init__.py app/models/message.py app/models/push_subscription.py app/routes/messages.py app/services/product_notifications.py app/services/push_service.py app/utils/websocket_helper.py migrations/versions/202606051000_add_rich_messaging_and_push.py; flask db upgrade; cd %REMOTE_ROOT%/messaging-service; node --check server.js; cd %REMOTE_ROOT%/backend; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; (pm2 restart bantubuzz-messaging 2>/dev/null || pm2 restart messaging-service 2>/dev/null || true); systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Messaging PM2:'; (pm2 status bantubuzz-messaging 2>/dev/null || pm2 status messaging-service 2>/dev/null || true); echo 'Ports:'; (ss -tlnp | grep -E '8002|3002' || netstat -tlnp | grep -E '8002|3002')"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health; echo; echo 'Messaging health if available:'; (curl -f -s -i http://localhost:3002/health || curl -f -s -i http://localhost:3002/api/health || true)"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Rich messaging deployed
echo ========================================
echo.
echo Manual checks:
echo   - Send a plain text message
echo   - Send an image attachment
echo   - Send a file attachment
echo   - Paste a content link and confirm it renders as a link card
echo   - Open the conversation as the receiver and confirm the sender sees Read status
echo   - Enable browser notifications from Messages and confirm new-message push works when VAPID keys are configured
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
