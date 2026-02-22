# Campaign Payment Implementation Plan
**Date:** 2026-01-26
**Status:** Planning Phase
**Priority:** High - Critical Business Logic Change

## Overview
This document outlines the implementation plan for enforcing payment requirements before campaign collaborations can start. Currently, campaign applications and package additions bypass payment, which needs to be fixed.

---

## Current vs. Desired Flow

### **Scenario 1: Campaign Application Acceptance**

#### Current Flow (INCORRECT):
1. Brand creates campaign
2. Creator applies to campaign
3. Brand clicks "Accept" → **Collaboration created immediately**
4. Creator starts work (no payment verified)

#### Desired Flow (CORRECT):
1. Brand creates campaign
2. Creator applies to campaign
3. Brand clicks "Accept" → **Create booking → Redirect to payment page**
4. Brand pays (Paynow or Bank Transfer)
5. **After payment confirmed** → Application auto-accepted → Collaboration created → Creator notified

---

### **Scenario 2: Adding Package to Campaign**

#### Current Flow (INCORRECT):
1. Brand creates campaign
2. Brand browses packages
3. Brand clicks "Add to Campaign" → **Package added & collaboration created immediately**
4. Creator starts work (no payment verified)

#### Desired Flow (CORRECT):
1. Brand creates campaign
2. Brand browses packages
3. Brand clicks "Add to Campaign" → **Create booking → Redirect to payment page**
4. Brand pays (Paynow or Bank Transfer)
5. **After payment confirmed** → Package added to campaign → Collaboration created → Creator notified

---

## Database Changes

### ✅ **Already Completed:**

#### 1. `bookings` table:
```sql
ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(20) DEFAULT 'paynow';
ALTER TABLE bookings ADD COLUMN proof_of_payment VARCHAR(500);
```

#### 2. `campaign_applications` table:
```sql
ALTER TABLE campaign_applications ADD COLUMN booking_id INTEGER REFERENCES bookings(id);
```

#### 3. `campaign_packages` table:
```sql
ALTER TABLE campaign_packages ADD COLUMN booking_id INTEGER REFERENCES bookings(id);
```

### 📋 **Migration Needed:**
- Run `/backend/migrations/add_booking_to_campaigns.py` on production

---

## Backend Changes Required

### **File 1: `app/routes/campaigns.py`**

#### A. Update `accept_application()` endpoint (~line 470)

**Current Code:**
```python
@bp.route('/applications/<int:application_id>/accept', methods=['POST'])
@jwt_required()
def accept_application(application_id):
    # ... validation code ...

    # Currently creates collaboration immediately
    collaboration = Collaboration(...)
    db.session.add(collaboration)
    db.session.commit()
```

**New Code:**
```python
@bp.route('/applications/<int:application_id>/accept', methods=['POST'])
@jwt_required()
def accept_application(application_id):
    # ... validation code ...

    # Don't create collaboration yet - create booking first
    application = CampaignApplication.query.get(application_id)
    campaign = Campaign.query.get(application.campaign_id)

    # Create booking for this application
    booking = Booking(
        package_id=None,  # No package, this is a campaign application
        campaign_id=campaign.id,
        creator_id=application.creator_id,
        brand_id=brand.id,
        status='pending',
        amount=application.proposed_price,
        total_price=application.proposed_price,
        payment_status='pending',
        payment_method='paynow',  # Default, user can change
        notes=f"Campaign application for: {campaign.title}"
    )
    db.session.add(booking)
    db.session.flush()  # Get booking.id

    # Link booking to application
    application.booking_id = booking.id
    application.status = 'awaiting_payment'

    db.session.commit()

    # Return booking ID so frontend can redirect to payment
    return jsonify({
        'message': 'Booking created. Please proceed to payment.',
        'booking_id': booking.id,
        'redirect_to': f'/bookings/{booking.id}/payment'
    }), 200
```

#### B. Create new endpoint `complete_application_payment()` (NEW)

```python
@bp.route('/applications/<int:application_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_application_payment(application_id):
    """
    Called after payment is confirmed (webhook or manual verification)
    Creates the collaboration after payment is verified
    """
    application = CampaignApplication.query.get(application_id)
    if not application:
        return jsonify({'error': 'Application not found'}), 404

    # Verify booking exists and payment is complete
    if not application.booking_id:
        return jsonify({'error': 'No booking found for this application'}), 400

    booking = Booking.query.get(application.booking_id)
    if booking.payment_status not in ['paid', 'verified']:
        return jsonify({'error': 'Payment not confirmed'}), 400

    # Update application status
    application.status = 'accepted'

    # Create collaboration NOW (after payment confirmed)
    collaboration = Collaboration(
        collaboration_type='campaign',
        campaign_application_id=application.id,
        booking_id=booking.id,
        brand_id=application.campaign.brand_id,
        creator_id=application.creator_id,
        title=application.campaign.title,
        description=application.campaign.description,
        amount=application.proposed_price,
        deliverables=application.deliverables,
        start_date=application.campaign.start_date,
        expected_completion_date=application.campaign.end_date,
        status='in_progress',
        progress_percentage=0
    )
    db.session.add(collaboration)
    db.session.commit()

    # Notify creator
    creator_user = User.query.get(application.creator.user_id)
    notify_application_accepted(creator_user.id, application.id)

    return jsonify({
        'message': 'Payment confirmed, collaboration started',
        'collaboration_id': collaboration.id
    }), 200
```

#### C. Update `add_package_to_campaign()` endpoint (~line 170)

**Current Code:**
```python
@bp.route('/campaigns/<int:campaign_id>/packages', methods=['POST'])
@jwt_required()
def add_package_to_campaign(campaign_id):
    # ... validation code ...

    # Currently adds package and creates collaboration immediately
    campaign.packages.append(package)
    collaboration = Collaboration(...)
    db.session.add(collaboration)
    db.session.commit()
```

**New Code:**
```python
@bp.route('/campaigns/<int:campaign_id>/packages', methods=['POST'])
@jwt_required()
def add_package_to_campaign(campaign_id):
    # ... validation code ...

    # Don't add package yet - create booking first
    package = Package.query.get(package_id)
    campaign = Campaign.query.get(campaign_id)

    # Create booking for this package
    booking = Booking(
        package_id=package.id,
        campaign_id=campaign.id,
        creator_id=package.creator_id,
        brand_id=brand.id,
        status='pending',
        amount=package.price,
        total_price=package.price,
        payment_status='pending',
        payment_method='paynow',  # Default
        notes=f"Package '{package.title}' for campaign: {campaign.title}"
    )
    db.session.add(booking)
    db.session.commit()

    return jsonify({
        'message': 'Booking created. Please proceed to payment.',
        'booking_id': booking.id,
        'redirect_to': f'/bookings/{booking.id}/payment'
    }), 200
```

#### D. Create new endpoint `complete_package_payment()` (NEW)

```python
@bp.route('/campaigns/<int:campaign_id>/packages/<int:package_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_package_payment(campaign_id, package_id):
    """
    Called after payment is confirmed for package addition
    Adds package to campaign and creates collaboration
    """
    data = request.get_json()
    booking_id = data.get('booking_id')

    booking = Booking.query.get(booking_id)
    if not booking or booking.payment_status not in ['paid', 'verified']:
        return jsonify({'error': 'Payment not confirmed'}), 400

    campaign = Campaign.query.get(campaign_id)
    package = Package.query.get(package_id)

    # Add package to campaign NOW (after payment)
    campaign.packages.append(package)

    # Update campaign_packages table with booking_id
    # Note: This requires raw SQL since it's an association table
    from sqlalchemy import text
    db.session.execute(text("""
        UPDATE campaign_packages
        SET booking_id = :booking_id
        WHERE campaign_id = :campaign_id AND package_id = :package_id
    """), {'booking_id': booking_id, 'campaign_id': campaign_id, 'package_id': package_id})

    # Create collaboration
    collaboration = Collaboration(
        collaboration_type='package',
        booking_id=booking.id,
        brand_id=campaign.brand_id,
        creator_id=package.creator_id,
        title=f"{campaign.title} - {package.title}",
        description=package.description,
        amount=package.price,
        deliverables=package.deliverables or [],
        start_date=campaign.start_date,
        expected_completion_date=campaign.end_date,
        status='in_progress',
        progress_percentage=0
    )
    db.session.add(collaboration)
    db.session.commit()

    # Notify creator
    creator_user = User.query.get(package.creator.user_id)
    notify_package_added_to_campaign(creator_user.id, package.id, campaign.id)

    return jsonify({
        'message': 'Payment confirmed, package added to campaign',
        'collaboration_id': collaboration.id
    }), 200
```

---

### **File 2: `app/routes/bookings.py`**

#### Update payment confirmation webhook/handler

**Add calls to complete_application_payment or complete_package_payment:**

```python
# In the payment confirmation handler (Paynow webhook or POP verification)
def handle_payment_confirmation(booking_id):
    booking = Booking.query.get(booking_id)
    booking.payment_status = 'paid'  # or 'verified' for bank transfer
    db.session.commit()

    # Check if this booking is for a campaign application
    if booking.campaign_application:
        # Trigger application acceptance
        complete_application_payment(booking.campaign_application.id)

    # Check if this booking is for a campaign package
    elif booking.campaign_id and booking.package_id:
        # Trigger package addition
        complete_package_payment(booking.campaign_id, booking.package_id)

    # Regular package booking - existing flow
    # (collaboration already created on booking acceptance)
```

---

## Frontend Changes Required

### **File 1: `src/pages/CampaignApplications.jsx`**

#### Update `handleAcceptApplication()` function:

**Current:**
```javascript
const handleAcceptApplication = async (applicationId) => {
  await campaignsAPI.acceptApplication(applicationId);
  toast.success('Application accepted!');
  fetchApplications();
};
```

**New:**
```javascript
const handleAcceptApplication = async (applicationId) => {
  try {
    const response = await campaignsAPI.acceptApplication(applicationId);

    // Backend returns booking_id and redirect path
    const { booking_id, redirect_to } = response.data;

    toast.success('Application approved! Redirecting to payment...');

    // Redirect to payment page
    setTimeout(() => {
      navigate(redirect_to);  // e.g., /bookings/123/payment
    }, 1500);
  } catch (error) {
    toast.error('Failed to accept application');
  }
};
```

---

### **File 2: `src/pages/CampaignPackages.jsx`** (or wherever "Add to Campaign" button is)

#### Update `handleAddToCampaign()` function:

**Current:**
```javascript
const handleAddToCampaign = async (packageId) => {
  await campaignsAPI.addPackageToCampaign(campaignId, packageId);
  toast.success('Package added!');
};
```

**New:**
```javascript
const handleAddToCampaign = async (packageId) => {
  try {
    const response = await campaignsAPI.addPackageToCampaign(campaignId, packageId);

    const { booking_id, redirect_to } = response.data;

    toast.success('Booking created! Redirecting to payment...');

    setTimeout(() => {
      navigate(redirect_to);
    }, 1500);
  } catch (error) {
    toast.error('Failed to add package to campaign');
  }
};
```

---

### **File 3: `src/pages/Payment.jsx`**

#### Update payment success handler:

After successful payment (both Paynow and Bank Transfer), call the appropriate completion endpoint:

```javascript
const handlePaymentSuccess = async (bookingId) => {
  // Check if this booking is for a campaign application or package
  const booking = await bookingsAPI.getBooking(bookingId);

  if (booking.campaign_application_id) {
    // Complete campaign application payment
    await campaignsAPI.completeApplicationPayment(booking.campaign_application_id);
    navigate(`/brand/campaigns/${booking.campaign_id}`);
  } else if (booking.campaign_id && booking.package_id) {
    // Complete campaign package payment
    await campaignsAPI.completePackagePayment(
      booking.campaign_id,
      booking.package_id,
      bookingId
    );
    navigate(`/brand/campaigns/${booking.campaign_id}`);
  } else {
    // Regular package booking
    navigate('/brand/bookings');
  }
};
```

---

## API Service Updates

### **File: `src/services/api.js`**

Add new endpoints to `campaignsAPI`:

```javascript
export const campaignsAPI = {
  // ... existing methods ...

  completeApplicationPayment: (applicationId) =>
    api.post(`/campaigns/applications/${applicationId}/complete-payment`),

  completePackagePayment: (campaignId, packageId, bookingId) =>
    api.post(`/campaigns/${campaignId}/packages/${packageId}/complete-payment`, { booking_id: bookingId }),
};
```

---

## Testing Checklist

### Backend Testing:
- [ ] Accept campaign application → Creates booking, no collaboration yet
- [ ] Pay for application booking (Paynow) → Collaboration created
- [ ] Pay for application booking (Bank Transfer + POP) → Collaboration created after admin verification
- [ ] Add package to campaign → Creates booking, no collaboration yet
- [ ] Pay for package booking → Package added, collaboration created
- [ ] Verify booking.payment_status validation works
- [ ] Test edge cases (duplicate payments, expired bookings)

### Frontend Testing:
- [ ] Accept application → Redirects to payment page
- [ ] Add package to campaign → Redirects to payment page
- [ ] Complete payment → Redirects back to campaign page
- [ ] See collaboration only after payment confirmed
- [ ] Creator receives notification only after payment

---

## Deployment Order

1. **Database Migration:**
   ```bash
   cd /var/www/bantubuzz/backend
   source venv/bin/activate
   python migrations/add_booking_to_campaigns.py
   ```

2. **Backend Deployment:**
   - Deploy updated `app/models/campaign.py`
   - Deploy updated `app/routes/campaigns.py`
   - Deploy updated `app/routes/bookings.py`
   - Restart Gunicorn

3. **Frontend Deployment:**
   - Deploy updated campaign application pages
   - Deploy updated campaign package pages
   - Deploy updated payment page
   - Deploy updated API service

4. **Verification:**
   - Test complete flow end-to-end in production
   - Monitor error logs

---

## Rollback Plan

If issues arise:

1. **Immediate:** Revert frontend to allow direct acceptance (bypass payment)
2. **Database:** Run migration downgrade script
3. **Backend:** Restore previous campaign.py and campaigns.py from git
4. **Communication:** Notify users of temporary direct acceptance flow

---

## Notes & Considerations

1. **Existing Collaborations:** Old collaborations created without payment should remain valid
2. **Campaign Budget:** Ensure campaign budget tracking accounts for individual payments
3. **Refunds:** Need refund logic if brand cancels after payment
4. **Notifications:** Update all notification templates to reference payment requirement
5. **UI Messaging:** Clear messaging that payment is required before collaboration starts

---

## Estimated Time to Complete

- Backend changes: **4-5 hours**
- Frontend changes: **3-4 hours**
- Testing: **2-3 hours**
- **Total: 9-12 hours of development time**

---

## Questions to Resolve

1. Should we allow "draft" bookings that expire after X hours if unpaid?
2. What happens if brand pays but then application/package becomes unavailable?
3. Should creators be notified when brand initiates payment (not just when confirmed)?
4. Do we need a "pending payment" view for brands to track their incomplete payments?

---

**End of Implementation Plan**
