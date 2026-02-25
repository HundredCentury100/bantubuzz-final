"""
Helper functions for subscription-related operations
"""
from app.models import Subscription, SubscriptionPlan


def get_brand_platform_fee_percentage(brand_user_id):
    """
    Get the platform fee percentage for a brand based on their subscription tier.

    Returns:
        float: Platform fee percentage (e.g., 10.0 for 10%, 5.0 for 5%)

    Tiers:
        - Free: 10%
        - Pro: 10%
        - Premium: 5%
    """
    # Get active subscription for brand
    subscription = Subscription.query.filter_by(
        user_id=brand_user_id,
        status='active'
    ).first()

    if not subscription or not subscription.plan:
        # Default to 10% if no subscription found
        return 10.0

    # Get platform fee from subscription plan
    fee_percentage = subscription.plan.platform_fee_percentage

    # Return fee percentage, default to 10% if not set
    return float(fee_percentage) if fee_percentage is not None else 10.0


def get_brand_subscription_plan(brand_user_id):
    """
    Get the subscription plan object for a brand.

    Returns:
        SubscriptionPlan or None
    """
    subscription = Subscription.query.filter_by(
        user_id=brand_user_id,
        status='active'
    ).first()

    return subscription.plan if subscription else None
