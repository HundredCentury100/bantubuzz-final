# SmilePay Card Payment - Correct Implementation

## Based on Official SmilePay Express Checkout Documentation

### Key Understanding from Documentation

SmilePay Express Checkout for Card Payments works as follows:

1. **Customer enters card details IN OUR UI** (not SmilePay's hosted page)
2. **We send card details to SmilePay API** (pan, expMonth, expYear, securityCode)
3. **SmilePay returns `redirectHtml`** containing 3D Secure challenge form
4. **We display 3DS challenge in overlay/iframe**
5. **After 3DS auth, user returns to our returnUrl**
6. **Final payment status sent via webhook to resultUrl**

### The Confusion

There were two interpretations:

**❌ WRONG (What edits branch implemented)**:
- No card details collected on our form
- Redirect to SmilePay's hosted checkout
- User enters card details on SmilePay's page

**✅ CORRECT (Per actual documentation)**:
- Card details collected on OUR form
- Send to SmilePay with card data
- Display 3DS challenge from SmilePay response
- User completes 3DS in overlay on our site

---

## What Needs to Be Fixed

### 1. Backend Service (PARTIALLY DONE ✅)

**File**: `backend/app/services/smilepay_service.py`

**Status**: ✅ CORRECTED - Already updated to accept card details

```python
def initiate_card_payment(
    order_reference: str,
    amount: float,
    card_number: str,  # ✅ Now accepts card details
    expiry_month: str,
    expiry_year: str,
    cvv: str,
    ...
) -> Dict[str, Any]:
    payload = {
        'pan': card_number.replace(' ', ''),
        'expMonth': expiry_month,
        'expYear': expiry_year,
        'securityCode': cvv,
        'paymentMethod': 'CARD',
        ...
    }

    # Returns redirect_html with 3DS challenge
    return {
        'redirect_html': response_data.get('redirectHtml'),
        'requires_3ds': has_redirect_html,
        ...
    }
```

###  2. Backend Config (DONE ✅)

**File**: `backend/app/config/smilepay_config.py`

**Status**: ✅ ADDED - MPGS endpoint added

```python
PAYMENT_METHODS = {
    ...
    'mpgs': 'express-checkout/mpgs',  # ✅ Added
    'card': 'express-checkout/mpgs',  # ✅ Alias
}
```

### 3. Backend Routes (NEEDS FIXING ❌)

**File**: `backend/app/routes/smilepay_payments.py`

**Current State**: ❌ WRONG - Expects `card_type`, no card details

**What needs to change**:

```python
# CURRENT (WRONG):
required_fields = ['payment_type', 'amount', 'item_name', 'card_type']

# SHOULD BE:
required_fields = ['payment_type', 'amount', 'item_name',
                   'card_number', 'expiry_month', 'expiry_year', 'cvv']

# CURRENT (WRONG):
result = smilepay_service.initiate_card_payment(
    ...
    card_type=card_type  # ❌
)

# SHOULD BE:
result = smilepay_service.initiate_card_payment(
    ...
    card_number=data['card_number'],  # ✅
    expiry_month=data['expiry_month'],
    expiry_year=data['expiry_year'],
    cvv=data['cvv']
)

# CURRENT (WRONG):
return jsonify({
    'redirect_url': result.get('redirect_url'),  # ❌
    ...
})

# SHOULD BE:
return jsonify({
    'redirect_html': result.get('redirect_html'),  # ✅
    'requires_3ds': result.get('requires_3ds'),
    ...
})
```

### 4. Frontend Modal (NEEDS FIXING ❌)

**File**: `frontend/src/components/SmilePayPaymentModal.jsx`

**Current State**: ❌ PARTIALLY WRONG - Card form removed, only `cardType` state

**What needs to change**:

1. **Revert state variables**:
```javascript
// KEEP THESE (already removed, need to add back):
const [cardNumber, setCardNumber] = useState('');
const [expiryMonth, setExpiryMonth] = useState('');
const [expiryYear, setExpiryYear] = useState('');
const [cvv, setCvv] = useState('');

// REMOVE THIS (wrongly added):
const [cardType, setCardType] = useState('visa');
```

2. **Keep the card form UI** (lines 707-788 already exist, keep them!)

3. **Update handleCardPayment** to send card details:
```javascript
const handleCardPayment = async () => {
  // Validate card details
  if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
    toast.error('Please fill in all card details');
    return;
  }

  try {
    setProcessing(true);

    const paymentData = {
      payment_type: paymentType,
      payment_id: paymentId,
      amount,
      currency,
      card_number: cardNumber,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      cvv: cvv,
      item_name: itemName,
      item_description: itemDescription,
      return_url: returnUrl || window.location.href,
      result_url: resultUrl || `${window.location.origin}/api/payments/smilepay/webhook/callback`,
    };

    const response = await smilepayAPI.initiateCard(paymentData);

    if (response.data.success) {
      const reference = response.data.order_reference;
      setOrderReference(reference);

      // Check if 3D Secure is required
      if (response.data.requires_3ds && response.data.redirect_html) {
        // Display 3DS challenge in overlay
        display3DSChallenge(response.data.redirect_html);
      } else {
        toast.success('Card payment initiated');
        startPolling(reference);
      }
    } else {
      toast.error(response.data.error || 'Failed to initiate payment');
    }
  } catch (error) {
    console.error('Card payment error:', error);
    toast.error(error.response?.data?.error || 'Payment failed');
  } finally {
    setProcessing(false);
  }
};
```

4. **Add 3DS Challenge Display**:
```javascript
const display3DSChallenge = (redirectHtml) => {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'threeDS-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create container
  const container = document.createElement('div');
  container.id = 'threeDS-content';
  container.style.cssText = `
    width: 90%;
    max-width: 600px;
    height: 80vh;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  `;

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Inject HTML
  container.innerHTML = redirectHtml;

  // Execute script (required for 3DS auto-submission)
  const script = container.querySelector('script');
  if (script) {
    const newScript = document.createElement("script");
    newScript.text = script.text;
    document.body.appendChild(newScript);
  }

  // Start polling for payment status
  startPolling(orderReference);
};
```

---

## Complete Fix Steps

### Step 1: Fix Backend Route

Update `backend/app/routes/smilepay_payments.py` line 521-649:

```python
@bp.route('/card', methods=['POST'])
@jwt_required()
def initiate_card_payment():
    """
    Initiate card payment (Visa/Mastercard) via Express Checkout

    Customer enters card details in our UI, we send to SmilePay.
    SmilePay returns redirectHtml with 3D Secure challenge.

    Request Body:
    {
        "payment_type": "subscription|booking|campaign|cart|collaboration",
        "payment_id": 123,
        "amount": 100.00,
        "currency": "USD",
        "card_number": "4111111111111111",
        "expiry_month": "12",
        "expiry_year": "25",
        "cvv": "123",
        "item_name": "Premium Subscription",
        "item_description": "Monthly premium plan",
        "return_url": "https://...",
        "result_url": "https://...",
        "cancel_url": "https://...",
        "failure_url": "https://..."
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['payment_type', 'amount', 'item_name',
                          'card_number', 'expiry_month', 'expiry_year', 'cvv']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate unique order reference
        order_reference = SmilePayTransaction.generate_order_reference(
            data['payment_type'],
            data.get('payment_id')
        )

        # Get customer name from profile
        customer_first_name, customer_last_name = get_user_display_name(user)

        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data['payment_type'],
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='card',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_phone=data.get('phone', ''),
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data={'payment_type': data['payment_type'], 'amount': data['amount']},  # Don't store card details!
            otp_required=False
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created Card transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_card_payment(
            order_reference=order_reference,
            amount=data['amount'],
            card_number=data['card_number'],
            expiry_month=data['expiry_month'],
            expiry_year=data['expiry_year'],
            cvv=data['cvv'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_phone=data.get('phone', ''),
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.extra_data = response_data
            db.session.commit()

            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'transaction_reference': transaction.transaction_reference,
                'redirect_html': result.get('redirect_html'),
                'requires_3ds': result.get('requires_3ds'),
                'message': 'Card payment initiated - 3DS authentication may be required',
                'status': 'PENDING',
                'response': response_data
            }), 200
        else:
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error', 'Payment initiation failed')
            db.session.commit()

            return jsonify({
                'success': False,
                'error': result.get('error', 'Payment initiation failed'),
                'order_reference': order_reference
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Card payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500
```

### Step 2: Fix Frontend State

Revert the state changes in `SmilePayPaymentModal.jsx`:

```javascript
// Change from:
const [cardType, setCardType] = useState('visa');

// Back to:
const [cardNumber, setCardNumber] = useState('');
const [expiryMonth, setExpiryMonth] = useState('');
const [expiryYear, setExpiryYear] = useState('');
const [cvv, setCvv] = useState('');
```

### Step 3: Keep Card Form UI

The card form UI (lines 707-788) should STAY as is. Don't remove it!

### Step 4: Fix handleCardPayment

Update the handler to match the implementation above.

### Step 5: Add 3DS Display

Add the `display3DSChallenge()` function.

---

## Summary

**The edits branch was WRONG**. The correct implementation requires:
- ✅ Collecting card details on our form
- ✅ Sending to SmilePay with card data
- ✅ Displaying 3DS challenge from response
- ✅ User completes 3DS on our site

This is NOT a redirect to SmilePay's hosted page. It's Express Checkout where we handle the UI and SmilePay handles the payment processing and 3DS challenge.

---

## Next Steps

1. Update backend routes file (card endpoint)
2. Revert frontend state changes
3. Update frontend handleCardPayment
4. Add 3DS display logic
5. Test with real card (use test cards from SmilePay)
6. Deploy all changes

**Priority**: HIGH - Current implementation won't work
**Impact**: Card payments completely broken
**Estimated Time**: 2-3 hours to fix and test
