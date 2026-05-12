# Phase 4: Booking Auto-Accept Implementation Plan

**Date**: 2026-04-23
**Status**: PLANNING

---

## Overview

Remove creator booking accept/decline logic. Bookings should automatically accept when payment completes, sending email notification to creator. Creators can only cancel collaborations (with reason and rating penalty).

---

## Current Flow (TO BE REMOVED)

### Brand Books Creator Package:
1. Brand creates booking → Status: `pending`
2. Brand pays (Paynow/Wallet/Bank Transfer) → Payment verified
3. Collaboration created with status: `pending_creator_acceptance`
4. **Creator must manually accept or decline** ← THIS NEEDS TO BE REMOVED
5. If accepted → Collaboration status: `in_progress`
6. If declined → Refund processed, collaboration status: `creator_declined`

### Problems with Current Flow:
- Creates friction - creators may forget to accept
- Delays collaboration start
- Can lead to abandoned bookings
- Requires extra UI complexity

---

## New Flow (TO BE IMPLEMENTED)

### Brand Books Creator Package:
1. Brand creates booking → Status: `pending`
2. Brand pays (Paynow/Wallet/Bank Transfer) → Payment verified
3. **Collaboration automatically created with status: `in_progress`** ← AUTO-ACCEPT
4. **Email sent to creator immediately** ← NEW
5. Creator works on deliverables
6. Creator can cancel if needed (with reason and rating penalty) ← NEW FEATURE

### Benefits:
- Faster collaboration start
- Simpler UI (no accept/decline buttons)
- Better user experience for creators
- Encourages commitment through rating penalty

---

## Database Changes

### Collaboration Model

**Already Exists** (no migration needed):
```python
# Line 49 in collaboration.py
cancellation_request = db.Column(db.JSON)
# Structure: {requested_by, reason, requested_at, status, cancelled_by_type}
```

**New Fields Needed**:
```sql
ALTER TABLE collaborations
ADD COLUMN cancelled_by_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancelled_at TIMESTAMP,
ADD COLUMN cancellation_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN cancellation_approved_at TIMESTAMP,
ADD COLUMN cancellation_approved_by INTEGER;  -- admin user_id
```

### CreatorProfile Model

**New Fields for Rating Penalty**:
```sql
ALTER TABLE creator_profiles
ADD COLUMN cancelled_collaborations_count INTEGER DEFAULT 0,
ADD COLUMN rating_penalty DECIMAL(3,2) DEFAULT 0.00;  -- Up to -0.50 stars
```

**Rating Calculation**:
- Each cancellation = -0.10 rating penalty (up to max -0.50)
- Display as: `final_rating = base_rating - rating_penalty`
- Show cancellation count on profile

---

## Backend Changes

### 1. Update Booking Routes (`backend/app/routes/bookings.py`)

**Lines to Modify**: 666, 910, 1475 (all instances of `pending_creator_acceptance`)

**BEFORE**:
```python
collaboration = Collaboration(
    # ... fields ...
    status='pending_creator_acceptance',  # ← REMOVE THIS
    # ... more fields ...
)
```

**AFTER**:
```python
collaboration = Collaboration(
    # ... fields ...
    status='in_progress',  # ← AUTO-ACCEPT
    # ... more fields ...
)

# Send email to creator about new collaboration
creator_user = User.query.get(booking.creator.user_id)
if creator_user:
    from app.services.email_service import EmailService
    EmailService.send_booking_auto_accepted_email(
        creator_email=creator_user.email,
        creator_name=booking.creator.username,
        brand_name=booking.brand.company_name,
        package_title=package.title if package else 'Package',
        amount=float(booking.amount),
        deliverables=package.deliverables if package else [],
        expected_days=package.duration_days if package else None,
        collaboration_id=collaboration.id
    )
```

**Specific Locations**:

1. **Line 666** - `cart_payment_status()` function:
```python
collab = Collaboration(
    collaboration_type='package',
    booking_id=booking.id,
    creator_id=booking.creator_id,
    brand_id=booking.brand_id,
    title=f"Collaboration for {package.title if package else 'Package'}",
    description=package.description if package else '',
    amount=booking.amount,
    status='in_progress',  # ← CHANGED from 'pending_creator_acceptance'
    start_date=start_date,
    expected_completion_date=expected_completion,
    deliverables=package.deliverables if package and package.deliverables else [],
    progress_percentage=0
)
db.session.add(collab)
db.session.flush()

# Send email to creator
creator = CreatorProfile.query.get(booking.creator_id)
creator_user = User.query.get(creator.user_id)
package = Package.query.get(booking.package_id)
EmailService.send_booking_auto_accepted_email(...)
```

2. **Line 910** - `cart_pay_with_wallet()` function:
```python
collaboration = Collaboration(
    collaboration_type='package',
    booking_id=booking.id,
    creator_id=booking.creator_id,
    brand_id=booking.brand_id,
    title=f"Collaboration for {package.title}",
    description=package.description or '',
    amount=booking.amount,
    status='in_progress',  # ← CHANGED
    start_date=start_date,
    expected_completion_date=expected_completion,
    deliverables=package.deliverables if package.deliverables else [],
    progress_percentage=0
)
db.session.add(collaboration)
db.session.flush()

# Send email
creator_user = User.query.get(package.creator.user_id)
EmailService.send_booking_auto_accepted_email(...)
```

3. **Line 1475** - `verify_bank_transfer_payment()` function:
```python
collaboration = Collaboration(
    collaboration_type='package',
    booking_id=booking.id,
    creator_id=booking.creator_id,
    brand_id=booking.brand_id,
    title=f"Collaboration for {package.title if package else 'Package'}",
    description=package.description if package else '',
    amount=booking.amount,
    status='in_progress',  # ← CHANGED
    start_date=start_date,
    expected_completion_date=expected_completion,
    deliverables=package.deliverables if package and package.deliverables else [],
    progress_percentage=0
)
db.session.add(collaboration)
# Send email
```

**Remove Accept/Decline Endpoint** (Lines 196-289):
```python
# REMOVE THIS ENTIRE ENDPOINT - creators can no longer accept/decline
@bp.route('/<int:booking_id>/status', methods=['PUT'])
@jwt_required()
def update_booking_status(booking_id):
    # ... DELETE THIS ENTIRE FUNCTION ...
```

### 2. Add Cancellation Endpoint (`backend/app/routes/collaborations.py`)

**New Endpoint**:
```python
@bp.route('/<int:collaboration_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_collaboration(collaboration_id):
    """
    Creator cancels collaboration (with rating penalty)
    Body: { reason: str }
    """
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Verify creator owns this collaboration
        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Check if already cancelled or completed
        if collaboration.status in ['cancelled', 'completed']:
            return jsonify({'error': f'Cannot cancel {collaboration.status} collaboration'}), 400

        data = request.get_json()
        reason = data.get('reason', '').strip()

        if not reason or len(reason) < 10:
            return jsonify({'error': 'Cancellation reason required (min 10 characters)'}), 400

        # Update collaboration
        collaboration.cancelled_by_creator = True
        collaboration.cancellation_reason = reason
        collaboration.cancelled_at = datetime.utcnow()
        collaboration.status = 'cancelled'
        collaboration.updated_at = datetime.utcnow()

        # Apply rating penalty
        current_penalty = creator.rating_penalty or 0.0
        new_penalty = min(0.50, current_penalty + 0.10)  # Max -0.50 stars
        creator.rating_penalty = new_penalty
        creator.cancelled_collaborations_count = (creator.cancelled_collaborations_count or 0) + 1

        db.session.commit()

        # Notify brand
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            from app.utils.notifications import create_notification
            create_notification(
                user_id=brand_user.id,
                notification_type='collaboration_cancelled',
                title='Collaboration Cancelled by Creator',
                message=f'{creator.username} cancelled: {collaboration.title}. Reason: {reason}',
                action_url=f'/collaborations/{collaboration.id}'
            )

        # Send email to brand
        from app.services.email_service import EmailService
        EmailService.send_collaboration_cancelled_email(
            brand_email=brand_user.email,
            brand_name=collaboration.brand.company_name,
            creator_name=creator.username,
            collaboration_title=collaboration.title,
            cancellation_reason=reason
        )

        return jsonify({
            'success': True,
            'message': 'Collaboration cancelled. Rating penalty applied.',
            'collaboration': collaboration.to_dict(),
            'rating_penalty': float(new_penalty),
            'total_cancellations': creator.cancelled_collaborations_count
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
```

### 3. Update Collaboration Model (`backend/app/models/collaboration.py`)

**Add to `to_dict()` method**:
```python
def to_dict(self, include_relations=False):
    data = {
        # ... existing fields ...
        'cancelled_by_creator': self.cancelled_by_creator or False,
        'cancellation_reason': self.cancellation_reason,
        'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
        # ... rest of fields ...
    }
    return data
```

### 4. Update Creator Profile Model (`backend/app/models/creator_profile.py`)

**Add to `to_dict()` method**:
```python
def to_dict(self, include_packages=False):
    data = {
        # ... existing fields ...
        'rating_penalty': float(self.rating_penalty) if self.rating_penalty else 0.0,
        'cancelled_collaborations_count': self.cancelled_collaborations_count or 0,
        'effective_rating': self.get_effective_rating(),  # New method
        # ... rest of fields ...
    }
    return data

def get_effective_rating(self):
    """Calculate rating with penalty applied"""
    base_rating = self.rating or 5.0
    penalty = self.rating_penalty or 0.0
    return max(0.0, base_rating - penalty)
```

### 5. Email Service (`backend/app/services/email_service.py`)

**New Email Template 1: Booking Auto-Accepted**:
```python
def send_booking_auto_accepted_email(creator_email, creator_name, brand_name, package_title, amount, deliverables, expected_days, collaboration_id):
    """Send email when booking is auto-accepted after payment"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    subject = f"New Collaboration from {brand_name} - Payment Confirmed"

    deliverables_text = '\n'.join([f"  • {item}" for item in deliverables]) if deliverables else "  • See collaboration details"
    deliverables_html = ''.join([f"<li>{item}</li>" for item in deliverables]) if deliverables else "<li>See collaboration details</li>"

    duration_text = f"{expected_days} days" if expected_days else "As agreed"

    text_body = f"""
Hi {creator_name},

Great news! {brand_name} has booked your package and payment has been confirmed.

Package: {package_title}
Amount: R {amount:.2f}
Expected Delivery: {duration_text}

Deliverables:
{deliverables_text}

What's Next:
1. Review the collaboration details
2. Start working on deliverables
3. Submit drafts for review

View Collaboration: {frontend_url}/creator/collaborations/{collaboration_id}

Important: Cancelling collaborations affects your rating. Please only cancel if absolutely necessary.

Best regards,
The BantuBuzz Team
    """

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #1F2937; color: white; padding: 20px; text-align: center; }}
        .content {{ background-color: #ffffff; padding: 30px; }}
        .highlight {{ background-color: #f9fafb; border-left: 4px solid #B5E61D; padding: 15px; margin: 20px 0; }}
        .button {{ background-color: #B5E61D; color: #1F2937; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }}
        .footer {{ background-color: #1F2937; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; }}
        ul {{ list-style-type: none; padding-left: 0; }}
        li {{ padding: 5px 0; }}
        .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 20px 0; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 New Collaboration Started!</h1>
        </div>
        <div class="content">
            <p>Hi {creator_name},</p>

            <p><strong>Great news!</strong> {brand_name} has booked your package and payment has been confirmed. The collaboration is now active.</p>

            <div class="highlight">
                <h3 style="margin-top: 0;">Collaboration Details</h3>
                <p><strong>Package:</strong> {package_title}</p>
                <p><strong>Amount:</strong> R {amount:.2f}</p>
                <p><strong>Expected Delivery:</strong> {duration_text}</p>

                <p><strong>Deliverables:</strong></p>
                <ul>
                    {deliverables_html}
                </ul>
            </div>

            <h3>What's Next?</h3>
            <ol>
                <li>Review the collaboration details</li>
                <li>Start working on deliverables</li>
                <li>Submit drafts for brand review</li>
            </ol>

            <a href="{frontend_url}/creator/collaborations/{collaboration_id}" class="button">View Collaboration</a>

            <div class="warning">
                ⚠️ <strong>Important:</strong> Cancelling collaborations will decrease your rating by 0.10 stars (up to -0.50 max). Please only cancel if absolutely necessary and provide a valid reason.
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2026 BantuBuzz. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """

    send_email(subject, creator_email, text_body, html_body)

# Add wrapper method
class EmailService:
    @staticmethod
    def send_booking_auto_accepted_email(creator_email, creator_name, brand_name, package_title, amount, deliverables, expected_days, collaboration_id):
        return send_booking_auto_accepted_email(creator_email, creator_name, brand_name, package_title, amount, deliverables, expected_days, collaboration_id)
```

**New Email Template 2: Collaboration Cancelled by Creator**:
```python
def send_collaboration_cancelled_email(brand_email, brand_name, creator_name, collaboration_title, cancellation_reason):
    """Send email when creator cancels collaboration"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    subject = f"Collaboration Cancelled - {collaboration_title}"

    text_body = f"""
Hi {brand_name},

Unfortunately, {creator_name} has cancelled the collaboration: {collaboration_title}.

Cancellation Reason:
{cancellation_reason}

What Happens Next:
- Funds will be refunded to your wallet within 24-48 hours
- You can book another creator or contact support

If you have any questions, please contact our support team.

Best regards,
The BantuBuzz Team
    """

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #1F2937; color: white; padding: 20px; text-align: center; }}
        .content {{ background-color: #ffffff; padding: 30px; }}
        .reason {{ background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }}
        .footer {{ background-color: #1F2937; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Collaboration Cancelled</h1>
        </div>
        <div class="content">
            <p>Hi {brand_name},</p>

            <p>Unfortunately, <strong>{creator_name}</strong> has cancelled the collaboration: <strong>{collaboration_title}</strong>.</p>

            <div class="reason">
                <h3 style="margin-top: 0;">Cancellation Reason:</h3>
                <p>{cancellation_reason}</p>
            </div>

            <h3>What Happens Next:</h3>
            <ul>
                <li>✅ Funds will be refunded to your wallet within 24-48 hours</li>
                <li>✅ You can book another creator</li>
                <li>✅ Contact support if you need assistance</li>
            </ul>

            <p>We apologize for the inconvenience. Our team is here to help you find the perfect creator for your next collaboration.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 BantuBuzz. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """

    send_email(subject, brand_email, text_body, html_body)

# Add wrapper method
class EmailService:
    @staticmethod
    def send_collaboration_cancelled_email(brand_email, brand_name, creator_name, collaboration_title, cancellation_reason):
        return send_collaboration_cancelled_email(brand_email, brand_name, creator_name, collaboration_title, cancellation_reason)
```

---

## Frontend Changes

### 1. Remove Accept/Decline UI

**Files to Modify**:
- `frontend/src/pages/Bookings.jsx` - Remove accept/decline buttons from creator bookings view
- `frontend/src/components/BookingCard.jsx` - Remove accept/decline action buttons (if exists)

**BEFORE**:
```jsx
{user.user_type === 'creator' && booking.status === 'pending' && (
  <div className="flex gap-2">
    <button onClick={() => acceptBooking(booking.id)} className="btn-accept">
      Accept
    </button>
    <button onClick={() => declineBooking(booking.id)} className="btn-decline">
      Decline
    </button>
  </div>
)}
```

**AFTER**:
```jsx
{/* Bookings are auto-accepted - no action needed */}
{booking.status === 'accepted' && (
  <span className="badge badge-success">Active Collaboration</span>
)}
```

### 2. Add Cancel Collaboration UI

**File**: `frontend/src/pages/CollaborationDetails.jsx` (or similar)

**Add Cancel Button**:
```jsx
const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelReason, setCancelReason] = useState('');
const [cancelling, setCancelling] = useState(false);

const handleCancelCollaboration = async () => {
  if (!cancelReason || cancelReason.length < 10) {
    toast.error('Please provide a cancellation reason (min 10 characters)');
    return;
  }

  try {
    setCancelling(true);
    const res = await api.post(`/collaborations/${collaboration.id}/cancel`, {
      reason: cancelReason
    });

    if (res.data.success) {
      toast.success('Collaboration cancelled. Rating penalty applied.');
      toast.warning(`Rating penalty: -${res.data.rating_penalty.toFixed(2)} stars`);
      navigate('/creator/collaborations');
    }
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to cancel collaboration');
  } finally {
    setCancelling(false);
  }
};

// In JSX:
{user.user_type === 'creator' && collaboration.status === 'in_progress' && (
  <button
    onClick={() => setShowCancelModal(true)}
    className="btn btn-danger"
  >
    Cancel Collaboration
  </button>
)}

{/* Cancel Modal */}
{showCancelModal && (
  <div className="modal">
    <div className="modal-content">
      <h2>Cancel Collaboration</h2>
      <p className="text-warning">
        ⚠️ Warning: Cancelling will decrease your rating by 0.10 stars.
      </p>
      <p>Current cancellations: {creator.cancelled_collaborations_count || 0}</p>
      <p>Current penalty: -{creator.rating_penalty || 0} stars</p>

      <label>Cancellation Reason (required):</label>
      <textarea
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Please explain why you need to cancel this collaboration..."
        rows={4}
        minLength={10}
        className="w-full p-2 border rounded"
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleCancelCollaboration}
          disabled={cancelling || cancelReason.length < 10}
          className="btn btn-danger"
        >
          {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
        </button>
        <button
          onClick={() => setShowCancelModal(false)}
          className="btn btn-secondary"
        >
          Keep Collaboration
        </button>
      </div>
    </div>
  </div>
)}
```

### 3. Display Rating Penalty on Creator Profile

**File**: `frontend/src/pages/CreatorProfile.jsx`

**Add to Profile Display**:
```jsx
<div className="rating-section">
  <div className="flex items-center gap-2">
    <span className="text-2xl font-bold">
      {(creator.effective_rating || 5.0).toFixed(1)} ⭐
    </span>
    {creator.rating_penalty > 0 && (
      <span className="text-sm text-red-600">
        (-{creator.rating_penalty.toFixed(2)} penalty)
      </span>
    )}
  </div>

  {creator.cancelled_collaborations_count > 0 && (
    <p className="text-sm text-gray-600 mt-1">
      {creator.cancelled_collaborations_count} cancelled collaboration{creator.cancelled_collaborations_count > 1 ? 's' : ''}
    </p>
  )}
</div>
```

---

## Testing Checklist

### Backend Tests

- [ ] **Auto-Accept on Paynow Payment**:
  - [ ] Create booking
  - [ ] Pay with Paynow
  - [ ] Verify collaboration created with `status='in_progress'`
  - [ ] Verify email sent to creator
  - [ ] Check collaboration_id in email is correct

- [ ] **Auto-Accept on Wallet Payment**:
  - [ ] Create booking
  - [ ] Pay with wallet
  - [ ] Verify collaboration auto-accepted
  - [ ] Verify email sent

- [ ] **Auto-Accept on Bank Transfer Verification**:
  - [ ] Create booking
  - [ ] Upload bank transfer proof
  - [ ] Admin verifies payment
  - [ ] Verify collaboration auto-accepted
  - [ ] Verify email sent

- [ ] **Cancel Collaboration**:
  - [ ] Creator cancels active collaboration
  - [ ] Verify `cancelled_by_creator = True`
  - [ ] Verify `status = 'cancelled'`
  - [ ] Verify rating penalty applied (+0.10)
  - [ ] Verify cancelled_collaborations_count incremented
  - [ ] Verify brand receives notification
  - [ ] Verify brand receives email

- [ ] **Rating Penalty Calculation**:
  - [ ] Cancel 1 collaboration → penalty = 0.10
  - [ ] Cancel 2 collaborations → penalty = 0.20
  - [ ] Cancel 5 collaborations → penalty = 0.50
  - [ ] Cancel 6+ collaborations → penalty capped at 0.50
  - [ ] Verify effective_rating = base_rating - penalty

- [ ] **Cannot Cancel Completed/Cancelled Collaborations**:
  - [ ] Try to cancel completed collaboration → Error
  - [ ] Try to cancel already cancelled collaboration → Error

### Frontend Tests

- [ ] **Bookings Page (Creator)**:
  - [ ] Verify no accept/decline buttons shown
  - [ ] Verify bookings show as "Active" after payment
  - [ ] Verify redirect to collaboration details works

- [ ] **Collaboration Details Page**:
  - [ ] Verify "Cancel Collaboration" button appears for creator
  - [ ] Verify brand does not see cancel button
  - [ ] Click cancel → Modal opens
  - [ ] Modal shows current penalty and cancellation count
  - [ ] Cannot submit without reason (min 10 chars)
  - [ ] Submit cancellation → Success message
  - [ ] Verify rating penalty notification shown
  - [ ] Verify redirect to collaborations list

- [ ] **Creator Profile Page**:
  - [ ] Verify effective rating displayed with penalty
  - [ ] Verify cancellation count shown if > 0
  - [ ] Verify penalty shown in red text

### Email Tests

- [ ] **Booking Auto-Accepted Email**:
  - [ ] Creator receives email immediately after payment
  - [ ] Email contains correct collaboration details
  - [ ] Email contains deliverables list
  - [ ] Email contains warning about cancellation penalty
  - [ ] Click "View Collaboration" link → Redirects to correct collaboration

- [ ] **Collaboration Cancelled Email**:
  - [ ] Brand receives email when creator cancels
  - [ ] Email contains cancellation reason
  - [ ] Email explains refund process

---

## Migration SQL

**File**: `backend/migrations/add_collaboration_cancellation_fields.sql`

```sql
-- Add cancellation fields to collaborations table
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS cancelled_by_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add rating penalty fields to creator_profiles table
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS cancelled_collaborations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_penalty DECIMAL(3,2) DEFAULT 0.00;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_collaborations_cancelled
ON collaborations(cancelled_by_creator, cancelled_at);

CREATE INDEX IF NOT EXISTS idx_creator_cancellations
ON creator_profiles(cancelled_collaborations_count);
```

**Migration Script**: `backend/run_collaboration_cancellation_migration.py`

```python
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db

app = create_app()

with app.app_context():
    print("Running collaboration cancellation migration...")

    # Read and execute migration SQL
    with open('migrations/add_collaboration_cancellation_fields.sql', 'r') as f:
        sql = f.read()
        statements = [s.strip() for s in sql.split(';') if s.strip()]

        for statement in statements:
            try:
                db.session.execute(db.text(statement))
                print(f"✓ Executed: {statement[:50]}...")
            except Exception as e:
                print(f"✗ Error: {e}")
                db.session.rollback()
                continue

        db.session.commit()
        print("✓ Migration completed successfully!")
```

---

## Deployment Plan

### Phase 4 Deployment Steps:

1. **Create Database Migration**:
   ```bash
   cd backend
   python run_collaboration_cancellation_migration.py
   ```

2. **Update Backend Code**:
   - Add new email templates
   - Update bookings.py (auto-accept)
   - Add cancellation endpoint
   - Update models

3. **Update Frontend Code**:
   - Remove accept/decline UI
   - Add cancel collaboration UI
   - Update profile to show penalty

4. **Deploy Backend**:
   - Upload modified files
   - Restart Gunicorn

5. **Deploy Frontend**:
   - Build production bundle
   - Upload dist folder

6. **Test End-to-End**:
   - Create test booking
   - Verify auto-accept
   - Verify email sent
   - Test cancellation
   - Verify rating penalty

---

## Success Metrics

- ✅ Collaborations auto-accept on payment
- ✅ Creators receive email immediately
- ✅ No accept/decline buttons in UI
- ✅ Creators can cancel with reason
- ✅ Rating penalty applied on cancellation
- ✅ Brands notified of cancellations
- ✅ Cancellation count tracked on profile

---

**Status**: Ready for Implementation
**Estimated Time**: 3-4 hours
**Complexity**: Medium
