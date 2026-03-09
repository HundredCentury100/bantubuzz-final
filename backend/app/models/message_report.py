"""
Message Report model for BantuBuzz Trust & Safety system
"""
from datetime import datetime
from app import db


class MessageReport(db.Model):
    """Model for reporting inappropriate messages"""
    __tablename__ = 'message_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_number = db.Column(db.String(20), unique=True, nullable=False)  # REPORT-2026-00001

    # Reporter & Reported
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Message Details
    conversation_id = db.Column(db.String(100), nullable=False)
    message_id = db.Column(db.String(100), nullable=False)
    message_content = db.Column(db.Text, nullable=True)
    message_context = db.Column(db.JSON, nullable=True)  # 3 messages before/after for context

    # Report Details
    report_category = db.Column(db.String(50), nullable=False)  # harassment, hate_speech, scam, spam, fraud, abusive
    description = db.Column(db.Text, nullable=True)

    # Status
    status = db.Column(db.String(30), default='pending', nullable=False)  # pending, under_review, action_taken, dismissed, escalated
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Safety Flags
    is_emergency = db.Column(db.Boolean, default=False, nullable=False)
    auto_escalated = db.Column(db.Boolean, default=False, nullable=False)

    # Actions Taken
    action_taken = db.Column(db.String(100), nullable=True)  # warning_issued, messaging_restricted, account_suspended, no_action, false_report
    action_notes = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    action_taken_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    reporter = db.relationship('User', foreign_keys=[reporter_id], backref='reports_filed')
    reported_user = db.relationship('User', foreign_keys=[reported_user_id], backref='reports_received')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref='reports_reviewed')

    def to_dict(self, include_details=False):
        """Convert report to dictionary"""
        data = {
            'id': self.id,
            'report_number': self.report_number,
            'reporter_id': self.reporter_id,
            'reported_user_id': self.reported_user_id,
            'conversation_id': self.conversation_id,
            'message_id': self.message_id,
            'report_category': self.report_category,
            'description': self.description,
            'status': self.status,
            'is_emergency': self.is_emergency,
            'auto_escalated': self.auto_escalated,
            'action_taken': self.action_taken,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'action_taken_at': self.action_taken_at.isoformat() if self.action_taken_at else None
        }

        if include_details:
            # Reporter info (limited for privacy)
            data['reporter'] = {
                'id': self.reporter.id,
                'user_type': self.reporter.user_type
            } if self.reporter else None

            # Reported user info
            data['reported_user'] = {
                'id': self.reported_user.id,
                'email': self.reported_user.email,
                'user_type': self.reported_user.user_type
            } if self.reported_user else None

            # Message content (only for admin)
            data['message_content'] = self.message_content
            data['message_context'] = self.message_context

            # Reviewer info
            data['reviewed_by_user'] = {
                'id': self.reviewer.id,
                'email': self.reviewer.email
            } if self.reviewer else None

            data['action_notes'] = self.action_notes

        return data

    @staticmethod
    def generate_report_number():
        """Generate next REPORT-YYYY-XXXXX number"""
        last = MessageReport.query.order_by(MessageReport.id.desc()).first()
        next_id = (last.id + 1) if last else 1
        year = datetime.now().year
        return f'REPORT-{year}-{next_id:05d}'

    @staticmethod
    def check_emergency_keywords(message_content):
        """
        Check if message contains emergency keywords that should trigger auto-escalation

        Returns: (is_emergency: bool, detected_keywords: list)
        """
        if not message_content:
            return False, []

        emergency_keywords = [
            # Violence
            'kill', 'murder', 'hurt', 'attack', 'beat up', 'bomb', 'shoot', 'stab',
            # Severe threats
            'I will kill', 'I will hurt', 'watch out', "you'll regret", 'find you',
            # Hate speech indicators
            'die', 'death threat',
            # Extreme harassment
            'rape', 'assault', 'molest'
        ]

        message_lower = message_content.lower()
        detected = [kw for kw in emergency_keywords if kw in message_lower]

        is_emergency = len(detected) > 0

        return is_emergency, detected

    def __repr__(self):
        return f'<MessageReport {self.report_number} [{self.status}]>'
