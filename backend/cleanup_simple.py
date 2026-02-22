"""
Simple cleanup using raw SQL with CASCADE
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

            # Get counts
            result = db.session.execute(text("SELECT COUNT(*) FROM campaigns"))
            campaigns = result.scalar()
            result = db.session.execute(text("SELECT COUNT(*) FROM collaborations"))
            collabs = result.scalar()
            result = db.session.execute(text("SELECT COUNT(*) FROM bookings"))
            bookings = result.scalar()

            print(f"Found: {campaigns} campaigns, {collabs} collaborations, {bookings} bookings")
            confirm = input("Delete all? (yes/no): ")

            if confirm.lower() != 'yes':
                print("Cancelled")
                return

            # Delete using CASCADE
            db.session.execute(text("DELETE FROM campaigns CASCADE"))
            db.session.execute(text("DELETE FROM collaborations CASCADE"))
            db.session.execute(text("DELETE FROM bookings CASCADE"))
            db.session.execute(text("DELETE FROM campaign_applications CASCADE"))

            db.session.commit()
            print("Cleanup complete!")

        except Exception as e:
            db.session.rollback()
            print(f"Error: {e}")
            sys.exit(1)

if __name__ == '__main__':
    cleanup()
