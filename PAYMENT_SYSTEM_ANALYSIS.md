# Payment System Analysis & Implementation Plan

## Current State

### Existing Models
1. **Payment** (`backend/app/models/payment.py`)
   - Fields: booking_id, collaboration_id, user_id, amount, currency
   - payment_method: 'paynow', 'bank_transfer', 'ecocash', 'cash', 'other'
   - payment_type: 'automated', 'manual', 'admin_added'
   - status: 'pending', 'completed', 'failed', 'refunded'
   - Manual payment fields: payment_proof_url, payment_reference
   - Verification fields: verified_by, verified_at, verification_notes

2. **Booking** (`backend/app/models/booking.py`)
   - Fields: package_id, campaign_id, creator_id, brand_id
   - payment_status: 'pending', 'paid', 'failed', 'refunded', 'verified'
   - payment_method: 'paynow', 'bank_transfer'
   - proof_of_payment: File path for bank transfer POP
   - booking_type: 'direct', 'campaign_application', 'campaign_package'
   - payment_category: 'package', 'revision', 'brief', 'campaign'

3. **CampaignApplication** (`backend/app/models/campaign.py`)
   - Fields: campaign_id, creator_id, status, proposed_price

### Existing Payment Pages (Frontend)
1. ✅ `AdminPayments.jsx` - Admin payment verification page
2. ✅ `CampaignPayment.jsx` - Campaign payment page
3. ✅ `RevisionPayment.jsx` - Revision payment page
4. ✅ `Payment.jsx` - General payment page

### Missing Admin Route
- ❌ **Admin payments routes** (`backend/app/routes/admin/payments.py`) - DOES NOT EXIST
- Admin route exists in collaborations.py but incomplete

## Payment Scenarios That Need Implementation

### 1. Exceeding Free Revisions ⚠️ Partially Implemented
**Current State:**
- RevisionPayment.jsx exists
- Payment route `/payments/revision` mentioned in docs but needs verification

**Missing:**
- Complete backend endpoint for revision payment
- Booking record creation with payment_category='revision'
- Admin verification flow

### 2. Accepting Campaign Application ❌ NOT IMPLEMENTED
**Flow:**
- Brand accepts creator's application to campaign
- Payment required = application's proposed_price
- Creates booking with:
  - booking_type='campaign_application'
  - payment_category='campaign'
  - Links to campaign_id and creator_id

**Missing:**
- Frontend payment page
- Backend endpoint to create application payment
- Auto-accept application after payment verification

### 3. Adding Package to Campaign ❌ NOT IMPLEMENTED
**Flow:**
- Brand adds creator's package to their campaign
- Payment required = package price
- Creates booking with:
  - booking_type='campaign_package'
  - payment_category='package'
  - Links to package_id, campaign_id

**Missing:**
- Frontend payment flow in campaign management
- Backend endpoint
- Integration with campaign_packages table

### 4. Cart Checkout ⚠️ Partially Implemented
**Current State:**
- Payment.jsx exists

**Missing Verification:**
- Check if booking_type='direct' is set correctly
- Check if payment_category='package' is set
- Verify manual payment upload works

### 5. Accepting Brief Proposal ❌ NOT IMPLEMENTED
**Flow:**
- Brand accepts creator's proposal to brief
- Payment required = proposal amount
- Creates booking/collaboration with:
  - booking_type='brief_proposal'
  - payment_category='brief'

**Missing:**
- Frontend payment page
- Backend endpoint
- Auto-accept proposal after payment

## Required Admin Features

### Admin Bookings/Payments Management Page
**Requirements:**
- List all bookings with payment status
- Filter by: payment_status, payment_category, booking_type, date range
- Display for each booking:
  - Booking ID
  - Payment Type (why payment is made): booking_type + payment_category
  - Brand email
  - Creator email
  - Amount
  - Payment method
  - Payment status
  - Date created
  - Proof of Payment download link
- Actions:
  - View POP (download/view in modal)
  - Verify payment (update payment_status to 'verified')
  - Reject payment
  - View booking details

## Backend Routes Needed

### Admin Routes (`/api/admin/`)
1. ✅ GET `/admin/payments/pending` - List pending payments
2. ✅ GET `/admin/payments/statistics` - Payment statistics
3. ❌ GET `/admin/payments` - All payments with filters
4. ❌ GET `/admin/payments/:id` - Single payment details
5. ❌ PUT `/admin/payments/:id/verify` - Verify payment
6. ❌ PUT `/admin/payments/:id/reject` - Reject payment
7. ❌ POST `/admin/payments/manual` - Add manual payment
8. ❌ GET `/admin/bookings` - All bookings with filters
9. ❌ GET `/admin/bookings/:id` - Single booking with full details

### Brand Payment Routes (`/api/payments/`)
1. ⚠️ POST `/payments/revision` - Create revision payment
2. ❌ POST `/payments/campaign-application` - Payment for accepting application
3. ❌ POST `/payments/campaign-package` - Payment for adding package to campaign
4. ❌ POST `/payments/cart-checkout` - Cart checkout payment
5. ❌ POST `/payments/brief-proposal` - Payment for accepting proposal
6. ✅ POST `/payments/paynow/callback` - Paynow callback (likely exists)

## Database Fields Verification

### Booking Table - Verify These Columns Exist:
- ✅ booking_type VARCHAR(50)
- ✅ payment_category VARCHAR(50)
- ✅ payment_method VARCHAR(20)
- ✅ proof_of_payment VARCHAR(500)
- ✅ payment_status VARCHAR(20)

### Payment Table - Verify These Columns Exist:
- ✅ payment_type VARCHAR(20)
- ✅ payment_proof_url VARCHAR(255)
- ✅ verified_by INTEGER
- ✅ verified_at DATETIME

## Implementation Priority

### Phase 1: Admin Verification System (CRITICAL)
1. Create `/backend/app/routes/admin/payments.py`
2. Implement all admin payment endpoints
3. Update AdminPayments.jsx to show payment_category and booking_type
4. Add POP download functionality
5. Test verification flow end-to-end

### Phase 2: Missing Payment Flows
1. Campaign Application Payment
2. Campaign Package Payment
3. Brief Proposal Payment

### Phase 3: Testing & Verification
1. Test all payment methods (Paynow + Manual)
2. Test admin verification
3. Test escrow release after verification
4. End-to-end testing for all 5 scenarios

## Key Implementation Notes

### Payment Type Display Logic
```javascript
const getPaymentTypeDisplay = (booking) => {
  const types = {
    'direct-package': 'Package Purchase',
    'campaign_application-campaign': 'Campaign Application Accepted',
    'campaign_package-package': 'Package Added to Campaign',
    'direct-revision': 'Paid Revision',
    'brief_proposal-brief': 'Brief Proposal Accepted'
  };

  const key = `${booking.booking_type}-${booking.payment_category}`;
  return types[key] || 'Payment';
};
```

### Manual Payment Flow
1. Brand selects "Manual Payment" (Bank Transfer)
2. Brand uploads Proof of Payment (POP)
3. Booking created with payment_status='pending'
4. Admin views in /admin/payments
5. Admin downloads POP
6. Admin verifies payment
7. payment_status → 'verified'
8. Funds move to escrow
9. Collaboration/booking proceeds

### Paynow Flow
1. Brand selects "Paynow"
2. Redirect to Paynow
3. Paynow callback updates payment_status='paid'
4. Funds move to escrow automatically
5. Collaboration/booking proceeds
