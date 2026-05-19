"""
Migration: Add Collaboration Details and Content Review Fields
Date: May 19, 2026
Purpose: Add fields for content review selection and collaboration brief/guidelines

New Fields:
- requires_content_review (Boolean) - YES/NO selection in cart
- brief (Text) - What do you want the creator to do?
- guidelines (Text) - Brief & Guidelines
- rules (Text) - Rules & Expectations
- additional_notes (Text) - Additional Notes
- auto_complete_eligible_at (DateTime) - For 3-day auto-complete tracking
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import db, create_app
from sqlalchemy import text

def upgrade():
    """Add new collaboration detail fields"""
    app = create_app()

    with app.app_context():
        print("Starting migration: add_collaboration_details_fields")

        try:
            # Add requires_content_review column (Boolean, default TRUE)
            print("Adding requires_content_review column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS requires_content_review BOOLEAN DEFAULT TRUE
            """))

            # Add brief column (Text)
            print("Adding brief column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS brief TEXT
            """))

            # Add guidelines column (Text)
            print("Adding guidelines column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS guidelines TEXT
            """))

            # Add rules column (Text)
            print("Adding rules column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS rules TEXT
            """))

            # Add additional_notes column (Text)
            print("Adding additional_notes column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS additional_notes TEXT
            """))

            # Add auto_complete_eligible_at column (DateTime)
            print("Adding auto_complete_eligible_at column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS auto_complete_eligible_at TIMESTAMP
            """))

            db.session.commit()
            print("✅ Migration completed successfully!")

            # Verify columns were added
            print("\nVerifying columns...")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'collaborations'
                AND column_name IN (
                    'requires_content_review',
                    'brief',
                    'guidelines',
                    'rules',
                    'additional_notes',
                    'auto_complete_eligible_at'
                )
                ORDER BY column_name
            """))

            print("\nNew columns:")
            for row in result:
                print(f"  - {row[0]} ({row[1]}) | Nullable: {row[2]} | Default: {row[3]}")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            raise

def downgrade():
    """Remove collaboration detail fields"""
    app = create_app()

    with app.app_context():
        print("Starting rollback: remove_collaboration_details_fields")

        try:
            print("Removing auto_complete_eligible_at column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                DROP COLUMN IF EXISTS auto_complete_eligible_at
            """))

            print("Removing additional_notes column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                DROP COLUMN IF EXISTS additional_notes
            """))

            print("Removing rules column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                DROP COLUMN IF EXISTS rules
            """))

            print("Removing guidelines column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                DROP COLUMN IF EXISTS guidelines
            """))

            print("Removing brief column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                DROP COLUMN IF EXISTS brief
            """))

            print("Removing requires_content_review column...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                DROP COLUMN IF EXISTS requires_content_review
            """))

            db.session.commit()
            print("✅ Rollback completed successfully!")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Rollback failed: {e}")
            raise

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Collaboration details migration')
    parser.add_argument('--downgrade', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.downgrade:
        downgrade()
    else:
        upgrade()
