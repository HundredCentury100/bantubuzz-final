# Collaboration Enhancements Implementation Plan
**Date**: April 24, 2026
**Features**: Cancellation System, Milestone Countdown Timer, Deadline Extensions

---

## Executive Summary

This document outlines the implementation plan for three critical collaboration features:
1. **Structured Cancellation System** with reasons, evidence, and penalties
2. **Milestone Countdown Timer** with real-time tracking and reminders
3. **Deadline Extension Request** workflow for both parties

Based on codebase analysis, here's what exists and what needs to be built:

---

## Part 1: Collaboration Cancellation System

### Current Implementation Status

#### ✅ **What Exists:**

**Backend (Database & Models)**
- ✅ `collaborations.cancelled_by_creator` - BOOLEAN flag
- ✅ `collaborations.cancellation_reason` - TEXT field (free text)
- ✅ `collaborations.cancelled_at` - TIMESTAMP
- ✅ `creator_profiles.cancelled_collaborations_count` - INTEGER counter
- ✅ `creator_profiles.rating_penalty` - DECIMAL(3,2) (max -0.50)
- ✅ Migration file: `add_collaboration_cancellation_fields.sql`
- ✅ Indexes created for performance

**Backend (API Endpoints)**
- ✅ `POST /api/collaborations/<id>/cancel` - Creator cancellation endpoint (lines 1238-1326 in collaborations.py)
  - Applies automatic -0.10 rating penalty (capped at -0.50)
  - Sends email notification to brand
  - Requires minimum 10-character reason
  - Updates cancellation counter
- ✅ `POST /api/collaborations/<id>/cancel-request` - Brand cancellation endpoint (lines 1082-1235)
  - Creates formal Dispute record with reference (e.g., `DSP-ABC123`)
  - Requires minimum 20-character reason
  - Notifies all admins
  - Status: 'pending' awaiting admin approval
- ✅ Email notifications for cancellations (via `EmailService.send_collaboration_cancelled_email()`)
- ✅ In-app notifications via `notify_collaboration_status()`

**Admin Features**
- ✅ Disputes system exists (`app/models/dispute.py`)
- ✅ Admin can view cancellation disputes
- ✅ Cancellation data surfaced in admin reports

#### ❌ **What's Missing:**

**Backend**
- ❌ **Structured cancellation reasons** (currently just free text)
  - No primary reason dropdown
  - No sub-checkboxes for specific issues
  - No validation for reason types
- ❌ **Cancellation reason tables** in database
  - Need `collaboration_cancellation_reasons` table
  - Need `cancellation_reason_details` table (for checkboxes)
- ❌ **Evidence URLs** storage
  - Currently only stored in Dispute model
  - Should be in collaboration record too
- ❌ **Refund calculation logic** for partial milestone completion
  - No calculation of completed milestones value
  - No automatic refund based on progress
- ❌ **Brand penalty logic** (only creator penalties exist)
- ❌ **Repeat cancellation threshold** detection and auto-flagging

**Frontend**
- ❌ **Cancellation modal** with structured reasons
  - No dropdown for primary reason selection
  - No conditional checkboxes based on reason
  - No evidence URL upload fields
  - No preview of penalty/refund before confirming
- ❌ **Different UIs** for creator vs brand cancellation
- ❌ **Cancellation warnings** (rating impact, refund amount display)

**Admin**
- ❌ **Cancellation review panel** (approve/reduce/waive penalties)
- ❌ **Pattern detection** for repeat cancellers
- ❌ **Cancellation analytics dashboard widget**

---

###  Implementation Requirements

#### 1.1 Database Schema Changes

**New Tables:**

```sql
-- Cancellation reasons (predefined taxonomy)
CREATE TABLE collaboration_cancellation_reasons (
    id SERIAL PRIMARY KEY,
    collaboration_id INTEGER REFERENCES collaborations(id) NOT NULL,
    cancelled_by VARCHAR(20) NOT NULL, -- 'creator' or 'brand'
    primary_reason VARCHAR(100) NOT NULL, -- e.g., 'brief_changed', 'unresponsive', etc.
    sub_reasons JSONB, -- Array of selected checkboxes
    free_text TEXT, -- For 'Other' option (min 20 chars)
    evidence_urls JSONB, -- Array of evidence URLs
    refund_amount DECIMAL(10, 2), -- Calculated refund for brand cancellations
    penalty_applied DECIMAL(3, 2), -- Rating penalty applied (if any)
    penalty_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'upheld', 'reduced', 'waived'
    admin_review_notes TEXT,
    reviewed_by_admin_id INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cancellation_reasons_collaboration ON collaboration_cancellation_reasons(collaboration_id);
CREATE INDEX idx_cancellation_reasons_user ON collaboration_cancellation_reasons(cancelled_by);
CREATE INDEX idx_cancellation_reasons_primary ON collaboration_cancellation_reasons(primary_reason);
```

**Modify Existing:**

```sql
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS cancellation_refund_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS cancellation_evidence_urls JSONB;
```

#### 1.2 Backend Implementation

**File**: `backend/app/models/collaboration_cancellation.py` (NEW)

```python
class CollaborationCancellationReason(db.Model):
    __tablename__ = 'collaboration_cancellation_reasons'

    # Define primary reasons
    CREATOR_REASONS = {
        'niche_mismatch': {
            'label': 'Does not align with my niche, brand, personality or values',
            'sub_options': ['niche', 'brand_identity', 'personality', 'values', 'content_style', 'audience_fit']
        },
        'brief_changed': {
            'label': 'Brand changed brief or added requirements',
            'sub_options': ['deliverables_changed', 'timeline_shortened', 'platforms_added', 'requirements_different']
        },
        'other': {
            'label': 'Other (please specify)',
            'sub_options': []
        }
    }

    BRAND_REASONS = {
        'creator_misaligned': {
            'label': 'Creator no longer aligns with our brand',
            'sub_options': ['values', 'brand_identity', 'content_style', 'audience_fit']
        },
        'unresponsive': {
            'label': 'Creator unresponsive',
            'sub_options': ['no_messages', 'no_deliverables', 'no_revision_ack']
        },
        'missed_deadline': {
            'label': 'Not delivering within agreed timeline',
            'sub_options': ['missed_milestone', 'unreasonable_extension', 'not_started']
        },
        'unprofessional': {
            'label': 'Unprofessional behaviour',
            'sub_options': ['off_platform', 'payment_outside', 'rude_harassing']
        },
        'other': {
            'label': 'Other (please specify)',
            'sub_options': []
        }
    }
```

**File**: `backend/app/routes/collaborations.py` (UPDATE)

Update `/cancel` and `/cancel-request` endpoints to:
1. Accept structured reason data (primary_reason + sub_reasons + free_text)
2. Validate at least one sub-reason selected (if applicable)
3. Validate free_text minimum 20 chars for 'Other'
4. Store evidence URLs
5. Calculate refund amount based on milestone completion
6. Create `CollaborationCancellationReason` record
7. Apply conditional penalty logic

#### 1.3 Frontend Implementation

**File**: `frontend/src/components/CancellationModal.jsx` (NEW)

```jsx
const CancellationModal = ({ collaboration, userType, onCancel, onConfirm }) => {
  // Show different reasons based on userType ('creator' | 'brand')
  // Display conditional checkboxes when primary reason selected
  // Show estimated refund/penalty before confirmation
  // Validate: at least one sub-reason OR free text (min 20 chars)
  // Allow evidence URL uploads
};
```

**Updates Needed:**
- `frontend/src/pages/CollaborationDetails.jsx` - Add cancel button + modal
- Show warning banner before cancellation
- Display refund calculation preview (for brands)
- Display penalty impact preview (for creators)

#### 1.4 Admin Interface Updates

**File**: `frontend/src/pages/admin/CancellationReview.jsx` (NEW)

- List all pending cancellations
- Show full cancellation details (reason, sub-reasons, evidence, message history)
- Action panel: Uphold / Reduce / Waive penalty
- Require admin note when making decision
- Auto-flag patterns (3+ cancellations in 60 days)

**File**: `backend/app/routes/admin/collaborations.py` (UPDATE)

Add endpoints:
- `GET /api/admin/cancellations` - List all cancellations with filters
- `POST /api/admin/cancellations/<id>/review` - Uphold/reduce/waive penalty
- `GET /api/admin/cancellations/stats` - Cancellation analytics

---

## Part 2: Milestone Countdown Timer

### Current Implementation Status

#### ✅ **What Exists:**

**Database**
- ✅ `collaboration_milestones.due_date` - DATE field (not datetime)
- ✅ Milestone model exists with status tracking
- ✅ Escrow release countdown (14 days after approval)

**Backend**
- ✅ Milestone creation with due_date
- ✅ Basic milestone CRUD operations

#### ❌ **What's Missing:**

**Database**
- ❌ `due_date` is DATE not DATETIME WITH TIMEZONE (no time/timezone support)
- ❌ No `deadline_at` field (precise timestamp)
- ❌ No `overdue` flag
- ❌ No `last_reminder_sent_at` tracking
- ❌ No extension tracking fields

**Backend**
- ❌ No countdown timer API endpoint
- ❌ No reminder system (14 days, 7 days, 24h, 12h, overdue)
- ❌ No Celery tasks for scheduled reminders
- ❌ No overdue detection logic
- ❌ No email templates for deadline reminders

**Frontend**
- ❌ No real-time countdown timer component
- ❌ No visual state changes (normal → warning → critical → overdue)
- ❌ No WebSocket integration for live updates

---

### Implementation Requirements

#### 2.1 Database Schema Changes

```sql
-- Modify collaboration_milestones table
ALTER TABLE collaboration_milestones
DROP COLUMN due_date, -- Remove old DATE field
ADD COLUMN deadline_at TIMESTAMP WITH TIME ZONE, -- Precise deadline with timezone
ADD COLUMN is_overdue BOOLEAN DEFAULT FALSE,
ADD COLUMN overdue_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_level VARCHAR(20); -- '14_days', '7_days', '24_hours', '12_hours', 'overdue'

CREATE INDEX idx_milestone_deadline ON collaboration_milestones(deadline_at) WHERE deadline_at IS NOT NULL;
CREATE INDEX idx_milestone_overdue ON collaboration_milestones(is_overdue, deadline_at);
```

#### 2.2 Backend Implementation

**File**: `backend/app/tasks/milestone_reminders.py` (NEW)

```python
from celery import shared_task
from datetime import datetime, timedelta
from app.models import CollaborationMilestone, User
from app.services.email_service import EmailService
from app.utils.notifications import notify_milestone_reminder

@shared_task
def check_milestone_deadlines():
    """
    Celery task that runs every hour to check milestone deadlines
    and send reminders at configured intervals
    """
    now = datetime.utcnow()

    # Check for 14-day reminders
    deadline_14d = now + timedelta(days=14)
    milestones_14d = CollaborationMilestone.query.filter(
        CollaborationMilestone.deadline_at.between(now, deadline_14d),
        CollaborationMilestone.status.in_(['pending', 'in_progress']),
        CollaborationMilestone.reminder_level != '14_days'
    ).all()

    for milestone in milestones_14d:
        send_deadline_reminder(milestone, '14_days')

    # Repeat for 7_days, 24_hours, 12_hours
    # Check for overdue
    overdue_milestones = CollaborationMilestone.query.filter(
        CollaborationMilestone.deadline_at < now,
        CollaborationMilestone.is_overdue == False,
        CollaborationMilestone.status.in_(['pending', 'in_progress'])
    ).all()

    for milestone in overdue_milestones:
        mark_milestone_overdue(milestone)
```

**File**: `backend/app/routes/milestones.py` (UPDATE)

Add endpoint:
```python
@bp.route('/<int:milestone_id>/countdown', methods=['GET'])
@jwt_required()
def get_milestone_countdown(milestone_id):
    """
    Returns real-time countdown data for a milestone
    """
    milestone = CollaborationMilestone.query.get(milestone_id)

    if not milestone.deadline_at:
        return jsonify({'error': 'No deadline set'}), 404

    now = datetime.utcnow()
    time_remaining = milestone.deadline_at - now

    return jsonify({
        'deadline_at': milestone.deadline_at.isoformat(),
        'is_overdue': milestone.is_overdue,
        'time_remaining_seconds': max(0, int(time_remaining.total_seconds())),
        'time_elapsed_seconds': max(0, int(-time_remaining.total_seconds())) if milestone.is_overdue else 0,
        'state': get_timer_state(time_remaining),
        'formatted': format_countdown(time_remaining)
    })

def get_timer_state(time_remaining):
    """Determine visual state based on time remaining"""
    hours = time_remaining.total_seconds() / 3600

    if hours < 0:
        return 'overdue'
    elif hours < 12:
        return 'critical'
    elif hours < 24:
        return 'warning'
    else:
        return 'normal'
```

#### 2.3 Frontend Implementation

**File**: `frontend/src/components/MilestoneCountdownTimer.jsx` (NEW)

```jsx
import { useState, useEffect } from 'react';

const MilestoneCountdownTimer = ({ milestone }) => {
  const [timeData, setTimeData] = useState(null);
  const [state, setState] = useState('normal');

  useEffect(() => {
    // Fetch initial countdown data
    fetchCountdown();

    // Update every second
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [milestone.id]);

  const updateCountdown = () => {
    // Calculate time remaining client-side for real-time updates
    const deadline = new Date(milestone.deadline_at);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      setState('overdue');
      const elapsed = Math.abs(diff);
      setTimeData({ elapsed, overdue: true });
    } else {
      const hours = diff / (1000 * 60 * 60);
      if (hours < 12) setState('critical');
      else if (hours < 24) setState('warning');
      else setState('normal');

      setTimeData({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    }
  };

  return (
    <div className={`countdown-timer state-${state}`}>
      {timeData?.overdue ? (
        <div className="overdue-indicator pulse">
          ⚠️ OVERDUE: {formatElapsed(timeData.elapsed)}
        </div>
      ) : (
        <div className="countdown-display">
          <span>{timeData?.days}d</span>
          <span>{timeData?.hours}h</span>
          <span>{timeData?.minutes}m</span>
          <span className="seconds">{timeData?.seconds}s</span>
        </div>
      )}
    </div>
  );
};
```

**Styling States**:
```css
.countdown-timer.state-normal { color: #22c55e; }
.countdown-timer.state-warning { color: #f59e0b; }
.countdown-timer.state-critical {
  color: #ef4444;
  animation: pulse 1s infinite;
}
.countdown-timer.state-overdue {
  color: #dc2626;
  font-weight: bold;
}
```

#### 2.4 Notification System

**Email Templates** (need to create):
- `milestone_reminder_14_days.html`
- `milestone_reminder_7_days.html`
- `milestone_reminder_24_hours.html` (urgent tone)
- `milestone_reminder_12_hours.html` (critical - last chance)
- `milestone_overdue.html`

**Celery Configuration**:
```python
# backend/celery_config.py
beat_schedule = {
    'check-milestone-deadlines': {
        'task': 'app.tasks.milestone_reminders.check_milestone_deadlines',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    }
}
```

---

## Part 3: Deadline Extension Request

### Current Implementation Status

#### ✅ **What Exists:**
- ✅ Milestone due_date field (can be updated manually)

#### ❌ **What's Missing:**
- ❌ **Everything** - this feature doesn't exist at all

**No database tables, no API endpoints, no frontend UI**

---

### Implementation Requirements

#### 3.1 Database Schema

**New Table:**

```sql
CREATE TABLE milestone_extension_requests (
    id SERIAL PRIMARY KEY,
    collaboration_milestone_id INTEGER REFERENCES collaboration_milestones(id) NOT NULL,
    requested_by_user_id INTEGER REFERENCES users(id) NOT NULL,
    requested_by_party VARCHAR(10) NOT NULL, -- 'creator' or 'brand'

    -- Request details
    current_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    proposed_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(100) NOT NULL, -- e.g., 'need_more_time', 'waiting_on_assets'
    notes TEXT,

    -- Response
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    responded_by_user_id INTEGER REFERENCES users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,

    -- Tracking
    flagged_for_admin_review BOOLEAN DEFAULT FALSE, -- Auto-flag if brand declines 'waiting_on_assets'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_deadline_extension CHECK (proposed_deadline > current_deadline),
    CONSTRAINT minimum_24h_extension CHECK (proposed_deadline >= current_deadline + INTERVAL '24 hours')
);

CREATE INDEX idx_extension_requests_milestone ON milestone_extension_requests(collaboration_milestone_id);
CREATE INDEX idx_extension_requests_status ON milestone_extension_requests(status);
CREATE INDEX idx_extension_requests_flagged ON milestone_extension_requests(flagged_for_admin_review) WHERE flagged_for_admin_review = TRUE;
```

#### 3.2 Backend Implementation

**File**: `backend/app/models/milestone_extension.py` (NEW)

```python
class MilestoneExtensionRequest(db.Model):
    __tablename__ = 'milestone_extension_requests'

    CREATOR_REASONS = {
        'need_more_time': 'I need more time to produce quality content',
        'technical_issue': 'I experienced a technical issue',
        'scope_increased': 'The brief required more work than originally scoped',
        'waiting_on_brand': 'I am waiting on assets or information from the brand',
        'personal': 'Personal or health reasons',
        'other': 'Other'
    }

    BRAND_REASONS = {
        'review_needed': 'We need to review the brief before creator proceeds',
        'approvals_pending': 'We are waiting on internal approvals',
        'campaign_shifted': 'The campaign timeline has shifted',
        'assets_delayed': 'We need to provide additional assets/information',
        'other': 'Other'
    }

    def to_dict(self):
        return {
            'id': self.id,
            'milestone_id': self.collaboration_milestone_id,
            'requested_by': self.requested_by_party,
            'current_deadline': self.current_deadline.isoformat(),
            'proposed_deadline': self.proposed_deadline.isoformat(),
            'reason': self.reason,
            'notes': self.notes,
            'status': self.status,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'response_notes': self.response_notes,
            'flagged_for_admin_review': self.flagged_for_admin_review,
            'created_at': self.created_at.isoformat()
        }
```

**File**: `backend/app/routes/milestones.py` (UPDATE)

```python
@bp.route('/<int:milestone_id>/request-extension', methods=['POST'])
@jwt_required()
def request_milestone_extension(milestone_id):
    """
    Request deadline extension for a milestone

    Body:
    {
        "proposed_deadline": "2026-05-01T14:30:00Z",
        "reason": "need_more_time",
        "notes": "Optional explanation"
    }
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    milestone = CollaborationMilestone.query.get(milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404

    # Check milestone is not already overdue
    if milestone.is_overdue:
        return jsonify({'error': 'Cannot request extension for overdue milestone'}), 400

    data = request.get_json()
    proposed_deadline = datetime.fromisoformat(data['proposed_deadline'].replace('Z', '+00:00'))

    # Validate: at least 24 hours from now
    if proposed_deadline < datetime.utcnow() + timedelta(hours=24):
        return jsonify({'error': 'Proposed deadline must be at least 24 hours from now'}), 400

    # Determine party
    collaboration = milestone.collaboration
    if user.user_type == 'creator':
        party = 'creator'
        recipient_user = User.query.get(collaboration.brand.user_id)
    else:
        party = 'brand'
        recipient_user = User.query.get(collaboration.creator.user_id)

    # Create extension request
    extension = MilestoneExtensionRequest(
        collaboration_milestone_id=milestone.id,
        requested_by_user_id=user_id,
        requested_by_party=party,
        current_deadline=milestone.deadline_at,
        proposed_deadline=proposed_deadline,
        reason=data['reason'],
        notes=data.get('notes'),
        status='pending'
    )
    db.session.add(extension)

    # Auto-flag if creator selects 'waiting_on_brand'
    if party == 'creator' and data['reason'] == 'waiting_on_brand':
        extension.flagged_for_admin_review = True

    db.session.commit()

    # Notify recipient on all channels
    notify_extension_request(recipient_user.id, milestone, extension)
    send_extension_request_email(recipient_user.email, milestone, extension)
    send_extension_request_push(recipient_user.id, milestone, extension)

    return jsonify({
        'success': True,
        'message': 'Extension request submitted',
        'extension': extension.to_dict()
    }), 201


@bp.route('/extensions/<int:extension_id>/respond', methods=['POST'])
@jwt_required()
def respond_to_extension(extension_id):
    """
    Accept or decline extension request

    Body:
    {
        "action": "accept" | "decline",
        "notes": "Optional note"
    }
    """
    user_id = int(get_jwt_identity())

    extension = MilestoneExtensionRequest.query.get(extension_id)
    if not extension:
        return jsonify({'error': 'Extension request not found'}), 404

    if extension.status != 'pending':
        return jsonify({'error': 'Extension request already responded to'}), 400

    # Verify user is the recipient
    milestone = extension.milestone
    collaboration = milestone.collaboration

    if extension.requested_by_party == 'creator':
        # Brand must respond
        if not user.brand_profile or collaboration.brand_id != user.brand_profile[0].id:
            return jsonify({'error': 'Unauthorized'}), 403
    else:
        # Creator must respond
        if not user.creator_profile or collaboration.creator_id != user.creator_profile[0].id:
            return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    action = data['action']

    extension.status = 'accepted' if action == 'accept' else 'declined'
    extension.responded_by_user_id = user_id
    extension.responded_at = datetime.utcnow()
    extension.response_notes = data.get('notes')

    if action == 'accept':
        # Update milestone deadline
        old_deadline = milestone.deadline_at
        milestone.deadline_at = extension.proposed_deadline

        # Reset overdue flags if any
        milestone.is_overdue = False
        milestone.overdue_at = None
        milestone.last_reminder_sent_at = None
        milestone.reminder_level = None

        message = f"Extension approved. Deadline moved from {old_deadline} to {milestone.deadline_at}"
    else:
        message = "Extension request declined"

        # Flag for admin review if brand declined 'waiting_on_brand'
        if extension.requested_by_party == 'creator' and extension.reason == 'waiting_on_brand':
            extension.flagged_for_admin_review = True

            # Notify admin
            admins = User.query.filter_by(user_type='admin').all()
            for admin in admins:
                notify_extension_flagged(admin.id, extension)

    db.session.commit()

    # Notify requester
    requester = User.query.get(extension.requested_by_user_id)
    notify_extension_response(requester.id, extension, action)

    return jsonify({
        'success': True,
        'message': message,
        'extension': extension.to_dict(),
        'milestone': milestone.to_dict()
    }), 200
```

#### 3.3 Frontend Implementation

**File**: `frontend/src/components/ExtensionRequestModal.jsx` (NEW)

```jsx
const ExtensionRequestModal = ({ milestone, userType, onClose, onSubmit }) => {
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const reasons = userType === 'creator'
    ? CREATOR_EXTENSION_REASONS
    : BRAND_EXTENSION_REASONS;

  const minDeadline = new Date();
  minDeadline.setHours(minDeadline.getHours() + 24);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    if (new Date(proposedDeadline) < minDeadline) {
      toast.error('Proposed deadline must be at least 24 hours from now');
      return;
    }

    await onSubmit({ proposedDeadline, reason, notes });
  };

  return (
    <Modal>
      <h2>Request Deadline Extension</h2>
      <p>Current Deadline: {formatDeadline(milestone.deadline_at)}</p>

      <DateTimePicker
        label="Proposed New Deadline"
        value={proposedDeadline}
        onChange={setProposedDeadline}
        min={minDeadline.toISOString()}
      />

      <Select label="Reason" value={reason} onChange={setReason}>
        {Object.entries(reasons).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </Select>

      {reason === 'other' && (
        <TextArea
          label="Please explain"
          value={notes}
          onChange={setNotes}
          minLength={20}
          required
        />
      )}

      {reason === 'waiting_on_brand' && userType === 'creator' && (
        <Alert type="info">
          This will be flagged for admin review if the brand declines.
        </Alert>
      )}

      <Button onClick={handleSubmit}>Submit Request</Button>
    </Modal>
  );
};
```

**File**: `frontend/src/components/ExtensionRequestCard.jsx` (NEW)

```jsx
const ExtensionRequestCard = ({ extension, canRespond, onRespond }) => {
  return (
    <div className="extension-request-card">
      <div className="header">
        <Badge status={extension.status} />
        <span>Requested by {extension.requested_by}</span>
      </div>

      <div className="details">
        <div className="deadline-change">
          <div className="old-deadline">
            <label>Current:</label>
            {formatDeadline(extension.current_deadline)}
          </div>
          <ArrowRight />
          <div className="new-deadline">
            <label>Proposed:</label>
            {formatDeadline(extension.proposed_deadline)}
          </div>
        </div>

        <div className="reason">
          <strong>Reason:</strong> {getReasonLabel(extension.reason)}
        </div>

        {extension.notes && (
          <div className="notes">
            <strong>Notes:</strong>
            <p>{extension.notes}</p>
          </div>
        )}
      </div>

      {canRespond && extension.status === 'pending' && (
        <div className="actions">
          <Button
            variant="success"
            onClick={() => onRespond('accept')}
          >
            Accept Extension
          </Button>
          <Button
            variant="danger"
            onClick={() => onRespond('decline')}
          >
            Decline
          </Button>
        </div>
      )}

      {extension.status !== 'pending' && (
        <div className="response">
          <Badge status={extension.status} />
          <span>
            {extension.status === 'accepted' ? 'Approved' : 'Declined'}
            {extension.response_notes && `: ${extension.response_notes}`}
          </span>
        </div>
      )}
    </div>
  );
};
```

**Integration in `CollaborationDetails.jsx`**:
- Add "Request Extension" button next to milestone timer
- Show pending extension requests with Accept/Decline actions
- Display extension history for each milestone

---

## Summary of Development Work

### Phase 1: Cancellation System (Est. 3-4 days)
- [ ] Create database tables for structured reasons
- [ ] Update Collaboration model with new fields
- [ ] Build `CollaborationCancellationReason` model
- [ ] Update `/cancel` and `/cancel-request` endpoints
- [ ] Build `CancellationModal.jsx` with structured UI
- [ ] Build admin review panel
- [ ] Create email templates
- [ ] Add refund calculation logic
- [ ] Add pattern detection for repeat cancellers
- [ ] Write unit tests

### Phase 2: Milestone Countdown Timer (Est. 3-4 days)
- [ ] Modify `collaboration_milestones` schema (deadline_at, timezone, overdue flags)
- [ ] Create Celery task for hourly deadline checks
- [ ] Build reminder logic (14d, 7d, 24h, 12h, overdue)
- [ ] Create email templates for reminders
- [ ] Build `/countdown` API endpoint
- [ ] Build `MilestoneCountdownTimer.jsx` component
- [ ] Add CSS animations (pulse, color changes)
- [ ] Integrate WebSocket for real-time updates
- [ ] Add push notification support
- [ ] Write unit tests

### Phase 3: Deadline Extensions (Est. 2-3 days)
- [ ] Create `milestone_extension_requests` table
- [ ] Build `MilestoneExtensionRequest` model
- [ ] Create `/request-extension` and `/respond` endpoints
- [ ] Build `ExtensionRequestModal.jsx`
- [ ] Build `ExtensionRequestCard.jsx`
- [ ] Add extension history display in CollaborationDetails
- [ ] Create email/notification templates
- [ ] Add admin flagging logic (declined 'waiting_on_brand')
- [ ] Add 2-extension cap logic
- [ ] Write unit tests

---

## Testing Checklist

### Cancellation System
- [ ] Creator can cancel with structured reason + checkboxes
- [ ] Brand cancellation creates Dispute record
- [ ] Rating penalty applied correctly (-0.10 per cancellation, max -0.50)
- [ ] Refund calculated based on milestone completion
- [ ] Admin can review and modify penalty
- [ ] Evidence URLs stored correctly
- [ ] Email notifications sent to all parties
- [ ] Repeat canceller detection works (3+ in 60 days)

### Countdown Timer
- [ ] Timer displays correctly in all states (normal, warning, critical, overdue)
- [ ] Timer updates every second
- [ ] Reminders sent at correct intervals
- [ ] Overdue flag set automatically when deadline passes
- [ ] Email/push/in-app notifications work
- [ ] Timezone handling correct for users in different regions

### Extensions
- [ ] Creator can request extension with valid reason
- [ ] Brand can accept/decline extension request
- [ ] Deadline updated when extension accepted
- [ ] 'Waiting on brand' auto-flagged for admin
- [ ] Declined extension logged permanently
- [ ] Cannot request extension after overdue
- [ ] Proposed deadline must be 24+ hours in future
- [ ] Extension history visible in collaboration details

---

## Migration Strategy

1. **Database Migrations** (Run first, in order):
   - `001_add_cancellation_structured_reasons.sql`
   - `002_modify_milestone_deadline_fields.sql`
   - `003_create_extension_requests_table.sql`

2. **Backend Deployment** (Zero downtime):
   - Deploy models first (backward compatible)
   - Deploy new endpoints (versioned API if needed)
   - Deploy Celery tasks
   - Start Celery beat scheduler

3. **Frontend Deployment**:
   - Deploy new components (progressive rollout)
   - A/B test cancellation modal
   - Monitor timer performance

4. **Data Migration**:
   - Migrate existing `cancellation_reason` TEXT to structured format (best effort)
   - Convert existing `due_date` DATE to `deadline_at` TIMESTAMP WITH TIMEZONE (set to end of day UTC)

---

## Open Questions / Product Decisions Needed

1. **Cancellation Penalty Calculation**:
   - Flat -0.10 or variable based on reason/stage?
   - Should "waiting on brand" have reduced/no penalty?

2. **Brand Penalty**:
   - Should brands get trust score impact for cancellations?
   - How does this affect brand subscription benefits?

3. **Escrow and Extensions**:
   - Do extensions reset the 30-day escrow countdown?
   - **Recommendation**: No, escrow starts from approval date only

4. **Timer Performance**:
   - Real-time seconds updates or per-minute outside critical state?
   - **Recommendation**: Seconds only in Critical/Overdue state

5. **Multiple Milestone Timers**:
   - Show all timers or only active milestone?
   - **Recommendation**: Show all for visibility

6. **Cancellation Window**:
   - Allow penalty-free cancellation within X hours of booking?
   - **Recommendation**: 24-hour grace period for both parties

---

**End of Implementation Plan**
