# Phase 2 Investigation Findings - Subscription Payment Issues

**Date**: 2026-04-23
**Status**: INVESTIGATION COMPLETE, FIXES IDENTIFIED

---

## Issues Being Investigated

1. **Subscription Upgrade Loading Issue**: Button shows "loading" indefinitely on mobile and desktop
2. **Bank Transfer Upload Error**: "No file provided" error for creator subscription payment proof

---

## Issue 1: Subscription Upgrade Button Loading Indefinitely

### Symptoms
- User clicks upgrade button on CreatorSubscriptions page
- Button changes to "Processing..." with spinner
- Button never returns to normal state
- No error message displayed to user
- Happens on both mobile and desktop

### Code Analysis

**Frontend Code** (`frontend/src/pages/CreatorSubscriptions.jsx` lines 99-137):
```javascript
const handleUpgrade = async (planId) => {
  try {
    setActionLoading(true);
    const plan = plans.find(p => p.id === planId);

    const res = await api.put('/subscriptions/upgrade', {
      plan_id: planId,
      billing_cycle: billingCycle
    });

    if (res.data.success && res.data.data) {
      if (res.data.data.redirect_url) {
        navigate('/subscription/payment', { ... });
      } else {
        toast.success('Successfully upgraded subscription!');
        await fetchData();
      }
    }
  } catch (error) {
    console.error('Error upgrading:', error);
    toast.error(error.response?.data?.error || 'Failed to upgrade');
  } finally {
    setActionLoading(false);  // This SHOULD reset loading state
  }
}
```

✅ **Frontend code is CORRECT** - Has proper try/catch/finally with loading state reset

**Backend Code** (`backend/app/routes/subscriptions.py` lines 216-315):
```python
@bp.route('/upgrade', methods=['PUT'])
@jwt_required()
def upgrade_subscription():
    try:
        user_id = get_jwt_identity()  # May return string or int
        user = User.query.get(user_id)
        # ... validation ...

        payment_result = initiate_subscription_payment(
            subscription=current_sub,
            user_email=user.email,
            plan_name=new_plan.name,
            amount=amount,
            billing_cycle=billing_cycle
        )

        if payment_result['success']:
            db.session.commit()
            return jsonify({
                'success': True,
                'data': { ... }
            }), 200
        else:
            # Revert changes
            return jsonify({
                'success': False,
                'error': payment_result.get('error'),
                'message': payment_result.get('message')
            }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to upgrade subscription',
            'message': str(e)
        }), 500
```

✅ **Backend route code is CORRECT** - Has proper error handling

**Payment Service** (`backend/app/services/payment_service.py` lines 837-916):
```python
def initiate_subscription_payment(subscription, user_email, plan_name, amount, billing_cycle):
    """Initiate Paynow payment for subscription"""
    try:
        # Initialize Paynow
        paynow = Paynow(
            integration_id=integration_id,
            integration_key=integration_key,
            return_url=return_url,
            result_url=result_url
        )

        # Create payment
        payment_ref = f'SUB-{subscription.id}-{datetime.utcnow().strftime("%Y%m%d%H%M%S")}'
        payment = paynow.create_payment(payment_ref, user_email)
        payment.add(description, amount)

        # Send payment to Paynow
        response = paynow.send(payment)  # THIS CAN TIMEOUT OR HANG

        if response.success:
            return { 'success': True, ... }
        else:
            return {
                'success': False,
                'error': 'Failed to initiate payment',
                'message': error_msg
            }
    except Exception as e:
        return {
            'success': False,
            'error': 'Payment initialization failed',
            'message': str(e)
        }
```

⚠️ **POTENTIAL ISSUE FOUND**: `paynow.send(payment)` can timeout or hang indefinitely

### Root Cause

**Primary Suspect**: Paynow API timeout with no timeout limit set

When `paynow.send(payment)` is called, if:
- Paynow API is slow to respond
- Network connection is poor
- Paynow servers are down
- Request hangs indefinitely

The backend request will timeout (Gunicorn default is 30 seconds), but the **frontend may not receive any response** if the connection is dropped.

### Solution

Add timeout handling to Paynow payment initiation:

```python
import requests
from requests.exceptions import Timeout, RequestException

def initiate_subscription_payment(subscription, user_email, plan_name, amount, billing_cycle):
    """Initiate Paynow payment for subscription with timeout"""
    try:
        # ... initialization code ...

        # Send payment to Paynow with timeout
        try:
            response = paynow.send(payment)
        except (Timeout, RequestException) as timeout_error:
            return {
                'success': False,
                'error': 'Payment service timeout',
                'message': 'Payment service is currently unavailable. Please try again later.'
            }

        # ... rest of code ...
    except Exception as e:
        return {
            'success': False,
            'error': 'Payment initialization failed',
            'message': str(e)
        }
```

**Alternative Fix**: Ensure Paynow library has timeout configured (check library source)

---

## Issue 2: Creator Subscription Bank Transfer "No File Provided" Error

### Symptoms
- User uploads payment proof on SubscriptionPayment page
- Error message: "No file provided"
- File is selected and visible in UI
- Upload fails even with valid file types (PNG, JPG, PDF)

### Code Analysis

**Frontend Payment Page** (`frontend/src/pages/SubscriptionPayment.jsx` line ~187):
```javascript
const handleBankTransferUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('subscription_id', paymentData.subscription_id);

  try {
    const res = await api.post('/creator/subscriptions/upload-proof', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'  // This may cause issues
      }
    });
    // ... handle response ...
  } catch (error) {
    toast.error(error.response?.data?.error || 'Upload failed');
  }
};
```

⚠️ **POTENTIAL ISSUE**: Setting `Content-Type: multipart/form-data` manually can prevent proper boundary generation

**Backend Upload Endpoint** (`backend/app/routes/creator_subscriptions.py` lines 341-407):
```python
@creator_subscriptions_bp.route('/api/creator/subscriptions/upload-proof', methods=['POST'])
@jwt_required()
def upload_payment_proof():
    try:
        current_user_id = get_jwt_identity()
        # ... validation ...

        if 'file' not in request.files:  # Check for 'file' key
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']
        subscription_id = request.form.get('subscription_id')

        # ... rest of upload logic ...
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
```

✅ **Backend code is CORRECT** - Proper file upload handling

### Root Cause

**Primary Suspect**: Frontend manually setting `Content-Type: multipart/form-data` header

When using `FormData` with axios/fetch, the browser automatically sets the correct `Content-Type` header with the boundary parameter:
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
```

If you manually set `Content-Type: multipart/form-data` without the boundary, the server cannot parse the multipart data correctly.

### Solution

**Fix 1**: Remove manual Content-Type header (let browser set it automatically)

```javascript
const handleBankTransferUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('subscription_id', paymentData.subscription_id);

  try {
    // REMOVE headers option - let axios/browser set Content-Type automatically
    const res = await api.post('/creator/subscriptions/upload-proof', formData);

    if (res.data.success) {
      toast.success('Payment proof uploaded successfully');
    }
  } catch (error) {
    toast.error(error.response?.data?.error || 'Upload failed');
  }
};
```

**Fix 2**: Verify API interceptor doesn't override Content-Type

Check `frontend/src/services/api.js` for interceptors that might be setting Content-Type globally.

---

## Additional Findings

### User ID Type Inconsistency (Minor Issue)

In some places, `get_jwt_identity()` returns a string, but queries expect int:

```python
user_id = get_jwt_identity()  # May return "26" instead of 26
user = User.query.get(user_id)  # Works with both string and int
```

This is not causing the current issues, but could cause problems in the future.

**Recommendation**: Consistently convert to int:
```python
user_id = int(get_jwt_identity())
```

---

## Testing Plan

### Test 1: Subscription Upgrade
1. Login as creator with active subscription
2. Navigate to /creator/subscriptions
3. Click "Upgrade" on higher-tier plan
4. Monitor network tab for:
   - Request to `/api/subscriptions/upgrade`
   - Response status and timing
   - Any timeout errors
5. Verify:
   - Loading state resets after response/error
   - User receives appropriate error/success message
   - Redirect to payment page if successful

### Test 2: Bank Transfer Upload
1. Login as creator
2. Subscribe to paid plan
3. Select "Bank Transfer" payment method
4. Upload payment proof (test with PNG, JPG, PDF)
5. Monitor network tab for:
   - Request to `/api/creator/subscriptions/upload-proof`
   - FormData payload structure
   - Content-Type header (should include boundary)
6. Verify:
   - File uploads successfully
   - Success message displayed
   - Subscription status updated to "pending_verification"

---

## Implementation Priority

### Priority 1: Fix Bank Transfer Upload (Quick Fix)
- **Impact**: High - Prevents creators from paying via bank transfer
- **Effort**: Low - Simple frontend change
- **Files**: `frontend/src/pages/SubscriptionPayment.jsx`

### Priority 2: Add Paynow Timeout Handling (Medium Fix)
- **Impact**: Medium - Improves UX when payment gateway is slow
- **Effort**: Medium - Need to test timeout behavior
- **Files**: `backend/app/services/payment_service.py`

### Priority 3: User ID Type Consistency (Low Priority)
- **Impact**: Low - Preventive measure
- **Effort**: Low - Search and replace
- **Files**: Multiple route files

---

## Next Steps

1. ✅ Investigation complete
2. ⏳ Fix bank transfer upload Content-Type issue
3. ⏳ Add timeout handling to Paynow payment initiation
4. ⏳ Test both fixes in local environment
5. ⏳ Deploy fixes to production
6. ⏳ Monitor error logs for any remaining issues

---

**Investigation Status**: ✅ **COMPLETE**
**Fixes Ready**: ⏳ **IN PROGRESS**
