"""
Support Ticket Model

Handles help center support tickets submitted by users.
Tracks ticket status, assignments, and conversation threads.

Created: March 10, 2026
Part of: Trust, Safety & Support Implementation Plan - Phase 2
"""

from app import db
from datetime import datetime


class SupportTicket(db.Model):
    """Support ticket model for help center"""

    __tablename__ = 'support_tickets'

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Ticket Details
    category = db.Column(db.String(50), nullable=False, index=True)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='normal', index=True)

    # Optional References
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id', ondelete='SET NULL'), nullable=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True)
    payment_reference = db.Column(db.String(100), nullable=True)
    message_thread_id = db.Column(db.String(100), nullable=True)

    # Status
    status = db.Column(db.String(30), default='open', nullable=False, index=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)

    # Tracking
    response_count = db.Column(db.Integer, default=0, nullable=False)
    last_response_at = db.Column(db.DateTime, nullable=True)
    last_response_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='support_tickets')
    assigned_admin = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_tickets')
    messages = db.relationship('SupportTicketMessage', backref='ticket', lazy='dynamic', cascade='all, delete-orphan')
    attachments = db.relationship('SupportTicketAttachment', backref='ticket', lazy='dynamic', cascade='all, delete-orphan')

    # Valid values
    VALID_CATEGORIES = ['technical', 'campaign', 'payment', 'messaging', 'account', 'inquiry', 'other']
    VALID_PRIORITIES = ['low', 'normal', 'high', 'emergency']
    VALID_STATUSES = ['open', 'under_review', 'awaiting_user', 'investigating', 'resolved', 'closed']

    def __repr__(self):
        return f'<SupportTicket {self.ticket_number}: {self.subject}>'

    @staticmethod
    def generate_ticket_number():
        """Generate next ticket number in format TICKET-YYYY-NNNNN"""
        year = datetime.utcnow().year
        # Get count of tickets this year
        count = SupportTicket.query.filter(
            SupportTicket.ticket_number.like(f'TICKET-{year}-%')
        ).count()
        return f'TICKET-{year}-{str(count + 1).zfill(5)}'

    def to_dict(self):
        """Convert ticket to dictionary"""
        return {
            'id': self.id,
            'ticket_number': self.ticket_number,
            'user_id': self.user_id,
            'user': {
                'id': self.user.id,
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
                'user_type': self.user.user_type
            } if self.user else None,
            'category': self.category,
            'subject': self.subject,
            'description': self.description,
            'priority': self.priority,
            'collaboration_id': self.collaboration_id,
            'booking_id': self.booking_id,
            'payment_reference': self.payment_reference,
            'message_thread_id': self.message_thread_id,
            'status': self.status,
            'assigned_to': self.assigned_to,
            'assigned_admin': {
                'id': self.assigned_admin.id,
                'email': self.assigned_admin.email,
                'first_name': self.assigned_admin.first_name,
                'last_name': self.assigned_admin.last_name
            } if self.assigned_admin else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'response_count': self.response_count,
            'last_response_at': self.last_response_at.isoformat() if self.last_response_at else None,
            'message_count': self.messages.count()
        }

    def to_admin_dict(self):
        """Convert ticket to dictionary with admin details"""
        data = self.to_dict()
        data['messages'] = [msg.to_dict() for msg in self.messages.order_by(SupportTicketMessage.created_at.asc()).all()]
        data['attachments'] = [att.to_dict() for att in self.attachments.all()]
        return data
