@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo   BantuBuzz - Continue Deployment (Step 4+)
echo   Target: Contabo VPS (173.212.245.22)
echo ============================================
echo.

REM Configuration
set SERVER_IP=173.212.245.22
set SERVER_USER=root
set DEPLOY_DIR=/var/www/bantubuzz
set BACKEND_PORT=8002
set MESSAGING_PORT=3002
set FRONTEND_PORT=8080
set DB_NAME=bantubuzz
set DB_USER=bantubuzz_user
set LOCAL_PATH=D:\Bantubuzz Platform

echo Continuing from Step 4...
echo.
echo Press any key to start...
pause >nul
echo.

echo ============================================
echo   Step 4: Uploading Messaging Service
echo ============================================
echo.

scp -r "%LOCAL_PATH%\messaging-service" %SERVER_USER%@%SERVER_IP%:%DEPLOY_DIR%/

if errorlevel 1 (
    echo Upload failed. Please try again.
    pause
    exit /b 1
)

echo ============================================
echo   Step 5: Creating setup script
echo ============================================
echo.

(
echo #!/bin/bash
echo set -e
echo.
echo echo "=========================================="
echo echo "  BantuBuzz Server Setup"
echo echo "=========================================="
echo.
echo DEPLOY_DIR="%DEPLOY_DIR%"
echo BACKEND_PORT=%BACKEND_PORT%
echo MESSAGING_PORT=%MESSAGING_PORT%
echo FRONTEND_PORT=%FRONTEND_PORT%
echo DB_NAME="%DB_NAME%"
echo DB_USER="%DB_USER%"
echo.
echo # Setup Backend
echo echo "Setting up Backend..."
echo cd $DEPLOY_DIR/backend
echo python3 -m venv venv
echo source venv/bin/activate
echo pip install --upgrade pip
echo pip install -r requirements.txt
echo pip install gunicorn psycopg2-binary
echo.
echo # Create backend .env file with actual credentials
echo echo "Creating backend .env..."
echo cat ^> .env ^<^< 'ENVEOF'
echo FLASK_ENV=production
echo SECRET_KEY=bantubuzz-prod-secret-key-2024-secure
echo JWT_SECRET_KEY=bantubuzz-jwt-secret-key-2024-secure
echo DATABASE_URL=postgresql://$DB_USER:BantuBuzz2024!@localhost:5432/$DB_NAME
echo REDIS_URL=redis://localhost:6379/0
echo.
echo # Email Configuration - BantuBuzz SMTP
echo MAIL_SERVER=bantubuzz.com
echo MAIL_PORT=465
echo MAIL_USE_SSL=True
echo MAIL_USE_TLS=False
echo MAIL_USERNAME=user@bantubuzz.com
echo MAIL_PASSWORD=-=hdZ!J_pd^s
echo MAIL_DEFAULT_SENDER=user@bantubuzz.com
echo.
echo # Paynow Configuration
echo PAYNOW_INTEGRATION_ID=22185
echo PAYNOW_INTEGRATION_KEY=c3a1de78-ed65-4487-8e75-de14510b109b
echo PAYNOW_RETURN_URL=http://%SERVER_IP%:%FRONTEND_PORT%/payment/return
echo PAYNOW_RESULT_URL=http://%SERVER_IP%:%BACKEND_PORT%/api/bookings/payment-webhook
echo.
echo # Frontend URL
echo FRONTEND_URL=http://%SERVER_IP%:%FRONTEND_PORT%
echo.
echo # File Upload Configuration
echo MAX_CONTENT_LENGTH=16777216
echo UPLOAD_FOLDER=uploads
echo ALLOWED_EXTENSIONS=png,jpg,jpeg,gif,pdf,mp4,mov
echo ENVEOF
echo.
echo # Create uploads directory
echo mkdir -p uploads/profiles/creators/gallery uploads/profiles/brands uploads/deliverables
echo.
echo # Run database migrations
echo echo "Running database migrations..."
echo export FLASK_APP=app
echo flask db upgrade 2^>/dev/null ^|^| python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
echo deactivate
echo.
echo # Setup Messaging Service
echo echo "Setting up Messaging Service..."
echo cd $DEPLOY_DIR/messaging-service
echo npm install
echo cat ^> .env ^<^< 'ENVEOF'
echo PORT=%MESSAGING_PORT%
echo JWT_SECRET=bantubuzz-messaging-jwt-2024
echo CORS_ORIGIN=http://%SERVER_IP%:%FRONTEND_PORT%
echo DATABASE_URL=postgresql://$DB_USER:BantuBuzz2024!@localhost:5432/$DB_NAME
echo ENVEOF
echo.
echo # Setup Frontend
echo echo "Setting up Frontend..."
echo cd $DEPLOY_DIR/frontend
echo npm install
echo cat ^> .env ^<^< 'ENVEOF'
echo VITE_API_URL=http://%SERVER_IP%:%BACKEND_PORT%/api
echo VITE_MESSAGING_URL=http://%SERVER_IP%:%MESSAGING_PORT%/api
echo VITE_MESSAGING_SOCKET_URL=http://%SERVER_IP%:%MESSAGING_PORT%
echo ENVEOF
echo.
echo # Build frontend
echo echo "Building frontend..."
echo npm run build
echo.
echo # Create PM2 ecosystem
echo echo "Creating PM2 ecosystem..."
echo cd $DEPLOY_DIR
echo cat ^> ecosystem.config.js ^<^< 'PMEOF'
echo module.exports = {
echo   apps: [
echo     {
echo       name: 'bantubuzz-backend',
echo       cwd: '%DEPLOY_DIR%/backend',
echo       script: 'venv/bin/gunicorn',
echo       args: '-w 4 -b 0.0.0.0:%BACKEND_PORT% --timeout 120 "app:create_app()"',
echo       interpreter: 'none',
echo       env: { FLASK_ENV: 'production' }
echo     },
echo     {
echo       name: 'bantubuzz-messaging',
echo       cwd: '%DEPLOY_DIR%/messaging-service',
echo       script: 'npm',
echo       args: 'start',
echo       interpreter: 'none'
echo     },
echo     {
echo       name: 'bantubuzz-frontend',
echo       cwd: '%DEPLOY_DIR%/frontend',
echo       script: 'serve',
echo       args: '-s dist -l %FRONTEND_PORT%',
echo       interpreter: 'none'
echo     }
echo   ]
echo };
echo PMEOF
echo.
echo # Start services
echo echo "Starting services..."
echo pm2 delete bantubuzz-backend 2^>/dev/null ^|^| true
echo pm2 delete bantubuzz-messaging 2^>/dev/null ^|^| true
echo pm2 delete bantubuzz-frontend 2^>/dev/null ^|^| true
echo pm2 start ecosystem.config.js
echo pm2 save
echo.
echo echo ""
echo echo "=========================================="
echo echo "  Deployment Complete!"
echo echo "=========================================="
echo echo "Frontend: http://%SERVER_IP%:%FRONTEND_PORT%"
echo echo "Backend: http://%SERVER_IP%:%BACKEND_PORT%/api"
echo echo "Messaging: http://%SERVER_IP%:%MESSAGING_PORT%"
) > setup-server.sh

echo Copying setup script to server...
scp setup-server.sh %SERVER_USER%@%SERVER_IP%:/root/

if errorlevel 1 (
    echo Copy failed. Please try again.
    pause
    exit /b 1
)

echo ============================================
echo   Step 6: Running setup on server
echo ============================================
echo.

ssh -t %SERVER_USER%@%SERVER_IP% "sed -i 's/\r$//' /root/setup-server.sh && chmod +x /root/setup-server.sh && /root/setup-server.sh"

echo.
echo ============================================
echo   DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Your BantuBuzz platform is now live at:
echo.
echo   Frontend:  http://%SERVER_IP%:%FRONTEND_PORT%
echo   Backend:   http://%SERVER_IP%:%BACKEND_PORT%/api
echo   Messaging: http://%SERVER_IP%:%MESSAGING_PORT%
echo.
echo Press any key to exit...
pause >nul
