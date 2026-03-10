# Phase 4: Admin Moderation Dashboard - Implementation Plan

**Created**: March 10, 2026
**Purpose**: Implement admin tools to review Trust & Safety reports and take enforcement actions
**Prerequisites**: Phase 1 & 1B complete (message reporting, blocking, safety warnings)
**Timeline**: 8-12 hours

---

## 🎯 Objectives

Make Trust & Safety reports actionable by providing admins with:
1. **Report Review Queue** - View all message reports with context
2. **User Risk Profiles** - See violation history and risk signals
3. **Enforcement Actions** - Warn, restrict, or suspend users
4. **Activity Logging** - Track all admin actions

---

## 📊 Current State Analysis

### What We Have (Phase 1 & 1B Complete)
✅ **Backend**:
- `message_reports` table with conversation-level reports
- `user_blocks` table with blocking relationships
- `safety_warnings` table with warning logs
- Report submission endpoint: `POST /api/messaging/report`
- Block/unblock endpoints working

✅ **Frontend**:
- ReportMessageModal.jsx - Users can report conversations
- BlockUserModal.jsx - Users can block users
- SafetyWarningModal.jsx - Pre-send safety warnings
- BlockedUsers.jsx - Manage blocked users page

### What We Need (Phase 4)

#### Backend:
1. **Admin report review endpoints**:
   - `GET /api/admin/moderation/reports` - List all reports (filterable)
   - `GET /api/admin/moderation/reports/:id` - Get report details
   - `PUT /api/admin/moderation/reports/:id/status` - Update report status
   - `POST /api/admin/moderation/reports/:id/action` - Take enforcement action

2. **Enforcement action endpoints**:
   - `POST /api/admin/moderation/enforce/warn` - Issue warning to user
   - `POST /api/admin/moderation/enforce/restrict` - Restrict messaging
   - `POST /api/admin/moderation/enforce/suspend` - Suspend account

3. **User profile endpoints**:
   - `GET /api/admin/moderation/users/:id/profile` - Get user moderation profile
   - `GET /api/admin/moderation/users/:id/reports` - Get reports involving user
   - `GET /api/admin/moderation/users/:id/violations` - Get violation history

#### Database:
1. **user_violations** table - Track enforcement actions
2. **admin_activity_log** table - Log all admin actions
3. Update **message_reports** table with new status values
4. Add `messaging_restricted_until` field to **users** table

#### Frontend:
1. **Admin Moderation Dashboard** (`/admin/moderation`)
   - Overview metrics (pending reports, total reports, actions taken)
   - Report queue table with filters
   - Click to review report details

2. **Report Review Modal**
   - Show report details (category, description, timestamp)
   - Display reported user info and risk profile
   - Show reporter info
   - Conversation reference
   - Action buttons (warn, restrict, dismiss)

3. **Enforcement Action Modal**
   - Action type selector
   - Duration selector (for temporary restrictions)
   - Reason text field
   - Confirmation step

4. **User Risk Profile View** (bonus)
   - Reports received count
   - Blocks received count
   - Violations history
   - Safety warnings count

---

## 🗄️ Database Schema

### 1. user_violations Table

```sql
CREATE TABLE user_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Violation Details
    violation_type VARCHAR(50) NOT NULL,  -- warning, messaging_restricted, account_suspended
    severity VARCHAR(20) NOT NULL,  -- minor, moderate, severe
    description TEXT NOT NULL,

    -- Source (what triggered this action)
    source_type VARCHAR(50),  -- message_report, admin_action, system_detection
    source_id INTEGER,  -- ID of source (e.g., message_report.id)

    -- Enforcement Action
    action_taken VARCHAR(100) NOT NULL,  -- warning_issued, messaging_restricted_7days, account_suspended_30days
    action_duration_days INTEGER,  -- NULL = permanent, or number of days
    action_expires_at TIMESTAMP,

    -- Admin
    issued_by INTEGER NOT NULL REFERENCES users(id),  -- admin user ID
    notes TEXT,  -- admin's reason for action

    -- Status
    status VARCHAR(30) DEFAULT 'active',  -- active, expired, reversed

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP
);

CREATE INDEX idx_violations_user ON user_violations(user_id);
CREATE INDEX idx_violations_status ON user_violations(status);
CREATE INDEX idx_violations_type ON user_violations(violation_type);
CREATE INDEX idx_violations_expires ON user_violations(action_expires_at);
```

### 2. admin_activity_log Table

```sql
CREATE TABLE admin_activity_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),

    -- Action Details
    action_type VARCHAR(50) NOT NULL,  -- report_reviewed, violation_issued, report_dismissed
    target_type VARCHAR(50),  -- report, user
    target_id INTEGER,  -- ID of target

    -- Action Data (JSON for flexibility)
    action_data JSONB,  -- stores details like {report_id, user_id, action_taken, reason}

    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_type ON admin_activity_log(action_type);
CREATE INDEX idx_admin_activity_target ON admin_activity_log(target_type, target_id);
CREATE INDEX idx_admin_activity_created ON admin_activity_log(created_at DESC);
```

### 3. Update message_reports Table

```sql
-- Add new fields to existing table
ALTER TABLE message_reports
    ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS action_taken VARCHAR(100),  -- warning_issued, messaging_restricted, account_suspended, dismissed, no_action
    ADD COLUMN IF NOT EXISTS action_notes TEXT,
    ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMP;

-- Update status field to allow new values
-- Current values: pending, reviewed, action_taken, dismissed
-- Keep these as they are, just ensure they're enforced
```

### 4. Update users Table (for messaging restrictions)

```sql
-- Add fields to track messaging restrictions
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_messaging_restricted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS messaging_restricted_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_account_suspended BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS account_suspended_until TIMESTAMP;

CREATE INDEX idx_users_messaging_restricted ON users(is_messaging_restricted);
CREATE INDEX idx_users_account_suspended ON users(is_account_suspended);
```

---

## 🔧 Backend Implementation

### File Structure

```
backend/app/routes/admin/
├── __init__.py (existing - register new blueprint)
├── moderation.py (NEW - main moderation endpoints)
└── moderation_enforcement.py (NEW - enforcement action endpoints)

backend/app/services/
└── moderation_service.py (NEW - business logic for moderation)

backend/app/models/
├── user_violation.py (NEW)
└── admin_activity_log.py (NEW)
```

### 1. Models

#### user_violation.py
```python
from app import db
from datetime import datetime

class UserViolation(db.Model):
    __tablename__ = 'user_violations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Violation Details
    violation_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text, nullable=False)

    # Source
    source_type = db.Column(db.String(50))
    source_id = db.Column(db.Integer)

    # Enforcement
    action_taken = db.Column(db.String(100), nullable=False)
    action_duration_days = db.Column(db.Integer)
    action_expires_at = db.Column(db.DateTime)

    # Admin
    issued_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notes = db.Column(db.Text)

    # Status
    status = db.Column(db.String(30), default='active')

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expired_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='violations')
    admin = db.relationship('User', foreign_keys=[issued_by])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'violation_type': self.violation_type,
            'severity': self.severity,
            'description': self.description,
            'action_taken': self.action_taken,
            'action_duration_days': self.action_duration_days,
            'action_expires_at': self.action_expires_at.isoformat() if self.action_expires_at else None,
            'issued_by': self.issued_by,
            'issued_by_name': self.admin.full_name if self.admin else None,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
```

#### admin_activity_log.py
```python
from app import db
from datetime import datetime

class AdminActivityLog(db.Model):
    __tablename__ = 'admin_activity_log'

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Action Details
    action_type = db.Column(db.String(50), nullable=False)
    target_type = db.Column(db.String(50))
    target_id = db.Column(db.Integer)

    # Action Data
    action_data = db.Column(db.JSON)

    # Metadata
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    admin = db.relationship('User', backref='admin_actions')

    def to_dict(self):
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'admin_name': self.admin.full_name if self.admin else None,
            'action_type': self.action_type,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'action_data': self.action_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
```

### 2. Admin Moderation Endpoints

#### backend/app/routes/admin/moderation.py

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.message_report import MessageReport
from app.models.user import User
from app.models.user_violation import UserViolation
from app.models.admin_activity_log import AdminActivityLog
from datetime import datetime
from sqlalchemy import or_, and_

bp = Blueprint('admin_moderation', __name__)

# Middleware to check admin access
def admin_required():
    from functools import wraps
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            if not user or not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper

# Helper: Log admin activity
def log_admin_action(admin_id, action_type, target_type, target_id, action_data):
    try:
        log = AdminActivityLog(
            admin_id=admin_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            action_data=action_data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Error logging admin action: {str(e)}")

# GET /api/admin/moderation/reports - List all message reports
@bp.route('/reports', methods=['GET'])
@admin_required()
def get_reports():
    try:
        # Query parameters for filtering
        status = request.args.get('status')  # pending, reviewed, action_taken, dismissed
        category = request.args.get('category')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Build query
        query = MessageReport.query

        if status:
            query = query.filter(MessageReport.status == status)
        if category:
            query = query.filter(MessageReport.category == category)

        # Order by created_at DESC (newest first)
        query = query.order_by(MessageReport.created_at.desc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        reports = []
        for report in paginated.items:
            reporter = User.query.get(report.reporter_user_id)
            reported_user = User.query.get(report.reported_user_id)

            # Get violation count for reported user
            violation_count = UserViolation.query.filter_by(
                user_id=report.reported_user_id,
                status='active'
            ).count()

            # Get block count for reported user
            from app.models.user_block import UserBlock
            block_count = UserBlock.query.filter_by(
                blocked_user_id=report.reported_user_id,
                is_active=True
            ).count()

            reports.append({
                'id': report.id,
                'conversation_id': report.conversation_id,
                'category': report.category,
                'description': report.description,
                'status': report.status,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'reporter': {
                    'id': reporter.id,
                    'name': reporter.full_name,
                    'email': reporter.email,
                    'user_type': reporter.user_type
                } if reporter else None,
                'reported_user': {
                    'id': reported_user.id,
                    'name': reported_user.full_name,
                    'email': reported_user.email,
                    'user_type': reported_user.user_type,
                    'violation_count': violation_count,
                    'block_count': block_count,
                    'is_messaging_restricted': reported_user.is_messaging_restricted if hasattr(reported_user, 'is_messaging_restricted') else False,
                    'is_account_suspended': reported_user.is_account_suspended if hasattr(reported_user, 'is_account_suspended') else False
                } if reported_user else None,
                'reviewed_by': report.reviewed_by,
                'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None,
                'action_taken': report.action_taken,
                'action_notes': report.action_notes
            })

        return jsonify({
            'success': True,
            'reports': reports,
            'pagination': {
                'page': paginated.page,
                'per_page': paginated.per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# GET /api/admin/moderation/reports/:id - Get report details
@bp.route('/reports/<int:report_id>', methods=['GET'])
@admin_required()
def get_report_details(report_id):
    try:
        report = MessageReport.query.get(report_id)

        if not report:
            return jsonify({'error': 'Report not found'}), 404

        reporter = User.query.get(report.reporter_user_id)
        reported_user = User.query.get(report.reported_user_id)

        # Get reported user's violation history
        violations = UserViolation.query.filter_by(
            user_id=report.reported_user_id
        ).order_by(UserViolation.created_at.desc()).limit(10).all()

        # Get reported user's block count
        from app.models.user_block import UserBlock
        block_count = UserBlock.query.filter_by(
            blocked_user_id=report.reported_user_id,
            is_active=True
        ).count()

        # Get reported user's report count (how many times they've been reported)
        report_count = MessageReport.query.filter_by(
            reported_user_id=report.reported_user_id
        ).count()

        return jsonify({
            'success': True,
            'report': {
                'id': report.id,
                'conversation_id': report.conversation_id,
                'category': report.category,
                'description': report.description,
                'status': report.status,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'reporter': {
                    'id': reporter.id,
                    'name': reporter.full_name,
                    'email': reporter.email,
                    'user_type': reporter.user_type,
                    'profile_image': reporter.profile_image
                } if reporter else None,
                'reported_user': {
                    'id': reported_user.id,
                    'name': reported_user.full_name,
                    'email': reported_user.email,
                    'user_type': reported_user.user_type,
                    'profile_image': reported_user.profile_image,
                    'is_messaging_restricted': reported_user.is_messaging_restricted if hasattr(reported_user, 'is_messaging_restricted') else False,
                    'is_account_suspended': reported_user.is_account_suspended if hasattr(reported_user, 'is_account_suspended') else False,
                    'messaging_restricted_until': reported_user.messaging_restricted_until.isoformat() if hasattr(reported_user, 'messaging_restricted_until') and reported_user.messaging_restricted_until else None
                } if reported_user else None,
                'reviewed_by': report.reviewed_by,
                'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None,
                'action_taken': report.action_taken,
                'action_notes': report.action_notes,
                'action_taken_at': report.action_taken_at.isoformat() if report.action_taken_at else None
            },
            'user_profile': {
                'violation_history': [v.to_dict() for v in violations],
                'total_violations': len(violations),
                'block_count': block_count,
                'report_count': report_count
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# PUT /api/admin/moderation/reports/:id/status - Update report status
@bp.route('/reports/<int:report_id>/status', methods=['PUT'])
@admin_required()
def update_report_status(report_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        report = MessageReport.query.get(report_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        # Update status
        new_status = data.get('status')  # reviewed, dismissed, action_taken
        if new_status:
            report.status = new_status

        # Mark as reviewed
        if not report.reviewed_by:
            report.reviewed_by = current_user_id
            report.reviewed_at = datetime.utcnow()

        db.session.commit()

        # Log admin action
        log_admin_action(
            admin_id=current_user_id,
            action_type='report_status_updated',
            target_type='report',
            target_id=report_id,
            action_data={'new_status': new_status}
        )

        return jsonify({
            'success': True,
            'message': 'Report status updated'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# POST /api/admin/moderation/reports/:id/action - Take enforcement action
@bp.route('/reports/<int:report_id>/action', methods=['POST'])
@admin_required()
def take_enforcement_action(report_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        report = MessageReport.query.get(report_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        action_type = data.get('action_type')  # warn, restrict_messaging, suspend_account, dismiss
        action_duration_days = data.get('action_duration_days')  # optional, for temporary restrictions
        action_reason = data.get('reason', '')

        if not action_type:
            return jsonify({'error': 'Action type required'}), 400

        if action_type == 'dismiss':
            # Dismiss report - no violation created
            report.status = 'dismissed'
            report.action_taken = 'dismissed'
            report.action_notes = action_reason
            report.action_taken_at = datetime.utcnow()
            report.reviewed_by = current_user_id
            report.reviewed_at = datetime.utcnow()

            db.session.commit()

            log_admin_action(
                admin_id=current_user_id,
                action_type='report_dismissed',
                target_type='report',
                target_id=report_id,
                action_data={'reason': action_reason}
            )

            return jsonify({
                'success': True,
                'message': 'Report dismissed'
            }), 200

        # Create user violation
        violation = UserViolation(
            user_id=report.reported_user_id,
            violation_type=action_type,
            severity=data.get('severity', 'moderate'),
            description=f"Report #{report.id}: {report.category} - {action_reason}",
            source_type='message_report',
            source_id=report.id,
            action_taken=action_type,
            action_duration_days=action_duration_days,
            issued_by=current_user_id,
            notes=action_reason,
            status='active'
        )

        # Calculate expiration if duration provided
        if action_duration_days:
            from datetime import timedelta
            violation.action_expires_at = datetime.utcnow() + timedelta(days=action_duration_days)

        db.session.add(violation)

        # Update reported user's status based on action
        reported_user = User.query.get(report.reported_user_id)
        if action_type == 'restrict_messaging':
            reported_user.is_messaging_restricted = True
            if action_duration_days:
                from datetime import timedelta
                reported_user.messaging_restricted_until = datetime.utcnow() + timedelta(days=action_duration_days)

        elif action_type == 'suspend_account':
            reported_user.is_account_suspended = True
            if action_duration_days:
                from datetime import timedelta
                reported_user.account_suspended_until = datetime.utcnow() + timedelta(days=action_duration_days)

        # Update report status
        report.status = 'action_taken'
        report.action_taken = action_type
        report.action_notes = action_reason
        report.action_taken_at = datetime.utcnow()
        report.reviewed_by = current_user_id
        report.reviewed_at = datetime.utcnow()

        db.session.commit()

        # Log admin action
        log_admin_action(
            admin_id=current_user_id,
            action_type='enforcement_action',
            target_type='user',
            target_id=report.reported_user_id,
            action_data={
                'action_type': action_type,
                'report_id': report_id,
                'duration_days': action_duration_days,
                'reason': action_reason
            }
        )

        return jsonify({
            'success': True,
            'message': f'Enforcement action taken: {action_type}',
            'violation_id': violation.id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# GET /api/admin/moderation/users/:id/profile - Get user moderation profile
@bp.route('/users/<int:user_id>/profile', methods=['GET'])
@admin_required()
def get_user_moderation_profile(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get violations
        violations = UserViolation.query.filter_by(user_id=user_id).order_by(UserViolation.created_at.desc()).all()

        # Get reports (as reported user)
        reports_against = MessageReport.query.filter_by(reported_user_id=user_id).order_by(MessageReport.created_at.desc()).all()

        # Get block count
        from app.models.user_block import UserBlock
        block_count = UserBlock.query.filter_by(blocked_user_id=user_id, is_active=True).count()

        # Get safety warnings count
        from app.models.safety_warning import SafetyWarning
        warning_count = SafetyWarning.query.filter_by(sender_user_id=user_id).count()

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.full_name,
                'email': user.email,
                'user_type': user.user_type,
                'profile_image': user.profile_image,
                'is_messaging_restricted': user.is_messaging_restricted if hasattr(user, 'is_messaging_restricted') else False,
                'messaging_restricted_until': user.messaging_restricted_until.isoformat() if hasattr(user, 'messaging_restricted_until') and user.messaging_restricted_until else None,
                'is_account_suspended': user.is_account_suspended if hasattr(user, 'is_account_suspended') else False,
                'account_suspended_until': user.account_suspended_until.isoformat() if hasattr(user, 'account_suspended_until') and user.account_suspended_until else None
            },
            'statistics': {
                'total_violations': len(violations),
                'active_violations': len([v for v in violations if v.status == 'active']),
                'reports_received': len(reports_against),
                'blocks_received': block_count,
                'safety_warnings': warning_count
            },
            'violations': [v.to_dict() for v in violations],
            'recent_reports': [{
                'id': r.id,
                'category': r.category,
                'status': r.status,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'action_taken': r.action_taken
            } for r in reports_against[:5]]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# GET /api/admin/moderation/stats - Get moderation dashboard stats
@bp.route('/stats', methods=['GET'])
@admin_required()
def get_moderation_stats():
    try:
        # Count pending reports
        pending_reports = MessageReport.query.filter_by(status='pending').count()

        # Count total reports
        total_reports = MessageReport.query.count()

        # Count reports by status
        reviewed_reports = MessageReport.query.filter_by(status='reviewed').count()
        action_taken_reports = MessageReport.query.filter_by(status='action_taken').count()
        dismissed_reports = MessageReport.query.filter_by(status='dismissed').count()

        # Count active violations
        active_violations = UserViolation.query.filter_by(status='active').count()

        # Count restricted users
        restricted_users = User.query.filter_by(is_messaging_restricted=True).count() if hasattr(User, 'is_messaging_restricted') else 0
        suspended_users = User.query.filter_by(is_account_suspended=True).count() if hasattr(User, 'is_account_suspended') else 0

        return jsonify({
            'success': True,
            'stats': {
                'pending_reports': pending_reports,
                'total_reports': total_reports,
                'reviewed_reports': reviewed_reports,
                'action_taken_reports': action_taken_reports,
                'dismissed_reports': dismissed_reports,
                'active_violations': active_violations,
                'restricted_users': restricted_users,
                'suspended_users': suspended_users
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### 3. Register Blueprint

#### Update backend/app/__init__.py

```python
# Import new moderation blueprint
from app.routes.admin import moderation

# Register blueprint (after other admin blueprints)
app.register_blueprint(moderation.bp, url_prefix='/api/admin/moderation')
```

---

## 🎨 Frontend Implementation

### File Structure

```
frontend/src/pages/
└── AdminModeration.jsx (NEW - main dashboard)

frontend/src/components/
├── AdminReportReviewModal.jsx (NEW)
├── EnforcementActionModal.jsx (NEW)
└── UserModerationProfileModal.jsx (NEW - bonus)
```

### 1. Admin Moderation Dashboard Page

#### frontend/src/pages/AdminModeration.jsx

*Full component code (500+ lines) will be provided in implementation*

**Key Features**:
- Overview metrics cards (pending reports, total reports, actions taken)
- Report queue table with filters (status, category)
- Pagination
- Click report row to open review modal
- Status badges (color-coded)
- Search functionality
- Refresh button

### 2. Report Review Modal

#### frontend/src/components/AdminReportReviewModal.jsx

**Key Features**:
- Show report details (category, description, timestamp)
- Display reporter info (name, email, user type)
- Display reported user info with risk indicators (violation count, block count)
- Show conversation reference
- Action buttons:
  - "Issue Warning" - Create violation, mark report as action_taken
  - "Restrict Messaging" - Create violation, restrict user messaging
  - "Suspend Account" - Create violation, suspend account
  - "Dismiss Report" - Mark report as dismissed
- Each action opens EnforcementActionModal for confirmation

### 3. Enforcement Action Modal

#### frontend/src/components/EnforcementActionModal.jsx

**Key Features**:
- Action type (already selected from review modal)
- Duration selector (7 days, 14 days, 30 days, permanent)
- Reason text field (required, min 20 characters)
- Preview of what user will see
- Confirm/Cancel buttons
- Calls `POST /api/admin/moderation/reports/:id/action`

---

## 🔒 Security & Access Control

### Backend Protection
- All admin endpoints require JWT + `is_admin=true` check
- Admin middleware decorator on all routes
- Activity logging for all actions
- Input validation on all endpoints

### Frontend Protection
- Admin routes protected by ProtectedRoute + admin check
- Non-admin users redirected to dashboard
- Confirmation modals for destructive actions
- Error handling with toast notifications

---

## 🧪 Testing Plan

### Backend Tests
1. **Report listing**: GET /api/admin/moderation/reports
   - Filter by status
   - Filter by category
   - Pagination works
   - Returns correct user info

2. **Report details**: GET /api/admin/moderation/reports/:id
   - Returns full report info
   - Includes violation history
   - Includes block count

3. **Enforcement actions**:
   - Issue warning (creates violation, updates report)
   - Restrict messaging (creates violation, updates user status)
   - Suspend account (creates violation, updates user status)
   - Dismiss report (no violation created)

4. **Admin activity logging**:
   - All actions logged correctly
   - IP address captured
   - Action data JSON stored

### Frontend Tests
1. **Dashboard loads**: Metrics display correctly
2. **Report queue**: Table displays, filters work, pagination works
3. **Review modal**: Opens correctly, displays all info
4. **Enforcement modal**: Form validation, API calls work
5. **Toast notifications**: Success/error messages show

### Integration Tests
1. **Full enforcement flow**:
   - User reports message
   - Admin reviews report
   - Admin takes action (restrict messaging)
   - Reported user cannot send messages
   - Violation recorded
   - Activity logged

---

## 📋 Implementation Checklist

### Phase 4A: Backend (4-5 hours)
- [ ] Create database migration for new tables
- [ ] Create UserViolation model
- [ ] Create AdminActivityLog model
- [ ] Update MessageReport model with new fields
- [ ] Update User model with restriction fields
- [ ] Implement admin moderation blueprint
- [ ] Implement all endpoints (reports list, details, action)
- [ ] Add admin activity logging helper
- [ ] Register blueprint in __init__.py
- [ ] Test all endpoints with Postman/curl

### Phase 4B: Frontend (3-4 hours)
- [ ] Create AdminModeration.jsx page
- [ ] Create AdminReportReviewModal.jsx component
- [ ] Create EnforcementActionModal.jsx component
- [ ] Add route to App.jsx (`/admin/moderation`)
- [ ] Add link in admin navbar
- [ ] Implement API calls in services/api.js
- [ ] Add toast notifications
- [ ] Test all user flows

### Phase 4C: Testing & Deployment (1-2 hours)
- [ ] Test end-to-end flow locally
- [ ] Run database migration on production
- [ ] Deploy backend to production
- [ ] Build and deploy frontend
- [ ] Verify admin access works
- [ ] Create test report and take action
- [ ] Document admin procedures

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
# SSH to server
ssh root@173.212.245.22

# Navigate to backend
cd /var/www/bantubuzz/backend

# Run migration script
source venv/bin/activate
python3 migrate_moderation_tables.py

# Verify tables created
psql $DATABASE_URL -c "\dt user_violations"
psql $DATABASE_URL -c "\dt admin_activity_log"
```

### 2. Backend Deployment
```bash
# Ensure backend/app/routes/admin/moderation.py exists
# Ensure models created
# Ensure __init__.py updated

# Restart backend
sudo systemctl restart bantubuzz-backend
```

### 3. Frontend Deployment
```bash
# Build frontend locally
cd frontend
npm run build

# Deploy to production
tar -czf dist.tar.gz dist/
scp dist.tar.gz root@173.212.245.22:/tmp/
ssh root@173.212.245.22 "cd /var/www/bantubuzz/frontend && rm -rf dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"
```

### 4. Verification
- Visit https://bantubuzz.com/admin/moderation
- Check metrics display
- Test filtering and pagination
- Review a report and take action
- Verify user restriction works

---

## 📊 Success Metrics

### Phase 4 Complete When:
✅ Admins can view all message reports
✅ Admins can filter reports by status/category
✅ Admins can review report details with user context
✅ Admins can take enforcement actions (warn, restrict, suspend)
✅ User restrictions are enforced (messaging blocked)
✅ All admin actions are logged
✅ Dashboard shows real-time metrics

### Future Enhancements (Post-Phase 4):
- User Risk Profile Viewer (detailed)
- Bulk actions (bulk dismiss, bulk assign)
- Admin response templates
- Email notifications to users when action taken
- Appeal system for violations
- Automated escalation for severe reports
- Integration with messaging service to show restriction messages

---

## 🎯 Next Steps

1. **Review this plan** - Confirm approach is correct
2. **Start with database migration** - Create tables first
3. **Build backend** - Implement endpoints and test
4. **Build frontend** - Create dashboard and modals
5. **Test locally** - End-to-end testing
6. **Deploy to production** - Database → Backend → Frontend
7. **Train admin team** - Document procedures
8. **Monitor** - Watch for issues in first week

---

**Status**: Ready for Implementation
**Estimated Time**: 8-12 hours total
**Priority**: High (makes Trust & Safety system actionable)
**Dependencies**: Phase 1 & 1B complete ✅
