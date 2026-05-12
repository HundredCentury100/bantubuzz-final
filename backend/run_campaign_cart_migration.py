#!/usr/bin/env python3
"""
Campaign Cart Migration Runner
Executes the campaign cart system database migration
"""

import os
import sys
import psycopg2
from psycopg2 import sql

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'bantubuzz',
    'user': 'bantubuzz_user',
    'password': 'your_secure_password_here'
}

def run_migration():
    """Execute the campaign cart migration"""

    migration_file = os.path.join(
        os.path.dirname(__file__),
        'migrations',
        'create_campaign_cart.sql'
    )

    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)

    try:
        # Read migration SQL
        with open(migration_file, 'r') as f:
            migration_sql = f.read()

        # Connect to database
        print("📊 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Execute migration
        print("🚀 Running campaign cart migration...")
        cursor.execute(migration_sql)
        conn.commit()

        # Verify table creation
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'campaign_cart_items'
        """)

        if cursor.fetchone():
            print("✅ campaign_cart_items table created successfully!")
        else:
            print("⚠️  Table creation verification failed")
            sys.exit(1)

        # Check columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_cart_items'
        """)

        columns = [row[0] for row in cursor.fetchall()]
        print(f"📋 Created columns: {', '.join(columns)}")

        # Check indexes
        cursor.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'campaign_cart_items'
        """)

        indexes = [row[0] for row in cursor.fetchall()]
        print(f"🔍 Created indexes: {', '.join(indexes)}")

        # Check new columns in existing tables
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_invitations'
            AND column_name = 'in_cart'
        """)

        if cursor.fetchone():
            print("✅ Added 'in_cart' column to campaign_invitations")

        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'proposals'
            AND column_name = 'accepted_pending_payment'
        """)

        if cursor.fetchone():
            print("✅ Added 'accepted_pending_payment' column to proposals")

        cursor.close()
        conn.close()

        print("\n🎉 Campaign cart migration completed successfully!")
        print("\nNext steps:")
        print("1. Create CampaignCartItem model in app/models/")
        print("2. Implement cart API endpoints in app/routes/")
        print("3. Update frontend to use cart workflow")

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_migration()
