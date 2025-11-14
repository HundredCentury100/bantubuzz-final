from datetime import datetime, timedelta
from app import db
import random
import string


class OTP(db.Model):
    __tablename__ = 'otps'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(50), nullable=False)  # 'registration', 'password_reset', 'email_change'
    is_used = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref='otps')

    def __init__(self, user_id, purpose, expiry_minutes=10):
        self.user_id = user_id
        self.purpose = purpose
        self.code = self.generate_code()
        self.expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)

    @staticmethod
    def generate_code():
        """Generate a 6-digit OTP code"""
        return ''.join(random.choices(string.digits, k=6))

    def is_valid(self):
        """Check if OTP is still valid"""
        return not self.is_used and datetime.utcnow() < self.expires_at

    def mark_as_used(self):
        """Mark OTP as used"""
        self.is_used = True

    def to_dict(self):
        """Convert OTP to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'purpose': self.purpose,
            'is_used': self.is_used,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<OTP {self.code} for User {self.user_id}>'
