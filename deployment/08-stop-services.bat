@echo off
echo ========================================
echo BantuBuzz Platform - Stop Services
echo ========================================
echo.
echo This script will stop all platform services
echo.
echo WARNING: This will make your platform inaccessible!
echo.
pause

echo.
echo Stopping services on VPS...
echo.

ssh root@173.212.245.22 "
echo 'Stopping PM2 services...'
pm2 stop all

echo ''
echo 'Stopping Nginx...'
systemctl stop nginx

echo ''
echo '=== Services Status ==='
pm2 status

echo ''
systemctl status nginx --no-pager
"

echo.
echo.
echo Services stopped!
echo.
pause
