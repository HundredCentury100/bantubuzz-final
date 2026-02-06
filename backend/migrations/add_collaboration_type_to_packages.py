"""
Migration: Add collaboration_type field to packages table
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Starting migration: Add collaboration_type to packages")

    try:
        # Add collaboration_type column
        print("Adding collaboration_type column...")
        db.session.execute(text("""
            ALTER TABLE packages
            ADD COLUMN IF NOT EXISTS collaboration_type VARCHAR(100)
        """))
        db.session.commit()
        print("✓ Added collaboration_type column")

        # Make category nullable
        print("Making category column nullable...")
        db.session.execute(text("""
            ALTER TABLE packages
            ALTER COLUMN category DROP NOT NULL
        """))
        db.session.commit()
        print("✓ Made category column nullable")

        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.session.rollback()
        raise
