"""
Update Brand Subscription Plans to Match New Specifications
"""
from app import create_app, db
from app.models import SubscriptionPlan

def update_brand_plans():
    app = create_app()

    with app.app_context():
        print("Updating Brand Subscription Plans...")

        # Free Plan
        free_plan = SubscriptionPlan.query.filter_by(user_type='brand', slug='brand-free').first()
        if not free_plan:
            free_plan = SubscriptionPlan.query.filter_by(user_type='brand', name='Free').first()

        if free_plan:
            free_plan.name = 'Free'
            free_plan.slug = 'brand-free'
            free_plan.price_monthly = 0.00
            free_plan.price_yearly = 0.00
            free_plan.platform_fee_percentage = 12.00
            free_plan.max_active_campaigns = 1
            free_plan.max_active_collaborations = 3
            free_plan.max_team_members = 1
            free_plan.max_creator_lists = 3
            free_plan.analytics_access = True  # Basic analytics
            free_plan.priority_support = False
            free_plan.has_advanced_analytics = False
            free_plan.description = 'Try the platform - Perfect for getting started'
            print(f"✓ Updated: {free_plan.name}")

        # Starter Plan (was Business)
        starter_plan = SubscriptionPlan.query.filter_by(user_type='brand', slug='brand-starter').first()
        if not starter_plan:
            starter_plan = SubscriptionPlan.query.filter_by(user_type='brand', name='Starter').first()

        if starter_plan:
            starter_plan.name = 'Starter'
            starter_plan.slug = 'brand-starter'
            starter_plan.price_monthly = 29.00
            starter_plan.price_yearly = 290.00  # ~2 months free
            starter_plan.platform_fee_percentage = 8.00
            starter_plan.max_active_campaigns = 3
            starter_plan.max_active_collaborations = 10
            starter_plan.max_team_members = 2
            starter_plan.max_creator_lists = 10
            starter_plan.analytics_access = True
            starter_plan.priority_support = False
            starter_plan.has_advanced_analytics = False
            starter_plan.description = 'Local brands getting serious'
            print(f"✓ Updated: {starter_plan.name}")
        else:
            # Create Starter if doesn't exist
            starter_plan = SubscriptionPlan(
                name='Starter',
                slug='brand-starter',
                user_type='brand',
                price_monthly=29.00,
                price_yearly=290.00,
                platform_fee_percentage=8.00,
                max_active_campaigns=3,
                max_active_collaborations=10,
                max_team_members=2,
                max_creator_lists=10,
                analytics_access=True,
                priority_support=False,
                has_advanced_analytics=False,
                is_active=True,
                display_order=2,
                description='Local brands getting serious'
            )
            db.session.add(starter_plan)
            print(f"✓ Created: {starter_plan.name}")

        # Pro Plan
        pro_plan = SubscriptionPlan.query.filter_by(user_type='brand', slug='brand-pro').first()
        if not pro_plan:
            pro_plan = SubscriptionPlan.query.filter_by(user_type='brand', name='Pro').first()

        if pro_plan:
            pro_plan.name = 'Pro'
            pro_plan.slug = 'brand-pro'
            pro_plan.price_monthly = 89.00
            pro_plan.price_yearly = 890.00  # ~2 months free
            pro_plan.platform_fee_percentage = 6.00
            pro_plan.max_active_campaigns = 10
            pro_plan.max_active_collaborations = 30
            pro_plan.max_team_members = 3
            pro_plan.max_creator_lists = -1  # Unlimited
            pro_plan.analytics_access = True
            pro_plan.priority_support = False
            pro_plan.has_advanced_analytics = True  # Live dashboard, exportable reports
            starter_plan.description = 'Run campaigns intelligently - Most Popular'
            print(f"✓ Updated: {pro_plan.name}")

        # Premium Plan (was Enterprise)
        premium_plan = SubscriptionPlan.query.filter_by(user_type='brand', slug='brand-premium').first()
        if not premium_plan:
            premium_plan = SubscriptionPlan.query.filter_by(user_type='brand', name='Premium').first()

        if premium_plan:
            premium_plan.name = 'Premium'
            premium_plan.slug = 'brand-premium'
            premium_plan.price_monthly = 199.00
            premium_plan.price_yearly = 1990.00  # ~2 months free
            premium_plan.platform_fee_percentage = 3.00
            premium_plan.max_active_campaigns = -1  # Unlimited
            premium_plan.max_active_collaborations = -1  # Unlimited
            premium_plan.max_team_members = 5
            premium_plan.max_creator_lists = -1  # Unlimited
            premium_plan.max_client_workspaces = 0
            premium_plan.analytics_access = True
            premium_plan.priority_support = True
            premium_plan.has_advanced_analytics = True
            premium_plan.has_dedicated_support = True
            premium_plan.description = 'Enterprise brand intelligence'
            print(f"✓ Updated: {premium_plan.name}")

        # Agency Plan
        agency_plan = SubscriptionPlan.query.filter_by(user_type='brand', slug='brand-agency').first()
        if not agency_plan:
            agency_plan = SubscriptionPlan.query.filter_by(user_type='brand', name='Agency').first()

        if agency_plan:
            agency_plan.name = 'Agency'
            agency_plan.slug = 'brand-agency'
            agency_plan.price_monthly = 399.00
            agency_plan.price_yearly = 3990.00  # ~2 months free
            agency_plan.platform_fee_percentage = 2.00
            agency_plan.max_active_campaigns = -1  # Unlimited
            agency_plan.max_active_collaborations = -1  # Unlimited
            agency_plan.max_team_members = 10
            agency_plan.max_creator_lists = -1  # Unlimited
            agency_plan.max_client_workspaces = 10  # 10 included
            agency_plan.analytics_access = True
            agency_plan.priority_support = True
            agency_plan.has_advanced_analytics = True
            agency_plan.has_dedicated_support = True
            agency_plan.description = 'For marketing agencies'
            print(f"✓ Updated: {agency_plan.name}")
        else:
            # Create Agency if doesn't exist
            agency_plan = SubscriptionPlan(
                name='Agency',
                slug='brand-agency',
                user_type='brand',
                price_monthly=399.00,
                price_yearly=3990.00,
                platform_fee_percentage=2.00,
                max_active_campaigns=-1,
                max_active_collaborations=-1,
                max_team_members=10,
                max_creator_lists=-1,
                max_client_workspaces=10,
                analytics_access=True,
                priority_support=True,
                has_advanced_analytics=True,
                has_dedicated_support=True,
                is_active=True,
                display_order=5,
                description='For marketing agencies'
            )
            db.session.add(agency_plan)
            print(f"✓ Created: {agency_plan.name}")

        # Commit changes
        db.session.commit()
        print("\n✅ All brand plans updated successfully!")

        # Display updated plans
        print("\nUpdated Brand Plans:")
        print("-" * 100)
        print(f"{'Plan':<15} {'Price':<10} {'Fee':<8} {'Campaigns':<12} {'Collabs':<10} {'Team':<8} {'Lists':<10}")
        print("-" * 100)

        brand_plans = SubscriptionPlan.query.filter_by(user_type='brand').order_by(SubscriptionPlan.price_monthly).all()
        for plan in brand_plans:
            campaigns = 'Unlimited' if plan.max_active_campaigns == -1 else str(plan.max_active_campaigns)
            collabs = 'Unlimited' if plan.max_active_collaborations == -1 else str(plan.max_active_collaborations)
            lists = 'Unlimited' if plan.max_creator_lists == -1 else str(plan.max_creator_lists)
            print(f"{plan.name:<15} ${plan.price_monthly:<9.2f} {plan.platform_fee_percentage:<7.0f}% {campaigns:<12} {collabs:<10} {plan.max_team_members:<8} {lists:<10}")

if __name__ == '__main__':
    update_brand_plans()
