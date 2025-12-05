from datetime import datetime
from app import db


class CreatorProfile(db.Model):
    __tablename__ = 'creator_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)  # Unique username for creators
    bio = db.Column(db.Text)
    profile_picture = db.Column(db.String(255))
    portfolio_url = db.Column(db.String(255))
    categories = db.Column(db.JSON, default=list)  # List of categories
    follower_count = db.Column(db.Integer, default=0)
    engagement_rate = db.Column(db.Float, default=0.0)
    location = db.Column(db.String(100))
    languages = db.Column(db.JSON, default=list)
    availability_status = db.Column(db.String(20), default='available')  # available, busy, unavailable
    social_links = db.Column(db.JSON, default=dict)  # {platform: url}
    success_stories = db.Column(db.Text)
    gallery = db.Column(db.JSON, default=list)  # List of gallery image paths

    # Revision policy
    free_revisions = db.Column(db.Integer, default=2)  # Number of free revisions allowed per collaboration
    revision_fee = db.Column(db.Float, default=0.0)  # Fee charged per revision after free limit

    # Featured creator fields
    is_featured = db.Column(db.Boolean, default=False)
    featured_type = db.Column(db.String(20), nullable=True)  # 'general', 'tiktok', 'instagram'
    featured_order = db.Column(db.Integer, default=0)
    featured_since = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    packages = db.relationship('Package', backref='creator', lazy='dynamic', cascade='all, delete-orphan')
    bookings_as_creator = db.relationship('Booking', foreign_keys='Booking.creator_id', backref='creator', lazy='dynamic')
    saved_by_brands = db.relationship('SavedCreator', backref='creator', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_user=False):
        """Convert creator profile to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'bio': self.bio,
            'profile_picture': self.profile_picture,
            'portfolio_url': self.portfolio_url,
            'categories': self.categories or [],
            'follower_count': self.follower_count,
            'engagement_rate': self.engagement_rate,
            'location': self.location,
            'languages': self.languages or [],
            'availability_status': self.availability_status,
            'social_links': self.social_links or {},
            'success_stories': self.success_stories,
            'gallery': self.gallery or [],
            'free_revisions': self.free_revisions or 2,
            'revision_fee': self.revision_fee or 0.0,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_user and self.user:
            data['user'] = self.user.to_dict()

        return data

    def __repr__(self):
        return f'<CreatorProfile {self.user_id}>'
