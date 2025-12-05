from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
import secrets


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(20), nullable=False)  # 'creator', 'brand', or 'admin'
    is_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)  # Admin flag
    admin_role = db.Column(db.String(20))  # 'super_admin', 'moderator', 'support', 'finance'
    verification_token = db.Column(db.String(100), unique=True)
    reset_token = db.Column(db.String(100), unique=True)
    reset_token_expires = db.Column(db.DateTime)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator_profile = db.relationship('CreatorProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    brand_profile = db.relationship('BrandProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy='dynamic')
    received_messages = db.relationship('Message', foreign_keys='Message.receiver_id', backref='receiver', lazy='dynamic')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def __init__(self, email, password, user_type):
        self.email = email.lower()
        self.set_password(password)
        self.user_type = user_type
        self.verification_token = secrets.token_urlsafe(32)

    def set_password(self, password):
        """Hash and set the password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)

    def generate_verification_token(self):
        """Generate a new verification token"""
        self.verification_token = secrets.token_urlsafe(32)
        return self.verification_token

    def generate_reset_token(self):
        """Generate a password reset token"""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        return self.reset_token

    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'user_type': self.user_type,
            'is_verified': self.is_verified,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'admin_role': self.admin_role,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<User {self.email} ({self.user_type})>'
