#!/usr/bin/env python3
"""
Database Migration Script
Adds brand wallet and collaboration response fields
"""

from app import create_app, db

app = create_app()

with app.app_context():
    print("Starting database migration...")

    try:
        # Add wallet columns
        print("\n1. Adding columns to wallets table...")
        db.session.execute(db.text("""
            ALTER TABLE wallets
            ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'creator',
            ADD COLUMN IF NOT EXISTS total_deposited NUMERIC(10, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0.00;
        """))
        db.session.commit()
        print("   ✓ Wallet columns added successfully")

        # Add collaboration response tracking columns
        print("\n2. Adding columns to collaborations table...")
        db.session.execute(db.text("""
            ALTER TABLE collaborations
            ADD COLUMN IF NOT EXISTS creator_response_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS creator_decline_reason TEXT,
            ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT FALSE;
        """))
        db.session.commit()
        print("   ✓ Collaboration columns added successfully")

        # Create deposit_requests table
        print("\n3. Creating deposit_requests table...")
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS deposit_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                proof_of_payment TEXT,
                paynow_poll_url TEXT,
                admin_notes TEXT,
                verified_by INTEGER REFERENCES users(id),
                verified_at TIMESTAMP,
                wallet_transaction_id INTEGER REFERENCES wallet_transactions(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.session.commit()
        print("   ✓ deposit_requests table created successfully")

        # Create indexes
        print("\n4. Creating indexes...")
        db.session.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
        """))
        db.session.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
        """))
        db.session.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_deposit_requests_created_at ON deposit_requests(created_at DESC);
        """))
        db.session.commit()
        print("   ✓ Indexes created successfully")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.session.rollback()
        raise
