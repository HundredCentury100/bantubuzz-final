"""
Verification Application Model
Tracks creator verification applications with documents and social proof
"""
from app import db
from datetime import datetime


class VerificationApplication(db.Model):
    __tablename__ = 'verification_applications'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey('creator_subscriptions.id'))
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, pending_payment

    # Application Data
    real_name = db.Column(db.String(100), nullable=False)
    id_type = db.Column(db.String(50), nullable=False)  # national_id, passport, drivers_license
    id_number = db.Column(db.String(100), nullable=False)

    # Document Uploads
    id_document_front = db.Column(db.String(255))
    id_document_back = db.Column(db.String(255))
    selfie_with_id = db.Column(db.String(255))

    # Social Media Verification
    instagram_verified = db.Column(db.Boolean, default=False)
    instagram_username = db.Column(db.String(100))
    instagram_followers = db.Column(db.Integer)
    tiktok_verified = db.Column(db.Boolean, default=False)
    tiktok_username = db.Column(db.String(100))
    tiktok_followers = db.Column(db.Integer)
    facebook_verified = db.Column(db.Boolean, default=False)
    facebook_username = db.Column(db.String(100))
    facebook_followers = db.Column(db.Integer)

    # Additional Info
    reason = db.Column(db.Text)  # Why they should be verified

    # Payment
    payment_reference = db.Column(db.String(100))
    payment_verified = db.Column(db.Boolean, default=False)

    # Admin Review
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    rejection_reason = db.Column(db.Text)
    admin_notes = db.Column(db.Text)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('CreatorProfile', backref='verification_applications')
    subscription = db.relationship('CreatorSubscription', backref='verification_applications')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def approve(self, admin_id):
        """Approve the verification application"""
        self.status = 'approved'
        self.reviewed_by = admin_id
        self.reviewed_at = datetime.utcnow()
        # The creator's is_verified will be set to True in the route handler

    def reject(self, admin_id, reason):
        """Reject the verification application"""
        self.status = 'rejected'
        self.reviewed_by = admin_id
        self.reviewed_at = datetime.utcnow()
        self.rejection_reason = reason

    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'subscription_id': self.subscription_id,
            'status': self.status,
            'real_name': self.real_name,
            'id_type': self.id_type,
            'id_number': self.id_number,
            'documents': {
                'id_front': self.id_document_front,
                'id_back': self.id_document_back,
                'selfie': self.selfie_with_id
            },
            'social_media': {
                'instagram': {
                    'verified': self.instagram_verified,
                    'username': self.instagram_username,
                    'followers': self.instagram_followers
                },
                'tiktok': {
                    'verified': self.tiktok_verified,
                    'username': self.tiktok_username,
                    'followers': self.tiktok_followers
                },
                'facebook': {
                    'verified': self.facebook_verified,
                    'username': self.facebook_username,
                    'followers': self.facebook_followers
                }
            },
            'reason': self.reason,
            'payment_reference': self.payment_reference,
            'payment_verified': self.payment_verified,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'rejection_reason': self.rejection_reason,
            'admin_notes': self.admin_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<VerificationApplication creator_id={self.creator_id} status={self.status}>'
