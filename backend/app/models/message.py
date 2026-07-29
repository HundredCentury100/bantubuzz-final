from datetime import datetime
from app import db


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='SET NULL'), nullable=True, index=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)
    custom_request_id = db.Column(db.Integer, db.ForeignKey('custom_package_requests.id'), nullable=True)
    custom_offer_id = db.Column(db.Integer, db.ForeignKey('custom_package_offers.id'), nullable=True)
    message_type = db.Column(db.String(20), default='text')  # text, custom_request, custom_offer
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    attachment_url = db.Column(db.String(255))
    attachment_type = db.Column(db.String(30))
    attachment_name = db.Column(db.String(255))
    attachment_mime_type = db.Column(db.String(120))
    attachment_size = db.Column(db.Integer)
    link_url = db.Column(db.Text)
    link_title = db.Column(db.String(255))
    link_description = db.Column(db.Text)
    link_image = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert message to dictionary"""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'workspace_id': self.workspace_id,
            'booking_id': self.booking_id,
            'custom_request_id': self.custom_request_id,
            'custom_offer_id': self.custom_offer_id,
            'message_type': self.message_type,
            'content': self.content,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'attachment_url': self.attachment_url,
            'attachment_type': self.attachment_type,
            'attachment_name': self.attachment_name,
            'attachment_mime_type': self.attachment_mime_type,
            'attachment_size': self.attachment_size,
            'link_url': self.link_url,
            'link_title': self.link_title,
            'link_description': self.link_description,
            'link_image': self.link_image,
            'created_at': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id} to {self.receiver_id}>'
