"""
Migration: Add creator verification and badge fields
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Starting migration: Add creator verification fields")

    try:
        # Add is_verified column
        print("Adding is_verified column...")
        db.session.execute(text("""
            ALTER TABLE creator_profiles
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
        """))
        db.session.commit()
        print("✓ Added is_verified column")

        # Add verified_at column
        print("Adding verified_at column...")
        db.session.execute(text("""
            ALTER TABLE creator_profiles
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """))
        db.session.commit()
        print("✓ Added verified_at column")

        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.session.rollback()
        raise
