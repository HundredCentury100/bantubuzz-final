"""
Database cleanup script for Briefs & Milestones feature
Removes test data while preserving users, profiles, and packages
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import (
    Campaign, CampaignApplication, Collaboration, Booking,
    Notification, Message
)
from datetime import datetime

def cleanup_database():
    """Clean database for milestone implementation"""
    app = create_app()

    with app.app_context():
        try:
            print("Starting database cleanup...")
            print("=" * 60)

            # Count records before deletion
            campaigns_count = Campaign.query.count()
            applications_count = CampaignApplication.query.count()
            collaborations_count = Collaboration.query.count()
            bookings_count = Booking.query.count()

            print(f"\nRecords to be deleted:")
            print(f"  - Campaigns: {campaigns_count}")
            print(f"  - Campaign Applications: {applications_count}")
            print(f"  - Collaborations: {collaborations_count}")
            print(f"  - Bookings: {bookings_count}")

            # Confirm deletion
            confirm = input("\nThis will delete all campaigns, collaborations, and bookings. Continue? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Cleanup cancelled.")
                return

            print("\nDeleting records...")

            # Delete in correct order (respecting foreign keys)

            # 1. Collaborations first (they reference campaign_applications)
            Collaboration.query.delete()
            print("- Deleted collaborations")

            # 2. Campaign Applications
            CampaignApplication.query.delete()
            print("- Deleted campaign applications")

            # 3. Bookings
            Booking.query.delete()
            print("- Deleted bookings")

            # 4. Campaigns
            Campaign.query.delete()
            print("- Deleted campaigns")

            # 5. Clean old notifications (optional - clean those related to deleted items)
            old_date = datetime(2025, 1, 1)
            old_notifications = Notification.query.filter(Notification.created_at < old_date).delete()
            print(f"- Deleted {old_notifications} old notifications")

            # 6. Clean old messages (optional - older than 60 days)
            from datetime import timedelta
            cutoff_date = datetime.now() - timedelta(days=60)
            old_messages = Message.query.filter(Message.created_at < cutoff_date).delete()
            print(f"- Deleted {old_messages} old messages")

            # Commit changes
            db.session.commit()

            print("\n" + "=" * 60)
            print("Database cleanup completed successfully!")
            print("\nPreserved:")
            print("  - Users")
            print("  - Creator Profiles")
            print("  - Brand Profiles")
            print("  - Packages")
            print("  - Reviews")
            print("  - Wallets")
            print("  - Recent notifications and messages")
            print("=" * 60)

        except Exception as e:
            db.session.rollback()
            print(f"\nError during cleanup: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    cleanup_database()
