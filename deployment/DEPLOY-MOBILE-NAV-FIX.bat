@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\mobile-nav-fix"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_mobile_nav_fix.tar.gz"

cls
echo ========================================
echo   BantuBuzz Mobile Nav Fix Deployment
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the current frontend mobile nav fix:
echo   - creator bottom nav order and profile route
echo   - brand bottom nav order
echo   - frontend build files into /var/www/bantubuzz/frontend
echo   - Apache restart
echo   - public health check
echo.
echo No backend files, database migration, or backfill will run.
echo.
echo You will be asked for the SSH password on each ssh/scp step.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/6] Preparing local package folder...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if errorlevel 1 goto fail
if exist "%FRONTEND_TAR%" del "%FRONTEND_TAR%"

echo.
echo [2/6] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto fail

echo.
echo [3/6] Creating frontend tarball from dist contents...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/6] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_mobile_nav_fix.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/6] Backing up and extracting frontend build...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_mobile_nav_frontend_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_mobile_nav_frontend_backup_$TS.tar.gz frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p frontend; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_mobile_nav_fix.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_mobile_nav_fix.tar.gz"
if errorlevel 1 goto fail

echo.
echo [6/6] Restarting Apache and checking public health...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; systemctl restart apache2; sleep 2; echo 'Apache status:'; systemctl is-active apache2; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Mobile nav fix deployment finished
echo ========================================
echo.
echo Manual checks on mobile:
echo   - Creator nav: Home, Messages, Collaborations, Profile
echo   - Creator Profile opens profile edit instead of 404
echo   - Brand nav: Dashboard, Messages, Search, Collaborations, Profile
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
