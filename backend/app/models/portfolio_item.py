from datetime import datetime
from app import db


class PortfolioItem(db.Model):
    """
    Portfolio/Success Story items for creators to showcase their work
    """
    __tablename__ = 'portfolio_items'

    id = db.Column(db.Integer, primary_key=True)
    creator_profile_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False)

    # Project details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    brand_name = db.Column(db.String(100))

    # Project metadata
    platform = db.Column(db.String(50))  # instagram, tiktok, youtube, etc.
    collaboration_type = db.Column(db.String(100))  # Sponsored Post, Product Review, etc.
    campaign_objective = db.Column(db.String(200))  # Awareness, Engagement, Sales, etc.

    # Media
    image_url = db.Column(db.String(500))  # Featured image
    media_urls = db.Column(db.JSON, default=list)  # Additional images/videos
    post_url = db.Column(db.String(500))  # Link to actual post

    # Performance metrics
    views = db.Column(db.Integer)
    likes = db.Column(db.Integer)
    comments = db.Column(db.Integer)
    shares = db.Column(db.Integer)
    engagement_rate = db.Column(db.Numeric(5, 4))  # 0.0000 to 0.9999 (0% to 99.99%)
    reach = db.Column(db.Integer)

    # Results/impact
    result_description = db.Column(db.Text)
    client_testimonial = db.Column(db.Text)

    # Project timeline
    project_date = db.Column(db.Date)

    # Display settings
    is_featured = db.Column(db.Boolean, default=False)
    display_order = db.Column(db.Integer, default=0)
    is_visible = db.Column(db.Boolean, default=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert portfolio item to dictionary"""
        return {
            'id': self.id,
            'creator_profile_id': self.creator_profile_id,
            'title': self.title,
            'description': self.description,
            'brand_name': self.brand_name,
            'platform': self.platform,
            'collaboration_type': self.collaboration_type,
            'campaign_objective': self.campaign_objective,
            'image_url': self.image_url,
            'media_urls': self.media_urls or [],
            'post_url': self.post_url,
            'views': self.views,
            'likes': self.likes,
            'comments': self.comments,
            'shares': self.shares,
            'engagement_rate': float(self.engagement_rate) if self.engagement_rate else None,
            'reach': self.reach,
            'result_description': self.result_description,
            'client_testimonial': self.client_testimonial,
            'project_date': self.project_date.isoformat() if self.project_date else None,
            'is_featured': self.is_featured,
            'display_order': self.display_order,
            'is_visible': self.is_visible,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<PortfolioItem {self.id}: {self.title}>'
