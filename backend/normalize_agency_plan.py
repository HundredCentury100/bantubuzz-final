"""Normalize the brand Agency subscription plan for production QA.

Run from the backend directory:
    python normalize_agency_plan.py
"""
from app import create_app, db
from app.models import SubscriptionPlan


def normalize_agency_plan():
    app = create_app()
    with app.app_context():
        plan = (
            SubscriptionPlan.query.filter_by(user_type='brand', slug='brand-agency').first()
            or SubscriptionPlan.query.filter_by(user_type='brand', slug='agency').first()
            or SubscriptionPlan.query.filter_by(user_type='brand', name='Agency').first()
        )

        if not plan:
            plan = SubscriptionPlan(user_type='brand')
            db.session.add(plan)

        plan.name = 'Agency'
        plan.slug = 'brand-agency'
        plan.description = 'For marketing agencies managing multiple client brands'
        plan.price_monthly = 399.00
        plan.price_yearly = 3990.00
        plan.platform_fee_percentage = 2.00
        plan.service_fee_percentage = 2.00
        plan.max_active_campaigns = -1
        plan.max_active_collaborations = -1
        plan.max_team_members = 10
        plan.max_creator_lists = -1
        plan.max_client_workspaces = 10
        plan.analytics_access = True
        plan.priority_support = True
        plan.has_advanced_analytics = True
        plan.has_custom_branding = True
        plan.has_dedicated_support = True
        plan.is_active = True
        plan.is_default = False
        plan.display_order = 5
        plan.badge_label = 'Agency Partner'

        db.session.commit()
        print('Agency plan normalized: $399/mo, $3990/year, 10 workspaces, 10 seats, 2% fee')


if __name__ == '__main__':
    normalize_agency_plan()
