# SmilePay Complete Implementation - Comprehensive Plan

## Status: Critical Bug FIXED ✅
- ✅ Fixed `first_name` error by extracting names from profiles
- ✅ Updated to production API keys
- ✅ Backend restarted with new code
- ✅ System ready for testing

---

## Remaining Work

### 1. Implement SmileCash Payment Method
### 2. Implement Omari Payment Method
### 3. Implement Visa/Mastercard Payment Method
### 4. Remove Paynow from ALL frontend pages
### 5. Verify database schema is correct

---

## Database Schema Verification

Let me verify our SmilePay transactions table matches our needs:

### Current Schema (from migration):
```sql
CREATE TABLE smilepay_transactions (
    id SERIAL PRIMARY KEY,
    payment_type VARCHAR(50),
    payment_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    user_type VARCHAR(20),
    order_reference VARCHAR(100) UNIQUE,
    smilepay_reference VARCHAR(100),
    transaction_reference VARCHAR(100),
    amount DECIMAL(10, 2),
    currency VARCHAR(10),
    currency_code VARCHAR(10),
    payment_method VARCHAR(50),
    payment_option VARCHAR(50),
    status VARCHAR(50),
    item_name VARCHAR(200),
    item_description TEXT,
    customer_email VARCHAR(255),
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),
    customer_mobile VARCHAR(20),
    customer_phone VARCHAR(20),
    payment_code VARCHAR(50),
    otp VARCHAR(10),
    otp_required BOOLEAN,
    return_url TEXT,
    result_url TEXT,
    cancel_url TEXT,
    failure_url TEXT,
    response_code VARCHAR(50),
    response_message TEXT,
    request_data JSON,
    extra_data JSON,
    client_fee DECIMAL(10, 2),
    merchant_fee DECIMAL(10, 2),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    paid_at TIMESTAMP
);
```

### ✅ Schema is GOOD - Supports ALL payment methods

---

## Implementation Plan

### PHASE 1: Implement SmileCash Payment

#### Backend Implementation

**1. Service Method** (`backend/app/services/smilepay_service.py`)

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
    """
    Initiate SmileCash payment via Express Checkout

    SmileCash is an OTP-based mobile wallet payment method
    """
    try:
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

        logger.info(f"Initiating SmileCash payment: {order_reference}")

        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        response_data = response.json()

        if response.status_code == 200:
            logger.info(f"SmileCash payment initiated successfully: {order_reference}")
            return {
                'success': True,
                'data': response_data
            }
        else:
            logger.error(f"SmileCash payment failed: {response_data}")
            return {
                'success': False,
                'error': response_data.get('message', 'Payment initiation failed')
            }

    except requests.exceptions.Timeout:
        logger.error(f"SmileCash payment timeout: {order_reference}")
        return {'success': False, 'error': 'Payment request timed out'}
    except requests.exceptions.RequestException as e:
        logger.error(f"SmileCash payment request error: {str(e)}")
        return {'success': False, 'error': f'Network error: {str(e)}'}
    except Exception as e:
        logger.error(f"SmileCash payment error: {str(e)}")
        return {'success': False, 'error': str(e)}
```

**2. API Route** (`backend/app/routes/smilepay_payments.py`)

```python
@bp.route('/smilecash', methods=['POST'])
@jwt_required()
def initiate_smilecash_payment():
    """
    Initiate SmileCash payment via Express Checkout

    Request Body:
    {
        "payment_type": "subscription|booking|campaign|cart|collaboration",
        "payment_id": 123,
        "amount": 100.00,
        "currency": "USD",
        "smilecash_mobile": "0771234567",
        "otp": "123456",
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
        required_fields = ['payment_type', 'amount', 'smilecash_mobile', 'otp', 'item_name']
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
            payment_method='smilecash',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_mobile=data['smilecash_mobile'],
            otp=data['otp'],
            otp_required=True,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data=data
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created SmileCash transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_smilecash_payment(
            order_reference=order_reference,
            amount=data['amount'],
            smilecash_mobile=data['smilecash_mobile'],
            otp=data['otp'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            # Update transaction with SmilePay response
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
                'message': 'SmileCash payment initiated successfully',
                'status': 'PENDING',
                'response': response_data
            }), 200
        else:
            # Payment initiation failed
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
        logger.error(f"SmileCash payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500
```

#### Frontend Implementation

**1. API Service** (`frontend/src/services/smilepayAPI.js`)

```javascript
initiateSmileCash: (paymentData) =>
  api.post('/payments/smilepay/smilecash', paymentData),
```

**2. Modal UI** (`frontend/src/components/SmilePayPaymentModal.jsx`)

Add SmileCash payment flow:
- Tab for SmileCash
- Phone number input
- OTP input field
- Submit button
- OTP verification message

---

### PHASE 2: Implement Omari Payment

Same structure as SmileCash (OTP-based):
- Backend service method: `initiate_omari_payment()`
- Backend route: `POST /api/payments/smilepay/omari`
- Frontend API method: `initiateOmari()`
- Frontend UI: Phone + OTP input

---

### PHASE 3: Implement Visa/Mastercard Payment

**Key Differences:**
- Uses card details instead of phone/OTP
- May return 3D Secure HTML for authentication
- Need to handle redirect flow

**Backend Service Method:**
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
    # ... rest of parameters
) -> Dict[str, Any]:
    """Initiate card payment (Visa/Mastercard)"""
    endpoint = smilepay_config.get_payment_endpoint('card')
    # ... implementation
```

**Frontend:**
- Card number input (with validation)
- Expiry date (MM/YY)
- CVV input
- Cardholder name
- Handle 3D Secure redirect if needed

---

### PHASE 4: Remove Paynow

**Files to Update:**

1. `frontend/src/pages/SubscriptionPayment.jsx`
   - Remove Paynow radio option
   - Remove Paynow payment handler
   - Update button logic

2. `frontend/src/pages/CartCheckout.jsx`
   - Remove Paynow radio option
   - Remove Paynow initialization logic
   - Keep only: Wallet, SmilePay, Bank Transfer

3. `frontend/src/components/CampaignPaymentModal.jsx`
   - Remove 'paynow' from paymentMethods array
   - Remove Paynow handling logic

4. `frontend/src/components/CampaignCartPaymentModal.jsx`
   - Remove 'paynow' from paymentMethods array
   - Remove Paynow handling logic

**Backend:**
- Keep existing Paynow code for historical transactions
- Don't remove Paynow routes/services
- Just disable from frontend UI

---

## Next Steps

1. **Implement SmileCash** - Backend + Frontend
2. **Implement Omari** - Backend + Frontend
3. **Implement Cards** - Backend + Frontend
4. **Update Frontend Modal** - Add all 5 payment methods with proper UI
5. **Remove Paynow** - From all frontend pages
6. **Testing** - Test each payment method end-to-end
7. **Deployment** - Deploy all changes

Total Estimated Time: ~12-15 hours

---

## Ready to Proceed?

I will now implement each phase methodically, testing as I go.
