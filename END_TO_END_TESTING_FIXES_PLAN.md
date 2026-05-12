# End-to-End Testing Fixes - Implementation Plan

**Date**: 2026-04-23
**Status**: Planning Complete - Ready for Implementation

---

## Issues Identified from Testing

### 1. Cart Total Showing NaN
**Severity**: High
**Location**: Frontend - Cart display
**Root Cause**: When multiple packages from different creators are added, the total calculation returns NaN
**Files Affected**:
- `frontend/src/contexts/CartContext.jsx` - `getCartTotal()` function (line 60-62)
- `frontend/src/pages/CartCheckout.jsx` - Uses `getCartTotal()` (line 234)

**Fix Required**:
- Ensure all cart items have valid `price` values
- Add defensive parsing with `parseFloat()` and null/undefined checks
- Handle edge cases where price might be string or missing

---

### 2. Admin Logs Page Missing Navbar
**Severity**: Medium
**Location**: Frontend - Admin Logs page
**Root Cause**: `SystemLogs.jsx` doesn't import/render AdminLayout or navbar component
**Files Affected**:
- `frontend/src/pages/admin/SystemLogs.jsx`

**Fix Required**:
- Wrap the page content with `<AdminLayout>` component (like other admin pages)
- OR add `<Navbar />` at the top of the page
- Match the layout pattern used in AdminBookings, AdminDashboard, etc.

---

### 3. Subscription Upgrade Button Stuck on "Loading"
**Severity**: High
**Location**: Frontend & Backend - Subscription upgrade flow
**Root Cause**: Upgrade payment initiation fails or returns no response
**Files Affected**:
- `frontend/src/pages/CreatorSubscriptions.jsx` OR `SubscriptionManage.jsx` - upgrade button handler
- `backend/app/routes/creator_subscriptions.py` OR `subscriptions.py` - upgrade payment endpoint

**Investigation Needed**:
- Check which endpoint is called: `/api/creator-subscriptions/upgrade` or `/api/subscriptions/initiate-payment`
- Review error handling in upgrade flow
- Check if payment initiation is missing or timing out
- Verify loading state is properly reset on error

---

### 4. Creator Subscription Payment Bank Transfer Upload Error
**Severity**: High
**Location**: Backend - Subscription payment processing
**Root Cause**: "No file provided" error even after uploading proof of payment
**Files Affected**:
- `backend/app/routes/creator_subscriptions.py` - Bank transfer upload endpoint
- Likely: `/api/creator-subscriptions/*/upload-pop` or similar

**Investigation Needed**:
- Find the exact endpoint for creator subscription bank transfer
- Check if `request.files['file']` is being checked correctly
- Verify multipart/form-data is being handled properly
- Check if file upload field name matches between frontend and backend

---

### 5. Email Notifications for Custom Package Offers Missing
**Severity**: Medium
**Location**: Backend - Custom package routes
**Root Cause**: No email sent when brands/creators send custom package offers
**Files Affected**:
- `backend/app/routes/custom_packages.py`:
  - Line 14-101: `create_custom_request()` - Brand sends request to creator
  - Line 294-433: `create_custom_offer()` - Creator sends offer to brand

**Fix Required**:
- Import `EmailService` from `app.services.email_service`
- Create new email templates:
  - `send_custom_package_request_email()` - When brand requests custom package
  - `send_custom_package_offer_email()` - When creator sends offer
- Add email sending after notification creation
- Include offer/request details in email

---

### 6. Datetime Comparison Error in Creator Offers
**Severity**: High
**Location**: Backend - Custom package offers
**Root Cause**: Comparing offset-naive and offset-aware datetime objects
**Files Affected**:
- `backend/app/routes/custom_packages.py` - Likely line 149 or line 383

**Error Context**:
```python
if datetime.now(timezone.utc) > offer.expires_at:
```

**Fix Required**:
- Ensure all datetime comparisons use timezone-aware datetimes
- Use `datetime.now(timezone.utc)` OR `datetime.utcnow().replace(tzinfo=timezone.utc)`
- Ensure database datetime fields are stored with timezone info
- Fix the expires_at field generation/comparison

---

### 7. Remove Creator Booking Accept/Decline Logic
**Severity**: High - Major Feature Change
**Location**: Frontend & Backend - Booking and Collaboration flows
**Root Cause**: Current logic requires creators to accept/decline bookings, which is unnecessary

**Current Flow (TO BE REMOVED)**:
1. Brand books creator
2. Payment is made
3. Collaboration created with status `pending_creator_acceptance`
4. Creator must manually accept or decline
5. Only then does collaboration start

**New Flow (TO BE IMPLEMENTED)**:
1. Brand books creator
2. Payment is made
3. Collaboration automatically created with status `in_progress`
4. Email sent to creator notifying them of new booking
5. Creator can only CANCEL (with reason) if needed

**Files Affected**:

Backend:
- `backend/app/routes/bookings.py`:
  - Line 196-289: `update_booking_status()` - Remove accept/decline logic
  - Line 666: Change status from `pending_creator_acceptance` to `in_progress`
  - Line 910: Change status from `pending_creator_acceptance` to `in_progress`
  - Line 1475: Change status from `pending_creator_acceptance` to `in_progress`

- `backend/app/routes/collaborations.py`:
  - Remove accept/decline collaboration endpoints
  - Add/update cancel collaboration endpoint
  - Add cancellation reason field
  - Implement creator rating decrease logic on cancellation

- `backend/app/models/collaboration.py`:
  - Remove `pending_creator_acceptance` status
  - Add `cancelled_by_creator` field
  - Add `cancellation_reason` field
  - Add `cancelled_at` field

Frontend:
- Remove all "Accept Booking" / "Decline Booking" UI
- Update booking status displays
- Add "Cancel Collaboration" button in creator collaboration views
- Add cancellation reason modal/form
- Update collaboration status badges

**Rating Impact**:
- Each creator cancellation decreases rating by configurable amount (e.g., 0.5 stars)
- Track cancellation count in creator profile
- Display cancellation rate in creator stats

---

## Implementation Plan

### Phase 1: Quick Fixes (1-2 hours)
**Priority**: Critical bugs affecting user experience

1. **Fix Cart Total NaN** ✅
   - Update `getCartTotal()` in CartContext
   - Add price validation
   - Test with multiple creators

2. **Add Navbar to Admin Logs** ✅
   - Wrap SystemLogs with AdminLayout
   - Test navigation

3. **Fix Datetime Comparison** ✅
   - Update custom package offer expiration check
   - Ensure timezone-aware comparisons
   - Test offer acceptance flow

---

### Phase 2: Payment & Upload Fixes (2-3 hours)
**Priority**: High - Blocking payment flows

4. **Fix Subscription Upgrade Loading** ✅
   - Investigate upgrade payment endpoint
   - Add error handling
   - Fix loading state management
   - Test upgrade flow end-to-end

5. **Fix Creator Subscription Bank Transfer** ✅
   - Find and fix file upload endpoint
   - Verify multipart handling
   - Test bank transfer upload
   - Verify admin can see uploaded proof

---

### Phase 3: Email Notifications (1-2 hours)
**Priority**: Medium - Enhances communication

6. **Add Custom Package Offer Emails** ✅
   - Create email templates
   - Add to both request and offer endpoints
   - Test email delivery
   - Verify email content and styling

---

### Phase 4: Booking Auto-Accept (3-4 hours)
**Priority**: High - Major workflow improvement

7. **Remove Accept/Decline, Implement Auto-Accept** ✅
   - Update collaboration creation to use `in_progress` status
   - Remove accept/decline endpoints
   - Add cancel collaboration endpoint with reason
   - Implement rating decrease logic
   - Update frontend UI
   - Test entire booking → collaboration flow
   - Test cancellation flow and rating impact

---

## Testing Checklist

### Cart Total Fix
- [ ] Add 2+ packages from different creators to cart
- [ ] Verify total displays correctly
- [ ] Verify checkout amount matches
- [ ] Test with various price formats

### Admin Logs Navbar
- [ ] Navigate to Admin Logs page
- [ ] Verify navbar is present
- [ ] Test navigation to other admin pages
- [ ] Verify layout consistency

### Subscription Upgrade
- [ ] Go to subscription management page
- [ ] Click upgrade button
- [ ] Verify loading state appears
- [ ] Verify payment modal/redirect appears
- [ ] Complete upgrade payment
- [ ] Verify subscription is upgraded

### Creator Subscription Bank Transfer
- [ ] Initiate creator subscription payment
- [ ] Select bank transfer
- [ ] Upload proof of payment file
- [ ] Verify no error message
- [ ] Check admin panel shows uploaded proof

### Custom Package Emails
- [ ] Brand sends custom package request
- [ ] Verify creator receives email
- [ ] Creator sends custom package offer
- [ ] Verify brand receives email
- [ ] Check email formatting and links

### Booking Auto-Accept
- [ ] Brand books creator package
- [ ] Complete payment
- [ ] Verify collaboration created automatically
- [ ] Verify status is "in_progress"
- [ ] Verify creator receives email notification
- [ ] Creator cancels collaboration
- [ ] Verify cancellation reason is captured
- [ ] Verify creator rating decreased
- [ ] Verify brand notified of cancellation

---

## Database Changes Required

### Collaboration Model
```sql
ALTER TABLE collaborations
ADD COLUMN cancelled_by_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancelled_at TIMESTAMP;
```

### Creator Profile (if not exists)
```sql
ALTER TABLE creator_profiles
ADD COLUMN total_cancellations INTEGER DEFAULT 0,
ADD COLUMN cancellation_rate DECIMAL(5,2) DEFAULT 0.00;
```

---

## Files to Create

1. `backend/migrations/add_collaboration_cancellation_fields.sql`
2. Email templates in `email_service.py`:
   - `send_custom_package_request_email()`
   - `send_custom_package_offer_email()`
   - `send_booking_auto_accepted_email()`
   - `send_collaboration_cancelled_email()`

---

## Files to Modify

### Backend
1. `backend/app/routes/bookings.py`
2. `backend/app/routes/collaborations.py`
3. `backend/app/routes/custom_packages.py`
4. `backend/app/routes/creator_subscriptions.py` (TBD - need to find)
5. `backend/app/services/email_service.py`
6. `backend/app/models/collaboration.py`

### Frontend
1. `frontend/src/contexts/CartContext.jsx`
2. `frontend/src/pages/admin/SystemLogs.jsx`
3. `frontend/src/pages/CreatorSubscriptions.jsx` OR `SubscriptionManage.jsx`
4. All creator booking/collaboration UI components
5. Collaboration detail pages
6. Booking status displays

---

## Success Criteria

✅ Cart total displays correctly with multiple creators
✅ Admin Logs page has consistent navigation
✅ Subscription upgrade completes successfully
✅ Creator subscription bank transfer uploads work
✅ Custom package offers trigger email notifications
✅ No datetime comparison errors in custom offers
✅ Bookings auto-accepted after payment
✅ Creators can cancel collaborations with reasons
✅ Creator ratings decrease on cancellation
✅ All email notifications working
✅ Zero errors in production logs

---

## Deployment Plan

1. Create database migration for collaboration fields
2. Run migration on production database
3. Deploy backend changes (all 7 fixes)
4. Deploy frontend changes
5. Restart services
6. Run smoke tests on all fixed features
7. Monitor error logs for 24 hours
8. Create deployment summary document

---

**Estimated Total Time**: 8-12 hours
**Can be completed in**: 1-2 working days
**Risk Level**: Medium (major workflow changes in Phase 4)
**Rollback Plan**: Keep previous booking accept/decline code commented for 1 week before permanent deletion

