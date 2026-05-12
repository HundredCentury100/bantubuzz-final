# SmilePay Card Payment Express Checkout - Deployment Guide

## Overview
This document provides step-by-step instructions to deploy the SmilePay card payment fixes to your production server at **173.212.245.22**. The fix implements proper Express Checkout pattern for card payments (Visa/Mastercard), eliminating PCI compliance risks by not collecting card details in our forms.

## What Changed
- **`backend/app/services/smilepay_service.py`**: Card payment method now uses Express Checkout (redirect-based, not collecting card details)
- **`backend/app/routes/smilepay_payments.py`**: Card payment endpoint updated to accept only `card_type` (visa/mastercard), not card details

## Pre-Deployment Verification

### Local Verification (Already Complete)
✅ Changes verified in local repository on `edits` branch

### Server Information
- **Host**: 173.212.245.22
- **User**: root
- **Backend Location**: `/var/www/bantubuzz/backend`
- **Backend Service**: Gunicorn (port 8002)
- **Database**: PostgreSQL

## Deployment Steps

### Step 1: Connect to Server
```bash
ssh root@173.212.245.22
# Enter password: P9MYrbtC61MA54t
```

### Step 2: Backup Current Files
```bash
cd /var/www/bantubuzz/backend/app
cp services/smilepay_service.py services/smilepay_service.py.backup.$(date +%s)
cp routes/smilepay_payments.py routes/smilepay_payments.py.backup.$(date +%s)
```

### Step 3: Deploy Updated Files
Copy the updated files from your local machine to the server. You can use SCP:

**From your local machine (Windows):**
```powershell
# Copy smilepay_service.py
scp -r "D:\Bantubuzz Platform\backend\app\services\smilepay_service.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/services/

# Copy smilepay_payments.py
scp -r "D:\Bantubuzz Platform\backend\app\routes\smilepay_payments.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/
```

Or manually edit the files on the server using SSH and a terminal editor (vi/nano).

### Step 4: Verify File Permissions
```bash
ssh root@173.212.245.22 "ls -la /var/www/bantubuzz/backend/app/services/smilepay_service.py && ls -la /var/www/bantubuzz/backend/app/routes/smilepay_payments.py"
```

### Step 5: Restart Backend Service
```bash
ssh root@173.212.245.22 "pkill -f gunicorn; sleep 2; cd /var/www/bantubuzz/backend && source venv/bin/activate && gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 'app:create_app()' --daemon"
```

Verify it restarted:
```bash
ssh root@173.212.245.22 "sleep 3 && ps aux | grep gunicorn | grep -v grep"
```

### Step 6: Check Backend Logs
```bash
ssh root@173.212.245.22 "tail -50 /var/www/bantubuzz/backend/logs/app.log 2>/dev/null || echo 'Log file not found'"
```

## Testing the Deployment

### Test 1: Health Check
```bash
curl http://173.212.245.22:8002/api/health
```

### Test 2: Card Payment Initiation (Requires Auth Token)
You'll need a valid JWT token for a test user. Example request:

```bash
curl -X POST http://173.212.245.22:8002/api/smilepay/card \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_type": "subscription",
    "amount": 10.00,
    "currency": "USD",
    "card_type": "visa",
    "item_name": "Test Card Payment",
    "item_description": "Testing Express Checkout flow",
    "return_url": "https://bantubuzz.com/payment/success",
    "result_url": "https://bantubuzz.com/api/webhook/smilepay",
    "cancel_url": "https://bantubuzz.com/payment/cancelled",
    "failure_url": "https://bantubuzz.com/payment/failed"
  }'
```

Expected response:
```json
{
  "success": true,
  "order_reference": "ORD_SUBSCRIPTION_123_timestamp",
  "redirect_url": "https://checkout.smilepay.co.zw/...",
  "message": "Redirecting to visa payment page",
  "status": "PENDING"
}
```

### Test 3: Verify Card Details NOT Required
The endpoint should NOT require these fields anymore:
- ❌ `card_number`
- ❌ `expiry_month`
- ❌ `expiry_year`
- ❌ `cvv`
- ❌ `cardholder_name`

Only these fields are required:
- ✅ `payment_type`
- ✅ `amount`
- ✅ `item_name`
- ✅ `card_type` (visa or mastercard)

## Rollback Plan (If Issues Occur)

### Quick Rollback
If the deployment causes issues, quickly restore from backup:

```bash
ssh root@173.212.245.22 "
  cd /var/www/bantubuzz/backend/app
  # List backups
  ls -la services/smilepay_service.py.backup.* routes/smilepay_payments.py.backup.*
  
  # Restore to most recent backup
  cp services/smilepay_service.py.backup.* services/smilepay_service.py
  cp routes/smilepay_payments.py.backup.* routes/smilepay_payments.py
  
  # Restart
  pkill -f gunicorn; sleep 2; cd /var/www/bantubuzz/backend && source venv/bin/activate && gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 'app:create_app()' --daemon
"
```

## API Changes Summary

### Before (Incorrect - Collecting Card Details)
```json
POST /api/smilepay/card
{
  "payment_type": "subscription",
  "card_number": "4111111111111111",
  "expiry_month": "12",
  "expiry_year": "25",
  "cvv": "123",
  "cardholder_name": "John Doe",
  "amount": 10.00
}
```
⚠️ **Problem**: Card details collected in-app = PCI liability

### After (Correct - Express Checkout)
```json
POST /api/smilepay/card
{
  "payment_type": "subscription",
  "card_type": "visa",
  "amount": 10.00,
  "currency": "USD",
  "item_name": "Premium Subscription",
  "item_description": "Monthly premium plan",
  "return_url": "https://...",
  "result_url": "https://...",
  "cancel_url": "https://...",
  "failure_url": "https://..."
}
```
✅ **Benefits**:
- No card details collected in-app
- PCI compliant (SmilePay handles the secure collection)
- User redirected to SmilePay's hosted checkout (like Ecocash/Innbucks)
- Secure payment processing
- Webhook callback with payment status

## Monitoring After Deployment

### Watch for These Logs
1. **Card payment initiations**: `Initiating visa payment for order...`
2. **SmilePay API responses**: `Card payment response: {...}`
3. **Transaction creation**: `Created visa transaction ... for user ...`
4. **Any errors**: `Card payment error:...`

### Check Database Transactions
```bash
ssh root@173.212.245.22 "
  cd /var/www/bantubuzz/backend
  source venv/bin/activate
  python3 -c \"
from app import db, create_app
from app.models import SmilePayTransaction
app = create_app()
with app.app_context():
    transactions = SmilePayTransaction.query.filter(SmilePayTransaction.payment_method.in_(['visa', 'mastercard'])).order_by(SmilePayTransaction.created_at.desc()).limit(5).all()
    for t in transactions:
        print(f'Order: {t.order_reference}, Status: {t.status}, Method: {t.payment_method}, Amount: {t.amount}')
\"
"
```

## Success Criteria
✅ Backend service restarts without errors
✅ Card payment endpoint returns `redirect_url` instead of processing locally
✅ Card details are NOT required in request
✅ SmilePay redirects user to hosted checkout page
✅ Webhook receives payment status callback
✅ Transaction records created with correct status
✅ No PCI compliance issues (card details not stored in our database)

## Next Steps
1. **Frontend Update** (if needed): Ensure frontend sends only `card_type` and removes card detail fields
2. **End-to-End Testing**: Test complete user flow on staging environment
3. **Production Release**: After staging validation, deploy to main site
4. **Monitor Logs**: Watch application logs for the first 24 hours
5. **Analytics**: Track payment success rates and redirect completions

## Support/Troubleshooting
- Check logs: `/var/www/bantubuzz/backend/logs/app.log`
- Restart service: `pkill -f gunicorn && cd /var/www/bantubuzz/backend && source venv/bin/activate && gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 'app:create_app()' --daemon`
- Verify SmilePay config: `/var/www/bantubuzz/backend/app/config/smilepay_config.py`
- Check database: PostgreSQL on the server
