@echo off
setlocal EnableExtensions

set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_BACKEND=/var/www/bantubuzz/backend"

cls
echo ========================================
echo   BantuBuzz Backend Restart
echo ========================================
echo.
echo This will restart Gunicorn and Apache on production.
echo You will be asked for the SSH password.
echo.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo Restarting backend...
scp "%~dp0restart-backend-remote.sh" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_restart_backend.sh
if errorlevel 1 goto fail
ssh %SERVER_USER%@%SERVER_HOST% "chmod +x /tmp/bantubuzz_restart_backend.sh && REMOTE_BACKEND='%REMOTE_BACKEND%' PORT=8002 /tmp/bantubuzz_restart_backend.sh"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Backend restart finished
echo ========================================
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Backend restart failed
echo ========================================
echo.
echo If Gunicorn did not start, check:
echo   ssh root@173.212.245.22 "tail -80 /var/www/bantubuzz/backend/gunicorn_error.log"
pause
exit /b 1
