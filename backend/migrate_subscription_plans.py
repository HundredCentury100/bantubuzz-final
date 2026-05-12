"""
Migration Script: Add Subscription Plan Restrictions and New Plans
Date: 2026-04-14
Description: Updates subscription_plans table to support both brand and creator plans
"""
import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db
from app.models.subscription_plan import SubscriptionPlan
from sqlalchemy import text

app = create_app()

def run_migration():
    with app.app_context():
        print("\n" + "="*80)
        print("SUBSCRIPTION PLAN MIGRATION - Phase 1: Database Schema Updates")
        print("="*80 + "\n")

        # Step 1: Add new columns
        print("Step 1: Adding new columns to subscription_plans table...")
        try:
            with db.engine.connect() as conn:
                # Start transaction
                trans = conn.begin()

                try:
                    # Add user_type column
                    conn.execute(text("""
                        ALTER TABLE subscription_plans
                        ADD COLUMN IF NOT EXISTS user_type VARCHAR(10) DEFAULT 'brand';
                    """))
                    print("  ✓ Added user_type column")

                    # Brand-specific columns
                    conn.execute(text("""
                        ALTER TABLE subscription_plans
                        ADD COLUMN IF NOT EXISTS max_active_campaigns INTEGER DEFAULT 5,
                        ADD COLUMN IF NOT EXISTS max_active_collaborations INTEGER DEFAULT 10,
                        ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 1,
                        ADD COLUMN IF NOT EXISTS max_creator_lists INTEGER DEFAULT 3,
                        ADD COLUMN IF NOT EXISTS max_client_workspaces INTEGER DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS service_fee_percentage NUMERIC(5, 2) DEFAULT 12.00;
                    """))
                    print("  ✓ Added brand-specific restriction columns")

                    # Creator-specific columns
                    conn.execute(text("""
                        ALTER TABLE subscription_plans
                        ADD COLUMN IF NOT EXISTS max_portfolio_items INTEGER DEFAULT 10,
                        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 15.00,
                        ADD COLUMN IF NOT EXISTS has_verified_badge BOOLEAN DEFAULT FALSE,
                        ADD COLUMN IF NOT EXISTS search_placement_priority INTEGER DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS can_message_brands_first BOOLEAN DEFAULT FALSE;
                    """))
                    print("  ✓ Added creator-specific restriction columns")

                    # Feature columns
                    conn.execute(text("""
                        ALTER TABLE subscription_plans
                        ADD COLUMN IF NOT EXISTS has_advanced_analytics BOOLEAN DEFAULT FALSE,
                        ADD COLUMN IF NOT EXISTS has_priority_listing BOOLEAN DEFAULT FALSE,
                        ADD COLUMN IF NOT EXISTS has_custom_branding BOOLEAN DEFAULT FALSE,
                        ADD COLUMN IF NOT EXISTS has_dedicated_support BOOLEAN DEFAULT FALSE,
                        ADD COLUMN IF NOT EXISTS has_api_access BOOLEAN DEFAULT FALSE;
                    """))
                    print("  ✓ Added feature flag columns")

                    trans.commit()
                    print("\n✓ All columns added successfully\n")

                except Exception as e:
                    trans.rollback()
                    raise e

        except Exception as e:
            print(f"\n✗ Error adding columns: {e}")
            return False

        # Step 2: Update existing plans
        print("\nStep 2: Updating existing plans with new restriction values...")
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
            print(f"\n✗ Error updating existing plans: {e}")
            return False

        # Step 3: Insert new brand plans
        print("\nStep 3: Inserting new brand plans...")
        try:
            # Check if plans already exist
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
                    badge_label=None,
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
            print(f"\n✗ Error inserting brand plans: {e}")
            return False

        # Step 4: Insert new creator plans
        print("\nStep 4: Inserting new creator plans...")
        try:
            # Check if plans already exist
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
            print(f"\n✗ Error inserting creator plans: {e}")
            return False

        # Step 5: Display final results
        print("\n" + "="*80)
        print("MIGRATION COMPLETED SUCCESSFULLY")
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

        return True


if __name__ == '__main__':
    print("\nWARNING: This will modify the subscription_plans table in the database.")
    print("Make sure you have a backup before proceeding.\n")

    confirm = input("Do you want to proceed with the migration? (yes/no): ")

    if confirm.lower() == 'yes':
        success = run_migration()
        if success:
            print("\n✓ Migration completed successfully!")
        else:
            print("\n✗ Migration failed. Please check the errors above.")
    else:
        print("\nMigration cancelled.")
