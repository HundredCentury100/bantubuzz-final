from datetime import datetime
from app import db


class BrandProfile(db.Model):
    __tablename__ = 'brand_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)  # Unique username for brands
    company_name = db.Column(db.String(200), nullable=False)
    logo = db.Column(db.String(255))  # Kept for backward compatibility
    logo_sizes = db.Column(db.JSON, default=dict)  # Multi-size storage: {thumbnail, medium, large}
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
    campaigns = db.relationship('Campaign', backref='brand', lazy='dynamic', cascade='all, delete-orphan')
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
            'logo': self.logo,
            'logo_sizes': self.logo_sizes or {},
            'description': self.description,
            'website': self.website,
            'industry': self.industry,
            'company_size': self.company_size,
            'location': self.location,
            'social_links': self.social_links or {},
            'verified_status': self.verified_status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_user and self.user:
            if public_view:
                data['user'] = self.user.to_public_dict()  # No email!
            else:
                data['user'] = self.user.to_dict()  # Full data for owner

        return data

    def __repr__(self):
        return f'<BrandProfile {self.company_name}>'
