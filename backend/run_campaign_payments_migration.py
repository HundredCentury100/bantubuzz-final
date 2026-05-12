#!/usr/bin/env python3
"""
Run the campaign_payments tables migration
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def run_migration():
    """Execute the campaign_payments migration SQL"""
    app = create_app()

    with app.app_context():
        # Read the migration SQL file
        migration_file = os.path.join(
            os.path.dirname(__file__),
            'migrations',
            'create_campaign_payments_tables.sql'
        )

        with open(migration_file, 'r') as f:
            migration_sql = f.read()

        try:
            # Execute the migration
            db.session.execute(db.text(migration_sql))
            db.session.commit()
            print("✅ Campaign payments tables created successfully!")

            # Verify tables exist
            result = db.session.execute(db.text("""
                SELECT table_name FROM information_schema.tables
                WHERE table_name IN ('campaign_payments', 'campaign_payment_items')
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]

            if len(tables) == 2:
                print("✅ Table verification passed!")
                print(f"   - {tables[0]}")
                print(f"   - {tables[1]}")

                # Show campaign_payments structure
                print("\n📋 campaign_payments Structure:")
                result = db.session.execute(db.text("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_payments'
                    ORDER BY ordinal_position
                """))

                print(f"{'Column':<30} {'Type':<25} {'Nullable':<10}")
                print("-" * 70)
                for row in result:
                    col_name, data_type, max_length, nullable = row
                    type_str = f"{data_type}({max_length})" if max_length else data_type
                    print(f"{col_name:<30} {type_str:<25} {nullable:<10}")

                # Show campaign_payment_items structure
                print("\n📋 campaign_payment_items Structure:")
                result = db.session.execute(db.text("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_payment_items'
                    ORDER BY ordinal_position
                """))

                print(f"{'Column':<30} {'Type':<25} {'Nullable':<10}")
                print("-" * 70)
                for row in result:
                    col_name, data_type, max_length, nullable = row
                    type_str = f"{data_type}({max_length})" if max_length else data_type
                    print(f"{col_name:<30} {type_str:<25} {nullable:<10}")

                # Check if collaborations columns were added
                print("\n📋 Collaborations Table Updates:")
                result = db.session.execute(db.text("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'collaborations'
                    AND column_name IN ('payment_status', 'payment_id')
                    ORDER BY column_name
                """))

                for row in result:
                    print(f"   ✅ {row[0]}: {row[1]}")

            else:
                print(f"❌ Table verification failed! Found {len(tables)} tables instead of 2")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == '__main__':
    run_migration()
