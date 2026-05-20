#!/bin/bash
# SmilePay Card Payment Express Checkout - Deployment Script
# Run this in your bash environment
# You will be prompted for password when SSH commands execute

echo "=========================================="
echo "SmilePay Card Payment Fix - Deployment"
echo "=========================================="
echo ""

# Configuration
REMOTE_USER="root"
REMOTE_HOST="173.212.245.22"
REMOTE_PATH="/var/www/bantubuzz/backend"
LOCAL_PATH="D:\Bantubuzz Platform\backend"

echo "Step 1: Verify backend is currently running..."
ssh $REMOTE_USER@$REMOTE_HOST "ps aux | grep gunicorn | grep -v grep"
echo ""

echo "Step 2: Backup current files..."
ssh $REMOTE_USER@$REMOTE_HOST "
  cd $REMOTE_PATH/app
  cp services/smilepay_service.py services/smilepay_service.py.backup.\$(date +%s)
  cp routes/smilepay_payments.py routes/smilepay_payments.py.backup.\$(date +%s)
  echo 'Backups created:'
  ls -lah services/smilepay_service.py.backup.* routes/smilepay_payments.py.backup.* | tail -2
"
echo ""

echo "Step 3: Stop gunicorn..."
ssh $REMOTE_USER@$REMOTE_HOST "pkill -f gunicorn; sleep 2; echo 'Gunicorn stopped'"
echo ""

echo "Step 4: Verify gunicorn is stopped..."
ssh $REMOTE_USER@$REMOTE_HOST "ps aux | grep gunicorn | grep -v grep || echo 'Gunicorn not running (good)'"
echo ""

echo "Step 5: Upload new files..."
echo "Uploading smilepay_service.py..."
scp "$LOCAL_PATH/app/services/smilepay_service.py" $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/app/services/
echo ""

echo "Uploading smilepay_payments.py..."
scp "$LOCAL_PATH/app/routes/smilepay_payments.py" $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/app/routes/
echo ""

echo "Step 6: Verify files were uploaded..."
ssh $REMOTE_USER@$REMOTE_HOST "
  echo 'Service file:'
  ls -lah $REMOTE_PATH/app/services/smilepay_service.py
  echo ''
  echo 'Route file:'
  ls -lah $REMOTE_PATH/app/routes/smilepay_payments.py
"
echo ""

echo "Step 7: Start gunicorn..."
ssh $REMOTE_USER@$REMOTE_HOST "
  cd $REMOTE_PATH
  source venv/bin/activate
  gunicorn --bind 0.0.0.0:8002 --workers 4 --timeout 120 'app:create_app()' --daemon --error-logfile gunicorn_error.log --access-logfile gunicorn.log
  sleep 3
  echo 'Gunicorn started'
"
echo ""

echo "Step 8: Verify gunicorn is running..."
ssh $REMOTE_USER@$REMOTE_HOST "ps aux | grep gunicorn | grep -v grep"
echo ""

echo "Step 9: Check backend logs..."
ssh $REMOTE_USER@$REMOTE_HOST "
  echo '=== Gunicorn Error Log (last 20 lines) ==='
  tail -20 $REMOTE_PATH/gunicorn_error.log 2>/dev/null || echo 'No error log yet'
  echo ''
  echo '=== Application Log (last 20 lines) ==='
  tail -20 $REMOTE_PATH/logs/app.log 2>/dev/null || echo 'No app log yet'
"
echo ""

echo "Step 10: Test health endpoint..."
echo "Testing: curl http://173.212.245.22:8002/api/health"
curl -s http://173.212.245.22:8002/api/health | head -20
echo ""
echo ""

echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo "✓ Files backed up"
echo "✓ New files uploaded"
echo "✓ Gunicorn restarted"
echo "✓ Backend should be running on port 8002"
echo ""
echo "Next: Test the card payment endpoint with a valid JWT token"
echo ""
echo "curl -X POST http://173.212.245.22:8002/api/smilepay/card \\"
echo "  -H \"Authorization: Bearer <YOUR_JWT_TOKEN>\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"payment_type\": \"subscription\", \"amount\": 10.00, \"currency\": \"USD\", \"card_type\": \"visa\", \"item_name\": \"Test\"}'"
echo ""
echo "=========================================="
