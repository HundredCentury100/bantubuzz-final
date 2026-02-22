# Complete Fix Plan for BantuBuzz Payment & Messaging Issues

## Issues Identified

### 1. Revision Payment Not Redirecting
**Problem**: Frontend stores data in localStorage and redirects to payment page, but no booking is created in the database.
**Root Cause**: No backend endpoint to create booking for paid revisions.
**Solution**: Add endpoint `/api/collaborations/<id>/revision/create-booking` that creates a booking record.

### 2. Payment Verification Not Updating Application Status
**Problem**: Admin verifies payment but application remains in "awaiting_payment" status.
**Root Cause**: The payment verification endpoint doesn't update the campaign_application status to "accepted".
**Solution**: Modify admin payment verification to also update campaign_application status when booking_type is 'campaign_application'.

### 3. Package Added Before Payment Verification
**Problem**: Package is added to campaign immediately after booking creation, not after payment verification.
**Root Cause**: The `add_package_to_campaign` endpoint inserts into campaign_packages immediately instead of waiting for payment.
**Solution**: Remove the immediate insert, add it to the payment completion callback instead.

### 4. WebSocket Connection Errors
**Problem**: Frontend trying to connect to wss://bantubuzz.com:3002 and wss://bantubuzz.com which don't exist.
**Root Cause**: VITE_MESSAGING_SOCKET_URL is not set or pointing to wrong port. Socket.IO is integrated with Flask on port 8002.
**Solution**: Update MessagingContext to connect to https://bantubuzz.com (Apache proxies /socket.io/ to port 8002).

### 5. Messaging API Requests Failing
**Problem**: GET https://bantubuzz.com:3002/api/conversations returns ERR_SSL_PROTOCOL_ERROR
**Root Cause**: Messaging API trying to use port 3002 instead of main API.
**Solution**: Update messagingAPI.js to use main API URL (https://bantubuzz.com/api).

## Implementation Plan

### Step 1: Fix Revision Payment Flow (Backend)
File: `backend/app/routes/collaborations.py`

Add new endpoint after line 434:
```python
@bp.route('/<int:collab_id>/revision/create-booking', methods=['POST'])
@jwt_required()
def create_revision_booking(collab_id):
    """Create a booking for paid revision (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        deliverable_id = data.get('deliverable_id')
        notes = data.get('notes')
        fee = data.get('fee', 0)

        if not deliverable_id or not notes:
            return jsonify({'error': 'Deliverable ID and notes are required'}), 400

        # Find the deliverable
        draft_deliverables = collaboration.draft_deliverables or []
        deliverable_found = False
        deliverable_title = None

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                deliverable_found = True
                deliverable_title = d['title']
                break

        if not deliverable_found:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Create booking for revision fee
        from app.models import Booking
        booking = Booking(
            brand_id=brand.id,
            creator_id=collaboration.creator_id,
            package_id=None,
            campaign_id=None,
            booking_type='paid_revision',
            amount=float(fee),
            total_price=float(fee),
            status='pending',
            payment_status='pending',
            notes=f"Paid revision for deliverable: {deliverable_title}"
        )
        db.session.add(booking)
        db.session.flush()

        # Store revision data in booking notes as JSON
        import json
        revision_data = {
            'collaboration_id': collab_id,
            'deliverable_id': deliverable_id,
            'deliverable_title': deliverable_title,
            'revision_notes': notes
        }
        booking.notes = json.dumps(revision_data)

        db.session.commit()

        return jsonify({
            'message': 'Booking created for revision. Please proceed to payment.',
            'booking_id': booking.id,
            'redirect_to_payment': True
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"ERROR in create_revision_booking: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
```

Add completion endpoint after the above:
```python
@bp.route('/<int:collab_id>/revision/complete-payment', methods=['POST'])
@jwt_required()
def complete_revision_payment(collab_id):
    """Complete revision payment and request the revision (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        booking_id = data.get('booking_id')

        if not booking_id:
            return jsonify({'error': 'Booking ID is required'}), 400

        # Verify booking is paid
        from app.models import Booking
        booking = Booking.query.get(booking_id)
        if not booking or booking.payment_status != 'verified':
            return jsonify({'error': 'Payment not verified'}), 400

        # Extract revision data from booking notes
        import json
        revision_data = json.loads(booking.notes)
        deliverable_id = revision_data['deliverable_id']
        revision_notes = revision_data['revision_notes']
        deliverable_title = revision_data['deliverable_title']

        # Now request the revision
        draft_deliverables = collaboration.draft_deliverables or []

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                d['status'] = 'revision_requested'
                d['revision_notes'] = revision_notes
                d['revision_requested_at'] = datetime.utcnow().isoformat()
                break

        # Track revision request
        creator = collaboration.creator
        total_revisions = collaboration.total_revisions_used or 0
        free_revisions = creator.free_revisions or 2

        revision_request = {
            'deliverable_id': deliverable_id,
            'deliverable_title': deliverable_title,
            'notes': revision_notes,
            'requested_at': datetime.utcnow().isoformat(),
            'is_paid': True,
            'fee': booking.amount,
            'booking_id': booking_id
        }

        if collaboration.revision_requests is None:
            collaboration.revision_requests = []

        collaboration.revision_requests.append(revision_request)
        collaboration.total_revisions_used = total_revisions + 1
        collaboration.paid_revisions = (collaboration.paid_revisions or 0) + 1

        # Update last update
        collaboration.last_update = f"Paid revision requested for: {deliverable_title}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flags as modified for JSON fields
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'draft_deliverables')
        flag_modified(collaboration, 'revision_requests')

        db.session.commit()

        # Emit Socket.IO update
        emit_collaboration_update(collaboration.id)

        # Notify creator about revision request
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Paid revision requested for '{deliverable_title}'"
            )

        return jsonify({
            'message': 'Revision requested successfully after payment',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"ERROR in complete_revision_payment: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
```

### Step 2: Fix Revision Payment Flow (Frontend)
File: `frontend/src/pages/CollaborationDetails.jsx`

Replace lines 123-150 with:
```javascript
const handleRequestRevision = async () => {
  if (!revisionNotes.trim()) {
    toast.error('Please provide revision notes');
    return;
  }

  // Check if this will be a paid revision
  const willBePaid = totalRevisions >= freeRevisions;

  if (willBePaid && revisionFee > 0) {
    try {
      setRequestingRevision(true);
      // Call backend to create booking
      const response = await collaborationsAPI.createRevisionBooking(id, {
        deliverable_id: selectedDeliverableForRevision.id,
        notes: revisionNotes,
        fee: revisionFee
      });

      if (response.data.redirect_to_payment && response.data.booking_id) {
        // Store revision context for after payment
        localStorage.setItem('revision_payment_context', JSON.stringify({
          collaboration_id: id,
          deliverable_id: selectedDeliverableForRevision.id,
          deliverable_title: selectedDeliverableForRevision.title,
          booking_id: response.data.booking_id
        }));

        // Close modal and redirect to payment
        setShowRevisionModal(false);
        setRevisionNotes('');
        setSelectedDeliverableForRevision(null);

        toast.success('Redirecting to payment for revision fee...');
        navigate(`/brand/revision-payment/${response.data.booking_id}`);
      }
    } catch (error) {
      console.error('Error creating revision booking:', error);
      toast.error('Failed to create revision booking');
    } finally {
      setRequestingRevision(false);
    }
    return;
  }

  // Free revision - proceed normally
  try {
    setRequestingRevision(true);
    const response = await collaborationsAPI.requestRevision(
      id,
      selectedDeliverableForRevision.id,
      revisionNotes
    );

    toast.success('Revision requested. Creator will be notified.');
    setShowRevisionModal(false);
    setRevisionNotes('');
    setSelectedDeliverableForRevision(null);
    fetchCollaboration();
  } catch (error) {
    console.error('Error requesting revision:', error);
    toast.error('Failed to request revision');
  } finally {
    setRequestingRevision(false);
  }
};
```

### Step 3: Add API method for revision booking
File: `frontend/src/services/api.js`

Add to collaborationsAPI object:
```javascript
createRevisionBooking: (collabId, data) =>
  api.post(`/collaborations/${collabId}/revision/create-booking`, data),

completeRevisionPayment: (collabId, bookingId) =>
  api.post(`/collaborations/${collabId}/revision/complete-payment`, { booking_id: bookingId }),
```

### Step 4: Create Revision Payment Page
File: `frontend/src/pages/RevisionPayment.jsx` (create new file)

### Step 5: Fix Payment Verification to Update Application Status
File: `backend/app/routes/admin.py` or wherever payment verification is

Update payment verification endpoint to:
```python
# After verifying payment, check if it's a campaign application
if booking.booking_type == 'campaign_application':
    # Update the application status
    from app.models import CampaignApplication
    application = CampaignApplication.query.filter_by(booking_id=booking.id).first()
    if application:
        application.status = 'accepted'
        application.updated_at = datetime.utcnow()
        # Notify creator
```

### Step 6: Fix Package Being Added Before Payment
File: `backend/app/routes/campaigns.py`

Remove lines 215-221 (the insert into campaign_packages):
```python
# REMOVE THIS:
db.session.execute(
    campaign_packages.insert().values(
        campaign_id=campaign_id,
        package_id=package_id,
        booking_id=booking.id
    )
)
```

Add to payment completion endpoint `complete_package_payment`:
```python
# Add package to campaign AFTER payment verified
db.session.execute(
    campaign_packages.insert().values(
        campaign_id=campaign_id,
        package_id=package_id,
        booking_id=booking.id
    )
)
```

### Step 7: Fix WebSocket Connection
File: `frontend/src/contexts/MessagingContext.jsx`

Change line 5:
```javascript
const MESSAGING_SOCKET_URL = import.meta.env.VITE_MESSAGING_SOCKET_URL || 'https://bantubuzz.com';
```

### Step 8: Fix Messaging API Base URL
File: `frontend/src/services/api.js` or `messagingAPI.js`

Ensure messaging API uses main API URL not port 3002.

## Testing Checklist

- [ ] Accept campaign application → Redirects to payment → Verify payment → Application status changes to "accepted"
- [ ] Add package to campaign → Redirects to payment → Verify payment → Package added to campaign
- [ ] Request paid revision → Creates booking → Redirects to payment → Verify payment → Revision requested
- [ ] WebSocket connects successfully to wss://bantubuzz.com/socket.io/
- [ ] Messaging API calls work (GET /api/conversations)
- [ ] Real-time updates work (notifications, typing indicators)
