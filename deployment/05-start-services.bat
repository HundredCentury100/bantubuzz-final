@echo off
echo ========================================
echo BantuBuzz Platform - Start Services
echo ========================================
echo.
echo This script will start all platform services
echo.
pause

echo.
echo Starting services on VPS...
echo.

ssh root@173.212.245.22 "
echo 'Stopping any existing PM2 processes...'
pm2 delete all 2>/dev/null || true

echo ''
echo 'Starting services with PM2...'
cd /var/www/bantubuzz
pm2 start ecosystem.config.js

echo ''
echo 'Saving PM2 configuration...'
pm2 save

echo ''
echo 'Setting up PM2 to start on boot...'
pm2 startup systemd -u root --hp /root

echo ''
echo 'Restarting Nginx...'
systemctl restart nginx
systemctl enable nginx

echo ''
echo '=== Services Status ==='
pm2 status

echo ''
echo '=== Nginx Status ==='
systemctl status nginx --no-pager

echo ''
echo '=== Listening Ports ==='
netstat -tlnp | grep -E '80|5000|3001' || ss -tlnp | grep -E '80|5000|3001'
"

echo.
echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Your platform should now be accessible at:
echo http://173.212.245.22
echo.
echo To check logs, run: 06-check-logs.bat
echo.
pause
