# BantuBuzz Payment Flow Documentation

## Overview
This document standardizes all payment flows across the BantuBuzz platform to ensure consistency, reliability, and maintainability.

## Core Principles

### 1. **Uniformity Across All Payment Pages**
All payment pages must support:
- **Paynow** (automated online payment)
- **Bank Transfer** (manual payment with proof of payment upload)

### 2. **Consistent API Usage**
- **Frontend**: Use centralized API functions from `services/api.js`
- **Backend**: Handle all booking types in a unified manner

### 3. **Clear Payment Type Identification**
Every booking must have a clear `booking_type` that is visible on admin dashboards

---

## Payment Types and Booking Types

### Booking Types
| `booking_type` | Description | Payment Page | Notes Field Usage |
|---|---|---|---|
| `'package'` or `NULL` | Direct package booking | `/bookings/:id/payment` (Payment.jsx) | General notes |
| `'brief'` | Brief proposal accepted | `/bookings/:id/payment` (Payment.jsx) | Brief title |
| `'campaign_application'` | Campaign application accepted | `/brand/campaigns/payment/:bookingId` (CampaignPayment.jsx) | Application details |
| `'campaign_package'` | Package added to campaign | `/brand/campaigns/payment/:bookingId` (CampaignPayment.jsx) | Package in campaign |
| `'paid_revision'` | Paid revision request | `/brand/revision-payment/:bookingId` (RevisionPayment.jsx) | JSON with revision data |
| `'custom_package'` | Custom package offer accepted | *To be implemented* | Offer details |

---

## Frontend Standards

### API Service Pattern
**✅ CORRECT Pattern (from CartCheckout.jsx)**
```javascript
import { bookingsAPI } from '../services/api';

// For Paynow
const response = await bookingsAPI.initiatePayment(bookingId);
window.location.href = response.data.redirect_url;

// For Bank Transfer
const formData = new FormData();
formData.append('file', proofFile);
await bookingsAPI.uploadProofOfPayment(bookingId, formData);
```

**❌ INCORRECT Pattern**
```javascript
// DON'T use raw fetch or axios with manual headers
const response = await fetch(`/api/bookings/${id}/upload-pop`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: formData
});
```

### Payment Page Component Structure
Every payment page must have:

1. **Payment Method Selection**
   ```jsx
   const [paymentMethod, setPaymentMethod] = useState('paynow');
   // Options: 'paynow' or 'bank_transfer'
   ```

2. **Bank Transfer Instructions Section**
   ```jsx
   {paymentMethod === 'bank_transfer' && (
     <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6">
       {/* Bank details */}
       {/* Reference number */}
       {/* File upload input */}
     </div>
   )}
   ```

3. **Unified Payment Button**
   ```jsx
   <button
     onClick={paymentMethod === 'paynow'
       ? handlePaynowPayment
       : handleBankTransferPayment}
     disabled={
       (paymentMethod === 'paynow' && !paymentData?.redirect_url) ||
       (paymentMethod === 'bank_transfer' && !proofFile)
     }
   >
     {paymentMethod === 'paynow' ? 'Proceed to Paynow' : 'Submit Payment'}
   </button>
   ```

### File Upload Validation
```javascript
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('File size must be less than 5MB');
    return;
  }

  // Validate type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('File must be JPG, PNG, GIF, or PDF');
    return;
  }

  setProofFile(file);
};
```

---

## Backend Standards

### Initiate Payment Endpoint
**Location**: `backend/app/routes/bookings.py`
**Endpoint**: `POST /api/bookings/<booking_id>/initiate-payment`

**Requirements**:
- Must handle ALL booking types
- Generate appropriate payment title based on booking type

```python
# Get appropriate title based on booking type
payment_title = f'Booking {booking_id}'

if booking.booking_type == 'brief' and booking.brief:
    payment_title = f"Brief: {booking.brief.title}"

elif booking.booking_type == 'campaign_application':
    application = CampaignApplication.query.filter_by(booking_id=booking.id).first()
    if application and application.campaign:
        payment_title = f"Campaign Application: {application.campaign.title}"

elif booking.booking_type == 'campaign_package' and booking.package:
    payment_title = f"Campaign Package: {booking.package.title}"

elif booking.booking_type == 'paid_revision':
    revision_data = json.loads(booking.notes)
    deliverable_title = revision_data.get('deliverable_title', 'Revision')
    payment_title = f"Paid Revision: {deliverable_title}"

elif booking.package_id:
    package = Package.query.get(booking.package_id)
    payment_title = package.title if package else f'Package Booking {booking_id}'
```

### Upload Proof of Payment Endpoint
**Location**: `backend/app/routes/bookings.py`
**Endpoint**: `POST /api/bookings/<booking_id>/upload-pop`

**Standard Flow**:
1. Validate file (type, size)
2. Save file to uploads folder
3. Update booking:
   - `booking.proof_of_payment = filepath`
   - `booking.payment_method = 'bank_transfer'`
   - `booking.payment_status = 'pending'`
4. Return success response

### Payment Verification Endpoint
**Location**: `backend/app/routes/bookings.py`
**Endpoint**: `POST /api/bookings/<booking_id>/verify-payment`
**Auth**: Admin only

**Must handle different booking types**:
```python
if booking.booking_type == 'paid_revision':
    # Parse revision data, mark deliverable, create revision request
    # (Lines 882-968 in bookings.py)

elif booking.booking_type == 'campaign_application':
    # Update application status, create collaboration
    # (Lines 970-1015 in bookings.py)

elif booking.booking_type == 'brief':
    # Find accepted proposal, create collaboration with milestones
    # (Lines 1017-1118 in bookings.py)

elif booking.booking_type == 'campaign_package':
    # Add package to campaign, create collaboration
    # (Lines 1120-1172 in bookings.py)

else:
    # Regular package booking - auto-accept and create collaboration
    # (Lines 1174-1210 in bookings.py)
```

---

## Payment Flow Sequences

### 1. Direct Package Booking
```
User browses packages → Adds to cart → CartCheckout
  ↓
Choose payment method (Paynow / Bank Transfer)
  ↓
If Paynow:
  - Initiate payment → Redirect to Paynow → Poll status → Auto-verify
  - Create collaboration automatically

If Bank Transfer:
  - Upload POP → Admin verifies → Auto-create collaboration
```

### 2. Brief Proposal Flow
```
Brand posts brief → Creator submits proposal → Brand accepts
  ↓
Creates booking with booking_type='brief'
  ↓
Redirect to /bookings/:id/payment (Payment.jsx)
  ↓
Payment completed → Collaboration created with milestones
```

### 3. Campaign Application Flow
```
Brand posts campaign → Creator applies → Brand accepts
  ↓
Creates booking with booking_type='campaign_application'
  ↓
Redirect to /brand/campaigns/payment/:bookingId (CampaignPayment.jsx)
  ↓
Payment completed → Collaboration created
```

### 4. Paid Revision Flow
```
Brand requests paid revision → Creates booking with booking_type='paid_revision'
  ↓
Redirect to /brand/revision-payment/:bookingId (RevisionPayment.jsx)
  ↓
Payment completed → Auto-trigger revision request
  - Update deliverable status to 'revision_requested'
  - Add revision request to collaboration.revision_requests
  - Notify creator
```

---

## Admin Dashboard Requirements

### Bookings Table Display
The admin bookings page must show:
- **Payment Type**: Clear label based on `booking_type`
- **Payment Status**: `pending` / `paid` / `verified`
- **Payment Method**: `paynow` / `bank_transfer` / `wallet`
- **Amount**: Total amount
- **Brand**: Brand name
- **Creator**: Creator name
- **Created Date**
- **Actions**: View POP, Verify Payment (for bank transfers)

### Payment Type Labels
```javascript
const getPaymentTypeLabel = (bookingType) => {
  const labels = {
    'package': 'Package',
    'brief': 'Brief',
    'campaign_application': 'Campaign Application',
    'campaign_package': 'Campaign Package',
    'paid_revision': 'Paid Revision',
    'custom_package': 'Custom Package',
  };
  return labels[bookingType] || 'Package';
};
```

---

## Testing Checklist

For each payment type, test:
- [ ] Paynow payment initiation
- [ ] Paynow payment completion and verification
- [ ] Collaboration auto-creation after Paynow
- [ ] Bank transfer POP upload
- [ ] Admin POP verification
- [ ] Collaboration auto-creation after verification
- [ ] Error handling for failed payments
- [ ] Proper notifications to both parties
- [ ] Payment status display on admin dashboard

---

## Common Issues and Solutions

### Issue: White Screen on Payment Page
**Cause**: `initiatePayment` API call failing because backend doesn't handle the booking type
**Solution**: Ensure `initiate_booking_payment()` function handles all booking types (see Backend Standards)

### Issue: "Payment Failed" for Manual Payments
**Cause**: Inconsistent API usage (using raw `fetch()` instead of `bookingsAPI`)
**Solution**: Always use `bookingsAPI.uploadProofOfPayment(bookingId, formData)`

### Issue: "Unauthorized" Error
**Cause**: Manual token handling or missing auth headers
**Solution**: Use centralized API functions that handle auth automatically via interceptors

### Issue: Collaboration Not Created After Payment
**Cause**: Missing booking type handler in `verify_bank_transfer_payment()`
**Solution**: Add case for the booking type in the verification endpoint

---

## Migration Notes

### Updating Existing Payment Pages
1. Check if page uses `bookingsAPI` for all API calls
2. Ensure both Paynow and Bank Transfer options are available
3. Use consistent UI/UX (rounded corners, color scheme, bank details format)
4. Add proper loading states and error handling
5. Test file upload validation

### Creating New Payment Types
1. Define new `booking_type` value
2. Add handler in `initiate_booking_payment()` backend function
3. Add handler in `verify_bank_transfer_payment()` backend function
4. Create or update frontend payment page component
5. Add payment type label to admin dashboard
6. Update this documentation

---

## Files to Modify When Adding New Payment Types

### Backend
- `backend/app/routes/bookings.py` - Add handlers for new booking type
- `backend/app/models/booking.py` - Update booking type enum if needed

### Frontend
- `frontend/src/services/api.js` - Add new API functions if needed
- `frontend/src/pages/[PaymentPage].jsx` - Create or update payment page
- `frontend/src/pages/AdminBookings.jsx` - Add new payment type label
- `frontend/src/App.jsx` - Add route for new payment page

### Documentation
- Update this file (`PAYMENT_FLOW_DOCUMENTATION.md`)
- Update `AI_GUIDE.md` with payment flow standards

---

## References

- CartCheckout.jsx (lines 116-163): Reference implementation for payment flow
- Payment.jsx: Generic booking payment page
- CampaignPayment.jsx: Campaign-specific payment page
- RevisionPayment.jsx: Paid revision payment page
- bookings.py (lines 260-327): Payment initiation endpoint
- bookings.py (lines 803-1234): Payment verification endpoint

---

**Last Updated**: 2026-03-05
**Maintained By**: Development Team
