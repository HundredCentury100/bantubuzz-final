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
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_BACKEND%; source venv/bin/activate; PIDS_FILE=/tmp/bantubuzz_gunicorn_pids; pgrep -f '[g]unicorn.*0.0.0.0:8002' > $PIDS_FILE || true; if [ -s $PIDS_FILE ]; then echo 'Stopping Gunicorn PIDs:'; cat $PIDS_FILE; xargs -r kill < $PIDS_FILE; sleep 3; fi; pgrep -f '[g]unicorn.*0.0.0.0:8002' > $PIDS_FILE || true; if [ -s $PIDS_FILE ]; then echo 'Force stopping Gunicorn PIDs:'; cat $PIDS_FILE; xargs -r kill -9 < $PIDS_FILE; sleep 1; fi; rm -f $PIDS_FILE; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; echo 'Waiting for backend health...'; HEALTH_OK=0; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do if curl -fsS http://localhost:8002/api/health; then HEALTH_OK=1; break; fi; sleep 2; done; echo; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn' || true; echo 'Port 8002:'; netstat -tlnp | grep 8002 || ss -tlnp | grep 8002 || true; if [ $HEALTH_OK != 1 ]; then echo 'Backend health failed. Recent gunicorn errors:'; tail -80 gunicorn_error.log || true; exit 1; fi; echo 'Apache status:'; systemctl is-active apache2; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
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
