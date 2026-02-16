from datetime import datetime
from app import db


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)
    custom_request_id = db.Column(db.Integer, db.ForeignKey('custom_package_requests.id'), nullable=True)
    custom_offer_id = db.Column(db.Integer, db.ForeignKey('custom_package_offers.id'), nullable=True)
    message_type = db.Column(db.String(20), default='text')  # text, custom_request, custom_offer
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    attachment_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert message to dictionary"""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'booking_id': self.booking_id,
            'custom_request_id': self.custom_request_id,
            'custom_offer_id': self.custom_offer_id,
            'message_type': self.message_type,
            'content': self.content,
            'is_read': self.is_read,
            'attachment_url': self.attachment_url,
            'created_at': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id} to {self.receiver_id}>'
