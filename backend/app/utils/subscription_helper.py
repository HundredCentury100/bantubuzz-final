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


def get_brand_service_fee_percentage(brand_user_id):
    """
    Get the brand collaboration service fee percentage for invoices and checkout.
    Falls back to 12% when a plan is missing or old rows have no value.
    """
    subscription = Subscription.query.filter_by(
        user_id=brand_user_id,
        status='active'
    ).first()

    if not subscription or not subscription.plan:
        return 12.0

    fee_percentage = subscription.plan.service_fee_percentage
    return float(fee_percentage) if fee_percentage is not None else 12.0


def get_brand_analytics_entitlements(brand_user_id):
    """Return campaign analytics access for the active brand subscription."""
    plan = get_brand_subscription_plan(brand_user_id)
    if not plan:
        return {
            'enabled': False,
            'full_sentiment': False,
            'plan_name': 'Free',
            'plan_slug': 'free',
        }

    slug = (plan.slug or '').lower()
    name = (plan.name or '').lower()
    pro_or_higher = (
        bool(plan.analytics_access or plan.has_advanced_analytics)
        or any(token in slug for token in ('pro', 'premium', 'agency', 'enterprise'))
        or any(token in name for token in ('pro', 'premium', 'agency', 'enterprise'))
    )
    full_sentiment = (
        any(token in slug for token in ('premium', 'agency', 'enterprise'))
        or any(token in name for token in ('premium', 'agency', 'enterprise'))
    )

    return {
        'enabled': pro_or_higher,
        'full_sentiment': full_sentiment,
        'plan_name': plan.name,
        'plan_slug': plan.slug,
    }


def get_brand_report_entitlements(brand_user_id):
    """Return server-enforced campaign reporting capabilities."""
    analytics = get_brand_analytics_entitlements(brand_user_id)
    slug = (analytics.get('plan_slug') or '').lower()
    name = (analytics.get('plan_name') or '').lower()
    premium_or_higher = any(
        token in slug or token in name
        for token in ('premium', 'agency', 'enterprise')
    )
    return {
        **analytics,
        'pdf_export': analytics['enabled'],
        'csv_export': analytics['enabled'],
        'white_label': premium_or_higher,
        'custom_date_range': premium_or_higher,
        'shareable_links': premium_or_higher,
        'scheduled_reports': analytics['enabled'],
    }
