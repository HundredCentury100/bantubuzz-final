"""
Script to insert new subscription plans
Assumes schema migration has already been completed
"""
import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db
from app.models.subscription_plan import SubscriptionPlan

app = create_app()

def insert_new_plans():
    with app.app_context():
        print("\n" + "="*80)
        print("INSERTING NEW SUBSCRIPTION PLANS")
        print("="*80 + "\n")

        # Update existing plans first
        print("Step 1: Updating existing plans with new values...")
        try:
            # Update Free plan
            free_plan = SubscriptionPlan.query.filter_by(slug='free').first()
            if free_plan:
                free_plan.user_type = 'brand'
                free_plan.max_active_campaigns = 5
                free_plan.max_active_collaborations = 10
                free_plan.max_team_members = 1
                free_plan.max_creator_lists = 3
                free_plan.max_client_workspaces = 0
                free_plan.service_fee_percentage = 12.00
                free_plan.platform_fee_percentage = 12.00
                free_plan.display_order = 1
                free_plan.has_advanced_analytics = False
                free_plan.has_priority_listing = False
                free_plan.has_custom_branding = False
                free_plan.has_dedicated_support = False
                free_plan.has_api_access = False
                print("  ✓ Updated Free plan")

            # Update Pro plan
            pro_plan = SubscriptionPlan.query.filter_by(slug='pro').first()
            if pro_plan:
                pro_plan.user_type = 'brand'
                pro_plan.price_monthly = 89.00
                pro_plan.price_yearly = 890.00
                pro_plan.max_active_campaigns = 50
                pro_plan.max_active_collaborations = 100
                pro_plan.max_team_members = 5
                pro_plan.max_creator_lists = 50
                pro_plan.max_client_workspaces = 3
                pro_plan.service_fee_percentage = 6.00
                pro_plan.platform_fee_percentage = 6.00
                pro_plan.has_advanced_analytics = True
                pro_plan.has_priority_listing = True
                pro_plan.has_custom_branding = False
                pro_plan.has_dedicated_support = False
                pro_plan.has_api_access = False
                pro_plan.display_order = 3
                print("  ✓ Updated Pro plan (price: $89/mo, $890/yr)")

            # Update Premium plan
            premium_plan = SubscriptionPlan.query.filter_by(slug='premium').first()
            if premium_plan:
                premium_plan.user_type = 'brand'
                premium_plan.price_monthly = 199.00
                premium_plan.price_yearly = 1990.00
                premium_plan.max_active_campaigns = 200
                premium_plan.max_active_collaborations = 500
                premium_plan.max_team_members = 20
                premium_plan.max_creator_lists = 200
                premium_plan.max_client_workspaces = 10
                premium_plan.service_fee_percentage = 3.00
                premium_plan.platform_fee_percentage = 3.00
                premium_plan.has_advanced_analytics = True
                premium_plan.has_priority_listing = True
                premium_plan.has_custom_branding = True
                premium_plan.has_dedicated_support = True
                premium_plan.has_api_access = True
                premium_plan.display_order = 4
                print("  ✓ Updated Premium plan (price: $199/mo, $1990/yr)")

            db.session.commit()
            print("\n✓ Existing plans updated successfully\n")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error updating existing plans: {e}\n")

        # Insert new brand plans
        print("Step 2: Inserting new brand plans...")
        try:
            starter_exists = SubscriptionPlan.query.filter_by(slug='starter').first()
            agency_exists = SubscriptionPlan.query.filter_by(slug='agency').first()

            if not starter_exists:
                starter = SubscriptionPlan(
                    name='Starter',
                    slug='starter',
                    description='Perfect for small brands starting their influencer marketing journey',
                    user_type='brand',
                    price_monthly=29.00,
                    price_yearly=290.00,
                    max_packages=10,
                    max_bookings_per_month=20,
                    max_active_campaigns=15,
                    max_active_collaborations=30,
                    max_team_members=2,
                    max_creator_lists=10,
                    max_client_workspaces=1,
                    service_fee_percentage=8.00,
                    platform_fee_percentage=8.00,
                    can_access_briefs=True,
                    can_access_campaigns=True,
                    can_create_custom_packages=True,
                    priority_support=False,
                    analytics_access=True,
                    api_access=False,
                    has_advanced_analytics=True,
                    has_priority_listing=False,
                    has_custom_branding=False,
                    has_dedicated_support=False,
                    has_api_access=False,
                    featured_priority=1,
                    search_boost=1.0,
                    is_active=True,
                    is_default=False,
                    display_order=2
                )
                db.session.add(starter)
                print("  ✓ Added Starter plan ($29/mo)")
            else:
                print("  ⊘ Starter plan already exists, skipping")

            if not agency_exists:
                agency = SubscriptionPlan(
                    name='Agency',
                    slug='agency',
                    description='Enterprise solution for agencies managing multiple clients',
                    user_type='brand',
                    price_monthly=399.00,
                    price_yearly=3990.00,
                    max_packages=999999,
                    max_bookings_per_month=999999,
                    max_active_campaigns=999999,
                    max_active_collaborations=999999,
                    max_team_members=999999,
                    max_creator_lists=999999,
                    max_client_workspaces=999999,
                    service_fee_percentage=2.00,
                    platform_fee_percentage=2.00,
                    can_access_briefs=True,
                    can_access_campaigns=True,
                    can_create_custom_packages=True,
                    priority_support=True,
                    analytics_access=True,
                    api_access=True,
                    has_advanced_analytics=True,
                    has_priority_listing=True,
                    has_custom_branding=True,
                    has_dedicated_support=True,
                    has_api_access=True,
                    featured_priority=5,
                    badge_label='Agency Partner',
                    search_boost=1.5,
                    is_active=True,
                    is_default=False,
                    display_order=5
                )
                db.session.add(agency)
                print("  ✓ Added Agency plan ($399/mo)")
            else:
                print("  ⊘ Agency plan already exists, skipping")

            db.session.commit()
            print("\n✓ New brand plans inserted successfully\n")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error inserting brand plans: {e}\n")

        # Insert new creator plans
        print("Step 3: Inserting new creator plans...")
        try:
            creator_free_exists = SubscriptionPlan.query.filter_by(slug='creator-free').first()
            rising_exists = SubscriptionPlan.query.filter_by(slug='rising').first()
            pro_creator_exists = SubscriptionPlan.query.filter_by(slug='pro-creator').first()

            if not creator_free_exists:
                creator_free = SubscriptionPlan(
                    name='Creator Free',
                    slug='creator-free',
                    description='Start your creator journey on BantuBuzz',
                    user_type='creator',
                    price_monthly=0.00,
                    price_yearly=0.00,
                    max_packages=3,
                    max_bookings_per_month=5,
                    max_portfolio_items=10,
                    commission_percentage=15.00,
                    has_verified_badge=False,
                    search_placement_priority=0,
                    can_message_brands_first=False,
                    can_access_briefs=True,
                    can_access_campaigns=True,
                    can_create_custom_packages=True,
                    priority_support=False,
                    analytics_access=False,
                    api_access=False,
                    has_advanced_analytics=False,
                    has_priority_listing=False,
                    featured_priority=0,
                    search_boost=1.0,
                    is_active=True,
                    is_default=True,
                    display_order=1
                )
                db.session.add(creator_free)
                print("  ✓ Added Creator Free plan")
            else:
                print("  ⊘ Creator Free plan already exists, skipping")

            if not rising_exists:
                rising = SubscriptionPlan(
                    name='Rising',
                    slug='rising',
                    description='Grow your creator business with enhanced features',
                    user_type='creator',
                    price_monthly=9.00,
                    price_yearly=90.00,
                    max_packages=10,
                    max_bookings_per_month=20,
                    max_portfolio_items=50,
                    commission_percentage=10.00,
                    has_verified_badge=True,
                    search_placement_priority=1,
                    can_message_brands_first=True,
                    can_access_briefs=True,
                    can_access_campaigns=True,
                    can_create_custom_packages=True,
                    priority_support=False,
                    analytics_access=True,
                    api_access=False,
                    has_advanced_analytics=True,
                    has_priority_listing=True,
                    featured_priority=2,
                    badge_label='Rising Star',
                    search_boost=1.2,
                    is_active=True,
                    is_default=False,
                    display_order=2
                )
                db.session.add(rising)
                print("  ✓ Added Rising plan ($9/mo)")
            else:
                print("  ⊘ Rising plan already exists, skipping")

            if not pro_creator_exists:
                pro_creator = SubscriptionPlan(
                    name='Pro Creator',
                    slug='pro-creator',
                    description='Maximum visibility and minimum fees for professional creators',
                    user_type='creator',
                    price_monthly=19.00,
                    price_yearly=190.00,
                    max_packages=999999,
                    max_bookings_per_month=999999,
                    max_portfolio_items=999999,
                    commission_percentage=7.00,
                    has_verified_badge=True,
                    search_placement_priority=2,
                    can_message_brands_first=True,
                    can_access_briefs=True,
                    can_access_campaigns=True,
                    can_create_custom_packages=True,
                    priority_support=True,
                    analytics_access=True,
                    api_access=True,
                    has_advanced_analytics=True,
                    has_priority_listing=True,
                    featured_priority=3,
                    badge_label='Pro Creator',
                    search_boost=1.5,
                    is_active=True,
                    is_default=False,
                    display_order=3
                )
                db.session.add(pro_creator)
                print("  ✓ Added Pro Creator plan ($19/mo)")
            else:
                print("  ⊘ Pro Creator plan already exists, skipping")

            db.session.commit()
            print("\n✓ New creator plans inserted successfully\n")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error inserting creator plans: {e}\n")

        # Display final results
        print("\n" + "="*80)
        print("SUMMARY - ALL SUBSCRIPTION PLANS")
        print("="*80 + "\n")

        print("Brand Plans:")
        brand_plans = SubscriptionPlan.query.filter_by(user_type='brand').order_by(SubscriptionPlan.display_order).all()
        for plan in brand_plans:
            print(f"  • {plan.name:15} ${float(plan.price_monthly):6.2f}/mo  Service Fee: {float(plan.service_fee_percentage)}%")

        print("\nCreator Plans:")
        creator_plans = SubscriptionPlan.query.filter_by(user_type='creator').order_by(SubscriptionPlan.display_order).all()
        for plan in creator_plans:
            print(f"  • {plan.name:15} ${float(plan.price_monthly):6.2f}/mo  Commission: {float(plan.commission_percentage)}%")

        print("\n" + "="*80 + "\n")


if __name__ == '__main__':
    insert_new_plans()
