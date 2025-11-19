@echo off
echo ========================================
echo BantuBuzz Platform - VPS Server Scanner
echo ========================================
echo.
echo Server: 173.212.245.22
echo Username: root
echo.
echo This script will scan the VPS to understand current deployments
echo.
pause

echo.
echo Connecting to VPS...
echo.

REM Check what's running on the server
ssh root@173.212.245.22 "echo '=== Current Directory Structure ===' && ls -la / && echo '' && echo '=== Home Directory ===' && ls -la ~/ && echo '' && echo '=== Running Processes ===' && ps aux | grep -E 'node|python|nginx|apache' && echo '' && echo '=== Listening Ports ===' && netstat -tlnp 2>/dev/null || ss -tlnp && echo '' && echo '=== Nginx Sites ===' && ls -la /etc/nginx/sites-enabled/ 2>/dev/null && echo '' && echo '=== Web Root Directories ===' && ls -la /var/www/ 2>/dev/null && echo '' && echo '=== PM2 Processes ===' && pm2 list 2>/dev/null && echo '' && echo '=== Systemd Services ===' && systemctl list-units --type=service --state=running | grep -E 'node|python|web'"

echo.
echo.
echo Scan complete! Review the output above.
echo.
pause
