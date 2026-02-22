"""
Script to remove all users except admin users - Simple SQL approach
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from sqlalchemy import text

def cleanup_users():
    """Remove all non-admin users using direct SQL"""
    app = create_app()

    with app.app_context():
        try:
            # Get count of non-admin users
            result = db.session.execute(text("SELECT COUNT(*) FROM users WHERE is_admin = FALSE"))
            count = result.scalar()
            print(f"Found {count} non-admin users to delete...")

            # Get admin user IDs
            admin_result = db.session.execute(text("SELECT id FROM users WHERE is_admin = TRUE"))
            admin_ids = [row[0] for row in admin_result]
            print(f"Protecting {len(admin_ids)} admin users: {admin_ids}")

            # Delete in correct order to respect foreign keys
            tables_to_clean = [
                'messages',
                'notifications',
                'otps',
                'reviews',
                'saved_creators',
                'wallet_transactions',
                'wallets',
                'proposals',
                'brief_milestones',
                'briefs',
                'collaboration_milestones',
                'collaborations',
                'campaign_applications',
                'campaigns',
                'bookings',
                'packages',
                'creator_profiles',
                'brand_profiles'
            ]

            for table in tables_to_clean:
                try:
                    db.session.execute(text(f"DELETE FROM {table}"))
                    print(f"✓ Cleaned {table}")
                except Exception as e:
                    print(f"✗ Error cleaning {table}: {e}")

            # Finally delete non-admin users
            db.session.execute(text("DELETE FROM users WHERE is_admin = FALSE"))
            print(f"✓ Deleted non-admin users")

            db.session.commit()
            print(f"\n✓ Successfully cleaned database")

            # Show remaining users
            result = db.session.execute(text("SELECT id, email, is_admin FROM users"))
            print(f"\nRemaining users:")
            for row in result:
                print(f"  - ID: {row[0]}, Email: {row[1]}, Admin: {row[2]}")

        except Exception as e:
            print(f"✗ Error: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    cleanup_users()
