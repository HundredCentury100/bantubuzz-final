# Bug #12 & #15 Implementation - Payment Before Actions

## Files Created
1. ✅ `frontend/src/pages/RevisionPayment.jsx` - Revision payment page

## Files to Update

### 1. frontend/src/pages/CollaborationDetails.jsx
**Line 2**: Change from:
```javascript
import { useParams, Link } from 'react-router-dom';
```
To:
```javascript
import { useParams, Link, useNavigate } from 'react-router-dom';
```

**Line 11**: Add after `const { id } = useParams();`:
```javascript
const navigate = useNavigate();
```

**Line 122-156**: Replace `handleRequestRevision` function with:
```javascript
const handleRequestRevision = async () => {
  if (!revisionNotes.trim()) {
    toast.error('Please provide revision notes');
    return;
  }

  // Check if this will be a paid revision
  const willBePaid = totalRevisions >= freeRevisions;

  if (willBePaid && revisionFee > 0) {
    // Store revision request data in localStorage
    localStorage.setItem('pending_revision_request', JSON.stringify({
      collaboration_id: id,
      deliverable_id: selectedDeliverableForRevision.id,
      deliverable_title: selectedDeliverableForRevision.title,
      notes: revisionNotes,
      fee: revisionFee
    }));

    // Close modal and redirect to revision payment page
    setShowRevisionModal(false);
    setRevisionNotes('');
    setSelectedDeliverableForRevision(null);

    toast.info('Redirecting to payment for revision fee...');
    navigate(`/brand/collaborations/${id}/revision-payment`);
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

### 2. frontend/src/App.jsx
Add route after line 255:
```javascript
<Route
  path="/brand/collaborations/:id/revision-payment"
  element={
    <ProtectedRoute requiredType="brand">
      <RevisionPayment />
    </ProtectedRoute>
  }
/>
```

Add import at top:
```javascript
import RevisionPayment from './pages/RevisionPayment';
```

### 3. frontend/src/services/api.js
Add to `paymentsAPI` object:
```javascript
createRevisionPayment: (data) => api.post('/payments/revision', data),
```

### 4. backend/app/routes/payments.py
Add new endpoint before the last route:
```python
@bp.route('/revision', methods=['POST'])
@jwt_required()
def create_revision_payment():
    """Create payment for paid revision"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        collaboration_id = data.get('collaboration_id')
        deliverable_id = data.get('deliverable_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method', 'paynow')
        proof_of_payment = data.get('proof_of_payment')

        # Validate collaboration
        from app.models import Collaboration
        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration or collaboration.brand_id != brand.id:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Create payment record
        payment = Payment(
            collaboration_id=collaboration_id,
            user_id=user_id,
            amount=amount,
            payment_method=payment_method,
            payment_type='revision_fee',
            status='pending'
        )

        if payment_method == 'bank_transfer':
            payment.payment_proof_url = proof_of_payment
            payment.status = 'pending_verification'

        db.session.add(payment)
        db.session.commit()

        # If Paynow, initiate payment
        if payment_method == 'paynow':
            paynow_response = initiate_paynow_payment(
                amount=amount,
                email=brand.user.email,
                reference=f"REV-{collaboration_id}-{deliverable_id}",
                return_url=f"{os.getenv('FRONTEND_URL')}/brand/collaborations/{collaboration_id}",
                result_url=f"{os.getenv('BACKEND_URL')}/api/payments/paynow/callback"
            )

            if paynow_response.get('success'):
                payment.paynow_poll_url = paynow_response['poll_url']
                payment.paynow_reference = paynow_response['reference']
                db.session.commit()

                return jsonify({
                    'success': True,
                    'payment_id': payment.id,
                    'redirect_url': paynow_response['redirect_url']
                }), 200
            else:
                return jsonify({'error': 'Failed to initiate payment'}), 500

        # Bank transfer - return success
        return jsonify({
            'success': True,
            'payment_id': payment.id,
            'message': 'Proof of payment uploaded. Awaiting verification.'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
```

## Bug #15 Implementation - Payment Before Campaign Application Acceptance

### Create: frontend/src/pages/CampaignApplicationPayment.jsx
```javascript
// Similar structure to RevisionPayment.jsx but for campaign applications
// Payment amount = campaign budget
// On completion, auto-accept application and create collaboration
```

### Update: Campaign application accept handler
Before accepting application, redirect to payment page if not paid.

## Testing Checklist
- [ ] Paid revision redirects to payment page
- [ ] Free revision works normally
- [ ] Bank transfer uploads proof
- [ ] Paynow redirects correctly
- [ ] After payment, revision request is submitted
- [ ] Campaign application payment flow works
- [ ] Collaboration created after payment

## Deployment Steps
1. Build frontend: `npm run build`
2. Deploy frontend dist to server
3. Upload updated backend files
4. Restart Gunicorn
5. Test both payment flows
