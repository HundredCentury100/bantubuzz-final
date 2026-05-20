# SmilePay Card Payment Implementation Fix

## Summary
Fixed the card payment (Visa/Mastercard) implementation to use **Express Checkout** (redirect-based) instead of collecting card details in our form. This ensures **PCI compliance** and follows the same pattern as other SmilePay payment methods (Ecocash, Innbucks, etc.).

---

## Problems Found

### 1. **Duplicate Methods**
The `smilepay_service.py` had TWO conflicting `initiate_card_payment()` methods:
- **First method (lines 295-365)**: Took card details directly → ❌ WRONG
- **Second method (lines 368-432)**: Returned redirect URL → ✅ CORRECT

### 2. **Incorrect Route Implementation**
The `/card` route in `smilepay_payments.py` was:
- Expecting card details (`card_number`, `expiry_month`, `expiry_year`, `cvv`) ❌ WRONG
- Calling the wrong service method
- Never returning a redirect URL to SmilePay

### 3. **PCI Compliance Risk**
Collecting card details on our form creates **PCI DSS compliance issues**. SmilePay provides a hosted checkout for this exact reason.

---

## Solution Implemented

### Express Checkout Flow (CORRECT)

```
Frontend (User clicks "Pay with Card")
    ↓
POST /api/payments/smilepay/card
  - payment_type: "booking" | "subscription" | etc.
  - amount: 100.00
  - card_type: "visa" or "mastercard"
  - item_name: "Package Title"
  - NO card details sent
    ↓
Backend creates SmilePayTransaction (PENDING status)
    ↓
Backend calls SmilePay Express Checkout API
    ↓
SmilePay returns {paymentUrl: "https://..."}
    ↓
Frontend receives redirect_url
    ↓
Frontend redirects user: window.location.href = redirect_url
    ↓
User lands on SmilePay's hosted checkout page
    ↓
User enters card details SECURELY on SmilePay
    ↓
User completes payment
    ↓
SmilePay redirects to returnUrl or posts to resultUrl webhook
    ↓
Webhook updates transaction status → handles payment
```

### Key Changes

#### 1. **smilepay_service.py** - Removed duplicate, kept correct method

**Before:**
```python
# First incorrect method - took card details
def initiate_card_payment(card_number, expiry_month, expiry_year, cvv, ...):
    # Would send card details to SmilePay API

# Second correct method - took no card details  
def initiate_card_payment(item_name, item_description, ...):
    # Would return redirect_url
```

**After:**
```python
@staticmethod
def initiate_card_payment(
    order_reference: str,
    amount: float,
    item_name: str,
    item_description: str,
    customer_email: str,
    customer_phone: str = '',
    customer_first_name: str = '',
    customer_last_name: str = '',
    return_url: str = '',
    result_url: str = '',
    cancel_url: str = '',
    failure_url: str = '',
    currency: str = 'USD',
    card_type: str = 'visa'  # NEW: specify visa or mastercard
) -> Dict[str, Any]:
    """
    Initiate card payment via Express Checkout
    
    Returns redirect URL to SmilePay's hosted checkout page where
    user enters card details securely (PCI compliant).
    """
    # ... calls SmilePay API with ONLY metadata (no card details)
    return {
        'success': True,
        'redirect_url': response_data.get('paymentUrl'),  # User redirected here
        'data': response_data
    }
```

#### 2. **smilepay_payments.py** - Updated route to NOT expect card details

**Before:**
```python
@bp.route('/card', methods=['POST'])
def initiate_card_payment():
    """Request fields: card_number, expiry_month, expiry_year, cvv, cardholder_name"""
    
    required_fields = ['payment_type', 'amount', 'card_number', 'expiry_month',
                      'expiry_year', 'cvv', 'cardholder_name', 'item_name']
    
    result = smilepay_service.initiate_card_payment(
        card_number=data['card_number'],
        expiry_month=data['expiry_month'],
        expiry_year=data['expiry_year'],
        cvv=data['cvv'],
        cardholder_name=data['cardholder_name'],
        # ...
    )
```

**After:**
```python
@bp.route('/card', methods=['POST'])
def initiate_card_payment():
    """No card details needed - SmilePay handles secure collection"""
    
    required_fields = ['payment_type', 'amount', 'item_name', 'card_type']
    
    # Validate card_type
    card_type = data['card_type'].lower()
    if card_type not in ['visa', 'mastercard']:
        return error
    
    result = smilepay_service.initiate_card_payment(
        item_name=data['item_name'],
        card_type=card_type,
        # No card details!
    )
    
    return {
        'success': True,
        'redirect_url': result.get('redirect_url'),  # Send to frontend
        'order_reference': order_reference
    }
```

---

## API Changes

### Before (WRONG)
```bash
POST /api/payments/smilepay/card

{
  "payment_type": "booking",
  "payment_id": 123,
  "amount": 100.00,
  "card_number": "2223000000000007",        ❌ DON'T SEND
  "expiry_month": "01",                    ❌ DON'T SEND
  "expiry_year": "39",                     ❌ DON'T SEND
  "cvv": "100",                            ❌ DON'T SEND
  "cardholder_name": "John Doe",           ❌ DON'T SEND
  "item_name": "Premium Package",
  "currency": "USD",
  "return_url": "https://...",
  "result_url": "https://..."
}
```

### After (CORRECT)
```bash
POST /api/payments/smilepay/card

{
  "payment_type": "booking",
  "payment_id": 123,
  "amount": 100.00,
  "card_type": "visa",                     ✅ NEW: specify card type
  "item_name": "Premium Package",
  "item_description": "Optional description",
  "currency": "USD",
  "phone": "0771234567",                   ✅ Optional: phone number
  "return_url": "https://...",
  "result_url": "https://...",
  "cancel_url": "https://...",
  "failure_url": "https://..."
}

Response:
{
  "success": true,
  "order_reference": "ORD_BOOKING_20260512_ABC123",
  "redirect_url": "https://zbnet.zb.co.zw/wallet_checkout?reference=...",
  "transaction_reference": "TXN_123456"
}
```

---

## Frontend Integration

### Before (Card Form - WRONG)
```javascript
// ❌ DON'T DO THIS
const handleCardPayment = async (cardDetails) => {
  const response = await axios.post('/api/payments/smilepay/card', {
    payment_type: 'booking',
    amount: 100,
    card_number: cardDetails.number,
    expiry_month: cardDetails.expiry.month,
    expiry_year: cardDetails.expiry.year,
    cvv: cardDetails.cvv,
    cardholder_name: cardDetails.name,
    item_name: 'Package'
  });
};
```

### After (Redirect Flow - CORRECT)
```javascript
// ✅ DO THIS
const handleCardPayment = async (cardType) => {
  try {
    const response = await axios.post('/api/payments/smilepay/card', {
      payment_type: 'booking',
      payment_id: bookingId,
      amount: 100,
      card_type: cardType,  // 'visa' or 'mastercard'
      item_name: 'Premium Package',
      item_description: 'Monthly subscription',
      currency: 'USD',
      return_url: 'https://bantubuzz.com/payment-success',
      result_url: 'https://bantubuzz.com/api/payments/smilepay/webhook/callback',
      cancel_url: 'https://bantubuzz.com/payment-canceled',
      failure_url: 'https://bantubuzz.com/payment-failed'
    });
    
    if (response.data.success && response.data.redirect_url) {
      // Redirect user to SmilePay for secure payment
      window.location.href = response.data.redirect_url;
    }
  } catch (error) {
    console.error('Payment failed:', error);
  }
};
```

### Simple Usage
```jsx
// Component showing payment method selection
const [paymentMethod, setPaymentMethod] = useState('');

const handlePayment = async () => {
  if (paymentMethod === 'visa' || paymentMethod === 'mastercard') {
    // Just specify the card type - that's it!
    const result = await bookingsAPI.initiateCardPayment(bookingId, {
      card_type: paymentMethod,
      amount: bookingData.total_amount,
      item_name: bookingData.package_name
    });
    
    // Redirect to SmilePay
    if (result.redirect_url) {
      window.location.href = result.redirect_url;
    }
  }
};
```

---

## Consistency with Other Payment Methods

All payment methods now follow the same **Express Checkout** pattern:

| Method | User Action | Our Form Collects | SmilePay Returns |
|--------|-------------|------------------|-----------------|
| **Ecocash** | Enters phone | Phone number only | USSD prompt |
| **Innbucks** | Gets code | Nothing | Payment code |
| **SmileCash** | Enters OTP | Phone + OTP | OTP confirmation |
| **Omari** | Enters OTP | Phone + OTP | OTP confirmation |
| **Card (NEW)** | Enters card | Nothing | Redirect URL → SmilePay checkout |

---

## Benefits

✅ **PCI Compliance** - Card details never touch our servers  
✅ **Security** - SmilePay handles encryption and fraud prevention  
✅ **Consistency** - All payment methods use same Express Checkout pattern  
✅ **Reduced Liability** - We don't store/process card data  
✅ **User Trust** - Users see SmilePay's secure checkout page  
✅ **3D Secure Support** - Automatically handled by SmilePay  
✅ **Webhook Handling** - Same callback handling for all methods  

---

## Testing

### Sandbox Test Card
- **Number:** `2223000000000007`
- **Expiry:** `01/39`
- **CVV:** `100`
- **Cardholder Name:** `John Doe`

### Test Flow
1. POST to `/api/payments/smilepay/card` with `card_type: "visa"`
2. Receive `redirect_url`
3. User redirected to SmilePay checkout
4. User enters card details on SmilePay
5. Webhook posts to `resultUrl` with payment status
6. Transaction marked as PAID/FAILED

---

## Files Modified

- `backend/app/services/smilepay_service.py` - Removed duplicate, kept Express Checkout method
- `backend/app/routes/smilepay_payments.py` - Updated route to not expect card details

---

## Migration Notes

If you have **frontend components collecting card details**, they need to be updated:

### Old Component (Remove)
```jsx
<input type="text" placeholder="Card Number" />
<input type="text" placeholder="MM/YY" />
<input type="text" placeholder="CVV" />
<input type="text" placeholder="Cardholder Name" />
```

### New Component (Replace with)
```jsx
<select onChange={(e) => setCardType(e.target.value)}>
  <option value="">Select card type</option>
  <option value="visa">Visa</option>
  <option value="mastercard">Mastercard</option>
</select>
```

---

## Documentation References

- SmilePay Express Checkout: Lines 303-312 in SMILEPAY_API_DOCUMENTATION.md
- 3D Secure Flow: Lines 304-312 in SMILEPAY_API_DOCUMENTATION.md
- Payment Flow Standards: PAYMENT_FLOW_DOCUMENTATION.md

---

**Status:** ✅ Complete and tested  
**Deployed on:** edits branch  
**Date:** 2026-05-12
