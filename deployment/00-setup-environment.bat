@echo off
echo ========================================
echo BantuBuzz Platform - Environment Setup
echo ========================================
echo.
echo This script will create production environment files on the VPS
echo.
pause

echo.
echo Creating environment files...
echo.

ssh root@173.212.245.22 "
# Create backend .env file
cat > /var/www/bantubuzz/backend/.env << 'EOF'
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=your-super-secret-production-key-change-this
DATABASE_URL=sqlite:///instance/bantubuzz.db
JWT_SECRET_KEY=your-jwt-secret-key-change-this
PAYNOW_INTEGRATION_ID=your-paynow-integration-id
PAYNOW_INTEGRATION_KEY=your-paynow-integration-key
FRONTEND_URL=http://173.212.245.22
BACKEND_URL=http://173.212.245.22/api
EOF

# Create messaging service .env file
cat > /var/www/bantubuzz/messaging-service/.env << 'EOF'
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://173.212.245.22
EOF

# Create frontend .env.production file
cat > /var/www/bantubuzz/frontend/.env.production << 'EOF'
VITE_API_URL=http://173.212.245.22/api
VITE_SOCKET_URL=http://173.212.245.22
EOF

echo ''
echo '=== Environment files created ==='
echo ''
echo 'IMPORTANT: Edit these files with your actual credentials:'
echo '  /var/www/bantubuzz/backend/.env'
echo '  /var/www/bantubuzz/messaging-service/.env'
echo '  /var/www/bantubuzz/frontend/.env.production'
echo ''
echo 'You can edit them by running:'
echo '  ssh root@173.212.245.22'
echo '  nano /var/www/bantubuzz/backend/.env'
"

echo.
echo.
echo Environment files created!
echo.
echo IMPORTANT: Remember to update the secret keys and API credentials
echo before starting the services!
echo.
pause
