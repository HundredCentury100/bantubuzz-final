"""
Migration: Update Brief model to support multiple platforms
Changes platform from String to JSON array
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Starting migration: platform String -> platforms JSON[]")

    try:
        # Step 1: Add new platforms column as JSON
        print("Step 1: Adding platforms column...")
        db.session.execute(text("""
            ALTER TABLE briefs
            ADD COLUMN IF NOT EXISTS platforms JSON DEFAULT '[]'::json
        """))
        db.session.commit()
        print("✓ platforms column added")

        # Step 2: Migrate existing data from platform to platforms
        print("Step 2: Migrating existing platform data to platforms array...")
        db.session.execute(text("""
            UPDATE briefs
            SET platforms =
                CASE
                    WHEN platform IS NOT NULL AND platform != ''
                    THEN json_build_array(platform)::json
                    ELSE '[]'::json
                END
            WHERE platforms = '[]'::json OR platforms IS NULL
        """))
        db.session.commit()
        print("✓ Data migrated")

        # Step 3: Drop old platform column
        print("Step 3: Dropping old platform column...")
        db.session.execute(text("""
            ALTER TABLE briefs
            DROP COLUMN IF EXISTS platform
        """))
        db.session.commit()
        print("✓ Old platform column dropped")

        print("\n✅ Migration completed successfully!")
        print("Briefs now support multiple platforms")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.session.rollback()
        raise
