# SmilePay Comprehensive Update - Implementation Plan

## Issues Found

### 1. **Critical Bug: User Model Missing first_name/last_name**
- **Location**: `backend/app/routes/smilepay_payments.py` (lines 78-79, 102-103, 191-192, 215-216)
- **Error**: `'User' object has no attribute 'first_name'`
- **Root Cause**: The User model only has:
  - `email`
  - `user_type` (creator/brand/admin)
  - `phone_number`
  - NO `first_name` or `last_name` fields

- **User Profile Structure**:
  - **Creators**: Have `CreatorProfile` with `username` (used as display name)
  - **Brands**: Have `BrandProfile` with `company_name` (used as display name)

- **Solution**:
  - Extract display name from profile:
    - For creators: Use `creator_profile.username` or fallback to "Creator"
    - For brands: Use `brand_profile.company_name` or fallback to "Brand"
  - Pass as `customer_first_name` (SmilePay doesn't strictly require accurate first/last names)

### 2. **API Keys Configuration**
- **Current**: Using sandbox API keys hardcoded in config
- **Required**: Use production API keys from environment variables
- **User Provided Keys**:
  - API Key: `3927c441-efee-49df-a00b-de456832d02d`
  - API Secret: `3234fa9a-eb0a-4b57-9f40-4704d52a5459`
  - Environment: **PRODUCTION** (not sandbox)

### 3. **Incomplete Payment Methods**
- **Currently Implemented**: Ecocash, Innbucks only
- **Missing**: SmileCash, Omari, Visa/Mastercard
- **Required**: Implement ALL SmilePay payment methods

### 4. **Paynow Removal**
- **Current**: Paynow and SmilePay coexist
- **Required**: Remove Paynow completely, keep only SmilePay

---

## Updated Implementation Plan

### Phase 1: Fix Critical Bugs

#### Task 1.1: Fix User Name Extraction
**File**: `backend/app/routes/smilepay_payments.py`

**Problem Code** (Lines 78-79, 102-103, 191-192, 215-216):
```python
customer_first_name=user.first_name or '',
customer_last_name=user.last_name or '',
```

**Solution**:
```python
# Extract display name from user profile
def get_user_display_name(user):
    """Get display name from user profile"""
    if user.user_type == 'creator' and user.creator_profile:
        return user.creator_profile.username or 'Creator', ''
    elif user.user_type == 'brand' and user.brand_profile:
        return user.brand_profile.company_name or 'Brand', ''
    else:
        return 'User', ''

# Usage in routes:
customer_first_name, customer_last_name = get_user_display_name(user)
```

**Files to Update**:
1. `backend/app/routes/smilepay_payments.py` - Add helper function, update all 4 occurrences
2. `backend/app/services/smilepay_service.py` - No changes needed (already receives names as parameters)

---

#### Task 1.2: Update API Configuration to Production
**File**: `backend/app/config/smilepay_config.py`

**Current Code**:
```python
ENVIRONMENT = os.getenv('SMILEPAY_ENVIRONMENT', 'sandbox')
SANDBOX = {
    'base_url': 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway',
    'api_key': '3927c441-efee-49df-a00b-de456832d02d',
    'api_secret': '3234fa9a-eb0a-4b57-9f40-4704d52a5459',
}
```

**Updated Code**:
```python
ENVIRONMENT = os.getenv('SMILEPAY_ENVIRONMENT', 'production')  # Changed default

PRODUCTION = {
    'base_url': 'https://zbnet.zb.co.zw/wallet_gateway/payments-gateway',
    'api_key': os.getenv('SMILEPAY_API_KEY', '3927c441-efee-49df-a00b-de456832d02d'),
    'api_secret': os.getenv('SMILEPAY_API_SECRET', '3234fa9a-eb0a-4b57-9f40-4704d52a5459'),
}

SANDBOX = {
    'base_url': 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway',
    'api_key': os.getenv('SMILEPAY_SANDBOX_API_KEY', ''),
    'api_secret': os.getenv('SMILEPAY_SANDBOX_API_SECRET', ''),
}
```

**Environment Variables** (Optional - fallback to hardcoded):
```bash
SMILEPAY_ENVIRONMENT=production
SMILEPAY_API_KEY=3927c441-efee-49df-a00b-de456832d02d
SMILEPAY_API_SECRET=3234fa9a-eb0a-4b57-9f40-4704d52a5459
```

---

### Phase 2: Implement Missing Payment Methods

According to SmilePay documentation, these are ALL available payment methods:

#### Payment Method 1: Ecocash ✅ (DONE)
- **Status**: Already implemented
- **Type**: Mobile money, USSD push
- **User Flow**: User receives USSD prompt on phone

#### Payment Method 2: Innbucks ✅ (DONE)
- **Status**: Already implemented
- **Type**: Digital wallet, payment code
- **User Flow**: User gets code, enters in Innbucks app

#### Payment Method 3: SmileCash ❌ (TODO)
- **Type**: Digital wallet, OTP-based
- **API Endpoint**: `/express-checkout/smilecash`
- **Required Fields**:
  - `smileCashMobile` - Phone number
  - `otp` - One-time password
- **User Flow**:
  1. User enters phone number
  2. Request OTP from SmileCash
  3. User receives SMS with OTP
  4. User enters OTP
  5. Payment processed

#### Payment Method 4: Omari ❌ (TODO)
- **Type**: Payment platform, OTP-based
- **API Endpoint**: `/express-checkout/omari`
- **Required Fields**:
  - `omariMobile` - Phone number
  - `otp` - One-time password
- **User Flow**:
  1. User enters phone number
  2. Request OTP from Omari
  3. User receives SMS with OTP
  4. User enters OTP
  5. Payment processed

#### Payment Method 5: Visa/Mastercard ❌ (TODO)
- **Type**: Credit/Debit cards, 3D Secure
- **API Endpoint**: `/express-checkout/card`
- **Required Fields**:
  - `cardNumber` - Card number
  - `expiryMonth` - MM
  - `expiryYear` - YYYY
  - `cvv` - CVV code
  - `cardholderName` - Name on card
- **User Flow**:
  1. User enters card details
  2. System initiates payment
  3. 3D Secure redirect (if required)
  4. User completes authentication
  5. Payment processed

---

#### Task 2.1: Implement SmileCash Payment
**Files to Create/Update**:

1. **Backend Service** - `backend/app/services/smilepay_service.py`
```python
@staticmethod
def initiate_smilecash_payment(
    order_reference: str,
    amount: float,
    smilecash_mobile: str,
    otp: str,
    item_name: str,
    item_description: str = '',
    customer_email: str = '',
    customer_first_name: str = '',
    customer_last_name: str = '',
    return_url: str = '',
    result_url: str = '',
    cancel_url: str = '',
    failure_url: str = '',
    currency: str = 'USD'
) -> Dict[str, Any]:
    """Initiate SmileCash payment"""
    endpoint = smilepay_config.get_payment_endpoint('smilecash')
    headers = smilepay_config.get_headers()

    payload = {
        'orderReference': order_reference,
        'amount': amount,
        'smileCashMobile': smilecash_mobile,
        'otp': otp,
        'currencyCode': smilepay_config.get_currency_code(currency),
        'itemName': item_name,
        'itemDescription': item_description,
        'returnUrl': return_url,
        'resultUrl': result_url,
        'cancelUrl': cancel_url,
        'failureUrl': failure_url,
        'customerDetails': {
            'email': customer_email,
            'firstName': customer_first_name,
            'lastName': customer_last_name
        }
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        response_data = response.json()

        return {
            'success': response.status_code == 200,
            'data': response_data
        }
    except Exception as e:
        logger.error(f"SmileCash payment error: {str(e)}")
        return {'success': False, 'error': str(e)}
```

2. **Backend Routes** - `backend/app/routes/smilepay_payments.py`
```python
@bp.route('/smilecash', methods=['POST'])
@jwt_required()
def initiate_smilecash_payment():
    """Initiate SmileCash payment with OTP"""
    # Similar structure to ecocash/innbucks endpoints
    # Validate: payment_type, amount, smilecash_mobile, otp, item_name
    # Create transaction
    # Call service
    # Return response
```

3. **Frontend API** - `frontend/src/services/smilepayAPI.js`
```javascript
initiateSmileCash: (paymentData) =>
  api.post('/payments/smilepay/smilecash', paymentData),
```

4. **Frontend Modal** - `frontend/src/components/SmilePayPaymentModal.jsx`
```javascript
// Add SmileCash tab/section
// Add phone number input
// Add OTP request button
// Add OTP input field
// Handle OTP verification flow
```

---

#### Task 2.2: Implement Omari Payment
**Implementation**: Same structure as SmileCash (OTP-based)
- Backend service method: `initiate_omari_payment()`
- Backend route: `POST /api/payments/smilepay/omari`
- Frontend API method: `initiateOmari()`
- Frontend UI: Similar to SmileCash (phone + OTP)

---

#### Task 2.3: Implement Card Payment (Visa/Mastercard)
**Files to Create/Update**:

1. **Backend Service** - `backend/app/services/smilepay_service.py`
```python
@staticmethod
def initiate_card_payment(
    order_reference: str,
    amount: float,
    card_number: str,
    expiry_month: str,
    expiry_year: str,
    cvv: str,
    cardholder_name: str,
    item_name: str,
    item_description: str = '',
    customer_email: str = '',
    return_url: str = '',
    result_url: str = '',
    cancel_url: str = '',
    failure_url: str = '',
    currency: str = 'USD'
) -> Dict[str, Any]:
    """Initiate card payment (Visa/Mastercard)"""
    endpoint = smilepay_config.get_payment_endpoint('card')
    headers = smilepay_config.get_headers()

    payload = {
        'orderReference': order_reference,
        'amount': amount,
        'cardNumber': card_number,
        'expiryMonth': expiry_month,
        'expiryYear': expiry_year,
        'cvv': cvv,
        'cardholderName': cardholder_name,
        'currencyCode': smilepay_config.get_currency_code(currency),
        'itemName': item_name,
        'itemDescription': item_description,
        'returnUrl': return_url,
        'resultUrl': result_url,
        'cancelUrl': cancel_url,
        'failureUrl': failure_url,
        'customerDetails': {
            'email': customer_email
        }
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        response_data = response.json()

        # Card payments may return 3D Secure HTML
        return {
            'success': response.status_code == 200,
            'data': response_data,
            'requires_3ds': 'threeDSecureHtml' in response_data
        }
    except Exception as e:
        logger.error(f"Card payment error: {str(e)}")
        return {'success': False, 'error': str(e)}
```

2. **Backend Routes** - Add endpoint
3. **Frontend**: Card form with validation
4. **3D Secure Handling**: Render HTML in iframe if returned

---

#### Task 2.4: Update SmilePay Config for All Endpoints
**File**: `backend/app/config/smilepay_config.py`

**Add** to `get_payment_endpoint()` method:
```python
@classmethod
def get_payment_endpoint(cls, payment_method: str) -> str:
    """Get payment endpoint URL for specific method"""
    base_url = cls.get_base_url()
    endpoints = {
        'ecocash': f'{base_url}/express-checkout/ecocash',
        'innbucks': f'{base_url}/express-checkout/innbucks',
        'smilecash': f'{base_url}/express-checkout/smilecash',  # NEW
        'omari': f'{base_url}/express-checkout/omari',          # NEW
        'card': f'{base_url}/express-checkout/card',            # NEW
        'status': f'{base_url}/check-status',
        'cancel': f'{base_url}/cancel-payment'
    }
    return endpoints.get(payment_method, base_url)
```

---

### Phase 3: Remove Paynow

#### Task 3.1: Remove Paynow from Backend
**Files to Check**:
1. `backend/app/services/payment_service.py` (if exists)
2. `backend/app/routes/subscriptions.py`
3. `backend/app/routes/bookings.py`
4. `backend/app/routes/campaigns.py`

**Action**:
- Keep Paynow code for historical transactions
- Don't remove Paynow payment processing (needed for existing payments)
- Just disable NEW Paynow payments from frontend

#### Task 3.2: Remove Paynow from Frontend
**Files to Update**:
1. `frontend/src/pages/SubscriptionPayment.jsx`
2. `frontend/src/pages/CartCheckout.jsx`
3. `frontend/src/components/CampaignPaymentModal.jsx`
4. `frontend/src/components/CampaignCartPaymentModal.jsx`

**Changes**:
- Remove Paynow radio button option
- Remove Paynow payment method from arrays
- Keep only: Wallet, SmilePay, Bank Transfer
- Update button text from "Proceed to Paynow" to "Pay with SmilePay"

---

### Phase 4: Update Frontend Modal with All Payment Methods

#### Task 4.1: Enhanced SmilePayPaymentModal
**File**: `frontend/src/components/SmilePayPaymentModal.jsx`

**Current State**: Only Ecocash and Innbucks
**Required State**: ALL 5 payment methods

**UI Structure**:
```
┌─────────────────────────────────────────────────┐
│  Payment Method Selection                       │
│  [ Ecocash ] [ Innbucks ] [ SmileCash ]        │
│  [ Omari ] [ Visa/Mastercard ]                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Dynamic form based on selection]              │
│                                                 │
│  Ecocash: Phone number                         │
│  Innbucks: Payment code display                │
│  SmileCash: Phone + OTP fields                 │
│  Omari: Phone + OTP fields                     │
│  Cards: Card details form                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Payment Method State**:
```javascript
const [paymentMethod, setPaymentMethod] = useState('ecocash'); // default
const [phoneNumber, setPhoneNumber] = useState('');
const [otp, setOtp] = useState('');
const [cardDetails, setCardDetails] = useState({
  number: '',
  expiryMonth: '',
  expiryYear: '',
  cvv: '',
  name: ''
});
```

**Tab Component**:
```javascript
const paymentMethods = [
  { id: 'ecocash', name: 'Ecocash', icon: '📱', popular: true },
  { id: 'innbucks', name: 'Innbucks', icon: '💰' },
  { id: 'smilecash', name: 'SmileCash', icon: '😊' },
  { id: 'omari', name: 'Omari', icon: '🔵' },
  { id: 'card', name: 'Card', icon: '💳' }
];
```

---

## Implementation Order

### Step 1: Fix Critical Bugs ⚠️ HIGH PRIORITY
1. Fix `first_name` error in `smilepay_payments.py` (30 mins)
2. Update config to production API keys (10 mins)
3. Deploy and test Ecocash/Innbucks payments (15 mins)

**Total**: 1 hour
**Status**: MUST DO FIRST - System currently broken

---

### Step 2: Implement SmileCash Payment
1. Backend service method (1 hour)
2. Backend route (30 mins)
3. Frontend API method (10 mins)
4. Frontend UI (phone + OTP) (1 hour)
5. Testing (30 mins)

**Total**: 3 hours

---

### Step 3: Implement Omari Payment
1. Backend service method (1 hour)
2. Backend route (30 mins)
3. Frontend API method (10 mins)
4. Frontend UI (phone + OTP) (1 hour)
5. Testing (30 mins)

**Total**: 3 hours

---

### Step 4: Implement Card Payment
1. Backend service method (1.5 hours)
2. Backend route (30 mins)
3. Frontend API method (10 mins)
4. Frontend UI (card form + validation) (2 hours)
5. 3D Secure handling (1 hour)
6. Testing (30 mins)

**Total**: 5.5 hours

---

### Step 5: Remove Paynow from Frontend
1. Update SubscriptionPayment.jsx (20 mins)
2. Update CartCheckout.jsx (20 mins)
3. Update CampaignPaymentModal.jsx (15 mins)
4. Update CampaignCartPaymentModal.jsx (15 mins)
5. Testing all pages (30 mins)

**Total**: 1.5 hours

---

### Step 6: Final Testing & Deployment
1. Test all 5 payment methods (1 hour)
2. Test on all payment pages (1 hour)
3. Fix bugs found during testing (1 hour)
4. Deploy to production (30 mins)
5. Monitor for issues (ongoing)

**Total**: 3.5 hours

---

## Total Estimated Time

| Phase | Duration |
|-------|----------|
| Fix critical bugs | 1 hour |
| Implement SmileCash | 3 hours |
| Implement Omari | 3 hours |
| Implement Cards | 5.5 hours |
| Remove Paynow | 1.5 hours |
| Testing & Deployment | 3.5 hours |
| **TOTAL** | **17.5 hours** (~2-3 days) |

---

## Files to Modify Summary

### Backend
1. ✅ `backend/app/config/smilepay_config.py` - Production keys, new endpoints
2. ✅ `backend/app/routes/smilepay_payments.py` - Fix first_name bug, add 3 new routes
3. ✅ `backend/app/services/smilepay_service.py` - Add 3 new payment methods

### Frontend
1. ✅ `frontend/src/components/SmilePayPaymentModal.jsx` - Add 3 new payment methods
2. ✅ `frontend/src/services/smilepayAPI.js` - Add 3 new API methods
3. ✅ `frontend/src/pages/SubscriptionPayment.jsx` - Remove Paynow
4. ✅ `frontend/src/pages/CartCheckout.jsx` - Remove Paynow
5. ✅ `frontend/src/components/CampaignPaymentModal.jsx` - Remove Paynow
6. ✅ `frontend/src/components/CampaignCartPaymentModal.jsx` - Remove Paynow

---

## Testing Checklist

### Backend Testing
- [ ] Fix verified: No more `first_name` errors
- [ ] Production API keys working
- [ ] SmileCash payment initiation works
- [ ] Omari payment initiation works
- [ ] Card payment initiation works
- [ ] Webhook handles all payment methods
- [ ] Status polling works for all methods

### Frontend Testing
- [ ] Ecocash payment works end-to-end
- [ ] Innbucks payment works end-to-end
- [ ] SmileCash OTP flow works
- [ ] Omari OTP flow works
- [ ] Card payment with 3D Secure works
- [ ] Payment status polling updates UI correctly
- [ ] All payment methods work on subscription page
- [ ] All payment methods work on cart checkout
- [ ] All payment methods work in campaign modals
- [ ] Paynow option removed from all pages
- [ ] Error handling works for failed payments

### User Experience Testing
- [ ] Clear instructions for each payment method
- [ ] Loading states show appropriately
- [ ] Success messages clear
- [ ] Error messages helpful
- [ ] Payment codes displayed clearly (Innbucks)
- [ ] OTP flow intuitive (SmileCash, Omari)
- [ ] Card form validates inputs
- [ ] Mobile responsive design

---

## Deployment Strategy

### Step 1: Deploy Backend Fix ASAP
**Priority**: CRITICAL - System currently broken
**Changes**:
- Fix `first_name` bug
- Update to production API keys
**Time**: 15 minutes
**Risk**: Low - Simple bug fix

### Step 2: Deploy New Payment Methods
**Priority**: HIGH
**Changes**:
- Add SmileCash, Omari, Card endpoints
- Update frontend modal
**Time**: 30 minutes
**Risk**: Medium - New features, need testing

### Step 3: Remove Paynow
**Priority**: MEDIUM
**Changes**:
- Remove Paynow from frontend only
**Time**: 15 minutes
**Risk**: Low - Just removing UI options

---

## Success Criteria

✅ No more `first_name` errors in logs
✅ Users can pay with Ecocash successfully
✅ Users can pay with Innbucks successfully
✅ Users can pay with SmileCash successfully
✅ Users can pay with Omari successfully
✅ Users can pay with Visa/Mastercard successfully
✅ Paynow option removed from all payment pages
✅ Payment status updates correctly for all methods
✅ Webhook processes all payment methods correctly
✅ All payment pages work with new system
✅ Zero critical bugs in production

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Start with critical fixes** - Fix first_name bug and production keys
3. **Test immediately** - Verify Ecocash/Innbucks working
4. **Implement new methods** - SmileCash, Omari, Cards
5. **Remove Paynow** - Clean up frontend
6. **Final testing** - All payment flows on all pages
7. **Deploy** - Production rollout

---

**Ready to proceed? Let me know and I'll start with the critical bug fixes first.**
