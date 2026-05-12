"""
Run SmilePay transactions table migration
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Execute SmilePay migration SQL"""
    app = create_app()

    with app.app_context():
        try:
            # First check if table exists
            check_table = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'smilepay_transactions'
                );
            """)
            table_exists = db.session.execute(check_table).scalar()

            if table_exists:
                print("ℹ️  Table 'smilepay_transactions' already exists.")

                # Check if extra_data column exists
                check_column = text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'smilepay_transactions'
                    AND column_name = 'extra_data';
                """)
                result = db.session.execute(check_column).fetchone()

                if result:
                    print("✅ Column 'extra_data' already exists. No migration needed.")
                    return True
                else:
                    print("⚠️  Column 'extra_data' is missing. Adding it now...")
                    add_column = text("""
                        ALTER TABLE smilepay_transactions
                        ADD COLUMN IF NOT EXISTS extra_data JSON;
                    """)
                    db.session.execute(add_column)
                    db.session.commit()
                    print("✅ Column 'extra_data' added successfully!")
                    return True
            else:
                # Table doesn't exist, run full migration
                print("Creating smilepay_transactions table...")
                migration_file = os.path.join(
                    os.path.dirname(__file__),
                    'migrations',
                    'create_smilepay_transactions.sql'
                )

                with open(migration_file, 'r') as f:
                    sql = f.read()

                db.session.execute(text(sql))
                db.session.commit()
                print("✅ SmilePay transactions table created successfully!")
                print("✅ Added smilepay_order_reference columns to existing tables")
                return True

        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
