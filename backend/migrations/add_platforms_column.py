"""
Migration: Add platforms column to creator_profiles table
This replaces the social_links URL system with a simple platform selection
"""
import sys
import os

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import CreatorProfile
from sqlalchemy import text

def upgrade():
    """Add platforms column"""
    app = create_app()

    with app.app_context():
        try:
            # Check if column already exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('creator_profiles')]

            if 'platforms' not in columns:
                print("Adding platforms column to creator_profiles...")
                db.session.execute(
                    text('ALTER TABLE creator_profiles ADD COLUMN platforms JSON DEFAULT \'[]\'')
                )
                db.session.commit()
                print("✓ Platforms column added successfully")
            else:
                print("✓ Platforms column already exists")

        except Exception as e:
            print(f"✗ Error adding platforms column: {e}")
            db.session.rollback()
            raise

def downgrade():
    """Remove platforms column"""
    app = create_app()

    with app.app_context():
        try:
            print("Removing platforms column from creator_profiles...")
            db.session.execute(
                text('ALTER TABLE creator_profiles DROP COLUMN IF EXISTS platforms')
            )
            db.session.commit()
            print("✓ Platforms column removed")
        except Exception as e:
            print(f"✗ Error removing platforms column: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Add platforms column migration')
    parser.add_argument('action', choices=['upgrade', 'downgrade'], help='Migration action')
    args = parser.parse_args()

    if args.action == 'upgrade':
        upgrade()
    else:
        downgrade()
