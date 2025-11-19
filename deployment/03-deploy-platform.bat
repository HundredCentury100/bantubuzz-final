@echo off
echo ========================================
echo BantuBuzz Platform - Deploy to VPS
echo ========================================
echo.
echo Server: 173.212.245.22
echo Username: root
echo Deployment Path: /var/www/bantubuzz
echo.
echo This script will deploy your entire platform to the VPS
echo.
pause

echo.
echo [1/6] Uploading Backend...
echo.
scp -r "D:\Bantubuzz Platform\backend" root@173.212.245.22:/var/www/bantubuzz/

echo.
echo [2/6] Uploading Frontend...
echo.
scp -r "D:\Bantubuzz Platform\frontend" root@173.212.245.22:/var/www/bantubuzz/

echo.
echo [3/6] Uploading Messaging Service...
echo.
scp -r "D:\Bantubuzz Platform\messaging-service" root@173.212.245.22:/var/www/bantubuzz/

echo.
echo [4/6] Setting up Backend on VPS...
echo.
ssh root@173.212.245.22 "
cd /var/www/bantubuzz/backend && \
echo 'Installing Python dependencies...' && \
python3 -m venv venv && \
source venv/bin/activate && \
pip install --upgrade pip && \
pip install -r requirements.txt && \
echo 'Backend setup complete!'
"

echo.
echo [5/6] Setting up Frontend on VPS...
echo.
ssh root@173.212.245.22 "
cd /var/www/bantubuzz/frontend && \
echo 'Installing Node.js dependencies...' && \
npm install && \
echo 'Building frontend...' && \
npm run build && \
echo 'Frontend setup complete!'
"

echo.
echo [6/6] Setting up Messaging Service on VPS...
echo.
ssh root@173.212.245.22 "
cd /var/www/bantubuzz/messaging-service && \
echo 'Installing Node.js dependencies...' && \
npm install && \
echo 'Messaging service setup complete!'
"

echo.
echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo - Run 04-configure-services.bat to set up PM2 and Nginx
echo - Run 05-start-services.bat to start all services
echo.
pause
