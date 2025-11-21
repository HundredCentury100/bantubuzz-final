#/bin/bash
set -e

echo "=========================================="
echo "  BantuBuzz Server Setup"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_DIR="/var/www/bantubuzz"
BACKEND_PORT=8002
MESSAGING_PORT=3002
FRONTEND_PORT=8080
DB_NAME="bantubuzz"
DB_USER="bantubuzz_user"

echo -e "${GREEN}Creating deployment directory...${NC}"
mkdir -p $DEPLOY_DIR

echo -e "${GREEN}Installing dependencies...${NC}"
apt-get update -y
apt-get install -y python3 python3-pip python3-venv nodejs npm redis-server git curl

echo -e "${GREEN}Installing PM2 and serve...${NC}"
npm install -g pm2 serve

echo -e "${GREEN}Setting up PostgreSQL database...${NC}"
# Reset postgres password and create user/database
echo "Resetting PostgreSQL postgres user password..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
# Drop and recreate user/database for clean install
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'BantuBuzz2024';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
echo "PostgreSQL setup complete"

echo -e "${GREEN}Setting up application code...${NC}"
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd $DEPLOY_DIR
    git pull origin main
else
    git clone https://github.com/hundredCentury100/bantubuzz.git $DEPLOY_DIR
fi

echo -e "${GREEN}Setting up Backend...${NC}"
cd $DEPLOY_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

echo -e "${GREEN}Creating backend .env...${NC}"
cat > .env << 'ENVEOF'
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://$DB_USER:BantuBuzz20245432/$DB_NAME
REDIS_URL=redis://localhost:6379/0
PAYNOW_INTEGRATION_ID=YOUR_PAYNOW_ID
PAYNOW_INTEGRATION_KEY=YOUR_PAYNOW_KEY
PAYNOW_RETURN_URL=http://173.212.245.22:8080/payment/return
PAYNOW_RESULT_URL=http://173.212.245.22:8002/api/payment/webhook
FRONTEND_URL=http://173.212.245.22:8080
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@bantubuzz.com
ENVEOF

mkdir -p uploads/profiles/creators/gallery uploads/profiles/brands uploads/deliverables

echo -e "${GREEN}Running database migrations...${NC}"
export FLASK_APP=app
flask db upgrade 2>/dev/null || python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
deactivate

echo -e "${GREEN}Setting up Messaging Service...${NC}"
cd $DEPLOY_DIR/messaging-service
npm install
cat > .env << 'ENVEOF'
PORT=3002
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://173.212.245.22:8080
DATABASE_URL=postgresql://$DB_USER:BantuBuzz20245432/$DB_NAME
ENVEOF

echo -e "${GREEN}Setting up Frontend...${NC}"
cd $DEPLOY_DIR/frontend
npm install
cat > .env << 'ENVEOF'
VITE_API_URL=http://173.212.245.22:8002/api
VITE_MESSAGING_URL=http://173.212.245.22:3002/api
VITE_MESSAGING_SOCKET_URL=http://173.212.245.22:3002
ENVEOF

echo -e "${GREEN}Building frontend...${NC}"
npm run build

echo -e "${GREEN}Creating PM2 ecosystem...${NC}"
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

echo -e "${GREEN}Starting services...${NC}"
pm2 delete bantubuzz-backend 2>/dev/null || true
pm2 delete bantubuzz-messaging 2>/dev/null || true
pm2 delete bantubuzz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}=========================================="
echo "  Deployment Complete"
echo "==========================================${NC}"
echo "Frontend: http://173.212.245.22:8080"
echo "Backend: http://173.212.245.22:8002/api"
echo "Messaging: http://173.212.245.22:3002"
echo ""
echo -e "${YELLOW}UPDATE: /var/www/bantubuzz/backend/.env${NC}"
echo "Then: pm2 restart bantubuzz-backend"
