from datetime import datetime
from app import db


class CreatorProfile(db.Model):
    __tablename__ = 'creator_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_user and self.user:
            data['user'] = self.user.to_dict()

        return data

    def __repr__(self):
        return f'<CreatorProfile {self.user_id}>'
