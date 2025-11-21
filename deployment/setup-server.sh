#/bin/bash
set -e

echo "=========================================="
echo "  BantuBuzz Server Setup"
echo "=========================================="

DEPLOY_DIR="/var/www/bantubuzz"
BACKEND_PORT=8002
MESSAGING_PORT=3002
FRONTEND_PORT=8080
DB_NAME="bantubuzz"
DB_USER="bantubuzz_user"

# Setup Backend
echo "Setting up Backend..."
cd $DEPLOY_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# Create backend .env
echo "Creating backend .env..."
cat > .env << 'ENVEOF'
FLASK_ENV=production
SECRET_KEY=bantubuzz-prod-secret-key-2024-secure
JWT_SECRET_KEY=bantubuzz-jwt-secret-key-2024-secure
DATABASE_URL=postgresql://$DB_USER:BantuBuzz20245432/$DB_NAME
REDIS_URL=redis://localhost:6379/0
MAIL_SERVER=bantubuzz.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USE_TLS=False
MAIL_USERNAME=user@bantubuzz.com
MAIL_PASSWORD=-=hdZJ_pds
MAIL_DEFAULT_SENDER=user@bantubuzz.com
PAYNOW_INTEGRATION_ID=22185
PAYNOW_INTEGRATION_KEY=c3a1de78-ed65-4487-8e75-de14510b109b
PAYNOW_RETURN_URL=http://173.212.245.22:8080/payment/return
PAYNOW_RESULT_URL=http://173.212.245.22:8002/api/bookings/payment-webhook
FRONTEND_URL=http://173.212.245.22:8080
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads
ALLOWED_EXTENSIONS=png,jpg,jpeg,gif,pdf,mp4,mov
ENVEOF

mkdir -p uploads/profiles/creators/gallery uploads/profiles/brands uploads/deliverables

echo "Running database migrations..."
export FLASK_APP=app
flask db upgrade 2>/dev/null || python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
deactivate

# Setup Messaging
echo "Setting up Messaging Service..."
cd $DEPLOY_DIR/messaging-service
npm install
cat > .env << 'ENVEOF'
PORT=3002
JWT_SECRET=bantubuzz-messaging-jwt-2024
CORS_ORIGIN=http://173.212.245.22:8080
DATABASE_URL=postgresql://$DB_USER:BantuBuzz20245432/$DB_NAME
ENVEOF

# Setup Frontend
echo "Setting up Frontend..."
cd $DEPLOY_DIR/frontend
npm install
cat > .env << 'ENVEOF'
VITE_API_URL=http://173.212.245.22:8002/api
VITE_MESSAGING_URL=http://173.212.245.22:3002/api
VITE_MESSAGING_SOCKET_URL=http://173.212.245.22:3002
ENVEOF

echo "Building frontend..."
npm run build

# PM2 ecosystem
echo "Creating PM2 ecosystem..."
cd $DEPLOY_DIR
cat > ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [
    {
      name: 'bantubuzz-backend',
      cwd: '/var/www/bantubuzz/backend',
      script: 'venv/bin/gunicorn',
      args: '-w 4 -b 0.0.0.0:8002 --timeout 120 "app:create_app()"',
      interpreter: 'none',
      env: { FLASK_ENV: 'production' }
    },
    {
      name: 'bantubuzz-messaging',
      cwd: '/var/www/bantubuzz/messaging-service',
      script: 'npm',
      args: 'start',
      interpreter: 'none'
    },
    {
      name: 'bantubuzz-frontend',
      cwd: '/var/www/bantubuzz/frontend',
      script: 'serve',
      args: '-s dist -l 8080',
      interpreter: 'none'
    }
  ]
};
PMEOF

echo "Starting services..."
pm2 delete bantubuzz-backend 2>/dev/null || true
pm2 delete bantubuzz-messaging 2>/dev/null || true
pm2 delete bantubuzz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo "  Deployment Complete"
echo "=========================================="
echo "Frontend: http://173.212.245.22:8080"
echo "Backend: http://173.212.245.22:8002/api"
echo "Messaging: http://173.212.245.22:3002"
