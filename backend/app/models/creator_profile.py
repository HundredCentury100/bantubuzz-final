from datetime import datetime
from app import db


class CreatorProfile(db.Model):
    __tablename__ = 'creator_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)  # Unique username for creators
    bio = db.Column(db.Text)
    profile_picture = db.Column(db.String(255))  # Kept for backward compatibility
    profile_picture_sizes = db.Column(db.JSON, default=dict)  # Multi-size storage: {thumbnail, medium, large}
    portfolio_url = db.Column(db.String(255))
    categories = db.Column(db.JSON, default=list)  # List of categories
    follower_count = db.Column(db.Integer, default=0)
    engagement_rate = db.Column(db.Float, default=0.0)
    location = db.Column(db.String(100))
    city = db.Column(db.String(100))  # City/Town
    country = db.Column(db.String(2))  # 2-letter country code (e.g., ZW, ZA)
    languages = db.Column(db.JSON, default=list)
    platforms = db.Column(db.JSON, default=list)  # List of platforms: ['Instagram', 'TikTok', ...]
    availability_status = db.Column(db.String(20), default='available')  # available, busy, unavailable
    social_links = db.Column(db.JSON, default=dict)  # {platform: url}
    success_stories = db.Column(db.Text)
    gallery = db.Column(db.JSON, default=list)  # Legacy: List of gallery image paths
    gallery_images = db.Column(db.JSON, default=list)  # New: List of gallery items with multi-size support

    # Revision policy
    free_revisions = db.Column(db.Integer, default=2)  # Number of free revisions allowed per collaboration
    revision_fee = db.Column(db.Float, default=0.0)  # Fee charged per revision after free limit

    # Featured creator fields
    is_featured = db.Column(db.Boolean, default=False)
    featured_type = db.Column(db.String(20), nullable=True)  # 'general', 'tiktok', 'instagram'
    featured_order = db.Column(db.Integer, default=0)
    featured_since = db.Column(db.DateTime, nullable=True)

    # Verification and badges
    is_verified = db.Column(db.Boolean, default=False)  # Verified by platform with documents
    verified_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    packages = db.relationship('Package', backref='creator', lazy='dynamic', cascade='all, delete-orphan')
    bookings_as_creator = db.relationship('Booking', foreign_keys='Booking.creator_id', backref='creator', lazy='dynamic')
    saved_by_brands = db.relationship('SavedCreator', backref='creator', lazy='dynamic', cascade='all, delete-orphan')

    def get_badges(self):
        """
        Calculate creator badges based on verification and performance
        Returns list of up to 2 badges in priority order

        Badge hierarchy:
        1. Top Creator (5+ completed collaborations in last 30 days)
        2. Verified Creator (platform verified with documents)
        3. Creator (default badge for all creators)
        """
        from datetime import datetime, timedelta
        from app.models import Collaboration

        badges = []

        # Check for Top Creator badge (highest priority)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        completed_count = Collaboration.query.filter(
            Collaboration.creator_id == self.id,
            Collaboration.status == 'completed',
            Collaboration.updated_at >= thirty_days_ago
        ).count()

        if completed_count >= 5:
            badges.append('top_creator')

        # Check for Verified Creator badge
        if self.is_verified:
            badges.append('verified_creator')

        # Always include Creator badge if no other badges (everyone gets at least one)
        if not badges:
            badges.append('creator')

        # Return maximum of 2 badges
        return badges[:2]

    def to_dict(self, include_user=False, public_view=False):
        """
        Convert creator profile to dictionary

        Args:
            include_user: Include user object
            public_view: If True, exclude private info (email) from user object
        """
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'display_name': self.username or 'Creator',  # Frontend-friendly fallback
            'bio': self.bio,
            'profile_picture': self.profile_picture,
            'profile_picture_sizes': self.profile_picture_sizes or {},
            'portfolio_url': self.portfolio_url,
            'categories': self.categories or [],
            'follower_count': self.follower_count,
            'engagement_rate': self.engagement_rate,
            'location': self.location,
            'city': self.city,
            'country': self.country,
            'languages': self.languages or [],
            'platforms': self.platforms or [],  # Platforms selected by creator
            'availability_status': self.availability_status,
            'social_links': self.social_links or {},
            'success_stories': self.success_stories,
            'gallery': self.gallery or [],
            'gallery_images': self.gallery_images or [],
            'free_revisions': self.free_revisions or 2,
            'revision_fee': self.revision_fee or 0.0,
            'is_verified': self.is_verified or False,
            'badges': self.get_badges(),
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
        return f'<CreatorProfile {self.user_id}>'
