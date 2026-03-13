"""
Support Ticket Message Model

Handles conversation messages within support tickets.
Tracks admin vs user messages and read status.

Created: March 10, 2026
Part of: Trust, Safety & Support Implementation Plan - Phase 2
"""

from app import db
from datetime import datetime


class SupportTicketMessage(db.Model):
    """Support ticket message model for conversation threads"""

    __tablename__ = 'support_ticket_messages'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    # Message Content
    message = db.Column(db.Text, nullable=False)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Read Status
    read_by_user = db.Column(db.Boolean, default=False, nullable=False)
    read_by_admin = db.Column(db.Boolean, default=False, nullable=False)

    # Relationships
    user = db.relationship('User', backref='ticket_messages')

    def __repr__(self):
        return f'<SupportTicketMessage {self.id} for Ticket {self.ticket_id}>'

    def to_dict(self):
        """Convert message to dictionary"""
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'is_admin': self.is_admin,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_by_user': self.read_by_user,
            'read_by_admin': self.read_by_admin,
            'user': {
                'id': self.user.id,
                'email': self.user.email,
                'user_type': self.user.user_type
            } if self.user else None
        }
