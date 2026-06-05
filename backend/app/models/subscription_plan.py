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

    # User Type - brand or creator
    user_type = db.Column(db.String(10), default='brand')  # 'brand' or 'creator'

    # Pricing
    price_monthly = db.Column(db.Numeric(10, 2), default=0.0)  # Monthly price in USD
    price_yearly = db.Column(db.Numeric(10, 2), default=0.0)   # Yearly price in USD (discounted)

    # Feature Limits
    max_packages = db.Column(db.Integer, default=3)  # Maximum active packages creator can have
    max_bookings_per_month = db.Column(db.Integer, default=5)  # Maximum bookings per month
    can_access_briefs = db.Column(db.Boolean, default=False)  # Can respond to briefs
    can_access_campaigns = db.Column(db.Boolean, default=False)  # Can apply to campaigns
    can_create_custom_packages = db.Column(db.Boolean, default=True)  # Can create custom packages

    # Brand-specific restrictions
    max_active_campaigns = db.Column(db.Integer, default=5)  # Max concurrent campaigns
    max_active_collaborations = db.Column(db.Integer, default=10)  # Max concurrent collaborations
    max_team_members = db.Column(db.Integer, default=1)  # Max team members/seats
    max_creator_lists = db.Column(db.Integer, default=3)  # Max saved creator lists
    max_client_workspaces = db.Column(db.Integer, default=0)  # Max client workspaces (for agencies)
    service_fee_percentage = db.Column(db.Numeric(5, 2), default=12.00)  # Service fee on collaborations

    # Creator-specific restrictions
    max_portfolio_items = db.Column(db.Integer, default=10)  # Max portfolio/past work items
    commission_percentage = db.Column(db.Numeric(5, 2), default=15.00)  # Platform commission on earnings
    has_verified_badge = db.Column(db.Boolean, default=False)  # Blue checkmark badge
    search_placement_priority = db.Column(db.Integer, default=0)  # 0=normal, 1=boosted, 2=priority
    can_message_brands_first = db.Column(db.Boolean, default=False)  # Can initiate DMs with brands

    # Priority & Visibility
    featured_priority = db.Column(db.Integer, default=0)  # Higher = shown first in search
    badge_label = db.Column(db.String(30))  # "Pro Creator", "Agency Partner", etc.
    search_boost = db.Column(db.Float, default=1.0)  # Search ranking multiplier

    # Platform Features
    priority_support = db.Column(db.Boolean, default=False)
    analytics_access = db.Column(db.Boolean, default=False)
    api_access = db.Column(db.Boolean, default=False)
    has_advanced_analytics = db.Column(db.Boolean, default=False)  # Advanced insights & reports
    has_priority_listing = db.Column(db.Boolean, default=False)  # Priority in search results
    has_custom_branding = db.Column(db.Boolean, default=False)  # Custom branding options
    has_dedicated_support = db.Column(db.Boolean, default=False)  # Dedicated account manager
    has_api_access = db.Column(db.Boolean, default=False)  # API access for integrations

    # Platform Fees
    platform_fee_percentage = db.Column(db.Numeric(5, 2), default=10.00)  # 10% for Free/Pro, 5% for Premium

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
        monthly_price = float(self.price_monthly)
        yearly_price = float(self.price_yearly)
        if monthly_price > 0 and yearly_price <= 0:
            yearly_price = monthly_price * 10

        base_dict = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'user_type': self.user_type,
            'price_monthly': monthly_price,
            'price_yearly': yearly_price,
            'platform_fee_percentage': float(self.platform_fee_percentage) if self.platform_fee_percentage else 10.00,
            'features': {
                'max_packages': self.max_packages,
                'max_bookings_per_month': self.max_bookings_per_month,
                'can_access_briefs': self.can_access_briefs,
                'can_access_campaigns': self.can_access_campaigns,
                'can_create_custom_packages': self.can_create_custom_packages,
                'priority_support': self.priority_support,
                'analytics_access': self.analytics_access,
                'api_access': self.api_access,
                'has_advanced_analytics': self.has_advanced_analytics,
                'has_priority_listing': self.has_priority_listing,
                'has_custom_branding': self.has_custom_branding,
                'has_dedicated_support': self.has_dedicated_support,
                'has_api_access': self.has_api_access,
            },
            'badge_label': self.badge_label,
            'featured_priority': self.featured_priority,
            'is_active': self.is_active,
            'display_order': self.display_order
        }

        # Add brand-specific restrictions
        if self.user_type == 'brand':
            base_dict['restrictions'] = {
                'max_active_campaigns': self.max_active_campaigns,
                'max_active_collaborations': self.max_active_collaborations,
                'max_team_members': self.max_team_members,
                'max_creator_lists': self.max_creator_lists,
                'max_client_workspaces': self.max_client_workspaces,
                'service_fee_percentage': float(self.service_fee_percentage) if self.service_fee_percentage else 12.00,
            }

        # Add creator-specific restrictions
        if self.user_type == 'creator':
            base_dict['restrictions'] = {
                'max_portfolio_items': self.max_portfolio_items,
                'commission_percentage': float(self.commission_percentage) if self.commission_percentage else 15.00,
                'has_verified_badge': self.has_verified_badge,
                'search_placement_priority': self.search_placement_priority,
                'can_message_brands_first': self.can_message_brands_first,
            }

        return base_dict

    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'
