"""
Message Safety Warning model for BantuBuzz Trust & Safety system
"""
from datetime import datetime
from app import db


class MessageSafetyWarning(db.Model):
    """Model for logging message safety warnings"""
    __tablename__ = 'message_safety_warnings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    conversation_id = db.Column(db.String(100), nullable=False)

    # Warning Details
    warning_type = db.Column(db.String(50), nullable=False)  # harmful_language, contact_sharing, off_platform_payment
    message_content = db.Column(db.Text, nullable=True)
    detected_patterns = db.Column(db.JSON, nullable=True)  # Specific patterns detected

    # User Action
    user_action = db.Column(db.String(30), nullable=True)  # edited, cancelled, sent_anyway
    final_message_sent = db.Column(db.Text, nullable=True)  # If they edited and sent

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = db.relationship('User', backref='safety_warnings')

    def to_dict(self):
        """Convert warning to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'conversation_id': self.conversation_id,
            'warning_type': self.warning_type,
            'message_content': self.message_content,
            'detected_patterns': self.detected_patterns,
            'user_action': self.user_action,
            'final_message_sent': self.final_message_sent,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<MessageSafetyWarning type={self.warning_type} action={self.user_action}>'
