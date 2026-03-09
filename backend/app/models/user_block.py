"""
User Block model for BantuBuzz Trust & Safety system
"""
from datetime import datetime
from app import db


class UserBlock(db.Model):
    """Model for user blocking relationships"""
    __tablename__ = 'user_blocks'

    id = db.Column(db.Integer, primary_key=True)
    blocker_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    blocked_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    reason = db.Column(db.String(100), nullable=True)  # Optional, user doesn't have to specify
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    unblocked_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    blocker = db.relationship('User', foreign_keys=[blocker_user_id], backref='blocks_initiated')
    blocked = db.relationship('User', foreign_keys=[blocked_user_id], backref='blocks_received')

    def to_dict(self):
        """Convert block to dictionary"""
        return {
            'id': self.id,
            'blocker_user_id': self.blocker_user_id,
            'blocked_user_id': self.blocked_user_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'unblocked_at': self.unblocked_at.isoformat() if self.unblocked_at else None
        }

    def __repr__(self):
        return f'<UserBlock {self.blocker_user_id} blocked {self.blocked_user_id}>'
