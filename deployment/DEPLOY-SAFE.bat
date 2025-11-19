@echo off
color 0A
cls
echo ========================================
echo   BantuBuzz Platform - Safe Deployment
echo ========================================
echo.
echo Server: 173.212.245.22
echo Username: root
echo Password: P9MYrbtC61MA54t
echo.
echo DEPLOYMENT CONFIGURATION:
echo   - Location: /var/www/bantubuzz
echo   - Backend Port: 8002
echo   - Messaging Port: 3002
echo   - Access URL: http://173.212.245.22:8080
echo.
echo This deployment will NOT interfere with:
echo   - Port 80/443 (Apache - existing sites)
echo   - Port 8001 (savanna_sage_lms)
echo   - Port 5000 (thunzi.co)
echo   - Any existing /var/www apps
echo.
echo ESTIMATED TIME: 30-40 minutes
echo.
echo Press any key to start deployment or Ctrl+C to cancel...
pause > nul

cls
echo ========================================
echo STEP 1/8: Uploading Backend Files
echo ========================================
echo.
echo Uploading backend to VPS...
echo Password: P9MYrbtC61MA54t
echo.
scp -r "D:\Bantubuzz Platform\backend" root@173.212.245.22:/var/www/bantubuzz/

if errorlevel 1 (
    echo.
    echo ERROR: Failed to upload backend files!
    pause
    exit /b 1
)

echo.
echo Backend files uploaded successfully!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 2/8: Uploading Frontend Files
echo ========================================
echo.
echo Uploading frontend to VPS...
echo.
scp -r "D:\Bantubuzz Platform\frontend" root@173.212.245.22:/var/www/bantubuzz/

if errorlevel 1 (
    echo.
    echo ERROR: Failed to upload frontend files!
    pause
    exit /b 1
)

echo.
echo Frontend files uploaded successfully!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 3/8: Uploading Messaging Service
echo ========================================
echo.
echo Uploading messaging service to VPS...
echo.
scp -r "D:\Bantubuzz Platform\messaging-service" root@173.212.245.22:/var/www/bantubuzz/

if errorlevel 1 (
    echo.
    echo ERROR: Failed to upload messaging service!
    pause
    exit /b 1
)

echo.
echo Messaging service uploaded successfully!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 4/8: Setting Up Backend
echo ========================================
echo.
echo Installing Python dependencies and configuring backend...
echo This may take 5-10 minutes...
echo.

ssh root@173.212.245.22 "
set -e
cd /var/www/bantubuzz/backend

echo '=== Creating Python virtual environment ==='
python3 -m venv venv

echo '=== Installing Python dependencies ==='
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

echo '=== Creating .env file ==='
cat > .env << 'ENVEOF'
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=sqlite:///instance/bantubuzz.db
JWT_SECRET_KEY=$(openssl rand -hex 32)
PAYNOW_INTEGRATION_ID=your-paynow-integration-id
PAYNOW_INTEGRATION_KEY=your-paynow-integration-key
FRONTEND_URL=http://173.212.245.22:8080
BACKEND_URL=http://173.212.245.22:8002
ENVEOF

echo '=== Creating instance directory ==='
mkdir -p instance

echo '=== Backend setup complete! ==='
"

if errorlevel 1 (
    echo.
    echo ERROR: Backend setup failed!
    pause
    exit /b 1
)

echo.
echo Backend setup complete!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 5/8: Setting Up Frontend
echo ========================================
echo.
echo Installing Node.js dependencies and building frontend...
echo This may take 10-15 minutes...
echo.

ssh root@173.212.245.22 "
set -e
cd /var/www/bantubuzz/frontend

echo '=== Creating .env.production file ==='
cat > .env.production << 'ENVEOF'
VITE_API_URL=http://173.212.245.22:8002
VITE_SOCKET_URL=http://173.212.245.22:3002
ENVEOF

echo '=== Installing Node.js dependencies ==='
npm install

echo '=== Building production frontend ==='
npm run build

echo '=== Frontend setup complete! ==='
"

if errorlevel 1 (
    echo.
    echo ERROR: Frontend setup failed!
    pause
    exit /b 1
)

echo.
echo Frontend built successfully!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 6/8: Setting Up Messaging Service
echo ========================================
echo.
echo Installing messaging service dependencies...
echo.

ssh root@173.212.245.22 "
set -e
cd /var/www/bantubuzz/messaging-service

echo '=== Creating .env file ==='
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=http://173.212.245.22:8080
ENVEOF

echo '=== Installing Node.js dependencies ==='
npm install

echo '=== Messaging service setup complete! ==='
"

if errorlevel 1 (
    echo.
    echo ERROR: Messaging service setup failed!
    pause
    exit /b 1
)

echo.
echo Messaging service setup complete!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 7/8: Configuring Services
echo ========================================
echo.
echo Setting up PM2 and Apache configuration...
echo.

ssh root@173.212.245.22 "
set -e

echo '=== Creating logs directory ==='
mkdir -p /var/www/bantubuzz/logs

echo '=== Creating PM2 ecosystem file ==='
cat > /var/www/bantubuzz/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bantubuzz-backend',
      cwd: '/var/www/bantubuzz/backend',
      script: 'venv/bin/gunicorn',
      args: '--bind 0.0.0.0:8002 --workers 4 --timeout 120 run:app',
      interpreter: 'none',
      env: {
        FLASK_ENV: 'production',
        FLASK_APP: 'run.py'
      },
      error_file: '/var/www/bantubuzz/logs/backend-error.log',
      out_file: '/var/www/bantubuzz/logs/backend-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10
    },
    {
      name: 'bantubuzz-messaging',
      cwd: '/var/www/bantubuzz/messaging-service',
      script: 'server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/var/www/bantubuzz/logs/messaging-error.log',
      out_file: '/var/www/bantubuzz/logs/messaging-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10
    }
  ]
};
EOF

echo '=== Creating Apache virtual host configuration ==='
cat > /etc/apache2/sites-available/bantubuzz.conf << 'EOF'
<VirtualHost *:8080>
    ServerName 173.212.245.22
    DocumentRoot /var/www/bantubuzz/frontend/dist

    <Directory /var/www/bantubuzz/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # React Router support
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy backend API requests
    ProxyPreserveHost On
    ProxyPass /api http://localhost:8002/api
    ProxyPassReverse /api http://localhost:8002/api

    # Proxy WebSocket for messaging
    ProxyPass /socket.io http://localhost:3002/socket.io
    ProxyPassReverse /socket.io http://localhost:3002/socket.io

    # WebSocket upgrade support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) \"ws://localhost:3002/\$1\" [P,L]

    # Serve uploaded files
    Alias /uploads /var/www/bantubuzz/backend/uploads
    <Directory /var/www/bantubuzz/backend/uploads>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog /var/www/bantubuzz/logs/apache-error.log
    CustomLog /var/www/bantubuzz/logs/apache-access.log combined
</VirtualHost>
EOF

echo '=== Enabling required Apache modules ==='
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_wstunnel

echo '=== Adding port 8080 to Apache ports.conf ==='
if ! grep -q 'Listen 8080' /etc/apache2/ports.conf; then
    echo 'Listen 8080' >> /etc/apache2/ports.conf
fi

echo '=== Enabling BantuBuzz site ==='
a2ensite bantubuzz.conf

echo '=== Testing Apache configuration ==='
apache2ctl configtest

echo '=== Configuration complete! ==='
"

if errorlevel 1 (
    echo.
    echo ERROR: Service configuration failed!
    pause
    exit /b 1
)

echo.
echo Services configured successfully!
timeout /t 2 > nul

cls
echo ========================================
echo STEP 8/8: Starting Services
echo ========================================
echo.
echo Starting backend, messaging service, and Apache...
echo.

ssh root@173.212.245.22 "
set -e

echo '=== Starting PM2 services ==='
cd /var/www/bantubuzz
pm2 delete bantubuzz-backend 2>/dev/null || true
pm2 delete bantubuzz-messaging 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo '=== Setting PM2 to start on boot ==='
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo '=== Reloading Apache ==='
systemctl reload apache2

echo '=== Checking service status ==='
echo ''
echo 'PM2 Processes:'
pm2 status

echo ''
echo 'Apache Status:'
systemctl status apache2 --no-pager -l

echo ''
echo 'Listening Ports:'
netstat -tlnp | grep -E '8002|8080|3002' || ss -tlnp | grep -E '8002|8080|3002'

echo ''
echo '=== All services started successfully! ==='
"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)

cls
echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Your BantuBuzz Platform is now live!
echo.
echo ACCESS YOUR PLATFORM:
echo   URL: http://173.212.245.22:8080
echo.
echo SERVICES:
echo   Backend API: http://173.212.245.22:8002
echo   Messaging:   http://173.212.245.22:3002
echo   Frontend:    http://173.212.245.22:8080
echo.
echo DEPLOYMENT LOCATION:
echo   /var/www/bantubuzz/
echo.
echo LOGS LOCATION:
echo   /var/www/bantubuzz/logs/
echo.
echo MANAGEMENT COMMANDS:
echo   View logs:      pm2 logs
echo   Restart:        pm2 restart all
echo   Stop:           pm2 stop all
echo   Apache reload:  systemctl reload apache2
echo.
echo NEXT STEPS:
echo   1. Test the platform in your browser
echo   2. Update Paynow credentials in backend .env
echo   3. Set up regular backups
echo.
echo Press any key to exit...
pause > nul
