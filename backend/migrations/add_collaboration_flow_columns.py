"""
Add columns needed for correct collaboration flow

Adds:
1. live_urls_submitted_at - tracks when creator submits live URLs (for 3-day auto-complete)
2. deliverable_type - distinguishes between 'content_review' (drafts) and 'live_post' (actual posts)
3. revision_notes - stores revision requests from brand
4. revision_count - tracks number of revisions requested

Usage:
    python backend/migrations/add_collaboration_flow_columns.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Add collaboration flow columns"""
    app = create_app()

    with app.app_context():
        try:
            print("=" * 80)
            print("ADDING COLLABORATION FLOW COLUMNS")
            print("=" * 80)

            # 1. Add live_urls_submitted_at to collaborations table
            print("\n1. Adding live_urls_submitted_at to collaborations...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS live_urls_submitted_at TIMESTAMP NULL
            """))
            print("   ✓ Added live_urls_submitted_at column")

            # 2. Add deliverable_type to package_deliverables table
            print("\n2. Adding deliverable_type to package_deliverables...")
            db.session.execute(text("""
                ALTER TABLE package_deliverables
                ADD COLUMN IF NOT EXISTS deliverable_type VARCHAR(20) DEFAULT 'content_review'
            """))
            print("   ✓ Added deliverable_type column to package_deliverables")

            # 3. Add deliverable_type to milestone_deliverables table
            print("\n3. Adding deliverable_type to milestone_deliverables...")
            db.session.execute(text("""
                ALTER TABLE milestone_deliverables
                ADD COLUMN IF NOT EXISTS deliverable_type VARCHAR(20) DEFAULT 'content_review'
            """))
            print("   ✓ Added deliverable_type column to milestone_deliverables")

            # 4. Add revision_notes to package_deliverables table
            print("\n4. Adding revision_notes to package_deliverables...")
            db.session.execute(text("""
                ALTER TABLE package_deliverables
                ADD COLUMN IF NOT EXISTS revision_notes TEXT NULL
            """))
            print("   ✓ Added revision_notes column to package_deliverables")

            # 5. Add revision_notes to milestone_deliverables table
            print("\n5. Adding revision_notes to milestone_deliverables...")
            db.session.execute(text("""
                ALTER TABLE milestone_deliverables
                ADD COLUMN IF NOT EXISTS revision_notes TEXT NULL
            """))
            print("   ✓ Added revision_notes column to milestone_deliverables")

            # 6. Add revision_count to package_deliverables table
            print("\n6. Adding revision_count to package_deliverables...")
            db.session.execute(text("""
                ALTER TABLE package_deliverables
                ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0
            """))
            print("   ✓ Added revision_count column to package_deliverables")

            # 7. Add revision_count to milestone_deliverables table
            print("\n7. Adding revision_count to milestone_deliverables...")
            db.session.execute(text("""
                ALTER TABLE milestone_deliverables
                ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0
            """))
            print("   ✓ Added revision_count column to milestone_deliverables")

            db.session.commit()
            print("\n" + "=" * 80)
            print("✅ Migration completed successfully!")
            print("=" * 80)

            # Verify columns were added
            print("\nVerifying new columns in collaborations table:")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'collaborations'
                AND column_name IN ('live_urls_submitted_at')
                ORDER BY column_name
            """))

            for row in result:
                print(f"  {row[0]}: {row[1]} | Nullable: {row[2]} | Default: {row[3]}")

            print("\nVerifying new columns in package_deliverables table:")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'package_deliverables'
                AND column_name IN ('deliverable_type', 'revision_notes', 'revision_count')
                ORDER BY column_name
            """))

            for row in result:
                print(f"  {row[0]}: {row[1]} | Nullable: {row[2]} | Default: {row[3]}")

            print("\nVerifying new columns in milestone_deliverables table:")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'milestone_deliverables'
                AND column_name IN ('deliverable_type', 'revision_notes', 'revision_count')
                ORDER BY column_name
            """))

            for row in result:
                print(f"  {row[0]}: {row[1]} | Nullable: {row[2]} | Default: {row[3]}")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    run_migration()
