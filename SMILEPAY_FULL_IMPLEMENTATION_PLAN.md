# SmilePay Express Checkout - Full Implementation Plan

## Overview
Complete re-implementation of SmilePay payment integration using Express Checkout for all payment methods.

## Scope

### Payment Methods to Implement

#### Single-Step (No OTP)
1. **Ecocash** - Mobile money with USSD push
   - Endpoint: `/payments/express-checkout/ecocash`
   - Flow: Initiate → Customer approves on device → Webhook
   - Requires: Mobile number

2. **Innbucks** - Digital payment with payment code
   - Endpoint: `/payments/express-checkout/innbucks`
   - Flow: Initiate → Payment code to customer → Deep link or manual entry → Webhook
   - Returns: Payment code for user to enter in app

3. **OneMoney** - USSD push via NetOne network
   - Endpoint: `/payments/express-checkout/onemoney`
   - Flow: Initiate → Customer approves via USSD → Webhook
   - Requires: Mobile number

#### Two-Step (OTP Verification)
4. **SmileCash/ZB-Wallet** - SMS OTP verification
   - Leg 1: `/payments/express-checkout/zb-payment`
   - Leg 2: `/payments/express-checkout/zb-payment/confirmation`
   - Flow: Initiate (send SMS) → Collect OTP from user → Confirm OTP → Webhook
   - Requires: Mobile number
   - Key: Use `transactionReference` from leg 1 in leg 2

5. **Omari** - SMS OTP verification
   - Leg 1: `/payments/express-checkout/omari`
   - Leg 2: `/payments/express-checkout/omari/confirmation`
   - Flow: Initiate (send SMS) → Collect OTP from user → Confirm OTP → Webhook
   - Requires: Mobile number
   - Key: Use `transactionReference` from leg 1 in leg 2

#### Card Payment (3DS)
6. **Visa/Mastercard** - 3D Secure authentication
   - Endpoint: `/payments/express-checkout/mpgs`
   - Flow: Initiate → Card details → 3DS redirect → Customer auth → Webhook
   - Returns: `redirectHtml` for 3DS authentication
   - Key: Execute returned script to trigger form submission

---

## Backend Implementation

### 1. Service Layer (`backend/app/services/smilepay_service.py`)

**Methods to create:**

```python
# Single-step methods
def initiate_ecocash_payment()      # Returns: transaction reference, mobile required
def initiate_innbucks_payment()     # Returns: payment code
def initiate_onemoney_payment()     # Returns: transaction reference

# Two-step OTP methods (Leg 1)
def initiate_smilepay_otp()         # Returns: transaction reference
def initiate_omari_otp()            # Returns: transaction reference

# Two-step OTP methods (Leg 2)
def confirm_smilepay_otp()          # Takes: transaction reference + OTP
def confirm_omari_otp()             # Takes: transaction reference + OTP + mobile

# Card payment method
def initiate_card_payment()         # Returns: redirect HTML for 3DS

# Webhook handler
def handle_payment_webhook()        # Processes webhook from SmilePay
```

**Key Implementation Details:**
- All methods use SmilePay API headers: `x-api-key`, `x-api-secret`
- Base URL: `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`
- Currency code: "840" (USD)
- Always include: `orderReference`, `amount`, `resultUrl`, `itemName`, `itemDescription`
- Handle 3DS: Return `redirectHtml` for card payments

### 2. Routes Layer (`backend/app/routes/smilepay_payments.py`)

**Endpoints to create:**

```
POST /api/smilepay/ecocash          - Ecocash payment initiation
POST /api/smilepay/innbucks         - Innbucks payment initiation
POST /api/smilepay/onemoney         - OneMoney payment initiation
POST /api/smilepay/zb-payment       - SmileCash leg 1 (initiate)
POST /api/smilepay/zb-payment/confirm - SmileCash leg 2 (confirm OTP)
POST /api/smilepay/omari            - Omari leg 1 (initiate)
POST /api/smilepay/omari/confirm    - Omari leg 2 (confirm OTP)
POST /api/smilepay/card             - Card (MPGS) 3DS initiation
POST /api/webhooks/smilepay         - Webhook receiver (already exists)
```

### 3. Request/Response Formats

**Ecocash:**
```json
Request:
{
  "payment_type": "subscription|booking|campaign|cart",
  "payment_id": 123,
  "amount": 100.00,
  "currency": "USD",
  "ecocash_mobile": "0771234567",
  "item_name": "Premium Subscription"
}

Response:
{
  "success": true,
  "order_reference": "ORD_...",
  "transaction_reference": "TXN_...",
  "status": "PENDING",
  "message": "Payment initiated. Awaiting customer approval on device."
}
```

**SmileCash OTP (Leg 1):**
```json
Request:
{
  "payment_type": "subscription",
  "payment_id": 123,
  "amount": 25.00,
  "currency": "USD",
  "smilepay_mobile": "0711111111",
  "item_name": "Test Payment"
}

Response:
{
  "success": true,
  "transaction_reference": "TXN_123",
  "order_reference": "ORD_...",
  "status": "PENDING_OTP",
  "message": "SMS OTP sent to customer. Awaiting confirmation."
}
```

**SmileCash OTP (Leg 2):**
```json
Request:
{
  "transaction_reference": "TXN_123",
  "otp": "000000"
}

Response:
{
  "success": true,
  "order_reference": "ORD_...",
  "status": "PROCESSING",
  "message": "OTP confirmed. Awaiting webhook confirmation."
}
```

**Card (MPGS) 3DS:**
```json
Request:
{
  "payment_type": "subscription",
  "amount": 50.00,
  "currency": "USD",
  "card_number": "5123450000000008",
  "expiry_month": "01",
  "expiry_year": "39",
  "cvv": "100",
  "cardholder_name": "John Doe",
  "item_name": "Card Payment"
}

Response:
{
  "success": true,
  "transaction_reference": "TXN_123",
  "order_reference": "ORD_...",
  "status": "PENDING_3DS",
  "redirect_html": "<html>...</html>",
  "message": "Redirecting to 3DS authentication"
}
```

---

## Database Schema

### SmilePayTransaction Model Updates

Ensure these columns exist:

```python
# Existing columns that must support all methods
payment_type        # 'subscription', 'booking', 'campaign', 'cart', 'collaboration'
payment_method      # 'ecocash', 'innbucks', 'onemoney', 'smilepay', 'omari', 'visa', 'mastercard'
status              # 'PENDING', 'PENDING_OTP', 'PENDING_3DS', 'COMPLETED', 'FAILED', 'CANCELLED'

# Required new columns
customer_phone      # Mobile number for mobile money methods
transaction_reference  # From SmilePay API (for leg 2 operations)
otp_required        # Boolean: whether OTP is needed
otp_confirmed       # Boolean: whether OTP has been verified
redirect_html       # For 3DS (card) payments
response_code       # SmilePay response code
response_message    # SmilePay response message
extra_data          # JSON: any additional data from SmilePay
```

### Migration Needed
Check if columns exist; create migration if necessary.

---

## Frontend Implementation

### Payment Pages to Update/Create

1. **Subscription Payment** (`pages/subscriptions/payment.jsx` or similar)
   - Should show payment method selector
   - Routes to appropriate payment flow

2. **Campaign Payment** (`pages/campaigns/checkout.jsx` or similar)
   - Payment method selector
   - Routes based on selection

3. **Booking Payment** (`pages/bookings/payment.jsx` or similar)
   - Similar payment flow

4. **Cart Checkout** (`pages/checkout/payment.jsx` or similar)
   - Full payment flow

### Components to Create/Update

**1. Payment Method Selector**
```jsx
// components/payments/PaymentMethodSelector.jsx
// Shows: Ecocash, Innbucks, OneMoney, SmileCash, Omari, Visa, Mastercard
```

**2. Ecocash/Innbucks/OneMoney Flow**
```jsx
// components/payments/SingleStepPaymentFlow.jsx
// Shows: Mobile number input → Submit → Waiting screen
```

**3. OTP Verification Component**
```jsx
// components/payments/OTPVerification.jsx
// Shows: OTP input field → Verify button
// Used for: SmileCash, Omari
```

**4. Card Payment Component**
```jsx
// components/payments/CardPaymentForm.jsx
// Shows: Card number, expiry, CVV inputs
```

**5. 3DS Authentication Component**
```jsx
// components/payments/ThreeDSRedirect.jsx
// Injects redirect HTML and executes script
```

### Frontend Flow Diagrams

**Single-Step (Ecocash, Innbucks, OneMoney):**
```
User selects method → Enters mobile (if required) → 
Click Pay → Backend initiates → Shows "Awaiting approval" → 
Webhook updates transaction → User sees success/failure
```

**Two-Step OTP (SmileCash, Omari):**
```
User selects method → Enters mobile → Click Pay → 
Backend initiates (SMS sent) → User sees OTP form →
User enters OTP → Backend confirms → Shows "Processing" →
Webhook updates transaction → User sees success/failure
```

**Card 3DS (Visa/Mastercard):**
```
User selects card → Enters card details →
Backend initiates → Receives redirectHtml →
Frontend injects HTML and executes script →
3DS page opens in iframe/redirect →
User authenticates with card issuer →
Returns to result URL → Webhook updates transaction →
User sees success/failure
```

---

## Implementation Order

### Phase 1: Backend Service & Models (Priority 1-3)
1. ✅ Verify SmilePayTransaction model has all needed columns
2. ⏳ Create/run database migration if needed
3. ⏳ Update smilepay_service.py with all 6 payment methods
4. ⏳ Create routes for all payment methods
5. ⏳ Update webhook handler

### Phase 2: Frontend Pages (Priority 4-5)
6. ⏳ Verify frontend payment pages exist
7. ⏳ Create/update payment form components
8. ⏳ Create OTP verification component
9. ⏳ Create 3DS redirect component

### Phase 3: Testing & Deployment (Priority 6+)
10. ⏳ Test each payment method end-to-end
11. ⏳ Deploy to production
12. ⏳ Monitor webhooks and logs

---

## Key API Endpoints Reference

### SmilePay API Base
- Sandbox: `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`

### Payment Initiation Endpoints
- `POST /payments/express-checkout/ecocash`
- `POST /payments/express-checkout/innbucks`
- `POST /payments/express-checkout/onemoney`
- `POST /payments/express-checkout/zb-payment` (SmileCash leg 1)
- `POST /payments/express-checkout/zb-payment/confirmation` (SmileCash leg 2)
- `POST /payments/express-checkout/omari` (Omari leg 1)
- `POST /payments/express-checkout/omari/confirmation` (Omari leg 2)
- `POST /payments/express-checkout/mpgs` (Card 3DS)

### Utility Endpoints
- `GET /payments/transaction/{orderReference}/status/check` - Check status
- `POST /payments/cancel/{orderReference}` - Cancel payment

---

## Common Pitfalls to Avoid

1. ❌ Collecting card details in forms (PCI liability)
   - ✅ Always use Express Checkout for cards

2. ❌ Not using `transactionReference` in OTP leg 2
   - ✅ Must use reference from leg 1 response

3. ❌ Not executing script in 3DS redirect HTML
   - ✅ Extract and manually execute script tag

4. ❌ Duplicate webhook processing
   - ✅ Check `orderReference` already processed

5. ❌ Not acknowledging webhook with HTTP 200
   - ✅ Always return 200 immediately to gateway

---

## Testing Scenarios

### Ecocash Test
- Mobile: 263788687707
- Manual approval required

### SmileCash Test
- Mobile: 0711111111
- OTP: 000000

### Omari Test
- Mobile: 0731234567
- OTP: 000000

### OneMoney Test
- Success: 0713456789
- Failure: 0713456780

### Card Test
- Success: 5123450000000008
- Error: 5123450000000002
- Declined: (others)

---

## Success Criteria

✅ All 6 payment methods implemented
✅ Service methods for all payment flows
✅ Routes for all payment types
✅ Database models support all fields
✅ Frontend components for payment flows
✅ Webhook handling for all methods
✅ End-to-end testing for each method
✅ Production deployment ready

