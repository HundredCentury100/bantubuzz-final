@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo   BantuBuzz Platform - Full Deployment
echo   Target: Contabo VPS (173.212.245.22)
echo ============================================
echo.
echo This script will:
echo   1. Generate the server setup script
echo   2. Copy it to your VPS
echo   3. Run the deployment automatically
echo.
echo Your existing services will NOT be affected:
echo   - Apache on ports 80/443/8081
echo   - savanna_sage_lms on port 8001
echo   - thunzi.co on port 5000
echo   - n8n on port 5678
echo.
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
set SCRIPT_PATH=D:\Bantubuzz Platform\deployment\server-setup.sh

echo Press any key to start deployment...
pause >nul
echo.

echo ============================================
echo   Step 1: Generating server-setup.sh
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
echo RED='\033[0;31m'
echo GREEN='\033[0;32m'
echo YELLOW='\033[1;33m'
echo NC='\033[0m'
echo.
echo DEPLOY_DIR="%DEPLOY_DIR%"
echo BACKEND_PORT=%BACKEND_PORT%
echo MESSAGING_PORT=%MESSAGING_PORT%
echo FRONTEND_PORT=%FRONTEND_PORT%
echo DB_NAME="%DB_NAME%"
echo DB_USER="%DB_USER%"
echo.
echo echo -e "${GREEN}Creating deployment directory...${NC}"
echo mkdir -p $DEPLOY_DIR
echo.
echo echo -e "${GREEN}Installing dependencies...${NC}"
echo apt-get update -y
echo apt-get install -y python3 python3-pip python3-venv nodejs npm redis-server git curl
echo.
echo echo -e "${GREEN}Installing PM2 and serve...${NC}"
echo npm install -g pm2 serve
echo.
echo echo -e "${GREEN}Setting up PostgreSQL database...${NC}"
echo # Reset postgres password and create user/database
echo echo "Resetting PostgreSQL postgres user password..."
echo sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
echo # Drop and recreate user/database for clean install
echo sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2^>/dev/null ^|^| true
echo sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2^>/dev/null ^|^| true
echo sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'BantuBuzz2024!';"
echo sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
echo echo "PostgreSQL setup complete!"
echo.
echo echo -e "${GREEN}Setting up application code...${NC}"
echo if [ -d "$DEPLOY_DIR/.git" ]; then
echo     cd $DEPLOY_DIR
echo     git pull origin main
echo else
echo     git clone https://github.com/hundredCentury100/bantubuzz.git $DEPLOY_DIR
echo fi
echo.
echo echo -e "${GREEN}Setting up Backend...${NC}"
echo cd $DEPLOY_DIR/backend
echo python3 -m venv venv
echo source venv/bin/activate
echo pip install --upgrade pip
echo pip install -r requirements.txt
echo pip install gunicorn psycopg2-binary
echo.
echo echo -e "${GREEN}Creating backend .env...${NC}"
echo cat ^> .env ^<^< 'ENVEOF'
echo FLASK_ENV=production
echo SECRET_KEY=$(openssl rand -hex 32^)
echo JWT_SECRET_KEY=$(openssl rand -hex 32^)
echo DATABASE_URL=postgresql://$DB_USER:BantuBuzz2024!@localhost:5432/$DB_NAME
echo REDIS_URL=redis://localhost:6379/0
echo PAYNOW_INTEGRATION_ID=YOUR_PAYNOW_ID
echo PAYNOW_INTEGRATION_KEY=YOUR_PAYNOW_KEY
echo PAYNOW_RETURN_URL=http://%SERVER_IP%:%FRONTEND_PORT%/payment/return
echo PAYNOW_RESULT_URL=http://%SERVER_IP%:%BACKEND_PORT%/api/payment/webhook
echo FRONTEND_URL=http://%SERVER_IP%:%FRONTEND_PORT%
echo MAIL_SERVER=smtp.gmail.com
echo MAIL_PORT=587
echo MAIL_USE_TLS=True
echo MAIL_USERNAME=your-email@gmail.com
echo MAIL_PASSWORD=your-app-password
echo MAIL_DEFAULT_SENDER=noreply@bantubuzz.com
echo ENVEOF
echo.
echo mkdir -p uploads/profiles/creators/gallery uploads/profiles/brands uploads/deliverables
echo.
echo echo -e "${GREEN}Running database migrations...${NC}"
echo export FLASK_APP=app
echo flask db upgrade 2^>/dev/null ^|^| python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
echo deactivate
echo.
echo echo -e "${GREEN}Setting up Messaging Service...${NC}"
echo cd $DEPLOY_DIR/messaging-service
echo npm install
echo cat ^> .env ^<^< 'ENVEOF'
echo PORT=%MESSAGING_PORT%
echo JWT_SECRET=$(openssl rand -hex 32^)
echo CORS_ORIGIN=http://%SERVER_IP%:%FRONTEND_PORT%
echo DATABASE_URL=postgresql://$DB_USER:BantuBuzz2024!@localhost:5432/$DB_NAME
echo ENVEOF
echo.
echo echo -e "${GREEN}Setting up Frontend...${NC}"
echo cd $DEPLOY_DIR/frontend
echo npm install
echo cat ^> .env ^<^< 'ENVEOF'
echo VITE_API_URL=http://%SERVER_IP%:%BACKEND_PORT%/api
echo VITE_MESSAGING_URL=http://%SERVER_IP%:%MESSAGING_PORT%/api
echo VITE_MESSAGING_SOCKET_URL=http://%SERVER_IP%:%MESSAGING_PORT%
echo ENVEOF
echo.
echo echo -e "${GREEN}Building frontend...${NC}"
echo npm run build
echo.
echo echo -e "${GREEN}Creating PM2 ecosystem...${NC}"
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
echo echo -e "${GREEN}Starting services...${NC}"
echo pm2 delete bantubuzz-backend 2^>/dev/null ^|^| true
echo pm2 delete bantubuzz-messaging 2^>/dev/null ^|^| true
echo pm2 delete bantubuzz-frontend 2^>/dev/null ^|^| true
echo pm2 start ecosystem.config.js
echo pm2 save
echo pm2 startup
echo.
echo echo ""
echo echo -e "${GREEN}=========================================="
echo echo "  Deployment Complete!"
echo echo "==========================================${NC}"
echo echo "Frontend: http://%SERVER_IP%:%FRONTEND_PORT%"
echo echo "Backend: http://%SERVER_IP%:%BACKEND_PORT%/api"
echo echo "Messaging: http://%SERVER_IP%:%MESSAGING_PORT%"
echo echo ""
echo echo -e "${YELLOW}UPDATE: /var/www/bantubuzz/backend/.env${NC}"
echo echo "Then: pm2 restart bantubuzz-backend"
) > "%SCRIPT_PATH%"

echo server-setup.sh generated!
echo.

echo ============================================
echo   Step 2: Copying to VPS
echo ============================================
echo.

scp "%SCRIPT_PATH%" %SERVER_USER%@%SERVER_IP%:/root/
if errorlevel 1 (
    echo.
    echo ERROR: Failed to copy file to server.
    echo Make sure you have SSH access configured.
    echo.
    pause
    exit /b 1
)
echo File copied successfully!
echo.

echo ============================================
echo   Step 3: Running deployment on VPS
echo ============================================
echo.
echo This may take 5-10 minutes...
echo.

REM Convert Windows line endings to Unix and run
ssh -t %SERVER_USER%@%SERVER_IP% "sed -i 's/\r$//' /root/server-setup.sh && chmod +x /root/server-setup.sh && /root/server-setup.sh"

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
echo ============================================
echo   NEXT STEPS - UPDATE CREDENTIALS
echo ============================================
echo.
echo 1. SSH into server:
echo    ssh %SERVER_USER%@%SERVER_IP%
echo.
echo 2. Edit backend .env:
echo    nano /var/www/bantubuzz/backend/.env
echo.
echo 3. Update these values:
echo    - PAYNOW_INTEGRATION_ID
echo    - PAYNOW_INTEGRATION_KEY
echo    - MAIL_USERNAME
echo    - MAIL_PASSWORD
echo.
echo 4. Restart backend:
echo    pm2 restart bantubuzz-backend
echo.
echo ============================================
echo   USEFUL COMMANDS
echo ============================================
echo.
echo   pm2 status        - Check service status
echo   pm2 logs          - View all logs
echo   pm2 restart all   - Restart all services
echo.
echo Press any key to exit...
pause >nul
