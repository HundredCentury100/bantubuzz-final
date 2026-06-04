@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\auth-security"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_auth_security.tar.gz"

cls
echo ========================================
echo   BantuBuzz Auth Security Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the auth/security changes:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - backend/app/models/user.py
echo   - backend/app/routes/auth.py
echo   - backend/app/services/email_service.py
echo   - backend/migrations/versions/202606041300_add_user_login_security_fields.py
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_auth_security.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_auth_security_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_auth_security_backup_$TS.tar.gz backend/app/models/user.py backend/app/routes/auth.py backend/app/services/email_service.py backend/migrations/versions/202606041300_add_user_login_security_fields.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend files...
scp "%ROOT%\backend\app\models\user.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/user.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\auth.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/auth.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\email_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/email_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606041300_add_user_login_security_fields.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606041300_add_user_login_security_fields.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_auth_security.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_auth_security.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/models/user.py app/routes/auth.py app/services/email_service.py migrations/versions/202606041300_add_user_login_security_fields.py; flask db upgrade; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Auth security deployment finished
echo ========================================
echo.
echo Manual checks:
echo   - New brand/creator receives OTP at signup and welcome email after OTP verification
echo   - Failed password attempts lock account for 15 minutes after 5 failures
echo   - Forgot/reset password email flow works for both brand and creator users
echo   - Paid brand/creator can enable email 2FA from profile edit
echo   - 2FA-enabled paid user receives email code during login and must verify before dashboard access
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
