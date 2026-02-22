# Milestone-Based Collaboration Implementation Plan

## Problem Summary

**Current State:**
- Collaborations from **packages** work fine - they use JSON fields (`deliverables`, `draft_deliverables`, `submitted_deliverables`)
- Collaborations from **briefs** and **campaigns** have **milestones** but no way to submit deliverables to them
- When milestones are created (see `bookings.py:546-578`), the system has no endpoints to interact with them
- Frontend can't submit deliverables because there are no milestone deliverable endpoints

**What Happens Now:**
1. Brand accepts proposal → Payment verified → Collaboration created with Collaboration Milestones ✅
2. Creator tries to submit deliverable → Uses old JSON-based endpoint → Doesn't work for milestone collaborations ❌
3. No way to submit deliverables per milestone ❌
4. No per-milestone escrow release ❌

## Required Backend Changes

### 1. Add Milestone Deliverable Submission Endpoint
**Location:** `backend/app/routes/collaborations.py`

```python
@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables', methods=['POST'])
@jwt_required()
def submit_milestone_deliverable(collab_id, milestone_id):
    """Submit deliverable to a specific milestone (creator only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Create deliverable
        deliverable = MilestoneDeliverable(
            collaboration_milestone_id=milestone.id,
            title=data['title'],
            url=data['url'],
            description=data.get('description', ''),
            status='pending_review'
        )
        db.session.add(deliverable)
        db.session.commit()

        # Update collaboration
        collaboration.last_update = f"Deliverable submitted for {milestone.title}"
        collaboration.last_update_date = datetime.utcnow()
        db.session.commit()

        # Notify brand
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_update(
                user_id=brand_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"New deliverable submitted for milestone: {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable submitted successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
```

### 2. Add Milestone Deliverable Approval Endpoint

```python
@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_milestone_deliverable(collab_id, milestone_id, deliverable_id):
    """Approve milestone deliverable (brand only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Approve deliverable
        deliverable.status = 'approved'
        deliverable.approved_at = datetime.utcnow()

        # Check if milestone is now complete
        if milestone.is_complete():
            milestone.status = 'completed'
            milestone.completed_at = datetime.utcnow()
            milestone.approved_at = datetime.utcnow()

            # Trigger escrow for this milestone
            milestone.trigger_escrow()  # Sets escrow_triggered_at and escrow_release_date (30 days)

            # Release escrow for this specific milestone
            from app.services.payment_service import release_milestone_escrow
            try:
                transaction = release_milestone_escrow(milestone.id, platform_fee_percentage=15)
                print(f"Milestone {milestone.id} escrow released. Transaction: {transaction.id}")
            except Exception as e:
                print(f"Warning: Failed to release milestone escrow: {str(e)}")

        db.session.commit()

        # Notify creator
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Deliverable approved for {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable approved successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
```

### 3. Add Milestone Deliverable Revision Request Endpoint

```python
@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/request-revision', methods=['POST'])
@jwt_required()
def request_milestone_deliverable_revision(collab_id, milestone_id, deliverable_id):
    """Request revision on milestone deliverable (brand only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        data = request.get_json()
        revision_notes = data.get('notes', '')

        if not revision_notes:
            return jsonify({'error': 'Revision notes are required'}), 400

        # Update deliverable
        deliverable.status = 'revision_requested'
        deliverable.revision_notes = revision_notes
        deliverable.revision_requested_at = datetime.utcnow()

        db.session.commit()

        # Notify creator
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Revision requested for deliverable in {milestone.title}"
            )

        return jsonify({
            'message': 'Revision requested successfully',
            'deliverable': deliverable.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
```

### 4. Add Per-Milestone Escrow Release Function
**Location:** `backend/app/services/payment_service.py`

```python
def release_milestone_escrow(milestone_id, platform_fee_percentage=15):
    """
    Release escrow for a specific completed milestone to creator wallet
    Only releases the portion allocated to this milestone
    """
    from app.models import CollaborationMilestone, Collaboration, Transaction, WalletTransaction
    from datetime import timedelta

    milestone = CollaborationMilestone.query.get(milestone_id)
    if not milestone:
        raise ValueError(f"Milestone {milestone_id} not found")

    collaboration = Collaboration.query.get(milestone.collaboration_id)
    if not collaboration:
        raise ValueError(f"Collaboration not found for milestone {milestone_id}")

    # Calculate amounts
    milestone_amount = float(milestone.price)
    platform_fee = milestone_amount * (platform_fee_percentage / 100)
    creator_amount = milestone_amount - platform_fee

    # Create wallet transaction with 30-day release countdown
    transaction = WalletTransaction(
        creator_id=collaboration.creator_id,
        transaction_type='escrow_release',
        amount=creator_amount,
        status='pending',  # Pending 30-day countdown
        platform_fee=platform_fee,
        collaboration_id=collaboration.id,
        milestone_id=milestone.id,
        scheduled_release_date=(datetime.utcnow() + timedelta(days=30)).date(),
        created_at=datetime.utcnow()
    )

    db.session.add(transaction)
    db.session.commit()

    return transaction
```

## Frontend Changes Required

### 1. Update Collaboration Details Page
Check if collaboration `has_milestones === true`:
- If TRUE: Show milestone-based UI with collapsible milestone sections
- If FALSE: Show old deliverable submission UI

### 2. Add Milestone Deliverable Components
Create components for:
- Listing milestones with their deliverables
- Submitting deliverables to specific milestones
- Approving/rejecting milestone deliverables
- Showing milestone progress and escrow status

### 3. Update API Service
Add new API methods in `frontend/src/services/api.js`:

```javascript
export const collaborationsAPI = {
  // ... existing methods ...

  // Milestone deliverables
  submitMilestoneDeliverable: (collabId, milestoneId, data) =>
    api.post(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables`, data),

  approveMilestoneDeliverable: (collabId, milestoneId, deliverableId) =>
    api.post(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables/${deliverableId}/approve`),

  requestMilestoneRevision: (collabId, milestoneId, deliverableId, notes) =>
    api.post(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables/${deliverableId}/request-revision`, { notes }),
};
```

## Implementation Order

1. ✅ Models already exist (CollaborationMilestone, MilestoneDeliverable)
2. ✅ Milestones are created when brief collaborations are created
3. ❌ **Add backend endpoints** (3 new routes above)
4. ❌ **Add escrow release function** for milestones
5. ❌ **Update frontend** to detect milestone-based collaborations
6. ❌ **Create milestone UI components**
7. ❌ **Test end-to-end workflow**

## Key Differences: Packages vs Briefs/Campaigns

| Feature | Package Collaboration | Brief/Campaign Collaboration |
|---------|----------------------|------------------------------|
| Structure | Single deliverable list | Multiple milestones |
| Deliverables | JSON in `collaboration.deliverables` | `MilestoneDeliverable` table |
| Approval | All at once or per-deliverable | Per-deliverable, per-milestone |
| Escrow Release | All at end (100% progress) | Per-milestone as completed |
| Progress | Count of approved deliverables | Count of completed milestones |
| Payment | Single upfront payment | Milestone-based payments |

## Next Steps

Due to context limitations, this is a LARGE change that requires:
1. Adding 3+ backend endpoints
2. Adding payment service function
3. Complete frontend rewrite for milestone UI
4. Testing

**Recommendation:** Work on this in phases:
- Phase 1: Add backend endpoints (30 min)
- Phase 2: Add escrow logic (15 min)
- Phase 3: Update frontend detection (10 min)
- Phase 4: Build milestone UI (60 min)
- Phase 5: Test and deploy (30 min)

Total estimated time: ~2.5 hours
