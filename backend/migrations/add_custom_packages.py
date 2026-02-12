"""
Migration script to add custom package tables
Run this script to create the necessary database tables for custom packages feature
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Starting custom packages migration...")

    # Create custom_package_requests table
    print("Creating custom_package_requests table...")
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS custom_package_requests (
            id SERIAL PRIMARY KEY,
            brand_id INTEGER NOT NULL REFERENCES brand_profiles(id),
            creator_id INTEGER NOT NULL REFERENCES creator_profiles(id),
            expected_deliverables JSON NOT NULL,
            budget DECIMAL(10,2) NOT NULL,
            additional_notes TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT valid_status CHECK (status IN ('pending', 'offer_sent', 'accepted', 'declined', 'expired'))
        );
    """))

    # Create indexes for custom_package_requests
    print("Creating indexes for custom_package_requests...")
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_requests_brand ON custom_package_requests(brand_id);
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_requests_creator ON custom_package_requests(creator_id);
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_package_requests(status);
    """))

    # Create custom_package_offers table
    print("Creating custom_package_offers table...")
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS custom_package_offers (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL REFERENCES custom_package_requests(id) ON DELETE CASCADE,
            creator_id INTEGER NOT NULL REFERENCES creator_profiles(id),
            brand_id INTEGER NOT NULL REFERENCES brand_profiles(id),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            deliverables JSON NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            delivery_time_days INTEGER NOT NULL,
            revisions_allowed INTEGER DEFAULT 2,
            status VARCHAR(20) DEFAULT 'pending',
            accepted_at TIMESTAMP,
            declined_at TIMESTAMP,
            declined_reason TEXT,
            expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT valid_offer_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
        );
    """))

    # Create indexes for custom_package_offers
    print("Creating indexes for custom_package_offers...")
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_offers_request ON custom_package_offers(request_id);
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_offers_creator ON custom_package_offers(creator_id);
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_offers_brand ON custom_package_offers(brand_id);
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_custom_offers_status ON custom_package_offers(status);
    """))

    # Add columns to messages table (if not exists)
    print("Adding custom package columns to messages table...")
    try:
        db.session.execute(text("""
            ALTER TABLE messages
            ADD COLUMN IF NOT EXISTS custom_request_id INTEGER REFERENCES custom_package_requests(id),
            ADD COLUMN IF NOT EXISTS custom_offer_id INTEGER REFERENCES custom_package_offers(id),
            ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
        """))
    except Exception as e:
        print(f"Note: Some columns may already exist: {e}")

    # Create indexes on messages
    print("Creating indexes for messages custom package columns...")
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_messages_custom_request ON messages(custom_request_id);
    """))
    db.session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_messages_custom_offer ON messages(custom_offer_id);
    """))

    db.session.commit()
    print("✅ Custom packages tables created successfully!")
    print("\nMigration completed. The following tables have been created:")
    print("  - custom_package_requests")
    print("  - custom_package_offers")
    print("  - messages table updated with custom package columns")
