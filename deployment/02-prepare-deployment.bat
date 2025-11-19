@echo off
echo ========================================
echo BantuBuzz Platform - Prepare Deployment
echo ========================================
echo.
echo Server: 173.212.245.22
echo Username: root
echo.
echo This script will prepare the VPS for BantuBuzz deployment
echo.
pause

echo.
echo Connecting to VPS...
echo.

REM Create deployment directory and install prerequisites
ssh root@173.212.245.22 "
echo '=== Creating deployment directory ===' && \
mkdir -p /var/www/bantubuzz && \
echo 'Created: /var/www/bantubuzz' && \
echo '' && \
echo '=== Checking installed software ===' && \
echo 'Node.js version:' && node --version 2>/dev/null || echo 'Node.js not installed' && \
echo 'npm version:' && npm --version 2>/dev/null || echo 'npm not installed' && \
echo 'Python version:' && python3 --version 2>/dev/null || echo 'Python3 not installed' && \
echo 'pip version:' && pip3 --version 2>/dev/null || echo 'pip3 not installed' && \
echo 'PM2 installed:' && pm2 --version 2>/dev/null || echo 'PM2 not installed' && \
echo 'Nginx installed:' && nginx -v 2>&1 || echo 'Nginx not installed' && \
echo '' && \
echo '=== Installing missing prerequisites ===' && \
echo 'Updating package list...' && \
apt-get update -qq && \
echo '' && \
echo 'Installing required packages...' && \
apt-get install -y python3 python3-pip python3-venv nginx curl git && \
echo '' && \
echo 'Installing Node.js if needed...' && \
if ! command -v node &> /dev/null; then curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs; fi && \
echo '' && \
echo 'Installing PM2 globally if needed...' && \
if ! command -v pm2 &> /dev/null; then npm install -g pm2; fi && \
echo '' && \
echo '=== Prerequisites installation complete ===' && \
echo '' && \
ls -la /var/www/bantubuzz
"

echo.
echo.
echo Server preparation complete!
echo Deployment directory: /var/www/bantubuzz
echo.
pause
