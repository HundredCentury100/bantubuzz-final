"""
Support Ticket Attachment Model

Handles file attachments for support tickets and messages.
Stores file metadata and paths.

Created: March 10, 2026
Part of: Trust, Safety & Support Implementation Plan - Phase 2
"""

from app import db
from datetime import datetime


class SupportTicketAttachment(db.Model):
    """Support ticket attachment model for file uploads"""

    __tablename__ = 'support_ticket_attachments'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=True, index=True)
    message_id = db.Column(db.Integer, db.ForeignKey('support_ticket_messages.id', ondelete='CASCADE'), nullable=True, index=True)

    # File Details
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)

    # Metadata
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    uploader = db.relationship('User', backref='uploaded_attachments')

    def __repr__(self):
        return f'<SupportTicketAttachment {self.id}: {self.filename}>'

    def to_dict(self):
        """Convert attachment to dictionary"""
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'message_id': self.message_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'uploader': {
                'id': self.uploader.id,
                'email': self.uploader.email,
                'first_name': self.uploader.first_name,
                'last_name': self.uploader.last_name
            } if self.uploader else None
        }
