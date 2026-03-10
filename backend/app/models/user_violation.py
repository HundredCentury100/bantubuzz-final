"""
User Violation model for BantuBuzz Admin Moderation system
Tracks enforcement actions taken against users
"""
from datetime import datetime
from app import db


class UserViolation(db.Model):
    """Model for tracking enforcement actions against users"""
    __tablename__ = 'user_violations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Violation Details
    violation_type = db.Column(db.String(50), nullable=False)  # warning, restrict_messaging, suspend_account
    severity = db.Column(db.String(20), nullable=False)  # minor, moderate, severe
    description = db.Column(db.Text, nullable=False)

    # Source (what triggered this action)
    source_type = db.Column(db.String(50))  # message_report, admin_action, system_detection
    source_id = db.Column(db.Integer)  # ID of source record (e.g., message_report.id)

    # Enforcement Action
    action_taken = db.Column(db.String(100), nullable=False)  # warning_issued, messaging_restricted_7days, etc.
    action_duration_days = db.Column(db.Integer)  # NULL = permanent, or number of days
    action_expires_at = db.Column(db.DateTime)

    # Admin
    issued_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    notes = db.Column(db.Text)  # Admin's reason for action

    # Status
    status = db.Column(db.String(30), default='active', nullable=False)  # active, expired, reversed

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expired_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='violations_received')
    admin = db.relationship('User', foreign_keys=[issued_by], backref='violations_issued')

    def to_dict(self):
        """Convert violation to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'violation_type': self.violation_type,
            'severity': self.severity,
            'description': self.description,
            'source_type': self.source_type,
            'source_id': self.source_id,
            'action_taken': self.action_taken,
            'action_duration_days': self.action_duration_days,
            'action_expires_at': self.action_expires_at.isoformat() if self.action_expires_at else None,
            'issued_by': self.issued_by,
            'issued_by_name': self.admin.full_name if self.admin else None,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expired_at': self.expired_at.isoformat() if self.expired_at else None
        }

    def __repr__(self):
        return f'<UserViolation {self.id} - User {self.user_id} - {self.violation_type} [{self.status}]>'
