@echo off
echo ========================================
echo BantuBuzz Platform - Configure Services
echo ========================================
echo.
echo This script will configure PM2 and Nginx
echo.
pause

echo.
echo Configuring services on VPS...
echo.

ssh root@173.212.245.22 "
# Create PM2 ecosystem file
cat > /var/www/bantubuzz/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bantubuzz-backend',
      cwd: '/var/www/bantubuzz/backend',
      script: 'venv/bin/gunicorn',
      args: '--bind 0.0.0.0:5000 --workers 4 --timeout 120 app:app',
      interpreter: 'none',
      env: {
        FLASK_ENV: 'production',
        FLASK_APP: 'run.py'
      },
      error_file: '/var/www/bantubuzz/logs/backend-error.log',
      out_file: '/var/www/bantubuzz/logs/backend-out.log',
      time: true
    },
    {
      name: 'bantubuzz-messaging',
      cwd: '/var/www/bantubuzz/messaging-service',
      script: 'server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/www/bantubuzz/logs/messaging-error.log',
      out_file: '/var/www/bantubuzz/logs/messaging-out.log',
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p /var/www/bantubuzz/logs

# Install gunicorn in the virtual environment
cd /var/www/bantubuzz/backend
source venv/bin/activate
pip install gunicorn
deactivate

# Create Nginx configuration
cat > /etc/nginx/sites-available/bantubuzz << 'EOF'
server {
    listen 80;
    server_name 173.212.245.22;

    # Frontend
    location / {
        root /var/www/bantubuzz/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Messaging Service WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploaded files
    location /uploads {
        alias /var/www/bantubuzz/backend/uploads;
        expires 30d;
        add_header Cache-Control 'public, immutable';
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/bantubuzz /etc/nginx/sites-enabled/bantubuzz

# Remove default site if it conflicts
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

echo ''
echo '=== Configuration complete ==='
echo ''
echo 'Services configured:'
echo '  - Backend: Port 5000 (via Gunicorn)'
echo '  - Messaging: Port 3001'
echo '  - Nginx: Port 80 (reverse proxy)'
echo ''
"

echo.
echo.
echo Configuration complete!
echo.
pause
