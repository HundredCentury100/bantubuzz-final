@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\public-profile-release"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_public_profiles.tar.gz"

cls
echo ========================================
echo   BantuBuzz Public Profile Deployment
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the current public creator profile release:
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - backend/app/routes/creators.py
echo   - backend compile check
echo   - backend and Apache restart
echo   - local and public health checks
echo.
echo No database migration or Thunzi backfill will run.
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_public_profiles.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production frontend and creator route...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_public_profiles_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_public_profiles_backup_$TS.tar.gz backend/app/routes/creators.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/routes frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend creator route...
scp "%ROOT%\backend\app\routes\creators.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/creators.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend build and checking backend compile...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_public_profiles.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_public_profiles.tar.gz; cd %REMOTE_ROOT%/backend; source venv/bin/activate; python -m py_compile app/routes/creators.py"
if errorlevel 1 goto fail

echo.
echo [8/8] Restarting backend, Apache, and checking health...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; ps aux | grep '[g]unicorn'; echo 'Server-side health:'; curl -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Public profile deployment finished
echo ========================================
echo.
echo Manual checks:
echo   - https://bantubuzz.com/creatorusername opens without login
echo   - Share Profile uses the clean username URL
echo   - Save/book actions ask public users to sign in or sign up as a brand
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
