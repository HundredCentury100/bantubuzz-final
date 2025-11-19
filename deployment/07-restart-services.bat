@echo off
echo ========================================
echo BantuBuzz Platform - Restart Services
echo ========================================
echo.
echo This script will restart all platform services
echo.
pause

echo.
echo Restarting services on VPS...
echo.

ssh root@173.212.245.22 "
echo 'Restarting PM2 services...'
pm2 restart all

echo ''
echo 'Restarting Nginx...'
systemctl restart nginx

echo ''
echo '=== Services Status ==='
pm2 status

echo ''
systemctl status nginx --no-pager
"

echo.
echo.
echo Services restarted successfully!
echo.
pause
