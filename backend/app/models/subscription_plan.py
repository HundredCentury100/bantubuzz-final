"""
Subscription Plan Model - Defines subscription tiers and their features
"""
from app import db
from datetime import datetime


class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # Free, Starter, Pro, Agency
    slug = db.Column(db.String(50), unique=True, nullable=False)  # free, starter, pro, agency
    description = db.Column(db.Text)

    # Pricing
    price_monthly = db.Column(db.Float, default=0.0)  # Monthly price in USD
    price_yearly = db.Column(db.Float, default=0.0)   # Yearly price in USD (discounted)

    # Feature Limits
    max_packages = db.Column(db.Integer, default=3)  # Maximum active packages creator can have
    max_bookings_per_month = db.Column(db.Integer, default=5)  # Maximum bookings per month
    can_access_briefs = db.Column(db.Boolean, default=False)  # Can respond to briefs
    can_access_campaigns = db.Column(db.Boolean, default=False)  # Can apply to campaigns
    can_create_custom_packages = db.Column(db.Boolean, default=True)  # Can create custom packages

    # Priority & Visibility
    featured_priority = db.Column(db.Integer, default=0)  # Higher = shown first in search
    badge_label = db.Column(db.String(30))  # "Pro Creator", "Agency Partner", etc.
    search_boost = db.Column(db.Float, default=1.0)  # Search ranking multiplier

    # Platform Features
    priority_support = db.Column(db.Boolean, default=False)
    analytics_access = db.Column(db.Boolean, default=False)
    api_access = db.Column(db.Boolean, default=False)

    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)  # Default plan for new users
    display_order = db.Column(db.Integer, default=0)  # Order on pricing page

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subscriptions = db.relationship('Subscription', backref='plan', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'price_monthly': float(self.price_monthly),
            'price_yearly': float(self.price_yearly),
            'features': {
                'max_packages': self.max_packages,
                'max_bookings_per_month': self.max_bookings_per_month,
                'can_access_briefs': self.can_access_briefs,
                'can_access_campaigns': self.can_access_campaigns,
                'can_create_custom_packages': self.can_create_custom_packages,
                'priority_support': self.priority_support,
                'analytics_access': self.analytics_access,
                'api_access': self.api_access,
            },
            'badge_label': self.badge_label,
            'featured_priority': self.featured_priority,
            'is_active': self.is_active,
            'display_order': self.display_order
        }

    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'
