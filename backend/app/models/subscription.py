"""
Subscription Model - Tracks user subscriptions and billing
"""
from app import db
from datetime import datetime, timedelta


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)

    # Subscription Status
    status = db.Column(db.String(20), default='active')  # active, cancelled, expired, past_due, trialing
    billing_cycle = db.Column(db.String(20), default='monthly')  # monthly, yearly

    # Billing Period
    current_period_start = db.Column(db.DateTime, default=datetime.utcnow)
    current_period_end = db.Column(db.DateTime)
    trial_end = db.Column(db.DateTime, nullable=True)  # For trial periods

    # Cancellation
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    cancellation_reason = db.Column(db.Text, nullable=True)

    # Payment Info
    payment_method = db.Column(db.String(30))  # paynow, bank_transfer, stripe, paypal, etc.
    payment_reference = db.Column(db.String(100))  # External payment ID
    paynow_poll_url = db.Column(db.Text, nullable=True)  # Paynow polling URL
    last_payment_date = db.Column(db.DateTime, nullable=True)
    next_payment_date = db.Column(db.DateTime, nullable=True)
    last_payment_amount = db.Column(db.Numeric(10, 2), nullable=True)

    # Admin Actions
    admin_note = db.Column(db.Text, nullable=True)  # Internal admin notes
    modified_by_admin = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    # Note: 'plan' backref is defined in SubscriptionPlan model
    user = db.relationship('User', foreign_keys=[user_id], lazy=True)

    def set_billing_period(self, billing_cycle='monthly'):
        """Set current_period_end and next_payment_date based on billing cycle"""
        self.billing_cycle = billing_cycle
        self.current_period_start = datetime.utcnow()

        if billing_cycle == 'yearly':
            self.current_period_end = self.current_period_start + timedelta(days=365)
            self.next_payment_date = self.current_period_end
        else:  # monthly
            self.current_period_end = self.current_period_start + timedelta(days=30)
            self.next_payment_date = self.current_period_end

    def is_active(self):
        """Check if subscription is currently active"""
        if self.status != 'active':
            return False
        if self.current_period_end and datetime.utcnow() > self.current_period_end:
            return False
        return True

    def days_until_renewal(self):
        """Calculate days until next renewal"""
        if not self.next_payment_date:
            return None
        delta = self.next_payment_date - datetime.utcnow()
        return max(0, delta.days)

    def get_restriction(self, key: str):
        """
        Get a specific restriction value from the plan

        Args:
            key: The restriction key (e.g., 'max_active_collaborations')

        Returns:
            The restriction value, or None if not found
        """
        if not self.plan:
            return None

        # Map of restriction keys to plan attributes
        if self.plan.user_type == 'creator':
            restrictions = {
                'max_active_collaborations': self.plan.max_active_collaborations,
                'max_proposals_per_month': self.plan.max_bookings_per_month,
                'max_packages': self.plan.max_packages,
                'max_bookings_per_month': self.plan.max_bookings_per_month,
                'max_portfolio_items': self.plan.max_portfolio_items,
                'commission_percentage': self.plan.commission_percentage,
                'can_message_brands_first': self.plan.can_message_brands_first,
                'search_placement_priority': self.plan.search_placement_priority,
                'has_verified_badge': self.plan.has_verified_badge,
                'can_access_briefs': self.plan.can_access_briefs,
                'can_access_campaigns': self.plan.can_access_campaigns,
                'can_create_custom_packages': self.plan.can_create_custom_packages,
            }
        else:  # brand
            restrictions = {
                'max_active_campaigns': self.plan.max_active_campaigns,
                'max_active_collaborations': self.plan.max_active_collaborations,
                'max_team_members': self.plan.max_team_members,
                'max_creator_lists': self.plan.max_creator_lists,
                'max_client_workspaces': self.plan.max_client_workspaces,
                'service_fee_percentage': self.plan.service_fee_percentage,
            }

        return restrictions.get(key)

    def is_feature_available(self, feature: str) -> bool:
        """
        Check if a feature is available on this plan

        Args:
            feature: The feature name (e.g., 'analytics', 'priority_support')

        Returns:
            True if feature is available, False otherwise
        """
        if not self.plan:
            return False

        # Map of feature names to plan attributes
        feature_map = {
            'analytics': self.plan.analytics_access,
            'advanced_analytics': self.plan.has_advanced_analytics,
            'priority_support': self.plan.priority_support,
            'api_access': self.plan.has_api_access or self.plan.api_access,
            'custom_branding': self.plan.has_custom_branding,
            'dedicated_support': self.plan.has_dedicated_support,
            'priority_listing': self.plan.has_priority_listing,
            'verified_badge': self.plan.has_verified_badge if self.plan.user_type == 'creator' else False,
            'message_brands_first': self.plan.can_message_brands_first if self.plan.user_type == 'creator' else False,
            'access_briefs': self.plan.can_access_briefs if self.plan.user_type == 'creator' else False,
            'access_campaigns': self.plan.can_access_campaigns if self.plan.user_type == 'creator' else False,
            'custom_packages': self.plan.can_create_custom_packages if self.plan.user_type == 'creator' else False,
        }

        return feature_map.get(feature, False)

    def get_commission_rate(self) -> float:
        """Get the commission/service fee percentage for this subscription"""
        if not self.plan:
            return 15.0  # Default fallback

        if self.plan.user_type == 'creator':
            return float(self.plan.commission_percentage) if self.plan.commission_percentage else 15.0
        else:  # brand
            return float(self.plan.service_fee_percentage) if self.plan.service_fee_percentage else 12.0

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan': self.plan.to_dict() if self.plan else None,
            'status': self.status,
            'billing_cycle': self.billing_cycle,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'payment_method': self.payment_method,
            'next_payment_date': self.next_payment_date.isoformat() if self.next_payment_date else None,
            'last_payment_date': self.last_payment_date.isoformat() if self.last_payment_date else None,
            'last_payment_amount': float(self.last_payment_amount) if self.last_payment_amount else None,
            'days_until_renewal': self.days_until_renewal(),
            'is_active': self.is_active(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Subscription user_id={self.user_id} plan={self.plan.name if self.plan else None} status={self.status}>'
