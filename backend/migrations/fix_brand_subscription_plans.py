"""
Migration: Fix Brand Subscription Plans
- Add platform_fee_percentage column
- Update plans to: Free (10%), Pro (10%), Premium (5%)
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # 1. Add platform_fee_percentage column
        print('Adding platform_fee_percentage column...')
        db.session.execute(text('''
            ALTER TABLE subscription_plans
            ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2) DEFAULT 10.00
        '''))
        db.session.commit()

        # 2. Update Free plan
        print('Updating Free plan...')
        db.session.execute(text('''
            UPDATE subscription_plans
            SET
                name = 'Free',
                description = 'Get started with basic features - 10% platform fee',
                platform_fee_percentage = 10.00,
                price_monthly = 0.00,
                price_yearly = 0.00,
                badge_label = NULL
            WHERE slug = 'free'
        '''))

        # 3. Delete old Starter plan, keep Pro
        print('Cleaning up duplicate plans...')
        db.session.execute(text('''
            DELETE FROM subscription_plans WHERE slug = 'starter'
        '''))

        # Update Pro plan
        print('Updating Pro plan...')
        db.session.execute(text('''
            UPDATE subscription_plans
            SET
                name = 'Pro',
                description = 'Professional features for active brands - 10% platform fee',
                platform_fee_percentage = 10.00
            WHERE slug = 'pro'
        '''))

        # 4. Rename Agency to Premium
        print('Renaming Agency to Premium...')
        db.session.execute(text('''
            UPDATE subscription_plans
            SET
                name = 'Premium',
                slug = 'premium',
                description = 'Premium features with reduced platform fees - 5% platform fee',
                platform_fee_percentage = 5.00,
                badge_label = 'Premium Brand'
            WHERE slug = 'agency'
        '''))

        db.session.commit()
        print('✅ Brand subscription plans updated successfully')
        print('   - Free: 10% platform fee')
        print('   - Pro: 10% platform fee')
        print('   - Premium: 5% platform fee')

    except Exception as e:
        db.session.rollback()
        print(f'❌ Migration failed: {str(e)}')
        raise
