# Comprehensive Wallet & Username Implementation Plan

**Date:** 2025-01-11
**Goal:** Implement brand wallets, fix earnings calculation, add revision settings, replace emails with usernames, and add real-time updates

---

## 1. DATABASE CHANGES

### 1.1 Migration Created
- ✅ File: `backend/migrations/add_brand_wallet_and_fix_earnings.py`
- Adds `username` to `brand_profiles`
- Creates wallets for all brands
- Recalculates `total_earned` to be NET (after fees)

### 1.2 Model Updates Needed
- **wallet.py** - Update comment on `total_earned` (line 15)
- **brand_profile.py** - Add `username` field to model and `to_dict()`

---

## 2. BACKEND CODE CHANGES

### 2.1 Fix Total Earnings Calculation
**Files to Update:**
1. `app/services/payment_service.py:270`
   - Change: `wallet.total_earned += gross_amount`
   - To: `wallet.total_earned += net_amount`

2. `app/routes/admin/collaborations.py:284`
   - Change: `creator_wallet.total_earned += collab.amount`
   - To: `creator_wallet.total_earned += (collab.amount - platform_fee)`

3. `app/routes/admin/collaborations.py:449`
   - Change: `creator_wallet.total_earned += creator_payment`
   - To: `creator_wallet.total_earned += net_creator_payment`

4. `app/services/wallet_service.py:55-66`
   - Update `calculate_wallet_balances()` to sum `net_amount` instead of `amount`

### 2.2 Brand Wallet Credit Logic
**New Functions Needed:**

#### a) `app/services/wallet_service.py`
```python
def credit_brand_wallet(user_id, amount, transaction_type, description, metadata=None):
    """Credit a brand's wallet with refunded amount"""
    wallet = get_or_create_wallet(user_id)

    # Create credit transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type=transaction_type,  # 'refund' or 'credit'
        amount=amount,
        status='available',
        clearance_required=False,
        description=description,
        transaction_metadata=metadata
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance = float(wallet.available_balance) + amount
    wallet.updated_at = datetime.utcnow()

    db.session.commit()
    return transaction
```

#### b) Update Booking Rejection Logic
**File:** `app/routes/bookings.py` or relevant booking routes

When creator rejects booking AFTER payment:
```python
if booking.payment_status == 'paid':
    # Refund to brand wallet
    credit_brand_wallet(
        user_id=booking.brand.user_id,
        amount=booking.amount,
        transaction_type='refund',
        description=f"Refund for rejected booking #{booking.id}",
        metadata={
            'booking_id': booking.id,
            'creator_id': booking.creator_id,
            'package_id': booking.package_id
        }
    )
```

#### c) Update Collaboration Cancellation Logic
**File:** `app/routes/collaborations.py`

When brand cancels collaboration AFTER payment:
```python
if collaboration.payment_status == 'paid':
    credit_brand_wallet(
        user_id=collaboration.brand_id,
        amount=collaboration.amount,
        transaction_type='refund',
        description=f"Refund for cancelled collaboration #{collaboration.id}",
        metadata={
            'collaboration_id': collaboration.id,
            'creator_id': collaboration.creator_id
        }
    )
```

### 2.3 Brand Wallet Routes
**New File:** `app/routes/brand_wallet.py`

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.wallet_service import get_or_create_wallet, get_wallet_transactions

bp = Blueprint('brand_wallet', __name__, url_prefix='/api/brand/wallet')

@bp.route('/', methods=['GET'])
@jwt_required()
def get_brand_wallet():
    """Get brand wallet balance and details"""
    current_user_id = get_jwt_identity()
    wallet = get_or_create_wallet(current_user_id)
    return jsonify({'wallet': wallet.to_dict()}), 200

@bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_brand_transactions():
    """Get brand wallet transaction history"""
    current_user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    result = get_wallet_transactions(current_user_id, page, per_page)
    return jsonify(result), 200
```

Register in `app/__init__.py`:
```python
from app.routes import brand_wallet
app.register_blueprint(brand_wallet.bp)
```

### 2.4 Revision Settings in Creator Profile
**File:** `app/routes/creators.py`

Update profile endpoint to allow editing `free_revisions` and `revision_fee`:
```python
@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_creator_profile():
    # ... existing code ...

    # Add these fields
    if 'free_revisions' in data:
        profile.free_revisions = int(data['free_revisions'])
    if 'revision_fee' in data:
        profile.revision_fee = float(data['revision_fee'])

    # ... rest of update logic ...
```

---

## 3. FRONTEND CHANGES

### 3.1 Replace Email with Username

**Files to Update:**

1. **Creator Dashboard** (`frontend/src/pages/CreatorDashboard.jsx`)
   - Find all `.email` references
   - Replace with `.username` or fallback: `{creator.username || creator.user?.email}`

2. **Brand Dashboard** (`frontend/src/pages/BrandDashboard.jsx`)
   - Replace brand email displays with company_name or username

3. **Messages** (`frontend/src/pages/Messages.jsx`)
   - Use username for display names

4. **Bookings List** (all booking-related pages)
   - Display creator username instead of email
   - Display brand company_name instead of email

5. **Admin Pages** (`frontend/src/pages/admin/*`)
   - Update user lists to show username
   - Keep email in details view only

**Pattern to use:**
```jsx
// Old:
<p>{creator.user?.email}</p>

// New:
<p>{creator.username || creator.user?.username || creator.user?.email}</p>
```

### 3.2 Brand Wallet Pages

#### a) Create `frontend/src/pages/BrandWallet.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

export default function BrandWallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await api.get('/brand/wallet');
      setWallet(response.data.wallet);
    } catch (error) {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/brand/wallet/transactions');
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Brand Wallet</h1>

      {/* Wallet Balance Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Available Balance</p>
            <p className="text-3xl font-bold text-primary">
              ${(wallet?.available_balance || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Available for bookings and collaborations
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total Spent</p>
            <p className="text-2xl font-semibold">
              ${(wallet?.withdrawn_total || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="border-b pb-3">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### b) Add route in `frontend/src/App.jsx`
```jsx
import BrandWallet from './pages/BrandWallet';

// In routes:
<Route path="/brand/wallet" element={<BrandWallet />} />
```

### 3.3 Creator Profile - Revision Settings

**File:** `frontend/src/pages/CreatorProfileForm.jsx`

Add fields:
```jsx
<div className="card">
  <h2 className="text-xl font-bold mb-4">Revision Policy</h2>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-2">
        Free Revisions
      </label>
      <input
        type="number"
        min="0"
        max="10"
        {...register('free_revisions')}
        className="input"
      />
      <p className="text-xs text-gray-500 mt-1">
        Number of free revisions per project
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        Revision Fee (USD)
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        {...register('revision_fee')}
        className="input"
      />
      <p className="text-xs text-gray-500 mt-1">
        Fee charged after free revisions
      </p>
    </div>
  </div>
</div>
```

---

## 4. REAL-TIME UPDATES

### 4.1 WebSocket Implementation (Optional - Complex)
Would require setting up Socket.IO or similar.

### 4.2 Polling Implementation (Simpler)

**File:** `frontend/src/hooks/usePolling.js`
```jsx
import { useEffect, useRef } from 'react';

export function usePolling(callback, interval = 30000) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
}
```

**Usage in components:**
```jsx
import { usePolling } from '../hooks/usePolling';

function Dashboard() {
  const [data, setData] = useState(null);

  const fetchData = async () => {
    const response = await api.get('/dashboard/stats');
    setData(response.data);
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Poll every 30 seconds
  usePolling(fetchData, 30000);

  // ... rest of component
}
```

Apply to:
- Creator Dashboard (wallet balance, new bookings)
- Brand Dashboard (new messages, booking updates)
- Admin Dashboard (new cashouts, pending approvals)
- Messages page (new messages)

---

## 5. TESTING CHECKLIST

### 5.1 Backend Testing
- [ ] Run migration script
- [ ] Verify brand wallets created
- [ ] Test creator earnings shows NET amount
- [ ] Test brand wallet credit on booking rejection
- [ ] Test brand wallet credit on collaboration cancellation
- [ ] Test brand can use wallet balance for new bookings
- [ ] Test revision settings save and load correctly

### 5.2 Frontend Testing
- [ ] Verify usernames display instead of emails
- [ ] Test brand wallet page loads correctly
- [ ] Test creator can edit revision settings
- [ ] Test real-time polling updates data
- [ ] Test all booking flows with wallet credits
- [ ] Test responsive design on mobile

### 5.3 Integration Testing
- [ ] End-to-end: Brand pays, creator rejects, wallet credited
- [ ] End-to-end: Brand cancels collaboration, wallet credited
- [ ] End-to-end: Creator completes job, earnings show NET
- [ ] End-to-end: Admin approves cashout, balance deducted
- [ ] Check all user roles: creator, brand, admin

---

## 6. DEPLOYMENT ORDER

1. **Stop backend** (to prevent conflicts)
2. **Run migration** script
3. **Update backend code** (models, services, routes)
4. **Deploy backend** and restart
5. **Update frontend code** (components, pages, hooks)
6. **Build and deploy frontend**
7. **Test all critical paths**
8. **Monitor logs** for any errors

---

## 7. ROLLBACK PLAN

If issues arise:
1. Keep old `total_earned` data in database (migration can be reversed)
2. Revert backend code to previous commit
3. Revert frontend to previous build
4. Database rollback SQL:
   ```sql
   -- If needed, restore old total_earned calculation
   UPDATE wallets w
   SET total_earned = (
     SELECT COALESCE(SUM(gross_amount), 0)
     FROM wallet_transactions
     WHERE wallet_id = w.id AND transaction_type = 'earning'
   );
   ```

---

## 8. FILES TO CREATE/MODIFY

### New Files:
- `backend/migrations/add_brand_wallet_and_fix_earnings.py` ✅
- `backend/app/routes/brand_wallet.py`
- `frontend/src/pages/BrandWallet.jsx`
- `frontend/src/hooks/usePolling.js`

### Files to Modify:
**Backend:**
- `backend/app/models/wallet.py` (comment update)
- `backend/app/models/brand_profile.py` (add username)
- `backend/app/services/payment_service.py` (fix earnings calc)
- `backend/app/services/wallet_service.py` (add brand credit function)
- `backend/app/routes/admin/collaborations.py` (fix earnings)
- `backend/app/routes/bookings.py` (add wallet credit on reject)
- `backend/app/routes/collaborations.py` (add wallet credit on cancel)
- `backend/app/routes/creators.py` (add revision settings)
- `backend/app/__init__.py` (register brand_wallet blueprint)

**Frontend:**
- `frontend/src/App.jsx` (add brand wallet route)
- `frontend/src/pages/CreatorDashboard.jsx` (username, polling)
- `frontend/src/pages/BrandDashboard.jsx` (username, polling, wallet link)
- `frontend/src/pages/CreatorProfileForm.jsx` (revision settings)
- `frontend/src/pages/Messages.jsx` (username, polling)
- `frontend/src/pages/Wallet.jsx` (update to show NET earnings)
- All booking/collaboration pages (username replacements)
- All admin pages (username replacements)

---

## SUMMARY

This is a comprehensive update that touches:
- **Database:** 1 migration, 2 model updates
- **Backend:** 9 files modified, 2 new files
- **Frontend:** 15+ files modified, 2 new files

**Estimated Implementation Time:** 4-6 hours
**Testing Time:** 2-3 hours
**Total:** 6-9 hours for complete implementation

**Priority Order:**
1. Database migration (foundational)
2. Fix earnings calculation (critical for accuracy)
3. Brand wallet credit logic (new feature)
4. Username replacements (UX improvement)
5. Revision settings (creator feature)
6. Real-time polling (enhancement)
