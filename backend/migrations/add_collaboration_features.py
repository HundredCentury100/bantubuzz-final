"""
Migration script to add new collaboration features:
1. Draft deliverables with review workflow
2. Revision tracking with paid/free revisions
3. Cancellation requests requiring support approval
4. Revision settings in creator profiles

Run this script once to update the database schema.
"""

import sqlite3
from datetime import datetime

# Database path
DB_PATH = './instance/bantubuzz.db'


def migrate():
    """Run the migration"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Starting migration...")

        # Add new columns to collaborations table
        print("Adding columns to collaborations table...")

        try:
            cursor.execute("""
                ALTER TABLE collaborations
                ADD COLUMN draft_deliverables TEXT DEFAULT '[]'
            """)
            print("[OK] Added draft_deliverables column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- draft_deliverables column already exists")
            else:
                raise

        try:
            cursor.execute("""
                ALTER TABLE collaborations
                ADD COLUMN revision_requests TEXT DEFAULT '[]'
            """)
            print("[OK] Added revision_requests column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- revision_requests column already exists")
            else:
                raise

        try:
            cursor.execute("""
                ALTER TABLE collaborations
                ADD COLUMN total_revisions_used INTEGER DEFAULT 0
            """)
            print("[OK] Added total_revisions_used column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- total_revisions_used column already exists")
            else:
                raise

        try:
            cursor.execute("""
                ALTER TABLE collaborations
                ADD COLUMN paid_revisions INTEGER DEFAULT 0
            """)
            print("[OK] Added paid_revisions column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- paid_revisions column already exists")
            else:
                raise

        try:
            cursor.execute("""
                ALTER TABLE collaborations
                ADD COLUMN cancellation_request TEXT
            """)
            print("[OK] Added cancellation_request column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- cancellation_request column already exists")
            else:
                raise

        # Add new columns to creator_profiles table
        print("\nAdding columns to creator_profiles table...")

        try:
            cursor.execute("""
                ALTER TABLE creator_profiles
                ADD COLUMN free_revisions INTEGER DEFAULT 2
            """)
            print("[OK] Added free_revisions column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- free_revisions column already exists")
            else:
                raise

        try:
            cursor.execute("""
                ALTER TABLE creator_profiles
                ADD COLUMN revision_fee REAL DEFAULT 0.0
            """)
            print("[OK] Added revision_fee column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("- revision_fee column already exists")
            else:
                raise

        # Commit the changes
        conn.commit()
        print("\n[OK][OK][OK] Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise

    finally:
        conn.close()


if __name__ == '__main__':
    migrate()
