from datetime import datetime
from app import db


class Package(db.Model):
    __tablename__ = 'packages'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)  # Price in USD - exact decimal (no rounding)
    duration_days = db.Column(db.Integer, nullable=False)
    deliverables = db.Column(db.JSON, default=list)  # List of deliverable items
    category = db.Column(db.String(100), nullable=True)  # Kept for backward compatibility
    collaboration_type = db.Column(db.String(100), nullable=True)  # Brand Endorsement, UGC, etc.
    platform_type = db.Column(db.String(50), nullable=True)  # Instagram, TikTok, YouTube, Twitter, Twitch, UGC
    content_type = db.Column(db.String(50), nullable=True)  # Reel, Post, Story, Video, Short, etc.
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bookings = db.relationship('Booking', backref='package', lazy='dynamic')

    def to_dict(self, include_creator=False):
        """Convert package to dictionary"""
        data = {
            'id': self.id,
            'creator_id': self.creator_id,
            'title': self.title,
            'description': self.description,
            'price': self.price,
            'duration_days': self.duration_days,
            'deliverables': self.deliverables or [],
            'category': self.category,
            'collaboration_type': self.collaboration_type,
            'platform_type': self.platform_type,
            'content_type': self.content_type,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_creator and self.creator:
            data['creator'] = self.creator.to_dict(include_user=True)

        return data

    def __repr__(self):
        return f'<Package {self.title}>'
