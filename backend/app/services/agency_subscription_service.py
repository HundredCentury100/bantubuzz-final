"""Agency/enterprise subscription entitlement helpers."""
from app.models import BrandProfile, SubscriptionPlan


AGENCY_PLAN_SLUGS = {'agency', 'brand-agency'}


def is_agency_plan(plan):
    """Return true when a brand plan unlocks agency workspaces."""
    if not plan or getattr(plan, 'user_type', None) != 'brand':
        return False
    slug = (getattr(plan, 'slug', '') or '').lower()
    return slug in AGENCY_PLAN_SLUGS or int(getattr(plan, 'max_client_workspaces', 0) or 0) > 0


def apply_brand_subscription_entitlements(user_id, plan):
    """Apply account-mode changes implied by a paid brand subscription."""
    if not plan or getattr(plan, 'user_type', None) != 'brand':
        return None

    brand = BrandProfile.query.filter_by(user_id=user_id).first()
    if not brand:
        return None

    if is_agency_plan(plan):
        brand.account_type = 'agency'
    elif brand.account_type != 'enterprise':
        brand.account_type = 'brand'

    return brand


def agency_plan_query():
    """Find the canonical active Agency plan, tolerating legacy slug variants."""
    return SubscriptionPlan.query.filter(
        SubscriptionPlan.user_type == 'brand',
        SubscriptionPlan.is_active == True,
        SubscriptionPlan.slug.in_(list(AGENCY_PLAN_SLUGS)),
    ).order_by(SubscriptionPlan.price_monthly.desc())
