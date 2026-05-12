# Smile&Pay Payment Gateway Integration - Implementation Plan

## Overview
Integration of Smile&Pay payment gateway to support multiple payment methods across all payment pages in the Bantubuzz platform.

**Payment Methods to Support:**
- Ecocash (Mobile Money) - Most common in Zimbabwe
- Innbucks (Digital Wallet)
- Omari (Payment Platform)
- Visa/Mastercard (Credit/Debit Cards)
- Smile Cash (Digital Wallet)

---

## Current Payment Pages to Update

Based on the Bantubuzz platform, these are the payment pages that need Smile&Pay integration:

### 1. **Subscription Payments** (Creators & Brands)
- **File:** `frontend/src/pages/SubscriptionPayment.jsx`
- **Current:** Paynow integration
- **Use Case:** Users upgrading/purchasing subscription plans
- **Payment Type:** One-time or recurring subscription fees

### 2. **Campaign Cart Checkout**
- **File:** `frontend/src/pages/CartCheckout.jsx`
- **Current:** Paynow + Bank Transfer
- **Use Case:** Brands paying for multiple creators in campaign cart
- **Payment Type:** Campaign collaboration payments

### 3. **Direct Collaboration Payments**
- **File:** `frontend/src/pages/CollaborationDetails.jsx`
- **Current:** Paynow integration
- **Use Case:** Brands paying for individual collaborations
- **Payment Type:** Collaboration milestone payments

### 4. **Campaign Payments** (Single Creator)
- **Files:** Campaign payment modals
- **Current:** Paynow integration
- **Use Case:** Brands paying for campaign collaborations
- **Payment Type:** Direct campaign payments

### 5. **Booking Payments**
- **File:** `frontend/src/pages/BookingDetails.jsx`
- **Current:** Paynow + Bank Transfer
- **Use Case:** Brands paying for package bookings
- **Payment Type:** Package booking payments

### 6. **Wallet Top-up** (If exists)
- **Use Case:** Brands adding funds to wallet
- **Payment Type:** Wallet deposits

---

## Architecture Design

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Payment Request                          │
│         (Subscription/Campaign/Booking/etc)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Payment Service Layer                           │
│  - Determines payment gateway (Paynow/SmilePay)             │
│  - Routes to appropriate service                             │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│   Paynow Service     │   │  SmilePay Service    │
│  (Existing)          │   │  (NEW)               │
└──────────────────────┘   └──────────┬───────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
              ┌──────────────────┐    ┌──────────────────┐
              │ Standard Checkout│    │ Express Checkout │
              │ (Hosted Page)    │    │ (Direct API)     │
              └──────────────────┘    └──────────────────┘
                         │                         │
                         ▼                         ▼
              ┌──────────────────────────────────────────┐
              │     Smile&Pay API                        │
              │  - Ecocash, Innbucks, Cards, etc        │
              └──────────────┬───────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────────┐
              │     Webhook Handler                      │
              │  - Receives payment status               │
              │  - Updates database                      │
              │  - Sends notifications                   │
              └──────────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Payment Page                                    │
│  (Subscription/Campaign/Booking/Cart)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Payment Method Selection Modal                      │
│  - Show available payment methods                           │
│  - Paynow, Bank Transfer, Smile&Pay                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (User selects Smile&Pay)
┌─────────────────────────────────────────────────────────────┐
│         SmilePay Payment Modal (NEW)                        │
│  - Method tabs: Ecocash, Innbucks, Cards, etc              │
│  - Input fields based on selected method                    │
│  - Handles payment flow                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Standard Checkout   │   │  Express Checkout    │
│  - Redirect to       │   │  - Show payment      │
│    hosted page       │   │    instructions      │
│  - Return to app     │   │  - Poll for status   │
└──────────────────────┘   └──────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Backend Infrastructure (Foundation)

#### 1.1 Configuration & Environment
**File:** `backend/app/config/smilepay_config.py` (NEW)
```python
SMILEPAY_CONFIG = {
    'sandbox': {
        'base_url': 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway',
        'api_key': os.getenv('SMILEPAY_SANDBOX_API_KEY'),
        'api_secret': os.getenv('SMILEPAY_SANDBOX_API_SECRET'),
    },
    'production': {
        'base_url': 'https://zbnet.zb.co.zw/wallet_gateway/payments-gateway',
        'api_key': os.getenv('SMILEPAY_API_KEY'),
        'api_secret': os.getenv('SMILEPAY_API_SECRET'),
    }
}
```

**Environment Variables to Add:**
```bash
SMILEPAY_ENVIRONMENT=sandbox  # or 'production'
SMILEPAY_SANDBOX_API_KEY=your_sandbox_key
SMILEPAY_SANDBOX_API_SECRET=your_sandbox_secret
SMILEPAY_API_KEY=your_production_key
SMILEPAY_API_SECRET=your_production_secret
```

#### 1.2 Database Schema
**File:** `backend/migrations/create_smilepay_transactions.sql` (NEW)

```sql
CREATE TABLE IF NOT EXISTS smilepay_transactions (
    id SERIAL PRIMARY KEY,

    -- Reference to payment type
    payment_type VARCHAR(50) NOT NULL,  -- 'subscription', 'campaign', 'booking', 'wallet', 'cart'
    payment_id INTEGER,  -- ID from respective payment table

    -- User information
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(20),  -- 'brand' or 'creator'

    -- Transaction details
    order_reference VARCHAR(100) UNIQUE NOT NULL,
    smilepay_reference VARCHAR(100),
    transaction_reference VARCHAR(100),

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    currency_code VARCHAR(10),  -- '840' for USD, '924' for ZWL

    -- Payment method
    payment_method VARCHAR(50),  -- 'ecocash', 'innbucks', 'visa', 'mastercard', 'smilecash', 'omari'
    payment_option VARCHAR(50),  -- From SmilePay response

    -- Transaction status
    status VARCHAR(50) DEFAULT 'PENDING',  -- 'PENDING', 'PAID', 'FAILED', 'CANCELED'

    -- Item details
    item_name VARCHAR(200),
    item_description TEXT,

    -- Customer details
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),

    -- URLs
    return_url TEXT,
    result_url TEXT,
    cancel_url TEXT,
    failure_url TEXT,

    -- Fees
    client_fee DECIMAL(10, 2),
    merchant_fee DECIMAL(10, 2),

    -- Additional data
    metadata JSON,  -- Store any additional info
    webhook_data JSON,  -- Store webhook payload

    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    canceled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_smilepay_order_ref ON smilepay_transactions(order_reference);
CREATE INDEX idx_smilepay_payment_type ON smilepay_transactions(payment_type, payment_id);
CREATE INDEX idx_smilepay_user ON smilepay_transactions(user_id);
CREATE INDEX idx_smilepay_status ON smilepay_transactions(status);
CREATE INDEX idx_smilepay_created ON smilepay_transactions(created_at);
```

#### 1.3 SmilePay Service Class
**File:** `backend/app/services/smilepay_service.py` (NEW)

**Key Methods:**
- `initiate_express_checkout_ecocash()` - Ecocash payments
- `initiate_express_checkout_innbucks()` - Innbucks payments
- `initiate_express_checkout_card()` - Visa/Mastercard payments
- `initiate_express_checkout_smilecash()` - SmileCash payments
- `initiate_express_checkout_omari()` - Omari payments
- `check_payment_status()` - Poll payment status
- `cancel_payment()` - Cancel transaction
- `handle_webhook()` - Process webhook callbacks

#### 1.4 SmilePay Model
**File:** `backend/app/models/smilepay_transaction.py` (NEW)

SQLAlchemy model for smilepay_transactions table with:
- Relationships to User model
- Helper methods for status updates
- `to_dict()` method for API serialization

#### 1.5 Payment Routes
**File:** `backend/app/routes/smilepay_payments.py` (NEW)

**API Endpoints:**
```python
# Initiate payments
POST /api/payments/smilepay/ecocash
POST /api/payments/smilepay/innbucks
POST /api/payments/smilepay/card
POST /api/payments/smilepay/smilecash
POST /api/payments/smilepay/omari

# Check status
GET /api/payments/smilepay/{order_reference}/status

# Cancel payment
POST /api/payments/smilepay/{order_reference}/cancel

# Webhook (no auth required, but validate signature)
POST /api/webhooks/smilepay/callback
```

#### 1.6 Webhook Handler
**File:** `backend/app/routes/smilepay_payments.py`

**Webhook Processing Flow:**
1. Receive POST from SmilePay
2. Validate request (optional signature verification)
3. Extract payment status
4. Update smilepay_transactions table
5. Update related payment record (subscription/booking/etc)
6. Send notification to user
7. Return 200 OK to SmilePay

---

### Phase 2: Frontend Components (UI Layer)

#### 2.1 SmilePay API Service
**File:** `frontend/src/services/smilepayAPI.js` (NEW)

```javascript
export const smilepayAPI = {
  // Initiate payments
  initiateEcocash: (paymentData) => api.post('/payments/smilepay/ecocash', paymentData),
  initiateInnbucks: (paymentData) => api.post('/payments/smilepay/innbucks', paymentData),
  initiateCard: (paymentData) => api.post('/payments/smilepay/card', paymentData),
  initiateSmileCash: (paymentData) => api.post('/payments/smilepay/smilecash', paymentData),
  initiateOmari: (paymentData) => api.post('/payments/smilepay/omari', paymentData),

  // Check status
  checkStatus: (orderReference) => api.get(`/payments/smilepay/${orderReference}/status`),

  // Cancel payment
  cancelPayment: (orderReference) => api.post(`/payments/smilepay/${orderReference}/cancel`),
};
```

#### 2.2 SmilePay Payment Modal Component
**File:** `frontend/src/components/SmilePayPaymentModal.jsx` (NEW)

**Features:**
- Payment method tabs (Ecocash, Innbucks, Cards, SmileCash, Omari)
- Dynamic form fields based on selected method
- Payment instructions display
- Status polling for pending payments
- Error handling and retry logic

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: function,
  amount: number,
  currency: string,
  paymentType: string,  // 'subscription', 'campaign', 'booking', 'cart'
  paymentId: number,
  itemName: string,
  itemDescription: string,
  onSuccess: function,
  onFailure: function
}
```

**Tab Structure:**
```
┌─────────────────────────────────────────────┐
│  [Ecocash] [Innbucks] [Cards] [SmileCash]  │
├─────────────────────────────────────────────┤
│                                             │
│  [Dynamic form based on selected method]    │
│                                             │
│  Ecocash: Phone number input               │
│  Innbucks: Payment code display             │
│  Cards: Card details form                   │
│  SmileCash: Phone + OTP input              │
│  Omari: Phone + OTP input                  │
│                                             │
└─────────────────────────────────────────────┘
```

#### 2.3 Payment Method Selection Modal
**File:** `frontend/src/components/PaymentMethodModal.jsx` (NEW)

Universal modal for selecting payment gateway:
- Paynow (existing)
- Bank Transfer (existing)
- Smile&Pay (new)

Used across all payment pages.

#### 2.4 Payment Status Poller Hook
**File:** `frontend/src/hooks/usePaymentStatusPoller.js` (NEW)

Custom React hook for polling payment status:
```javascript
const { status, isPolling, error } = usePaymentStatusPoller(orderReference, {
  interval: 3000,  // Poll every 3 seconds
  maxAttempts: 40,  // Max 2 minutes
  onSuccess: () => {},
  onFailure: () => {},
});
```

---

### Phase 3: Integration into Existing Pages

#### 3.1 Subscription Payment Page
**File:** `frontend/src/pages/SubscriptionPayment.jsx`

**Changes:**
1. Add "Smile&Pay" payment method option
2. Show SmilePayPaymentModal when selected
3. Handle payment success/failure callbacks
4. Update subscription status on success

**Code Pattern:**
```javascript
const [showSmilePayModal, setShowSmilePayModal] = useState(false);
const [selectedMethod, setSelectedMethod] = useState('paynow');

const handlePaymentMethodSelect = (method) => {
  if (method === 'smilepay') {
    setShowSmilePayModal(true);
  } else if (method === 'paynow') {
    // Existing Paynow flow
  }
};

<SmilePayPaymentModal
  isOpen={showSmilePayModal}
  onClose={() => setShowSmilePayModal(false)}
  amount={subscriptionPlan.price}
  currency="USD"
  paymentType="subscription"
  paymentId={subscriptionId}
  itemName={subscriptionPlan.name}
  onSuccess={handlePaymentSuccess}
/>
```

#### 3.2 Cart Checkout Page
**File:** `frontend/src/pages/CartCheckout.jsx`

**Changes:**
1. Add Smile&Pay to payment method options
2. Calculate total amount for cart
3. Show SmilePayPaymentModal
4. Handle multi-creator payment processing

#### 3.3 Collaboration Details Page
**File:** `frontend/src/pages/CollaborationDetails.jsx`

**Changes:**
1. Add Smile&Pay to payment options
2. Show SmilePayPaymentModal for milestone payments
3. Update collaboration payment status

#### 3.4 Booking Details Page
**File:** `frontend/src/pages/BookingDetails.jsx`

**Changes:**
1. Add Smile&Pay to payment methods
2. Show SmilePayPaymentModal
3. Handle booking payment confirmation

#### 3.5 Campaign Payment Modal
**File:** Find existing campaign payment modals

**Changes:**
1. Integrate SmilePayPaymentModal
2. Handle campaign-specific payment flows

---

## Implementation Approach

### Option 1: Express Checkout (Recommended)
**Use Case:** Best UX - Users stay on our platform

**Flow:**
1. User selects payment method (Ecocash/Innbucks/Cards)
2. User enters details (phone/card number)
3. Backend calls SmilePay API
4. For Ecocash: User approves USSD prompt
5. For Innbucks: User gets code, pays in app
6. For Cards: 3D Secure redirect
7. Poll for payment status
8. Show success/failure

**Pros:**
- Better UX (no redirect for most methods)
- Custom UI control
- Faster payments

**Cons:**
- More complex implementation
- Need to handle different flows per method

### Option 2: Standard Checkout
**Use Case:** Simpler implementation

**Flow:**
1. User selects Smile&Pay
2. Backend initiates payment, gets paymentUrl
3. Redirect user to SmilePay hosted page
4. User completes payment
5. SmilePay redirects back to our returnUrl
6. Webhook confirms final status

**Pros:**
- Simpler implementation
- SmilePay handles UI
- Less code to maintain

**Cons:**
- User leaves our platform
- Less control over UX

### Recommended: Hybrid Approach
- **Express Checkout** for Ecocash, Innbucks, SmileCash, Omari (most common, better UX)
- **Standard Checkout** as fallback or for cards (less common, complex 3D Secure)

---

## Payment Flow Details

### Ecocash Payment Flow (Most Popular)

**Frontend:**
```javascript
1. User enters Ecocash phone number (e.g., 0771234567)
2. Submit to backend
3. Show "Processing..." spinner
4. Show "Check your phone for USSD prompt"
5. Start status polling
6. Show success/failure based on status
```

**Backend:**
```python
1. Receive payment request
2. Create smilepay_transaction record (status='PENDING')
3. Call SmilePay Express Checkout Ecocash API
4. Store transaction reference
5. Return success with order_reference
6. Wait for webhook callback
7. Update transaction status on webhook
8. Update related payment record
9. Send email/notification to user
```

### Innbucks Payment Flow

**Frontend:**
```javascript
1. User clicks "Pay with Innbucks"
2. Submit to backend
3. Backend returns payment code (e.g., "ABC123")
4. Show code prominently with instructions:
   "Open your Innbucks app and enter code: ABC123"
5. Start status polling
6. Show success when payment confirmed
```

### Card Payment Flow

**Frontend:**
```javascript
1. User enters card details (number, expiry, CVV)
2. Submit to backend
3. Backend returns 3D Secure HTML
4. Render HTML in iframe or new window
5. User completes 3D Secure auth
6. Return to app via returnUrl
7. Show payment success/failure
```

---

## Database Updates Required

### Update Existing Payment Tables

#### subscriptions table
Add column: `smilepay_order_reference VARCHAR(100)`

#### bookings table
Add column: `smilepay_order_reference VARCHAR(100)`

#### campaign_payments table
Add column: `smilepay_order_reference VARCHAR(100)`

#### campaign_cart table (if has payment tracking)
Add column: `smilepay_order_reference VARCHAR(100)`

---

## Configuration & Setup

### 1. Register for SmilePay Sandbox
- Visit: https://zbnet.zb.co.zw/wallet_sandbox_merchant/
- Create merchant account
- Generate API keys

### 2. Environment Setup
Add to `.env` file:
```bash
SMILEPAY_ENVIRONMENT=sandbox
SMILEPAY_SANDBOX_API_KEY=your_key_here
SMILEPAY_SANDBOX_API_SECRET=your_secret_here
SMILEPAY_WEBHOOK_SECRET=optional_webhook_secret
```

### 3. Webhook URL Configuration
Configure in SmilePay dashboard:
- Webhook URL: `https://api.bantubuzz.com/api/webhooks/smilepay/callback`
- Must be HTTPS
- Must return 200 OK quickly

---

## Testing Strategy

### Phase 1: Unit Tests
- Test SmilePay service methods
- Test webhook handling
- Test status polling logic

### Phase 2: Integration Tests
- Test full payment flows
- Test webhook callbacks
- Test error scenarios

### Phase 3: Manual Testing with Sandbox

**Ecocash Test:**
```
Phone: 263788687707
(Requires manual approval from SmilePay team)
```

**SmileCash Test:**
```
Phone: 0711111111
OTP: 000000
```

**Card Test:**
```
Card Number: 2223000000000007
Expiry: 01/39
CVV: 100
Name: John Doe
```

### Phase 4: Production Testing
- Start with small transactions
- Monitor webhook callbacks
- Check payment confirmation emails
- Verify database updates

---

## Error Handling

### Frontend Error Scenarios
1. **Network Error**: Show retry option
2. **Invalid Phone Number**: Validation before submit
3. **Payment Timeout**: Show status and retry option
4. **Payment Failed**: Show clear error message
5. **Webhook Delay**: Continue polling, don't assume failure

### Backend Error Scenarios
1. **SmilePay API Down**: Log error, return friendly message
2. **Webhook Processing Error**: Retry logic, log for investigation
3. **Database Error**: Transaction rollback, alert admin
4. **Duplicate Order Reference**: Check existing transaction

---

## Security Considerations

1. **API Keys**: Store in environment variables, never in code
2. **Webhook Validation**: Verify webhook requests (optional signature check)
3. **Order Reference**: Use UUID to prevent guessing
4. **Amount Validation**: Verify amount matches on webhook
5. **HTTPS Only**: All communication over HTTPS
6. **SQL Injection**: Use parameterized queries
7. **XSS Prevention**: Sanitize user inputs

---

## Deployment Checklist

### Backend Deployment
- [ ] Create `smilepay_transactions` table
- [ ] Add environment variables
- [ ] Deploy SmilePay service class
- [ ] Deploy payment routes
- [ ] Deploy webhook handler
- [ ] Test webhook endpoint accessibility
- [ ] Update existing payment tables with new columns

### Frontend Deployment
- [ ] Deploy SmilePayPaymentModal component
- [ ] Deploy payment method selection modal
- [ ] Update all payment pages
- [ ] Deploy API service layer
- [ ] Test UI across all payment pages

### Configuration
- [ ] Configure webhook URL in SmilePay dashboard
- [ ] Test webhook delivery
- [ ] Set up monitoring/alerts for failed payments
- [ ] Configure email notifications

---

## Monitoring & Analytics

### Key Metrics to Track
1. Payment success rate by method
2. Average payment completion time
3. Webhook delivery success rate
4. Failed payment reasons
5. Most popular payment methods
6. Revenue by payment method

### Logging
- Log all API requests to SmilePay
- Log all webhook callbacks
- Log payment status changes
- Log errors with context

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Test all payment flows internally
- Fix bugs and issues

### Phase 2: Beta Testing (Week 2)
- Enable for 10-20 test users
- Monitor closely for issues
- Gather feedback

### Phase 3: Gradual Rollout (Week 3)
- Enable for 25% of users
- Monitor metrics and errors
- Increase to 50%, then 100%

### Phase 4: Full Production (Week 4)
- Enable for all users
- Make Smile&Pay default option (if preferred)
- Keep Paynow as backup

---

## Estimated Timeline

| Task | Duration | Dependencies |
|------|----------|-------------|
| Backend infrastructure (DB, models, service) | 2 days | - |
| Payment routes & webhook handler | 1 day | Backend infrastructure |
| Frontend components (modal, service) | 2 days | - |
| Integration into payment pages | 2 days | Frontend components |
| Testing (unit + integration) | 2 days | All above |
| Sandbox testing | 1 day | All above |
| Documentation & deployment | 1 day | All above |
| **Total** | **11 days** (~2.5 weeks) | - |

---

## Files to Create (Summary)

### Backend
1. `backend/app/config/smilepay_config.py`
2. `backend/migrations/create_smilepay_transactions.sql`
3. `backend/app/models/smilepay_transaction.py`
4. `backend/app/services/smilepay_service.py`
5. `backend/app/routes/smilepay_payments.py`

### Frontend
1. `frontend/src/services/smilepayAPI.js`
2. `frontend/src/components/SmilePayPaymentModal.jsx`
3. `frontend/src/components/PaymentMethodModal.jsx`
4. `frontend/src/hooks/usePaymentStatusPoller.js`

### Files to Modify
1. `frontend/src/pages/SubscriptionPayment.jsx`
2. `frontend/src/pages/CartCheckout.jsx`
3. `frontend/src/pages/CollaborationDetails.jsx`
4. `frontend/src/pages/BookingDetails.jsx`
5. Campaign payment modals (find and update)
6. `backend/app/__init__.py` (register blueprint)
7. `backend/app/models/__init__.py` (import new model)

---

## Success Criteria

✅ Users can select Smile&Pay on all payment pages
✅ Users can complete payments via Ecocash, Innbucks, Cards
✅ Webhooks update payment status correctly
✅ Email notifications sent on payment success/failure
✅ 95%+ payment success rate in sandbox testing
✅ Clear error messages for failed payments
✅ Payment status polling works reliably
✅ All existing payment flows still work (Paynow, Bank Transfer)

---

## Next Steps

1. **Review this plan** - Confirm approach and timeline
2. **Get SmilePay credentials** - Register for sandbox account
3. **Start backend implementation** - Database and service layer
4. **Build frontend components** - Payment modal and UI
5. **Test thoroughly** - All payment methods in sandbox
6. **Deploy to production** - Gradual rollout

---

## Questions to Resolve

1. Should we make Smile&Pay the default/primary payment option?
2. Which payment method should be the default tab in the modal? (Ecocash recommended)
3. Do we want to disable Paynow once Smile&Pay is working?
4. Should we support ZWL currency in addition to USD?
5. Do we need to store customer card details for future use? (PCI compliance required)
6. What should the payment timeout be? (Recommended: 5 minutes)
7. Should we send SMS notifications in addition to email?

---

## Support & Resources

- **SmilePay Documentation**: Saved in `SMILEPAY_API_DOCUMENTATION.md`
- **Sandbox Portal**: https://zbnet.zb.co.zw/wallet_sandbox_merchant/
- **Test Accounts**: See documentation for test phone numbers and cards
- **Support Contact**: Get from SmilePay team for production issues
