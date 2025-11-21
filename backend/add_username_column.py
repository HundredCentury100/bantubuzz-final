"""
Migration script to add username column to creator_profiles table
"""
from app import create_app, db

app = create_app()

with app.app_context():
    # Add username column to creator_profiles table
    db.engine.execute("""
        ALTER TABLE creator_profiles
        ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE
    """)

    print("✅ Successfully added username column to creator_profiles table")
