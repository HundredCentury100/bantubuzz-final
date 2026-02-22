"""
Migration: Create Creator Subscription System
- creator_subscription_plans table (Featured & Verification)
- creator_subscriptions table
- verification_applications table
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # 1. Create creator_subscription_plans table
        print('Creating creator_subscription_plans table...')
        db.session.execute(text('''
            CREATE TABLE IF NOT EXISTS creator_subscription_plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                subscription_type VARCHAR(20) NOT NULL,
                featured_category VARCHAR(20),
                price DECIMAL(10,2) NOT NULL,
                duration_days INTEGER NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))

        # 2. Create creator_subscriptions table
        print('Creating creator_subscriptions table...')
        db.session.execute(text('''
            CREATE TABLE IF NOT EXISTS creator_subscriptions (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
                plan_id INTEGER NOT NULL REFERENCES creator_subscription_plans(id),
                status VARCHAR(20) DEFAULT 'active',
                payment_method VARCHAR(30),
                payment_reference VARCHAR(100),
                paynow_poll_url TEXT,
                payment_verified BOOLEAN DEFAULT FALSE,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                auto_renew BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))

        # 3. Create verification_applications table
        print('Creating verification_applications table...')
        db.session.execute(text('''
            CREATE TABLE IF NOT EXISTS verification_applications (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
                subscription_id INTEGER REFERENCES creator_subscriptions(id),
                status VARCHAR(20) DEFAULT 'pending',

                real_name VARCHAR(100) NOT NULL,
                id_type VARCHAR(50) NOT NULL,
                id_number VARCHAR(100) NOT NULL,

                id_document_front VARCHAR(255),
                id_document_back VARCHAR(255),
                selfie_with_id VARCHAR(255),

                instagram_verified BOOLEAN DEFAULT FALSE,
                instagram_username VARCHAR(100),
                instagram_followers INTEGER,
                tiktok_verified BOOLEAN DEFAULT FALSE,
                tiktok_username VARCHAR(100),
                tiktok_followers INTEGER,
                facebook_verified BOOLEAN DEFAULT FALSE,
                facebook_username VARCHAR(100),
                facebook_followers INTEGER,

                reason TEXT,
                payment_reference VARCHAR(100),
                payment_verified BOOLEAN DEFAULT FALSE,

                reviewed_by INTEGER REFERENCES users(id),
                reviewed_at TIMESTAMP,
                rejection_reason TEXT,
                admin_notes TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))

        db.session.commit()

        # 4. Insert default creator subscription plans
        print('Inserting default creator subscription plans...')
        db.session.execute(text('''
            INSERT INTO creator_subscription_plans
            (name, slug, subscription_type, featured_category, price, duration_days, description)
            VALUES
            ('General Featured', 'general-featured', 'featured', 'general', 10.00, 7,
             'Featured on homepage for all visitors - $10 per week'),
            ('Facebook Featured', 'facebook-featured', 'featured', 'facebook', 5.00, 7,
             'Featured in Facebook influencers section - $5 per week'),
            ('Instagram Featured', 'instagram-featured', 'featured', 'instagram', 5.00, 7,
             'Featured in Instagram influencers section - $5 per week'),
            ('TikTok Featured', 'tiktok-featured', 'featured', 'tiktok', 5.00, 7,
             'Featured in TikTok influencers section - $5 per week'),
            ('Creator Verification', 'creator-verification', 'verification', NULL, 5.00, 30,
             'Get verified badge on your profile - $5 per month')
            ON CONFLICT (slug) DO NOTHING
        '''))

        db.session.commit()

        print('✅ Creator subscription system created successfully')
        print('   Tables created:')
        print('   - creator_subscription_plans')
        print('   - creator_subscriptions')
        print('   - verification_applications')
        print('   Default plans added:')
        print('   - General Featured ($10/week)')
        print('   - Facebook Featured ($5/week)')
        print('   - Instagram Featured ($5/week)')
        print('   - TikTok Featured ($5/week)')
        print('   - Creator Verification ($5/month)')

    except Exception as e:
        db.session.rollback()
        print(f'❌ Migration failed: {str(e)}')
        raise
