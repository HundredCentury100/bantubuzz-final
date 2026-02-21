"""
Migration: Add subscription system (plans and subscriptions tables)
Run: python migrations/add_subscriptions.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Create subscription_plans table
    plans_sql = """
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,

        price_monthly FLOAT DEFAULT 0.0,
        price_yearly FLOAT DEFAULT 0.0,

        max_packages INTEGER DEFAULT 3,
        max_bookings_per_month INTEGER DEFAULT 5,
        can_access_briefs BOOLEAN DEFAULT FALSE,
        can_access_campaigns BOOLEAN DEFAULT FALSE,
        can_create_custom_packages BOOLEAN DEFAULT TRUE,

        featured_priority INTEGER DEFAULT 0,
        badge_label VARCHAR(30),
        search_boost FLOAT DEFAULT 1.0,

        priority_support BOOLEAN DEFAULT FALSE,
        analytics_access BOOLEAN DEFAULT FALSE,
        api_access BOOLEAN DEFAULT FALSE,

        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
    CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
    """

    # Create subscriptions table
    subscriptions_sql = """
    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),

        status VARCHAR(20) DEFAULT 'active',
        billing_cycle VARCHAR(20) DEFAULT 'monthly',

        current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        current_period_end TIMESTAMP,
        trial_end TIMESTAMP,

        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,

        payment_method VARCHAR(30),
        payment_reference VARCHAR(100),
        last_payment_date TIMESTAMP,
        next_payment_date TIMESTAMP,
        last_payment_amount FLOAT,

        admin_note TEXT,
        modified_by_admin INTEGER REFERENCES users(id),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
    """

    # Seed default subscription plans
    seed_plans_sql = """
    INSERT INTO subscription_plans
    (name, slug, description, price_monthly, price_yearly, max_packages, max_bookings_per_month,
     can_access_briefs, can_access_campaigns, can_create_custom_packages, featured_priority,
     badge_label, search_boost, priority_support, analytics_access, api_access, is_active,
     is_default, display_order)
    VALUES
    -- Free Plan (Default)
    ('Free', 'free', 'Perfect for getting started on BantuBuzz',
     0.0, 0.0, 3, 5, FALSE, FALSE, TRUE, 0, NULL, 1.0, FALSE, FALSE, FALSE, TRUE, TRUE, 0),

    -- Starter Plan
    ('Starter', 'starter', 'Grow your creator business with more visibility',
     9.99, 99.00, 10, 20, TRUE, TRUE, TRUE, 1, 'Starter Creator', 1.2, FALSE, TRUE, FALSE, TRUE, FALSE, 1),

    -- Pro Plan
    ('Pro', 'pro', 'Professional features for serious creators',
     29.99, 299.00, 50, 100, TRUE, TRUE, TRUE, 2, 'Pro Creator', 1.5, TRUE, TRUE, FALSE, TRUE, FALSE, 2),

    -- Agency Plan
    ('Agency', 'agency', 'Full-service solution for agencies and teams',
     99.99, 999.00, 999, 999, TRUE, TRUE, TRUE, 3, 'Agency Partner', 2.0, TRUE, TRUE, TRUE, TRUE, FALSE, 3)

    ON CONFLICT (slug) DO NOTHING;
    """

    try:
        print("Creating subscription_plans table...")
        db.session.execute(text(plans_sql))

        print("Creating subscriptions table...")
        db.session.execute(text(subscriptions_sql))

        print("Seeding default subscription plans...")
        db.session.execute(text(seed_plans_sql))

        db.session.commit()
        print("\n✓ Subscription system created successfully!")
        print("✓ Default plans seeded: Free, Starter, Pro, Agency")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.session.rollback()
        import traceback
        traceback.print_exc()
