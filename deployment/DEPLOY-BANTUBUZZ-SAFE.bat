@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo   BantuBuzz Platform SAFE Deployment Script
echo   Target: Contabo VPS (173.212.245.22)
echo
echo   This script will NOT affect:
echo   - Apache on ports 80/443/8081
echo   - savanna_sage_lms on port 8001
echo   - thunzi.co on port 5000
echo   - MySQL on port 3306
echo   - Existing PostgreSQL on port 5432
echo   - n8n on port 5678
echo ============================================
echo.

REM Configuration - Using ports that don't conflict
set SERVER_IP=173.212.245.22
set SERVER_USER=root
set DEPLOY_DIR=/var/www/bantubuzz
set BACKEND_PORT=8002
set MESSAGING_PORT=3002
set FRONTEND_PORT=8080

REM Database config (uses existing PostgreSQL)
set DB_NAME=bantubuzz
set DB_USER=bantubuzz_user
set DB_PORT=5432

echo Configuration:
echo   Server: %SERVER_USER%@%SERVER_IP%
echo   Deploy Directory: %DEPLOY_DIR%
echo   Backend Port: %BACKEND_PORT% (Gunicorn)
echo   Messaging Port: %MESSAGING_PORT% (Node.js)
echo   Frontend Port: %FRONTEND_PORT% (serve static)
echo   Database: Uses existing PostgreSQL on port %DB_PORT%
echo.
echo NO NGINX INSTALLED - Uses PM2 serve for frontend
echo.

echo ============================================
echo   Creating Server Setup Script
echo ============================================
echo.

(
echo #!/bin/bash
echo set -e
echo.
echo echo "=========================================="
echo echo "  BantuBuzz SAFE Server Setup"
echo echo "  Will NOT affect existing services"
echo echo "=========================================="
echo.
echo # Colors
echo RED='\033[0;31m'
echo GREEN='\033[0;32m'
echo YELLOW='\033[1;33m'
echo NC='\033[0m'
echo.
echo # Configuration
echo DEPLOY_DIR="%DEPLOY_DIR%"
echo BACKEND_PORT=%BACKEND_PORT%
echo MESSAGING_PORT=%MESSAGING_PORT%
echo FRONTEND_PORT=%FRONTEND_PORT%
echo DB_NAME="%DB_NAME%"
echo DB_USER="%DB_USER%"
echo.
echo echo -e "${YELLOW}Checking existing services...${NC}"
echo echo "Port 80: $(netstat -tlnp 2^>/dev/null ^| grep :80 ^| head -1 ^|^| echo 'free')"
echo echo "Port 5000: $(netstat -tlnp 2^>/dev/null ^| grep :5000 ^| head -1 ^|^| echo 'free')"
echo echo "Port 8001: $(netstat -tlnp 2^>/dev/null ^| grep :8001 ^| head -1 ^|^| echo 'free')"
echo echo "Port 8002: $(netstat -tlnp 2^>/dev/null ^| grep :8002 ^| head -1 ^|^| echo 'free')"
echo echo "Port 8080: $(netstat -tlnp 2^>/dev/null ^| grep :8080 ^| head -1 ^|^| echo 'free')"
echo echo ""
echo.
echo echo -e "${GREEN}Creating deployment directory...${NC}"
echo mkdir -p $DEPLOY_DIR
echo.
echo echo -e "${GREEN}Installing dependencies (no Nginx)...${NC}"
echo apt-get update
echo apt-get install -y python3 python3-pip python3-venv nodejs npm redis-server git
echo.
echo # Install PM2 and serve globally
echo echo -e "${GREEN}Installing PM2 and serve...${NC}"
echo npm install -g pm2 serve
echo.
echo # Setup PostgreSQL database (uses existing PostgreSQL)
echo echo -e "${GREEN}Setting up PostgreSQL database...${NC}"
echo sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'BantuBuzz2024!';" 2^>/dev/null ^|^| echo "User already exists"
echo sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2^>/dev/null ^|^| echo "Database already exists"
echo sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo.
echo # Clone or update repository
echo echo -e "${GREEN}Setting up application code...${NC}"
echo if [ -d "$DEPLOY_DIR/.git" ]; then
echo     cd $DEPLOY_DIR
echo     git pull origin main
echo else
echo     git clone https://github.com/HundredCentury100/bantubuzz-final.git $DEPLOY_DIR
echo fi
echo.
echo # Setup Backend
echo echo -e "${GREEN}Setting up Backend...${NC}"
echo cd $DEPLOY_DIR/backend
echo python3 -m venv venv
echo source venv/bin/activate
echo pip install --upgrade pip
echo pip install -r requirements.txt
echo pip install gunicorn psycopg2-binary
echo.
echo # Create backend .env file
echo echo -e "${GREEN}Creating backend environment file...${NC}"
echo cat ^> .env ^<^< 'ENVEOF'
echo FLASK_ENV=production
echo SECRET_KEY=$(openssl rand -hex 32)
echo JWT_SECRET_KEY=$(openssl rand -hex 32)
echo.
echo # Database - uses existing PostgreSQL
echo DATABASE_URL=postgresql://$DB_USER:BantuBuzz2024!@localhost:5432/$DB_NAME
echo.
echo # Redis
echo REDIS_URL=redis://localhost:6379/0
echo.
echo # Paynow - UPDATE THESE WITH YOUR ACTUAL KEYS
echo PAYNOW_INTEGRATION_ID=YOUR_PAYNOW_INTEGRATION_ID
echo PAYNOW_INTEGRATION_KEY=YOUR_PAYNOW_INTEGRATION_KEY
echo PAYNOW_RETURN_URL=http://%SERVER_IP%:%FRONTEND_PORT%/payment/return
echo PAYNOW_RESULT_URL=http://%SERVER_IP%:%BACKEND_PORT%/api/payment/webhook
echo.
echo # Frontend URL
echo FRONTEND_URL=http://%SERVER_IP%:%FRONTEND_PORT%
echo.
echo # Mail - UPDATE THESE WITH YOUR ACTUAL CREDENTIALS
echo MAIL_SERVER=smtp.gmail.com
echo MAIL_PORT=587
echo MAIL_USE_TLS=True
echo MAIL_USERNAME=your-email@gmail.com
echo MAIL_PASSWORD=your-app-password
echo MAIL_DEFAULT_SENDER=noreply@bantubuzz.com
echo ENVEOF
echo.
echo # Create uploads directory
echo mkdir -p uploads/profiles/creators/gallery uploads/profiles/brands uploads/deliverables
echo.
echo # Run database migrations
echo echo -e "${GREEN}Running database migrations...${NC}"
echo export FLASK_APP=app
echo flask db upgrade 2^>/dev/null ^|^| python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
echo deactivate
echo.
echo # Setup Messaging Service
echo echo -e "${GREEN}Setting up Messaging Service...${NC}"
echo cd $DEPLOY_DIR/messaging-service
echo npm install
echo.
echo # Create messaging .env file
echo cat ^> .env ^<^< 'ENVEOF'
echo PORT=%MESSAGING_PORT%
echo JWT_SECRET=$(openssl rand -hex 32)
echo CORS_ORIGIN=http://%SERVER_IP%:%FRONTEND_PORT%
echo DATABASE_URL=postgresql://$DB_USER:BantuBuzz2024!@localhost:5432/$DB_NAME
echo ENVEOF
echo.
echo # Setup Frontend
echo echo -e "${GREEN}Setting up Frontend...${NC}"
echo cd $DEPLOY_DIR/frontend
echo npm install
echo.
echo # Create frontend .env file
echo cat ^> .env ^<^< 'ENVEOF'
echo VITE_API_URL=http://%SERVER_IP%:%BACKEND_PORT%/api
echo VITE_MESSAGING_URL=http://%SERVER_IP%:%MESSAGING_PORT%/api
echo VITE_MESSAGING_SOCKET_URL=http://%SERVER_IP%:%MESSAGING_PORT%
echo ENVEOF
echo.
echo # Build frontend
echo echo -e "${GREEN}Building frontend...${NC}"
echo npm run build
echo.
echo # Create PM2 ecosystem file (NO NGINX - uses serve)
echo echo -e "${GREEN}Creating PM2 ecosystem file...${NC}"
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
echo       env: {
echo         FLASK_ENV: 'production'
echo       }
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
echo # Stop any existing bantubuzz PM2 processes
echo echo -e "${GREEN}Starting services with PM2...${NC}"
echo pm2 delete bantubuzz-backend 2^>/dev/null ^|^| true
echo pm2 delete bantubuzz-messaging 2^>/dev/null ^|^| true
echo pm2 delete bantubuzz-frontend 2^>/dev/null ^|^| true
echo.
echo cd $DEPLOY_DIR
echo pm2 start ecosystem.config.js
echo pm2 save
echo pm2 startup
echo.
echo echo ""
echo echo -e "${GREEN}=========================================="
echo echo "  Deployment Complete!"
echo echo "==========================================${NC}"
echo echo ""
echo echo "Access your platform at:"
echo echo "  Frontend: http://%SERVER_IP%:%FRONTEND_PORT%"
echo echo "  Backend API: http://%SERVER_IP%:%BACKEND_PORT%/api"
echo echo "  Messaging: http://%SERVER_IP%:%MESSAGING_PORT%"
echo echo ""
echo echo -e "${YELLOW}IMPORTANT: Update the following in $DEPLOY_DIR/backend/.env:${NC}"
echo echo "  - PAYNOW_INTEGRATION_ID"
echo echo "  - PAYNOW_INTEGRATION_KEY"
echo echo "  - MAIL_USERNAME"
echo echo "  - MAIL_PASSWORD"
echo echo ""
echo echo "Then restart: pm2 restart bantubuzz-backend"
echo echo ""
echo echo "Management commands:"
echo echo "  pm2 status           - View service status"
echo echo "  pm2 logs             - View logs"
echo echo "  pm2 restart all      - Restart all services"
echo echo ""
echo echo -e "${GREEN}Existing services NOT affected:${NC}"
echo echo "  - Apache on ports 80/443/8081"
echo echo "  - savanna_sage_lms on port 8001"
echo echo "  - thunzi.co on port 5000"
echo echo "  - n8n on port 5678"
echo echo ""
) > server-setup.sh

echo server-setup.sh created!
echo.

echo ============================================
echo   DEPLOYMENT INSTRUCTIONS
echo ============================================
echo.
echo This deployment is SAFE and will not affect existing services.
echo.
echo Ports used by BantuBuzz:
echo   - 8002: Backend API
echo   - 3002: Messaging Service
echo   - 8080: Frontend
echo.
echo Ports NOT touched (existing services):
echo   - 80, 443, 8081: Apache
echo   - 8001: savanna_sage_lms
echo   - 5000: thunzi.co
echo   - 5678: n8n
echo.
echo Steps to deploy:
echo.
echo 1. Copy server-setup.sh to your VPS:
echo    scp server-setup.sh %SERVER_USER%@%SERVER_IP%:/root/
echo.
echo 2. SSH into your server:
echo    ssh %SERVER_USER%@%SERVER_IP%
echo.
echo 3. Run the setup script:
echo    chmod +x /root/server-setup.sh
echo    /root/server-setup.sh
echo.
echo 4. Update %DEPLOY_DIR%/backend/.env with:
echo    - Your Paynow credentials
echo    - Your email credentials
echo.
echo 5. Restart backend:
echo    pm2 restart bantubuzz-backend
echo.
echo ============================================
echo   Script completed! server-setup.sh created
echo ============================================
echo.
echo Press any key to exit...
pause >nul
cmd /k
