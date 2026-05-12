#!/usr/bin/env python3
"""
Run the campaign_invitations table migration
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def run_migration():
    """Execute the campaign_invitations migration SQL"""
    app = create_app()

    with app.app_context():
        # Read the migration SQL file
        migration_file = os.path.join(
            os.path.dirname(__file__),
            'migrations',
            'create_campaign_invitations_table.sql'
        )

        with open(migration_file, 'r') as f:
            migration_sql = f.read()

        try:
            # Execute the migration
            db.session.execute(db.text(migration_sql))
            db.session.commit()
            print("✅ Campaign invitations table created successfully!")

            # Verify table exists
            result = db.session.execute(db.text("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_name = 'campaign_invitations'
            """))
            count = result.scalar()

            if count > 0:
                print("✅ Table verification passed!")

                # Show table structure
                result = db.session.execute(db.text("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_invitations'
                    ORDER BY ordinal_position
                """))

                print("\n📋 Table Structure:")
                print(f"{'Column':<25} {'Type':<20} {'Nullable':<10}")
                print("-" * 60)
                for row in result:
                    col_name, data_type, max_length, nullable = row
                    type_str = f"{data_type}({max_length})" if max_length else data_type
                    print(f"{col_name:<25} {type_str:<20} {nullable:<10}")
            else:
                print("❌ Table verification failed!")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    run_migration()
