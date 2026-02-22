"""
Direct SQL cleanup - delete in correct order
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def cleanup():
    app = create_app()
    with app.app_context():
        try:
            print("Starting cleanup...")

            confirm = input("Delete all campaigns, collaborations, bookings? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Cancelled")
                return

            # Delete in correct order to respect foreign keys
            print("Deleting wallet transactions...")
            db.session.execute(text("DELETE FROM wallet_transactions WHERE collaboration_id IS NOT NULL OR booking_id IS NOT NULL"))

            print("Deleting reviews...")
            db.session.execute(text("DELETE FROM reviews WHERE collaboration_id IS NOT NULL"))

            print("Deleting collaborations...")
            db.session.execute(text("DELETE FROM collaborations"))

            print("Deleting campaign applications...")
            db.session.execute(text("DELETE FROM campaign_applications"))

            print("Deleting campaign_packages...")
            db.session.execute(text("DELETE FROM campaign_packages"))

            print("Deleting bookings...")
            db.session.execute(text("DELETE FROM bookings"))

            print("Deleting campaigns...")
            db.session.execute(text("DELETE FROM campaigns"))

            db.session.commit()
            print("\nCleanup complete!")
            print("Preserved: Users, Profiles, Packages, Wallets")

        except Exception as e:
            db.session.rollback()
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    cleanup()
