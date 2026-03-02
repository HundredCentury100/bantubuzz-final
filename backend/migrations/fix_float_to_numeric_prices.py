"""
Migration: Convert all Float price columns to Numeric for exact decimal precision
Problem: Float columns cause rounding errors (e.g., $100 becomes $99.99)
Solution: Use Numeric(10, 2) for exact 2 decimal places

Run: python migrations/fix_float_to_numeric_prices.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

app = create_app()

def run_migration():
    with app.app_context():
        print("🔧 Starting Float → Numeric migration for all price fields...")
        print("=" * 60)

        try:
            # Tables and columns to update
            migrations = [
                # Format: (table_name, column_name, description)
                ('packages', 'price', 'Package price'),
                ('bookings', 'amount', 'Booking amount'),
                ('bookings', 'total_price', 'Booking total price'),
                ('collaborations', 'amount', 'Collaboration amount'),
                ('campaigns', 'proposed_price', 'Campaign proposed price'),
                ('campaigns', 'budget', 'Campaign budget'),
                ('creator_profiles', 'revision_fee', 'Creator revision fee'),
                ('creator_subscription_plans', 'price', 'Creator subscription price'),
                ('subscription_plans', 'price_monthly', 'Brand subscription monthly price'),
                ('subscription_plans', 'price_yearly', 'Brand subscription yearly price'),
                ('subscriptions', 'last_payment_amount', 'Last payment amount'),
                ('disputes', 'payout_percentage', 'Dispute payout percentage'),
            ]

            for table, column, description in migrations:
                print(f"\n📝 {description} ({table}.{column})")

                # Check if column exists and is Float
                check_query = text(f"""
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_name = '{table}'
                    AND column_name = '{column}'
                """)
                result = db.session.execute(check_query).fetchone()

                if not result:
                    print(f"   ⚠️  Column {table}.{column} not found, skipping...")
                    continue

                current_type = result[0]
                print(f"   Current type: {current_type}")

                if current_type in ['double precision', 'real', 'float', 'numeric']:
                    # Convert to NUMERIC(10, 2)
                    alter_query = text(f"""
                        ALTER TABLE {table}
                        ALTER COLUMN {column}
                        TYPE NUMERIC(10, 2)
                        USING {column}::NUMERIC(10, 2)
                    """)
                    db.session.execute(alter_query)
                    print(f"   ✅ Converted to NUMERIC(10, 2)")
                else:
                    print(f"   ⚠️  Unexpected type: {current_type}, skipping...")

            # Special handling for engagement_rate (should be NUMERIC(5, 4) for percentages like 3.5%)
            print(f"\n📝 Creator engagement rate (creator_profiles.engagement_rate)")
            check_query = text("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'creator_profiles'
                AND column_name = 'engagement_rate'
            """)
            result = db.session.execute(check_query).fetchone()

            if result:
                current_type = result[0]
                print(f"   Current type: {current_type}")
                if current_type in ['double precision', 'real', 'float', 'numeric']:
                    alter_query = text("""
                        ALTER TABLE creator_profiles
                        ALTER COLUMN engagement_rate
                        TYPE NUMERIC(5, 4)
                        USING engagement_rate::NUMERIC(5, 4)
                    """)
                    db.session.execute(alter_query)
                    print(f"   ✅ Converted to NUMERIC(5, 4)")

            # Commit all changes
            db.session.commit()

            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("\n📊 Summary:")
            print("   - All price fields now use NUMERIC(10, 2)")
            print("   - Engagement rate uses NUMERIC(5, 4)")
            print("   - No more floating-point rounding errors!")
            print("   - $100 will stay $100 (not $99.99)")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    print("\n⚠️  WARNING: This migration will modify database schema.")
    print("⚠️  Make sure you have a backup before proceeding.")
    response = input("\nContinue? (yes/no): ")

    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
