@echo off
echo ========================================
echo BantuBuzz Platform - Check Logs
echo ========================================
echo.
echo This script will show recent logs from all services
echo.
pause

echo.
echo Fetching logs from VPS...
echo.

ssh root@173.212.245.22 "
echo '=== PM2 Process Status ==='
pm2 status

echo ''
echo '=== Backend Logs (Last 50 lines) ==='
tail -n 50 /var/www/bantubuzz/logs/backend-out.log 2>/dev/null || echo 'No backend logs yet'

echo ''
echo '=== Backend Errors (Last 20 lines) ==='
tail -n 20 /var/www/bantubuzz/logs/backend-error.log 2>/dev/null || echo 'No backend errors'

echo ''
echo '=== Messaging Service Logs (Last 30 lines) ==='
tail -n 30 /var/www/bantubuzz/logs/messaging-out.log 2>/dev/null || echo 'No messaging logs yet'

echo ''
echo '=== Nginx Error Logs (Last 20 lines) ==='
tail -n 20 /var/log/nginx/error.log 2>/dev/null || echo 'No nginx errors'

echo ''
echo '=== Nginx Access Logs (Last 20 lines) ==='
tail -n 20 /var/log/nginx/access.log 2>/dev/null || echo 'No access logs yet'

echo ''
echo '=== System Resource Usage ==='
top -bn1 | head -n 20
"

echo.
echo.
echo Log check complete!
echo.
pause
