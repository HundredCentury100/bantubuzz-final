"""
Creator Subscription Plan Model
Defines subscription options for creators (Featured & Verification)
"""
from app import db
from datetime import datetime


class CreatorSubscriptionPlan(db.Model):
    __tablename__ = 'creator_subscription_plans'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    subscription_type = db.Column(db.String(20), nullable=False)  # 'featured' or 'verification'
    featured_category = db.Column(db.String(20))  # 'general', 'facebook', 'instagram', 'tiktok', NULL
    price = db.Column(db.Float, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)  # 7 for featured, 30 for verification
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subscriptions = db.relationship('CreatorSubscription', backref='plan', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'subscription_type': self.subscription_type,
            'featured_category': self.featured_category,
            'price': float(self.price),
            'duration_days': self.duration_days,
            'duration_display': f"{self.duration_days // 7} week(s)" if self.duration_days == 7 else f"{self.duration_days // 30} month(s)",
            'description': self.description,
            'is_active': self.is_active
        }

    def __repr__(self):
        return f'<CreatorSubscriptionPlan {self.name}>'
