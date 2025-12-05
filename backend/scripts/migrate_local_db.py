"""
Add admin columns to local SQLite database
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db

def migrate_local():
    app = create_app()

    with app.app_context():
        print("Adding admin columns to local database...")

        try:
            # For SQLite, we need to use ALTER TABLE
            with db.engine.connect() as conn:
                # Check if columns exist
                result = conn.execute(db.text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result]

                if 'is_admin' not in columns:
                    print("Adding is_admin column...")
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                    conn.commit()

                if 'admin_role' not in columns:
                    print("Adding admin_role column...")
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN admin_role VARCHAR(20)"))
                    conn.commit()

            print("Local database migrated successfully!")

            # Now create all new tables
            print("\nCreating categories and niches tables...")
            db.create_all()

            print("All tables created!")

        except Exception as e:
            print(f"Error during migration: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    migrate_local()
