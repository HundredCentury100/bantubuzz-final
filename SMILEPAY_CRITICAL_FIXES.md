# SmilePay Express Checkout - Implementation Priority Action Plan

## Current State Assessment

### ✅ What's Already Implemented
- All 6 payment methods exist in backend
- SmilePayPaymentModal UI component is complete
- Database models support all payment types
- Webhook handler exists
- Polling mechanism works
- OTP support for SmileCash and Omari

### ⚠️ Issues Found

#### CRITICAL (PCI Compliance Risk)
1. **Card Payment Sends Card Details to Frontend**
   - **Location**: `SmilePayPaymentModal.jsx` line 314-377
   - **Issue**: Card number, expiry, CVV collected in form and sent to backend
   - **Risk**: PCI-DSS Level 1 compliance required if storing/processing card details
   - **Fix**: Must use SmilePay's Express Checkout for MPGS (3DS only), never collect card details on frontend

#### HIGH PRIORITY
2. **Cart Payment Not Completed** 
   - **Location**: `smilepay_service.py` line 591 (TODO)
   - **Status**: Placeholder only, no logic
   - **Fix**: Implement cart payment completion

3. **Campaign Payment Missing SmilePay**
   - **Location**: `CampaignPayment.jsx`
   - **Fix**: Add SmilePay payment option

4. **Card Payment Flow Incorrect**
   - **Current**: Frontend sends card data to backend  
   - **Correct**: Backend sends card data to SmilePay (Express Checkout MPGS)
   - **Better**: Use hosted checkout (SmilePay handles card collection)

#### MEDIUM PRIORITY  
5. **No 3DS Redirect Handling in Backend**
   - Should extract and return `redirectHtml` for card payments
   - Frontend needs to inject and execute returned HTML/script

---

## Implementation Priority (Order of Execution)

### Phase 1: FIX CRITICAL ISSUES (Do This First)

**Task 1A: Fix Card Payment Flow** ⚠️ CRITICAL
- Backend: Update card payment to use MPGS Express Checkout (NOT Standard Checkout)
- Backend: Accept card details and send to SmilePay API (not from form)
- Backend: Return `redirect_html` for frontend to handle 3DS
- Frontend: Remove card form fields from SmilePayPaymentModal
- Frontend: Only collect card_type (visa/mastercard) selector

**Task 1B: Implement Cart Payment Completion**
- Add logic to update campaign cart status when payment completes
- Mark items as purchased
- Handle refunds for canceled orders

**Task 1C: Add SmilePay to Campaign Payment**
- Add SmilePay modal option to CampaignPayment.jsx
- Use same SmilePayPaymentModal component

### Phase 2: VERIFY & TEST (After Phase 1)

**Task 2A: Verify All Payment Methods Work**
- Test Ecocash flow
- Test Innbucks flow  
- Test OneMoney flow
- Test SmileCash OTP flow
- Test Omari OTP flow
- Test Card 3DS flow

**Task 2B: Database & Migrations**
- Verify all required columns exist in SmilePayTransaction
- Run migrations if needed
- Check indexes are created

**Task 2C: Frontend Completeness**
- Verify all payment pages have SmilePay integration
- Check error handling
- Verify payment status display

### Phase 3: DEPLOY & MONITOR

**Task 3A: Deploy to Production**
- Push to edits branch
- Test on staging
- Deploy to production

**Task 3B: Monitor Webhooks**
- Watch for payment confirmations
- Check logs for errors
- Verify transaction status updates

---

## Detailed Fixes Needed

### FIX 1: Card Payment - Use MPGS Express Checkout

**Current (WRONG):**
```
Frontend → collects card details → sends to backend → backend sends to SmilePay
❌ PCI compliance issue - card details in app
```

**Correct (Express Checkout):**
```
Backend → calls SmilePay MPGS API with card details → gets 3DS HTML
Frontend → receives redirect_html → injects and executes script → 3DS page opens
❌ Better but still has card details in backend memory

Best (Hosted Checkout):
Frontend → redirects to SmilePay hosted page → SmilePay collects card details
❌ Simplest but user leaves site
```

**Implementation:**
1. Backend accepts card details **ONLY** in POST request (NOT stored)
2. Immediately sends to SmilePay MPGS endpoint
3. Returns `redirect_html` to frontend
4. Frontend injects HTML and executes script for 3DS
5. Never store card details anywhere

**File: `backend/app/services/smilepay_service.py`**
```python
@staticmethod
def initiate_card_payment(
    order_reference: str,
    amount: float,
    item_name: str,
    customer_email: str,
    customer_first_name: str,
    customer_last_name: str,
    customer_phone: str,
    card_pan: str,              # Card number
    card_exp_month: str,        # Expiry month (01-12)
    card_exp_year: str,         # Expiry year (2-digit, e.g., 25)
    card_security_code: str,    # CVV
    currency: str = 'USD',
    return_url: str = '',
    result_url: str = '',
    cancel_url: str = '',
    failure_url: str = ''
) -> Dict[str, Any]:
    """
    Initiate card payment via MPGS Express Checkout with 3DS
    
    Returns redirect_html if 3DS required, or payment status
    Card details are sent directly to SmilePay, never stored
    """
    try:
        endpoint = f"{SMILEPAY_API_BASE}/payments/express-checkout/mpgs"
        headers = {
            'x-api-key': SMILEPAY_API_KEY,
            'x-api-secret': SMILEPAY_API_SECRET,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'orderReference': order_reference,
            'amount': amount,
            'currencyCode': get_currency_code(currency),
            'itemName': item_name,
            'itemDescription': '',
            'email': customer_email,
            'firstName': customer_first_name,
            'lastName': customer_last_name,
            'mobilePhoneNumber': customer_phone,
            'returnUrl': return_url,
            'resultUrl': result_url,
            'cancelUrl': cancel_url,
            'failureUrl': failure_url,
            'paymentMethod': 'CARD',
            'pan': card_pan,
            'expMonth': card_exp_month,
            'expYear': card_exp_year,
            'securityCode': card_security_code,
        }
        
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        data = response.json()
        
        # Extract 3DS handling info
        redirect_html = data.get('redirectHtml')
        status = data.get('status')
        
        return {
            'success': response.status_code == 200,
            'status_code': response.status_code,
            'data': data,
            'redirect_html': redirect_html,
            'status': status,
            'transaction_reference': data.get('transactionReference'),
            'response_code': data.get('responseCode'),
            'response_message': data.get('responseMessage'),
        }
    except Exception as e:
        logger.error(f"Card payment error: {str(e)}")
        return {'success': False, 'error': str(e)}
```

**File: `backend/app/routes/smilepay_payments.py`**
```python
@bp.route('/card', methods=['POST'])
@jwt_required()
def initiate_card_payment():
    """
    Initiate card payment with 3DS verification
    
    No card details stored - sent directly to SmilePay
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required = ['amount', 'card_pan', 'card_exp_month', 'card_exp_year', 'card_security_code', 'item_name']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Generate order reference
        order_reference = SmilePayTransaction.generate_order_reference('card_payment', None)
        
        # Get customer name
        customer_first_name, customer_last_name = get_user_display_name(user)
        
        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data.get('payment_type', 'card_payment'),
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='visa',  # Assume visa for now, could be dynamic
            status='PENDING_3DS',
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
            otp_required=False
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        # Initiate card payment with SmilePay
        result = smilepay_service.initiate_card_payment(
            order_reference=order_reference,
            amount=data['amount'],
            item_name=data['item_name'],
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_phone=data.get('phone', ''),
            card_pan=data['card_pan'],
            card_exp_month=data['card_exp_month'],
            card_exp_year=data['card_exp_year'],
            card_security_code=data['card_security_code'],
            currency=data.get('currency', 'USD'),
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', '')
        )
        
        if result.get('success'):
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.extra_data = response_data
            transaction.status = result.get('status', 'PENDING_3DS')
            db.session.commit()
            
            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'transaction_reference': transaction.transaction_reference,
                'redirect_html': result.get('redirect_html'),
                'status': transaction.status,
                'message': 'Redirecting to 3DS authentication'
            }), 200
        else:
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error')
            db.session.commit()
            
            return jsonify({
                'success': False,
                'error': result.get('error'),
                'order_reference': order_reference
            }), 400
    
    except Exception as e:
        logger.error(f"Card payment error: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

**File: `frontend/src/components/SmilePayPaymentModal.jsx`**
- Remove card form fields (card number, expiry, CVV)
- Keep card type selector (Visa/Mastercard)
- Add 3DS redirect handler
- Use hosted checkout if available

---

## Files to Modify

### Backend
- [ ] `backend/app/services/smilepay_service.py` - Fix card payment, implement cart completion
- [ ] `backend/app/routes/smilepay_payments.py` - Update card route
- [ ] `backend/app/models/smilepay_transaction.py` - Verify all fields exist
- [ ] Database migrations - Run if needed

### Frontend
- [ ] `frontend/src/components/SmilePayPaymentModal.jsx` - Fix card payment UI
- [ ] `frontend/src/pages/CampaignPayment.jsx` - Add SmilePay option
- [ ] `frontend/src/components/CardPaymentForm.jsx` - Create new (if doesn't exist)
- [ ] `frontend/src/components/ThreeDSHandler.jsx` - Create for 3DS redirect

---

## Verification Checklist

After implementation:

- [ ] Card payment uses MPGS Express Checkout
- [ ] Card details NOT collected in form
- [ ] 3DS redirect works
- [ ] Ecocash payment works
- [ ] Innbucks payment works
- [ ] OneMoney payment works
- [ ] SmileCash OTP works
- [ ] Omari OTP works
- [ ] Cart payment completion works
- [ ] Campaign payment SmilePay works
- [ ] Webhook processing works
- [ ] Transaction status updates correctly
- [ ] No card details in database logs
- [ ] All tests pass
- [ ] Ready for production

