# Remaining Tasks - Phase 1 Backend Implementation

## ✅ COMPLETED SO FAR:

1. ✅ Updated `backend/app/models/wallet.py` - Changed comment to NET earnings
2. ✅ Updated `backend/app/models/brand_profile.py` - Added username field
3. ✅ Fixed `backend/app/services/payment_service.py:270` - Changed to use net_amount
4. ✅ Fixed `backend/app/services/wallet_service.py:54-60` - Changed to sum net_amount
5. ✅ Added `credit_brand_wallet()` function to `wallet_service.py`
6. ✅ Added `get_wallet_transactions()` helper to `wallet_service.py`
7. ✅ Created migration script: `backend/migrations/add_brand_wallet_and_fix_earnings.py`

---

## 🔄 REMAINING BACKEND TASKS:

### Task 1: Create Brand Wallet Routes
**File to create:** `backend/app/routes/brand_wallet.py`

```python
"""
Brand Wallet Routes - API endpoints for brand wallet operations
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.wallet_service import get_or_create_wallet, get_wallet_transactions
from app.models import User

bp = Blueprint('brand_wallet', __name__, url_prefix='/api/brand/wallet')


@bp.route('/', methods=['GET'])
@jwt_required()
def get_brand_wallet():
    """Get brand wallet balance and details"""
    try:
        current_user_id = get_jwt_identity()

        # Verify user is a brand
        user = User.query.get(current_user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized - Brand access only'}), 403

        wallet = get_or_create_wallet(current_user_id)
        return jsonify({
            'success': True,
            'wallet': wallet.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_brand_transactions():
    """Get brand wallet transaction history"""
    try:
        current_user_id = get_jwt_identity()

        # Verify user is a brand
        user = User.query.get(current_user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized - Brand access only'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result = get_wallet_transactions(current_user_id, page, per_page)
        return jsonify({
            'success': True,
            **result
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Task 2: Register Brand Wallet Blueprint
**File to modify:** `backend/app/__init__.py`

Find the section where blueprints are registered and add:
```python
# Import brand wallet routes
from app.routes import brand_wallet

# Register blueprint
app.register_blueprint(brand_wallet.bp)
```

### Task 3: Add Refund Logic to Bookings
**File to modify:** `backend/app/routes/bookings.py`

Find the booking rejection/cancellation endpoint and add refund logic:

```python
from app.services.wallet_service import credit_brand_wallet

# In the booking reject/cancel function:
if booking.payment_status == 'paid':
    # Credit brand wallet
    brand_user_id = booking.brand.user_id
    credit_brand_wallet(
        user_id=brand_user_id,
        amount=booking.amount,
        transaction_type='refund',
        description=f"Refund for rejected booking #{booking.id}",
        metadata={
            'booking_id': booking.id,
            'creator_id': booking.creator_id,
            'package_id': booking.package_id,
            'reason': 'Booking rejected by creator'
        }
    )
```

### Task 4: Add Refund Logic to Collaborations
**File to modify:** `backend/app/routes/collaborations.py`

Find the collaboration cancellation endpoint and add:

```python
from app.services.wallet_service import credit_brand_wallet

# In the collaboration cancel function:
if collaboration.payment_status == 'paid' and user_type == 'brand':
    # Credit brand wallet
    credit_brand_wallet(
        user_id=current_user_id,
        amount=collaboration.amount,
        transaction_type='refund',
        description=f"Refund for cancelled collaboration #{collaboration.id}",
        metadata={
            'collaboration_id': collaboration.id,
            'creator_id': collaboration.creator_id,
            'reason': 'Collaboration cancelled by brand'
        }
    )
```

### Task 5: Update Creator Profile Endpoint for Revision Settings
**File to modify:** `backend/app/routes/creators.py`

In the profile update endpoint (usually `PUT /api/creator/profile`), add:

```python
# Add these fields to the update logic
if 'free_revisions' in data:
    profile.free_revisions = int(data['free_revisions'])

if 'revision_fee' in data:
    profile.revision_fee = float(data['revision_fee'])

# Validate
if profile.free_revisions < 0 or profile.free_revisions > 10:
    return jsonify({'error': 'Free revisions must be between 0 and 10'}), 400

if profile.revision_fee < 0:
    return jsonify({'error': 'Revision fee cannot be negative'}), 400
```

### Task 6: Fix Admin Collaborations Route (if needed)
**Files to check:** `backend/app/routes/admin/collaborations.py`

Search for `total_earned` and verify it's using net amounts. Lines around 284 and 449 were mentioned in the grep results. These should be fixed to ensure proper NET tracking.

---

## 🚀 DEPLOYMENT STEPS:

### Step 1: Stop Backend
```bash
ssh root@173.212.245.22 "pkill -9 gunicorn"
```

### Step 2: Upload Backend Changes
```bash
scp -r "d:\Bantubuzz Platform\backend\app" root@173.212.245.22:/var/www/bantubuzz/backend/
scp -r "d:\Bantubuzz Platform\backend\migrations" root@173.212.245.22:/var/www/bantubuzz/backend/
```

### Step 3: Run Migration
```bash
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && python3 migrations/add_brand_wallet_and_fix_earnings.py"
```

### Step 4: Restart Backend
```bash
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && nohup /var/www/bantubuzz/backend/venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 'app:create_app()' > /tmp/gunicorn-8002.log 2>&1 &"
```

### Step 5: Verify Backend Running
```bash
ssh root@173.212.245.22 "ps aux | grep gunicorn | grep 8002 | grep -v grep"
```

### Step 6: Test API Endpoints
```bash
# Test brand wallet endpoint
ssh root@173.212.245.22 'curl -X POST http://localhost:8002/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"brand@demo.com\",\"password\":\"password123\"}" | python3 -c "import sys, json; tok=json.load(sys.stdin)[\"access_token\"]; import subprocess; r=subprocess.run([\"curl\", \"-s\", \"-X\", \"GET\", \"http://localhost:8002/api/brand/wallet\", \"-H\", f\"Authorization: Bearer {tok}\"], capture_output=True, text=True); print(r.stdout)"'
```

---

## 📋 TESTING CHECKLIST:

**After Deployment, Test:**

- [ ] Creator wallet shows NET earnings (not gross)
- [ ] Migration ran successfully
- [ ] Brand wallets were created for existing brands
- [ ] Brand wallet API endpoint works (`GET /api/brand/wallet`)
- [ ] Brand transactions API endpoint works (`GET /api/brand/wallet/transactions`)
- [ ] When creator rejects paid booking, brand wallet is credited
- [ ] When brand cancels paid collaboration, brand wallet is credited
- [ ] Creator can update revision settings in profile
- [ ] Platform revenue still calculates correctly on admin dashboard

---

## ⏭️ NEXT: PHASE 2 - FRONTEND

After Phase 1 is deployed and tested, proceed to Phase 2:
- Replace email with username across all pages
- Create brand wallet frontend page
- Add revision settings to creator profile form
- Implement real-time polling for dashboards

See `WALLET_AND_USERNAME_IMPLEMENTATION_PLAN.md` for complete Phase 2 details.

---

**CURRENT STATUS:** Phase 1 is 70% complete. Need to:
1. Create brand_wallet.py routes file
2. Register blueprint in __init__.py
3. Add refund logic to bookings and collaborations
4. Update creator profile endpoint
5. Deploy and test

All the hard logic (earnings calculations, brand wallet credit function) is already implemented!
