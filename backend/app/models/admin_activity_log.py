"""
Admin Activity Log model for BantuBuzz Admin Moderation system
Tracks all actions performed by admins for audit trail
"""
from datetime import datetime
from app import db


class AdminActivityLog(db.Model):
    """Model for logging all admin moderation actions"""
    __tablename__ = 'admin_activity_log'

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Action Details
    action_type = db.Column(db.String(50), nullable=False)  # report_reviewed, violation_issued, report_dismissed
    target_type = db.Column(db.String(50))  # report, user, violation
    target_id = db.Column(db.Integer)  # ID of target

    # Action Data (JSON for flexibility)
    action_data = db.Column(db.JSON)  # stores details like {report_id, user_id, action_taken, reason}

    # Metadata
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    admin = db.relationship('User', backref='moderation_actions')

    def to_dict(self):
        """Convert activity log to dictionary"""
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'admin_name': self.admin.full_name if self.admin else None,
            'admin_email': self.admin.email if self.admin else None,
            'action_type': self.action_type,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'action_data': self.action_data,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<AdminActivityLog {self.id} - {self.action_type} by Admin {self.admin_id}>'
