from datetime import datetime
from app import db


class BrandProfile(db.Model):
    __tablename__ = 'brand_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)  # Unique username for brands
    company_name = db.Column(db.String(200), nullable=False)
    account_type = db.Column(db.String(20), default='brand', nullable=False)  # brand, agency, enterprise
    expected_workspace_count = db.Column(db.Integer, nullable=True)  # Number of clients/brands from signup
    logo = db.Column(db.String(255))  # Kept for backward compatibility
    logo_sizes = db.Column(db.JSON, default=dict)  # Multi-size storage: {thumbnail, medium, large}
    report_logo = db.Column(db.String(255))
    report_logo_sizes = db.Column(db.JSON, default=dict)
    report_brand_color = db.Column(db.String(20), default='#B5E61D')
    report_secondary_color = db.Column(db.String(20), default='#1F2937')
    report_email_signature = db.Column(db.Text)
    report_sender_name = db.Column(db.String(120))
    report_reply_to_email = db.Column(db.String(120))
    description = db.Column(db.Text)
    website = db.Column(db.String(255))
    industry = db.Column(db.String(100))
    company_size = db.Column(db.String(50))  # '1-10', '11-50', '51-200', '201-500', '500+'
    location = db.Column(db.String(100))
    social_links = db.Column(db.JSON, default=dict)  # {platform: url}
    verified_status = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaigns = db.relationship('Campaign', back_populates='brand', lazy='dynamic', cascade='all, delete-orphan')
    bookings_as_brand = db.relationship('Booking', foreign_keys='Booking.brand_id', backref='brand', lazy='dynamic')
    saved_creators = db.relationship('SavedCreator', backref='brand', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_user=False, public_view=False):
        """
        Convert brand profile to dictionary

        Args:
            include_user: Include user object
            public_view: If True, exclude private info (email) from user object
        """
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'company_name': self.company_name,
            'display_name': self.company_name or 'Brand',  # Brands use company name as display name
            'account_type': self.account_type or 'brand',
            'expected_workspace_count': self.expected_workspace_count,
            'logo': self.logo,
            'logo_sizes': self.logo_sizes or {},
            'report_logo': self.report_logo,
            'report_logo_sizes': self.report_logo_sizes or {},
            'report_brand_color': self.report_brand_color or '#B5E61D',
            'report_secondary_color': self.report_secondary_color or '#1F2937',
            'report_email_signature': self.report_email_signature,
            'report_sender_name': self.report_sender_name,
            'report_reply_to_email': self.report_reply_to_email,
            'description': self.description,
            'website': self.website,
            'industry': self.industry,
            'company_size': self.company_size,
            'location': self.location,
            'social_links': self.social_links or {},
            'verified_status': self.verified_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_user and self.user:
            if public_view:
                data['user'] = self.user.to_public_dict()  # No email!
            else:
                data['user'] = self.user.to_dict()  # Full data for owner

        return data

    def __repr__(self):
        return f'<BrandProfile {self.company_name}>'
