# SmilePay Express Checkout - EXACT Implementation Following Official Documentation

**Read Date**: May 13, 2026
**Status**: Following official Smile&Pay API documentation EXACTLY

---

## DOCUMENTATION ANALYSIS - LINE BY LINE

### BASE CONFIGURATION
- **Sandbox API Base URL**: `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`
- **Headers Required**: 
  - `x-api-key: YOUR_API_KEY`
  - `x-api-secret: YOUR_API_SECRET`
  - `Content-Type: application/json`

### EXPRESS CHECKOUT OVERVIEW (From Docs)
> "Process payments directly from your own UI without redirecting to the ZB hosted payment page. Ideal for seamless, in-app checkout experiences."

**Payment Flow Types:**
1. **Single-Step**: Ecocash, OneMoney, Innbucks
   - Flow: "Initiate payment → Customer approves on their device → Receive webhook callback"
   
2. **Two-Step (OTP)**: SmileCash, Omari
   - Flow: "Initiate payment (triggers SMS) → Collect OTP from customer in your UI → Submit OTP to confirm endpoint → Receive webhook callback"

---

## PAYMENT METHOD 1: ECOCASH EXPRESS CHECKOUT

### From Documentation
- **Endpoint**: `POST /payments/express-checkout/ecocash`
- **Flow**: "Process Ecocash payments directly via a USSD push to the customer's phone"
- **Test Mobile**: 263788687707
- **Note**: "Approval of EcoCash test payments is done manually from the test mobile. Please contact the Smile&Pay team to trigger approval during testing."

### Exact Request Format (From Docs)
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/ecocash' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "orderReference": "ORDER-12345",
  "amount": 100.00,
  "resultUrl": "https://yoursite.com/api/webhook",
  "itemName": "Product Name",
  "itemDescription": "Product Description",
  "currencyCode": "840",
  "ecocashMobile": "0771234567"
}'
```

### Backend Service Implementation Required
```python
def initiate_ecocash_payment(
    order_reference: str,
    amount: float,
    item_name: str,
    item_description: str,
    result_url: str,
    currency_code: str,
    ecocash_mobile: str
) -> Dict[str, Any]:
    """
    EXACTLY as per documentation.
    Send: order_reference, amount, resultUrl, itemName, itemDescription, currencyCode, ecocashMobile
    Receive: Response from SmilePay
    """
    endpoint = f"{SMILEPAY_BASE}/payments/express-checkout/ecocash"
    headers = {
        'x-api-key': SMILEPAY_API_KEY,
        'x-api-secret': SMILEPAY_API_SECRET,
        'Content-Type': 'application/json'
    }
    payload = {
        'orderReference': order_reference,
        'amount': amount,
        'resultUrl': result_url,
        'itemName': item_name,
        'itemDescription': item_description,
        'currencyCode': currency_code,
        'ecocashMobile': ecocash_mobile
    }
    response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    return response.json()
```

### Backend Route Required
```python
@bp.route('/ecocash', methods=['POST'])
@jwt_required()
def initiate_ecocash_payment():
    """
    POST /api/smilepay/ecocash
    Input: payment_type, amount, item_name, ecocash_mobile
    Output: order_reference, transaction_reference, status
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Generate order reference
    order_reference = SmilePayTransaction.generate_order_reference('ecocash', None)
    
    # Create transaction record
    transaction = SmilePayTransaction(
        payment_type=data['payment_type'],
        user_id=user_id,
        order_reference=order_reference,
        amount=data['amount'],
        currency_code='840',  # USD per docs
        payment_method='ecocash',
        status='PENDING',
        item_name=data['item_name'],
        customer_phone=data['ecocash_mobile'],
        result_url='webhook_url_here',
        otp_required=False
    )
    db.session.add(transaction)
    db.session.commit()
    
    # Call SmilePay
    result = smilepay_service.initiate_ecocash_payment(
        order_reference=order_reference,
        amount=data['amount'],
        item_name=data['item_name'],
        item_description='',
        result_url='webhook_url_here',
        currency_code='840',
        ecocash_mobile=data['ecocash_mobile']
    )
    
    return jsonify({
        'success': result.get('success'),
        'order_reference': order_reference,
        'status': 'PENDING'
    })
```

---

## PAYMENT METHOD 2: INNBUCKS EXPRESS CHECKOUT

### From Documentation
- **Endpoint**: `POST /payments/express-checkout/innbucks`
- **Flow**: "Process Innbucks payments by generating a payment code that the customer types into their app, or via deep link"
- **Response Contains**: `innbucksPaymentCode`
- **User Action**: "You can either display this code to the user, or automatically trigger a deep link if they are on a mobile device"
- **Deep Link Format**: `<a href="schinn.wbpycode://innbucks.co.zw?pymInnCode=701564">`

### Exact Request Format (From Docs)
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/innbucks' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "orderReference": "ORDER-12345",
  "amount": 100.00,
  "resultUrl": "https://yoursite.com/api/webhook",
  "itemName": "Product Name",
  "itemDescription": "Product Description",
  "currencyCode": "840"
}'
```

### Key Difference from Ecocash
- **NO** mobile number required
- Returns: **Payment code** that user enters in their app
- Frontend must display code to user OR create deep link

### Backend Service Implementation Required
```python
def initiate_innbucks_payment(
    order_reference: str,
    amount: float,
    item_name: str,
    item_description: str,
    result_url: str,
    currency_code: str
) -> Dict[str, Any]:
    """
    EXACTLY as per documentation.
    Send: orderReference, amount, resultUrl, itemName, itemDescription, currencyCode
    Receive: Response with innbucksPaymentCode
    """
    endpoint = f"{SMILEPAY_BASE}/payments/express-checkout/innbucks"
    headers = {'x-api-key': ..., 'x-api-secret': ..., 'Content-Type': 'application/json'}
    payload = {
        'orderReference': order_reference,
        'amount': amount,
        'resultUrl': result_url,
        'itemName': item_name,
        'itemDescription': item_description,
        'currencyCode': currency_code
    }
    response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    data = response.json()
    
    # Extract payment code
    payment_code = data.get('innbucksPaymentCode')
    
    return {
        'success': response.status_code == 200,
        'payment_code': payment_code,
        'raw_response': data
    }
```

---

## PAYMENT METHOD 3: SMARTCASH EXPRESS CHECKOUT - TWO-STEP (OTP)

### From Documentation
> "Process SmileCash (ZB Wallet) payments using a two-leg OTP verification flow entirely within your UI"

- **Test Mobile**: 0711111111
- **Test OTP**: 000000

### LEG 1: INITIATE PAYMENT

**Endpoint**: `POST /payments/express-checkout/zb-payment`

**Exact Request (From Docs)**:
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/zb-payment' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "orderReference": "ORDER-12345",
  "amount": 25.00,
  "resultUrl": "https://yoursite.com/api/webhook",
  "itemName": "Product Name",
  "itemDescription": "SmileCash test payment",
  "currencyCode": "840",
  "zbWalletMobile": "0711111111"
}'
```

**Response Contains**: `transactionReference`

**CRITICAL WARNING FROM DOCS**:
> "The initiation response will contain a transactionReference. You MUST use this transactionReference (not your original orderReference) in Leg 2 below to confirm the OTP."

### LEG 2: CONFIRM PAYMENT (OTP)

**Endpoint**: `POST /payments/express-checkout/zb-payment/confirmation`

**Exact Request (From Docs)**:
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/zb-payment/confirmation' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "transactionReference": "TXN-RECEIVED-FROM-LEG-1",
  "otp": "000000"
}'
```

### Backend Service Implementation Required

```python
# LEG 1
def initiate_smilepay_otp(
    order_reference: str,
    amount: float,
    item_name: str,
    item_description: str,
    result_url: str,
    currency_code: str,
    zb_wallet_mobile: str
) -> Dict[str, Any]:
    """LEG 1: Initiate SmileCash payment, triggers SMS OTP to user"""
    endpoint = f"{SMILEPAY_BASE}/payments/express-checkout/zb-payment"
    headers = {'x-api-key': ..., 'x-api-secret': ..., 'Content-Type': 'application/json'}
    payload = {
        'orderReference': order_reference,
        'amount': amount,
        'resultUrl': result_url,
        'itemName': item_name,
        'itemDescription': item_description,
        'currencyCode': currency_code,
        'zbWalletMobile': zb_wallet_mobile
    }
    response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    data = response.json()
    
    # CRITICAL: Extract and store transactionReference for leg 2
    transaction_reference = data.get('transactionReference')
    
    return {
        'success': response.status_code == 200,
        'transaction_reference': transaction_reference,  # MUST use this in leg 2
        'raw_response': data
    }

# LEG 2
def confirm_smilepay_otp(
    transaction_reference: str,  # From LEG 1 response, NOT orderReference
    otp: str
) -> Dict[str, Any]:
    """LEG 2: Confirm SmileCash payment with OTP entered by user"""
    endpoint = f"{SMILEPAY_BASE}/payments/express-checkout/zb-payment/confirmation"
    headers = {'x-api-key': ..., 'x-api-secret': ..., 'Content-Type': 'application/json'}
    payload = {
        'transactionReference': transaction_reference,  # MUST be from leg 1
        'otp': otp
    }
    response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    data = response.json()
    
    return {
        'success': response.status_code == 200,
        'raw_response': data
    }
```

---

## PAYMENT METHOD 4: OMARI EXPRESS CHECKOUT - TWO-STEP (OTP)

### From Documentation
> "Process Omari payments using a two-leg SMS OTP verification flow within your UI"

- **Test Mobile**: 0731234567
- **Test OTP**: 000000

### LEG 1: INITIATE PAYMENT

**Endpoint**: `POST /payments/express-checkout/omari`

**Exact Request (From Docs)**:
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/omari' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "orderReference": "ORDER-12345",
  "amount": 30.00,
  "resultUrl": "https://yoursite.com/api/webhook",
  "itemName": "Product Name",
  "itemDescription": "Omari test payment",
  "currencyCode": "840",
  "omariMobile": "0731234567"
}'
```

### LEG 2: CONFIRM PAYMENT (OTP)

**Endpoint**: `POST /payments/express-checkout/omari/confirmation`

**Exact Request (From Docs)**:
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/omari/confirmation' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret': YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "transactionReference": "TXN-RECEIVED-FROM-LEG-1",
  "otp": "000000",
  "omariMobile": "0731234567"
}'
```

**NOTE**: Omari LEG 2 also requires `omariMobile` (different from SmileCash)

### Backend Service Implementation
Similar to SmileCash, but:
- LEG 2 requires `omariMobile` in addition to `transactionReference` and `otp`

---

## PAYMENT METHOD 5: ONEMONEY EXPRESS CHECKOUT

### From Documentation
> "Process OneMoney payments with USSD push notifications via NetOne's mobile network"

- **Success Scenario Mobile**: 0713456789
- **Failed Scenario Mobile**: 0713456780

### Exact Request (From Docs)
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/onemoney' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--header 'Content-Type: application/json' \
--data '{
  "orderReference": "ORDER-12345",
  "amount": 100.00,
  "resultUrl": "https://yoursite.com/api/webhook",
  "itemName": "Product Name",
  "itemDescription": "Product Description",
  "currencyCode": "840",
  "oneMoneyMobile": "0713456789"
}'
```

### Backend Service Implementation
Same as Ecocash (single-step), but endpoint is `/payments/express-checkout/onemoney` and field is `oneMoneyMobile`

---

## PAYMENT METHOD 6: VISA/MASTERCARD EXPRESS CHECKOUT (MPGS 3DS)

### From Documentation
> "Process card payments directly from your app with secure 3DS redirection"

**Key Steps (From Docs)**:
1. Customer enters card details in your UI
2. Your server sends to Smile & Pay API
3. Smile & Pay returns 3D Secure HTML for redirection
4. Customer is redirected to card issuer's authentication page
5. After authentication, callback to your return URL
6. Smile & Pay sends final payment status via webhook

### Exact Request (From Docs)
```bash
curl --location 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/express-checkout/mpgs' \
--header 'Content-Type: application/json' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'x-api-secret: YOUR_API_SECRET' \
--data '{
  "orderReference": "ORDER-12345",
  "amount": 10.00,
  "returnUrl": "https://yoursite.com/return",
  "resultUrl": "https://yoursite.com/webhook",
  "itemName": "Test Item",
  "itemDescription": "Test Description",
  "currencyCode": "840",
  "firstName": "John",
  "lastName": "Doe",
  "mobilePhoneNumber": "0771234567",
  "email": "john@example.com",
  "paymentMethod": "CARD",
  "cancelUrl": "https://yoursite.com/cancel",
  "failureUrl": "https://yoursite.com/fail",
  "pan": "5123450000000008",
  "expMonth": "01",
  "expYear": "39",
  "securityCode": "100"
}'
```

### Example Response (From Docs)
```json
{
  "responseMessage": "Transaction initiated successfully",
  "responseCode": "00",
  "status": "PENDING_3DS",
  "transactionReference": "TXN-123456789",
  "gatewayRecommendation": "PROCEED",
  "authenticationStatus": "AUTHENTICATION_REQUIRED",
  "redirectHtml": "<html lang=\"en\"><body><form id=\"3ds\" action=\"...\"></form>...</body></html>",
  "customizedHtml": {
    "3ds2": {
      "acsUrl": "https://acs.example.com",
      "cReq": "eyJtZXNzYWdlVHlwZSI6IkNSZXEiLCJtZXNzYWdlVmVyc2lvbiI6IjIuMS4wIn0="
    }
  }
}
```

### 3DS Handling (From Docs)
> "Because modern browsers block scripts injected via innerHTML, you must manually execute the script tag within the redirectHtml to trigger the automatic submission to the Mastercard ACS (Access Control Server)."

**Steps**:
1. **Inject HTML**: Place the redirectHtml into a container
2. **Execute Script**: Extract the <script> tag and append it to the document body to trigger the form POST

### Backend Service Implementation
```python
def initiate_card_payment(
    order_reference: str,
    amount: float,
    item_name: str,
    item_description: str,
    result_url: str,
    return_url: str,
    cancel_url: str,
    failure_url: str,
    currency_code: str,
    first_name: str,
    last_name: str,
    mobile_phone: str,
    email: str,
    pan: str,
    exp_month: str,
    exp_year: str,
    security_code: str
) -> Dict[str, Any]:
    """
    EXACTLY as per documentation.
    Send card details directly to SmilePay MPGS endpoint
    Returns: redirectHtml for 3DS (frontend handles)
    """
    endpoint = f"{SMILEPAY_BASE}/payments/express-checkout/mpgs"
    headers = {'x-api-key': ..., 'x-api-secret': ..., 'Content-Type': 'application/json'}
    payload = {
        'orderReference': order_reference,
        'amount': amount,
        'returnUrl': return_url,
        'resultUrl': result_url,
        'itemName': item_name,
        'itemDescription': item_description,
        'currencyCode': currency_code,
        'firstName': first_name,
        'lastName': last_name,
        'mobilePhoneNumber': mobile_phone,
        'email': email,
        'paymentMethod': 'CARD',
        'cancelUrl': cancel_url,
        'failureUrl': failure_url,
        'pan': pan,
        'expMonth': exp_month,
        'expYear': exp_year,
        'securityCode': security_code
    }
    response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    data = response.json()
    
    return {
        'success': response.status_code == 200,
        'status': data.get('status'),
        'transaction_reference': data.get('transactionReference'),
        'redirect_html': data.get('redirectHtml'),  # Frontend uses this
        'raw_response': data
    }
```

---

## WEBHOOK CALLBACK (From Docs)

### Callback Payload Structure
```json
{
  "merchantId": "MERCHANT123",
  "reference": "TXN-789456123",
  "orderReference": "ORDER-12345",
  "itemName": "Product Name",
  "amount": 100.00,
  "currency": "USD",
  "currencyCode": "840",
  "paymentOption": "ECOCASH",
  "status": "PAID",
  "createdDate": "2026-01-06T10:30:00Z",
  "returnUrl": "https://yoursite.com/success",
  "resultUrl": "https://yoursite.com/webhook",
  "clientFee": 2.50,
  "merchantFee": 2.50,
  "mobileNumber": "0771234567"
}
```

### Best Practices (From Docs)
- **Acknowledge Receipt**: "Always return HTTP 200 immediately to acknowledge receipt, otherwise the gateway will keep retrying"
- **Idempotency**: "Ensure your system checks if the orderReference was already processed to prevent double-crediting if a duplicate webhook arrives"

---

## TESTING DATA (From Docs)

### Ecocash
- **Test Mobile**: 263788687707
- **Note**: Manual approval required

### SmileCash
- **Test Mobile**: 0711111111
- **Test OTP**: 000000

### Omari
- **Test Mobile**: 0731234567
- **Test OTP**: 000000

### OneMoney
- **Success**: 0713456789
- **Failure**: 0713456780

### Card
- **Success (3DS Challenge)**: 5123450000000008
- **System Error**: 5123450000000002
- **Declined**: (others)

---

## SUMMARY: EXACT FIELDS PER ENDPOINT

| Endpoint | Method | Required Fields |
|----------|--------|-----------------|
| `/payments/express-checkout/ecocash` | POST | orderReference, amount, resultUrl, itemName, itemDescription, currencyCode, **ecocashMobile** |
| `/payments/express-checkout/innbucks` | POST | orderReference, amount, resultUrl, itemName, itemDescription, currencyCode |
| `/payments/express-checkout/onemoney` | POST | orderReference, amount, resultUrl, itemName, itemDescription, currencyCode, **oneMoneyMobile** |
| `/payments/express-checkout/zb-payment` | POST | orderReference, amount, resultUrl, itemName, itemDescription, currencyCode, **zbWalletMobile** |
| `/payments/express-checkout/zb-payment/confirmation` | POST | **transactionReference** (from leg 1), **otp** |
| `/payments/express-checkout/omari` | POST | orderReference, amount, resultUrl, itemName, itemDescription, currencyCode, **omariMobile** |
| `/payments/express-checkout/omari/confirmation` | POST | **transactionReference** (from leg 1), **otp**, **omariMobile** |
| `/payments/express-checkout/mpgs` | POST | orderReference, amount, returnUrl, resultUrl, itemName, itemDescription, currencyCode, firstName, lastName, mobilePhoneNumber, email, paymentMethod="CARD", cancelUrl, failureUrl, **pan, expMonth, expYear, securityCode** |

---

## KEY IMPLEMENTATION RULES (From Documentation)

1. ✅ **Express Checkout**: Users stay in our app/form
2. ✅ **SMS OTP**: Collected in our UI, sent to confirmation endpoint
3. ✅ **3DS**: SmilePay returns HTML/script for redirect
4. ✅ **Card Details**: Sent directly to MPGS endpoint (not stored by us)
5. ✅ **Two-Step Methods**: MUST use `transactionReference` from leg 1 in leg 2 (not `orderReference`)
6. ✅ **Webhooks**: Always return HTTP 200 immediately
7. ✅ **Idempotency**: Check `orderReference` to prevent duplicates
8. ✅ **Testing**: Use provided test data and mobiles

