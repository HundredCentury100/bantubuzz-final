# Collaboration Flow - Strategic Implementation Plan

**Date**: May 19, 2026
**Branch**: development
**Strategy**: Fix issues in dependency order for maximum efficiency

---

## Dependency Analysis

```
DATABASE SCHEMA CHANGES (Foundation)
    ↓
├── Content Review Selection (affects collaboration creation)
│   ↓
├── Collaboration Details Form (depends on schema)
│   ↓
└── 3-Day Auto-Complete (depends on content review flow being established)
```

**Key Insight**: All three Sprint 1 features touch the same database table and flow. Implementing them together is faster than separate.

---

## Strategic Implementation Order

### Phase 1: Database Foundation (30 mins)
**Why First**: All features need these fields. Do once, use everywhere.

**Add to `Collaboration` model**:
```python
# New fields needed:
requires_content_review = db.Column(db.Boolean, default=True)  # Yes/No selection
brief = db.Column(db.Text)  # What do you want creator to do (required)
guidelines = db.Column(db.Text)  # Brief & Guidelines (required)
rules = db.Column(db.Text)  # Rules & Expectations (optional)
additional_notes = db.Column(db.Text)  # Additional Notes (optional)
auto_complete_eligible_at = db.Column(db.DateTime)  # For 3-day tracking
```

**Migration File**: `backend/migrations/add_collaboration_details_fields.py`

---

### Phase 2: Backend - Cart Checkout Flow (2 hours)
**Why Second**: Frontend needs these endpoints to save data.

#### Task 2.1: Update Booking Creation Endpoint
**File**: `backend/app/routes/bookings.py`

**Endpoint**: `POST /bookings/checkout`

**Changes**:
```python
# Accept new fields in request:
data = request.get_json()
collaboration_details = data.get('collaboration_details', {})

# When creating Collaboration:
collaboration = Collaboration(
    # ... existing fields ...
    requires_content_review=data.get('requires_content_review', True),
    brief=collaboration_details.get('brief'),
    guidelines=collaboration_details.get('guidelines'),
    rules=collaboration_details.get('rules'),
    additional_notes=collaboration_details.get('additional_notes')
)
```

**Validation**:
```python
# Validate required fields:
if not collaboration_details.get('brief'):
    return jsonify({'error': 'Brief is required'}), 400
if not collaboration_details.get('guidelines'):
    return jsonify({'error': 'Guidelines are required'}), 400
```

**Estimated Time**: 1 hour

#### Task 2.2: Update Collaboration Detail Endpoint
**File**: `backend/app/routes/collaborations.py`

**Endpoint**: `GET /collaborations/:id`

**Changes**:
```python
# Add to to_dict() method in Collaboration model:
def to_dict(self, include_relations=False):
    data = {
        # ... existing fields ...
        'requires_content_review': self.requires_content_review,
        'brief': self.brief,
        'guidelines': self.guidelines,
        'rules': self.rules,
        'additional_notes': self.additional_notes,
        'auto_complete_eligible_at': self.auto_complete_eligible_at.isoformat() if self.auto_complete_eligible_at else None
    }
    # ... rest of method ...
```

**Estimated Time**: 30 mins

---

### Phase 3: Frontend - Cart Flow (3 hours)
**Why Third**: User-facing changes that use backend from Phase 2.

#### Task 3.1: Content Review Selection in Cart
**File**: `frontend/src/components/CampaignCart.jsx`

**Location**: After package list, before checkout button

**Component**:
```jsx
{/* Content Review Selection */}
<div className="mb-6 p-6 bg-light border border-gray-200 rounded-3xl">
  <h3 className="text-lg font-bold text-dark mb-4">Content Review</h3>
  <p className="text-sm text-gray-600 mb-4">
    Would you like to review content before it's posted?
  </p>

  <div className="space-y-3">
    {/* Yes - Review Before Posting */}
    <label className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:border-primary transition-colors">
      <input
        type="radio"
        name="contentReview"
        value="yes"
        checked={requiresContentReview === true}
        onChange={() => setRequiresContentReview(true)}
        className="mt-1"
      />
      <div>
        <p className="font-semibold text-dark">Yes</p>
        <p className="text-sm text-gray-600 mt-1">
          I want to review content before it goes live.
        </p>
        <ul className="text-xs text-gray-500 mt-2 space-y-1 ml-4">
          <li>1. Creator submits content for review</li>
          <li>2. Brand reviews — Looks Good or Revision</li>
          <li>3. Creator posts live, submits URL, syncs</li>
          <li>4. Brand marks collaboration complete</li>
        </ul>
      </div>
    </label>

    {/* No - Trust Creator */}
    <label className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:border-primary transition-colors">
      <input
        type="radio"
        name="contentReview"
        value="no"
        checked={requiresContentReview === false}
        onChange={() => setRequiresContentReview(false)}
        className="mt-1"
      />
      <div>
        <p className="font-semibold text-dark">No</p>
        <p className="text-sm text-gray-600 mt-1">
          I trust this creator to follow the brief and guidelines in this collaboration.
        </p>
        <ul className="text-xs text-gray-500 mt-2 space-y-1 ml-4">
          <li>1. Creator posts live, submits URL, syncs</li>
          <li>2. Brand marks collaboration complete</li>
        </ul>
      </div>
    </label>
  </div>

  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
    <p className="text-xs text-yellow-900">
      <strong>Note:</strong> Selection is locked when the collaboration activates.
    </p>
  </div>
</div>
```

**State**:
```jsx
const [requiresContentReview, setRequiresContentReview] = useState(true);
```

**Estimated Time**: 1 hour

#### Task 3.2: Collaboration Details Form (Before Checkout)
**File**: `frontend/src/components/CampaignCart.jsx`

**Location**: After content review selection, before checkout button

**Component**:
```jsx
{/* Collaboration Details - Before Payment */}
<div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-3xl">
  <h3 className="text-lg font-bold text-dark mb-2">Collaboration Details</h3>
  <p className="text-sm text-gray-600 mb-4">
    Write instructions, brief, guidelines, rules, and expectations.
    The creator sees this the moment the collaboration activates.
  </p>

  <div className="space-y-4">
    {/* What do you want the creator to do? - Required */}
    <div>
      <label className="block text-sm font-medium text-dark mb-2">
        What do you want the creator to do? <span className="text-red-500">*</span>
      </label>
      <textarea
        value={collaborationBrief}
        onChange={(e) => setCollaborationBrief(e.target.value)}
        placeholder="Describe what you want the creator to do in this collaboration..."
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
        required
      />
    </div>

    {/* Brief & Guidelines - Required */}
    <div>
      <label className="block text-sm font-medium text-dark mb-2">
        Brief &amp; Guidelines <span className="text-red-500">*</span>
      </label>
      <textarea
        value={collaborationGuidelines}
        onChange={(e) => setCollaborationGuidelines(e.target.value)}
        placeholder="Key messages, tone, dos and don'ts, hashtags, tags, links..."
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px]"
        required
      />
    </div>

    {/* Rules & Expectations - Optional */}
    <div>
      <label className="block text-sm font-medium text-dark mb-2">
        Rules &amp; Expectations <span className="text-gray-400">(Optional)</span>
      </label>
      <textarea
        value={collaborationRules}
        onChange={(e) => setCollaborationRules(e.target.value)}
        placeholder="Deadlines, format, dimensions, compliance..."
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
      />
    </div>

    {/* Additional Notes - Optional */}
    <div>
      <label className="block text-sm font-medium text-dark mb-2">
        Additional Notes <span className="text-gray-400">(Optional)</span>
      </label>
      <textarea
        value={collaborationNotes}
        onChange={(e) => setCollaborationNotes(e.target.value)}
        placeholder="Anything else the creator should know..."
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
      />
    </div>
  </div>
</div>
```

**State**:
```jsx
const [collaborationBrief, setCollaborationBrief] = useState('');
const [collaborationGuidelines, setCollaborationGuidelines] = useState('');
const [collaborationRules, setCollaborationRules] = useState('');
const [collaborationNotes, setCollaborationNotes] = useState('');
```

**Validation Before Checkout**:
```jsx
const validateCollaborationDetails = () => {
  if (!collaborationBrief.trim()) {
    toast.error('Please describe what you want the creator to do');
    return false;
  }
  if (!collaborationGuidelines.trim()) {
    toast.error('Please provide brief and guidelines');
    return false;
  }
  return true;
};

const handleCheckout = () => {
  if (!validateCollaborationDetails()) return;

  // Proceed to payment modal with collaboration details
  openPaymentModal({
    requires_content_review: requiresContentReview,
    collaboration_details: {
      brief: collaborationBrief,
      guidelines: collaborationGuidelines,
      rules: collaborationRules,
      additional_notes: collaborationNotes
    }
  });
};
```

**Estimated Time**: 2 hours

---

### Phase 4: Frontend - Display to Creator (1 hour)
**Why Fourth**: Show the data we're now collecting.

#### Task 4.1: Display Collaboration Details in CollaborationDetails.jsx
**File**: `frontend/src/pages/CollaborationDetails.jsx`

**Location**: Top of collaboration details page (for creator) or in "Your Instructions" section (for brand)

**Component**:
```jsx
{/* Collaboration Brief - Visible to Creator */}
{user.user_type === 'creator' && (
  <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-3xl">
    <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
      </svg>
      Collaboration Brief
    </h3>

    <div className="space-y-4">
      {collaboration.brief && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">What to Do</p>
          <p className="text-sm text-dark whitespace-pre-wrap">{collaboration.brief}</p>
        </div>
      )}

      {collaboration.guidelines && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Brief &amp; Guidelines</p>
          <p className="text-sm text-dark whitespace-pre-wrap">{collaboration.guidelines}</p>
        </div>
      )}

      {collaboration.rules && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Rules &amp; Expectations</p>
          <p className="text-sm text-dark whitespace-pre-wrap">{collaboration.rules}</p>
        </div>
      )}

      {collaboration.additional_notes && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Additional Notes</p>
          <p className="text-sm text-dark whitespace-pre-wrap">{collaboration.additional_notes}</p>
        </div>
      )}
    </div>
  </div>
)}

{/* Brand View - Your Instructions */}
{user.user_type === 'brand' && (
  <div className="mb-6 p-6 bg-light border border-gray-200 rounded-3xl">
    <h3 className="text-lg font-bold text-dark mb-4">Your Instructions</h3>
    {/* Same content as creator view */}
  </div>
)}
```

**Estimated Time**: 1 hour

---

### Phase 5: Backend - 3-Day Auto-Complete (1 hour)
**Why Fifth**: Depends on content review flow being established.

#### Task 5.1: Create Celery Beat Task
**File**: `backend/app/tasks/collaboration_tasks.py`

**Task**:
```python
from celery import shared_task
from datetime import datetime, timedelta
from app import db
from app.models import Collaboration, WalletTransaction
from sqlalchemy import and_

@shared_task
def auto_complete_collaborations():
    """
    Auto-complete collaborations after 3 days of no brand response.

    Criteria:
    - Status: in_progress
    - Progress: 100% (all deliverables approved/submitted)
    - auto_complete_eligible_at is 3+ days ago
    - Not already completed
    """
    three_days_ago = datetime.utcnow() - timedelta(days=3)

    eligible_collaborations = Collaboration.query.filter(
        and_(
            Collaboration.status == 'in_progress',
            Collaboration.progress_percentage >= 100,
            Collaboration.auto_complete_eligible_at <= three_days_ago,
            Collaboration.actual_completion_date.is_(None)
        )
    ).all()

    for collaboration in eligible_collaborations:
        try:
            # Mark as completed
            collaboration.status = 'completed'
            collaboration.actual_completion_date = datetime.utcnow()
            collaboration.progress_percentage = 100

            # Release escrow to creator
            if collaboration.escrow_status == 'escrowed':
                creator_wallet = collaboration.creator.wallet
                creator_wallet.balance += collaboration.amount

                # Record wallet transaction
                transaction = WalletTransaction(
                    wallet_id=creator_wallet.id,
                    transaction_type='credit',
                    amount=collaboration.amount,
                    description=f'Payment released (auto-completed) - {collaboration.title}',
                    reference_type='collaboration',
                    reference_id=collaboration.id,
                    status='completed'
                )
                db.session.add(transaction)

                collaboration.escrow_status = 'released'

            db.session.commit()

            # Send notifications
            from app.utils.notifications import notify_collaboration_completed
            notify_collaboration_completed(
                collaboration_id=collaboration.id,
                auto_completed=True
            )

        except Exception as e:
            db.session.rollback()
            print(f"Error auto-completing collaboration {collaboration.id}: {e}")
            continue

    return f"Auto-completed {len(eligible_collaborations)} collaborations"
```

**Estimated Time**: 45 mins

#### Task 5.2: Register Celery Beat Schedule
**File**: `backend/celery_config.py`

**Add**:
```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    # ... existing tasks ...
    'auto-complete-collaborations': {
        'task': 'app.tasks.collaboration_tasks.auto_complete_collaborations',
        'schedule': crontab(hour='*/6'),  # Run every 6 hours
    },
}
```

**Estimated Time**: 15 mins

#### Task 5.3: Set auto_complete_eligible_at When Deliverable Approved
**File**: `backend/app/routes/collaborations.py`

**In approve deliverable endpoint**:
```python
@bp.route('/<int:collab_id>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_deliverable(collab_id, deliverable_id):
    # ... existing code ...

    deliverable.status = 'approved'

    # Check if all deliverables are now approved
    all_approved = all(d.status == 'approved' for d in collaboration.package_deliverables)

    if all_approved:
        collaboration.progress_percentage = 100
        # Set eligible for auto-complete in 3 days
        collaboration.auto_complete_eligible_at = datetime.utcnow()

    db.session.commit()
    # ... rest of code ...
```

**Estimated Time**: 15 mins (already in endpoint, just add 2 lines)

---

### Phase 6: Update Content Review Flow Logic (1 hour)
**Why Sixth**: Now that we have `requires_content_review` field, conditionally show review UI.

#### Task 6.1: Conditional UI in CollaborationDetails.jsx
**File**: `frontend/src/pages/CollaborationDetails.jsx`

**Changes**:
```jsx
{/* Show different UI based on requires_content_review */}
{collaboration.requires_content_review ? (
  // YES PATH - Show review workflow
  <div>
    {/* Submit for Review button */}
    {/* Approve/Revise buttons */}
    {/* Draft deliverables section */}
  </div>
) : (
  // NO PATH - Show direct post workflow
  <div>
    {/* Post Live & Submit URL button */}
    {/* No review, just sync metrics */}
  </div>
)}
```

**Estimated Time**: 1 hour

---

## Total Implementation Time

| Phase | Task | Time |
|-------|------|------|
| Phase 1 | Database schema | 30 mins |
| Phase 2 | Backend endpoints | 1.5 hours |
| Phase 3 | Frontend cart flow | 3 hours |
| Phase 4 | Frontend display | 1 hour |
| Phase 5 | Auto-complete task | 1 hour |
| Phase 6 | Conditional UI | 1 hour |
| **TOTAL** | | **8 hours** |

**Realistic estimate with testing**: **1 full work day (8-10 hours)**

---

## Implementation Checklist

### Phase 1: Database ✅
- [ ] Add fields to Collaboration model
- [ ] Create migration script
- [ ] Run migration on local DB
- [ ] Test migration rollback

### Phase 2: Backend ✅
- [ ] Update bookings checkout endpoint
- [ ] Update Collaboration.to_dict() method
- [ ] Add validation for required fields
- [ ] Test with Postman/curl

### Phase 3: Frontend Cart ✅
- [ ] Add content review radio buttons
- [ ] Add collaboration details form
- [ ] Add state management
- [ ] Add validation before checkout
- [ ] Update payment modal to accept new data
- [ ] Test cart flow end-to-end

### Phase 4: Frontend Display ✅
- [ ] Add brief display for creators
- [ ] Add brief display for brands
- [ ] Test display with long text
- [ ] Test display with empty fields

### Phase 5: Auto-Complete ✅
- [ ] Create Celery task
- [ ] Register in beat schedule
- [ ] Update approve deliverable endpoint
- [ ] Test task manually
- [ ] Verify escrow release
- [ ] Verify notifications sent

### Phase 6: Conditional UI ✅
- [ ] Add conditional rendering in CollaborationDetails
- [ ] Test YES path (review before posting)
- [ ] Test NO path (post directly)
- [ ] Verify locked after activation

---

## Testing Checklist

### End-to-End Flow Test
1. [ ] Brand adds package to cart
2. [ ] Brand selects "Yes - Review before posting"
3. [ ] Brand fills collaboration details (all 4 fields)
4. [ ] Brand proceeds to checkout
5. [ ] Brand pays with wallet/SmilePay
6. [ ] Collaboration activates
7. [ ] Creator sees brief immediately
8. [ ] Creator submits draft deliverable
9. [ ] Brand reviews - approves
10. [ ] System sets auto_complete_eligible_at
11. [ ] Wait 3 days (or manually trigger task)
12. [ ] Collaboration auto-completes
13. [ ] Payment released to creator wallet

### Edge Cases
- [ ] Empty required fields → validation error
- [ ] Very long text in fields → displays correctly
- [ ] Switch between Yes/No → state updates
- [ ] Cancel during collaboration details → state resets
- [ ] Creator declines after details entered → refund + data preserved

---

## Deployment Plan

1. **Database Migration First**:
   ```bash
   ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python migrations/add_collaboration_details_fields.py"
   ```

2. **Backend Deployment**:
   - Upload modified files
   - Restart Gunicorn

3. **Frontend Deployment**:
   - Build locally
   - Upload dist via tar.gz
   - Restart Apache

4. **Verify Celery Beat**:
   ```bash
   ssh root@173.212.245.22 "systemctl status celery-beat"
   ```

---

**Status**: Ready to implement
**Estimated Time**: 1 full work day
**Next Step**: Start Phase 1 - Database schema changes
