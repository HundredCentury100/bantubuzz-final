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
ssh %SERVER_USER%@%SERVER_HOST% "set -e; pkill gunicorn || true; sleep 2; cd %REMOTE_BACKEND%; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; netstat -tlnp | grep 8002 || ss -tlnp | grep 8002; echo 'Server-side health:'; curl -s -i http://localhost:8002/api/health; echo; echo 'Apache status:'; systemctl is-active apache2"
if errorlevel 1 goto fail

echo.
echo Public health check:
curl -L https://bantubuzz.com/api/health
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
