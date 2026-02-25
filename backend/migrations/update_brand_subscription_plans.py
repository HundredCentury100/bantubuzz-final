"""
Migration: Update Brand Subscription Plans to Collabstr-style Tiered Pricing
Run: python migrations/update_brand_subscription_plans.py

Updates:
- Free Tier: $0/mo (marketplace access with 10% service fee)
- Pro Tier: $120/mo or $1,200/yr (campaign analytics, advanced creator analytics, basic sentiment)
- Premium Tier: $250/mo or $2,500/yr (full sentiment, brand monitoring, reduced fees, priority support)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Check if column exists and add if needed (SQLite compatible)
    def add_column_if_not_exists():
        try:
            # Try to query the column - if it fails, it doesn't exist
            db.session.execute(text("SELECT platform_fee_percentage FROM subscription_plans LIMIT 1"))
            print("Column platform_fee_percentage already exists")
        except Exception:
            # Column doesn't exist, add it
            print("Adding platform_fee_percentage column...")
            db.session.execute(text("ALTER TABLE subscription_plans ADD COLUMN platform_fee_percentage FLOAT DEFAULT 10.00"))
            db.session.commit()

    # Update subscription plans to new Collabstr-style tiers
    update_plans_sql = """
    -- Delete old Starter and Agency plans (we're moving to Free, Pro, Premium)
    DELETE FROM subscription_plans WHERE slug IN ('starter', 'agency');

    -- Update Free Plan
    UPDATE subscription_plans
    SET
        name = 'Free',
        description = 'Try BantuBuzz. Pay only when you collaborate.',
        price_monthly = 0.0,
        price_yearly = 0.0,
        max_packages = -1,  -- Unlimited
        max_bookings_per_month = -1,  -- Unlimited
        can_access_briefs = TRUE,  -- Can create briefs
        can_access_campaigns = TRUE,  -- Can create campaigns
        can_create_custom_packages = TRUE,
        featured_priority = 0,
        badge_label = NULL,
        search_boost = 1.0,
        priority_support = FALSE,
        analytics_access = FALSE,  -- NO live analytics dashboards
        api_access = FALSE,
        platform_fee_percentage = 10.00,  -- 10% service fee
        is_active = TRUE,
        is_default = TRUE,
        display_order = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE slug = 'free';

    -- Update or Insert Pro Plan
    INSERT INTO subscription_plans
    (name, slug, description, price_monthly, price_yearly, max_packages, max_bookings_per_month,
     can_access_briefs, can_access_campaigns, can_create_custom_packages, featured_priority,
     badge_label, search_boost, priority_support, analytics_access, api_access,
     platform_fee_percentage, is_active, is_default, display_order)
    VALUES
    ('Pro', 'pro', 'Powerful insights for growing brands.',
     120.00, 1200.00, -1, -1, TRUE, TRUE, TRUE, 1, 'Pro Brand', 1.2, FALSE, TRUE, FALSE,
     10.00, TRUE, FALSE, 1)
    ON CONFLICT (slug)
    DO UPDATE SET
        name = 'Pro',
        description = 'Powerful insights for growing brands.',
        price_monthly = 120.00,
        price_yearly = 1200.00,
        max_packages = -1,
        max_bookings_per_month = -1,
        can_access_briefs = TRUE,
        can_access_campaigns = TRUE,
        can_create_custom_packages = TRUE,
        featured_priority = 1,
        badge_label = 'Pro Brand',
        search_boost = 1.2,
        priority_support = FALSE,
        analytics_access = TRUE,
        api_access = FALSE,
        platform_fee_percentage = 10.00,
        is_active = TRUE,
        is_default = FALSE,
        display_order = 1,
        updated_at = CURRENT_TIMESTAMP;

    -- Insert Premium Plan
    INSERT INTO subscription_plans
    (name, slug, description, price_monthly, price_yearly, max_packages, max_bookings_per_month,
     can_access_briefs, can_access_campaigns, can_create_custom_packages, featured_priority,
     badge_label, search_boost, priority_support, analytics_access, api_access,
     platform_fee_percentage, is_active, is_default, display_order)
    VALUES
    ('Premium', 'premium', 'Enterprise-grade intelligence & brand monitoring.',
     250.00, 2500.00, -1, -1, TRUE, TRUE, TRUE, 2, 'Premium Brand', 1.5, TRUE, TRUE, FALSE,
     5.00, TRUE, FALSE, 2)
    ON CONFLICT (slug)
    DO UPDATE SET
        name = 'Premium',
        description = 'Enterprise-grade intelligence & brand monitoring.',
        price_monthly = 250.00,
        price_yearly = 2500.00,
        max_packages = -1,
        max_bookings_per_month = -1,
        can_access_briefs = TRUE,
        can_access_campaigns = TRUE,
        can_create_custom_packages = TRUE,
        featured_priority = 2,
        badge_label = 'Premium Brand',
        search_boost = 1.5,
        priority_support = TRUE,
        analytics_access = TRUE,
        api_access = FALSE,
        platform_fee_percentage = 5.00,  -- Reduced fee for Premium
        is_active = TRUE,
        is_default = FALSE,
        display_order = 2,
        updated_at = CURRENT_TIMESTAMP;
    """

    try:
        add_column_if_not_exists()

        print("Updating subscription plans to Collabstr-style tiers...")
        db.session.execute(text(update_plans_sql))
        db.session.commit()

        print("\nBrand subscription plans updated successfully!")
        print("✓ New structure:")
        print("  - Free ($0/mo): Marketplace access with 10% service fee")
        print("  - Pro ($120/mo or $1,200/yr): Campaign & creator analytics, basic sentiment")
        print("  - Premium ($250/mo or $2,500/yr): Full analytics, brand monitoring, 5% service fee, priority support")

        # Print current plans
        result = db.session.execute(text("""
            SELECT name, price_monthly, price_yearly, platform_fee_percentage, analytics_access, priority_support
            FROM subscription_plans
            WHERE is_active = TRUE
            ORDER BY display_order
        """))

        print("\n✓ Current Active Plans:")
        for row in result:
            print(f"  - {row[0]}: ${row[1]}/mo (${row[2]}/yr), Fee: {row[3]}%, Analytics: {row[4]}, Support: {row[5]}")

    except Exception as e:
        print(f"\nError: {e}")
        db.session.rollback()
        import traceback
        traceback.print_exc()
