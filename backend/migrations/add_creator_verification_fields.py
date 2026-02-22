"""
Migration: Add verification fields to creator_profiles for badge system
- is_verified (Boolean): Whether the creator is verified
- verified_at (DateTime): When the creator was verified
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

def run_migration():
    app = create_app()
    with app.app_context():
        print("Adding verification fields to creator_profiles table...")

        # Add is_verified column
        db.session.execute("""
            ALTER TABLE creator_profiles
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
        """)

        # Add verified_at column
        db.session.execute("""
            ALTER TABLE creator_profiles
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)

        db.session.commit()
        print("✓ Successfully added is_verified and verified_at columns to creator_profiles")

if __name__ == '__main__':
    run_migration()
