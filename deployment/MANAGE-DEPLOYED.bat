@echo off
color 0A
cls
echo ========================================
echo   BantuBuzz Platform - Management Menu
echo ========================================
echo.
echo Server: 173.212.245.22
echo Platform URL: http://173.212.245.22:8080
echo.
echo Select an option:
echo.
echo   1. View logs (all services)
echo   2. Restart all services
echo   3. Stop all services
echo   4. Check service status
echo   5. Edit backend .env (Paynow credentials)
echo   6. View database
echo   7. Update and redeploy
echo   8. Exit
echo.
set /p choice="Enter choice (1-8): "

if "%choice%"=="1" goto viewlogs
if "%choice%"=="2" goto restart
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto status
if "%choice%"=="5" goto editenv
if "%choice%"=="6" goto database
if "%choice%"=="7" goto redeploy
if "%choice%"=="8" exit /b

echo Invalid choice!
pause
goto :eof

:viewlogs
cls
echo Fetching logs from VPS...
echo.
ssh root@173.212.245.22 "echo '=== PM2 Logs (last 50 lines) ===' && pm2 logs --lines 50 --nostream && echo '' && echo '=== Apache Error Log ===' && tail -20 /var/www/bantubuzz/logs/apache-error.log 2>/dev/null"
echo.
pause
goto :eof

:restart
cls
echo Restarting all services...
echo.
ssh root@173.212.245.22 "pm2 restart all && systemctl reload apache2 && pm2 status"
echo.
echo Services restarted!
pause
goto :eof

:stop
cls
echo Stopping all services...
echo.
ssh root@173.212.245.22 "pm2 stop all && pm2 status"
echo.
echo Services stopped!
pause
goto :eof

:status
cls
echo Checking service status...
echo.
ssh root@173.212.245.22 "echo '=== PM2 Status ===' && pm2 status && echo '' && echo '=== Listening Ports ===' && netstat -tlnp | grep -E '8002|8080|3002' || ss -tlnp | grep -E '8002|8080|3002'"
echo.
pause
goto :eof

:editenv
cls
echo Opening backend .env file...
echo.
echo Update your Paynow credentials and save with Ctrl+O, exit with Ctrl+X
echo.
ssh root@173.212.245.22 "nano /var/www/bantubuzz/backend/.env"
echo.
echo Remember to restart services after editing: option 2
pause
goto :eof

:database
cls
echo Connecting to database...
echo.
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python -c \"from app import create_app, db; from app.models import User; app = create_app(); ctx = app.app_context(); ctx.push(); users = User.query.all(); print('Total users:', len(users)); [print(f'  - {u.email} ({u.user_type})') for u in users[:10]]; ctx.pop()\""
echo.
pause
goto :eof

:redeploy
cls
echo ========================================
echo   Updating Platform
echo ========================================
echo.
echo This will upload your latest changes and restart services.
echo.
pause

echo Uploading backend...
scp -r "D:\Bantubuzz Platform\backend" root@173.212.245.22:/var/www/bantubuzz/

echo Uploading frontend...
scp -r "D:\Bantubuzz Platform\frontend" root@173.212.245.22:/var/www/bantubuzz/

echo Rebuilding and restarting...
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && pip install -r requirements.txt && cd /var/www/bantubuzz/frontend && npm install && npm run build && pm2 restart all && systemctl reload apache2"

echo.
echo Update complete!
pause
goto :eof
