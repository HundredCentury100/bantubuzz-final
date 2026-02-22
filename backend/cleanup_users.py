"""
Script to remove all users except admin users
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models import (
    User, CreatorProfile, BrandProfile, Package, Booking,
    Message, Notification, SavedCreator, Review, Collaboration,
    Campaign, CampaignApplication, Brief, Proposal, OTP
)

def cleanup_users():
    """Remove all non-admin users and their profiles"""
    app = create_app()

    with app.app_context():
        try:
            # Get all non-admin users
            non_admin_users = User.query.filter_by(is_admin=False).all()

            print(f"Found {len(non_admin_users)} non-admin users to delete...")

            for user in non_admin_users:
                print(f"Deleting user: {user.email} (ID: {user.id}, Type: {user.user_type})")

                # Delete all related data
                # Messages
                Message.query.filter((Message.sender_id == user.id) | (Message.receiver_id == user.id)).delete(synchronize_session=False)
                print(f"  - Deleted messages")

                # Notifications
                Notification.query.filter_by(user_id=user.id).delete(synchronize_session=False)
                print(f"  - Deleted notifications")

                # OTPs
                OTP.query.filter_by(user_id=user.id).delete(synchronize_session=False)
                print(f"  - Deleted OTPs")

                # Delete associated profiles and their data
                if user.user_type == 'creator':
                    creator = CreatorProfile.query.filter_by(user_id=user.id).first()
                    if creator:
                        # Delete creator-specific data (cascading should handle most)
                        db.session.delete(creator)
                        print(f"  - Deleted creator profile (with packages, bookings, etc.)")
                elif user.user_type == 'brand':
                    brand = BrandProfile.query.filter_by(user_id=user.id).first()
                    if brand:
                        # Delete brand-specific data (cascading should handle most)
                        db.session.delete(brand)
                        print(f"  - Deleted brand profile (with campaigns, briefs, etc.)")

                # Delete user
                db.session.delete(user)

            db.session.commit()
            print(f"\n✓ Successfully deleted {len(non_admin_users)} non-admin users")

            # Show remaining admin users
            admin_users = User.query.filter_by(is_admin=True).all()
            print(f"\nRemaining admin users: {len(admin_users)}")
            for admin in admin_users:
                print(f"  - {admin.email} (ID: {admin.id})")

        except Exception as e:
            print(f"✗ Error: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    cleanup_users()
