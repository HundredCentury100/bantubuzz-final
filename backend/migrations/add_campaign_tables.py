"""
Migration script to add campaign_applications and campaign_packages tables

Run this script to create the new tables for campaign management:
python migrations/add_campaign_tables.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

def migrate():
    """Create the new campaign-related tables"""
    app = create_app()

    with app.app_context():
        # Create tables
        print("Creating campaign_applications and campaign_packages tables...")

        # SQL for campaign_applications table
        campaign_applications_sql = """
        CREATE TABLE IF NOT EXISTS campaign_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            creator_id INTEGER NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            application_message TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
            FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
        );
        """

        # SQL for campaign_packages table
        campaign_packages_sql = """
        CREATE TABLE IF NOT EXISTS campaign_packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            package_id INTEGER NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
            FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
            UNIQUE(campaign_id, package_id)
        );
        """

        # Execute SQL
        db.session.execute(db.text(campaign_applications_sql))
        db.session.execute(db.text(campaign_packages_sql))
        db.session.commit()

        print("[OK] Tables created successfully!")
        print("[OK] campaign_applications table ready")
        print("[OK] campaign_packages table ready")

        return True

if __name__ == '__main__':
    try:
        migrate()
        print("\n Migration completed successfully!")
    except Exception as e:
        print(f"\n Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
