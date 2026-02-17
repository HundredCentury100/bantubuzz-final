"""
Migration: Add google_oauth_id and phone_number to users table
Run with: python migrations/add_google_oauth_and_phone.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Add google_oauth_id column if it doesn't exist
        db.session.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS google_oauth_id VARCHAR(255) UNIQUE;
        """))
        print("Added google_oauth_id column")
    except Exception as e:
        print(f"google_oauth_id column may already exist: {e}")
        db.session.rollback()

    try:
        # Add phone_number column if it doesn't exist
        db.session.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
        """))
        print("Added phone_number column")
    except Exception as e:
        print(f"phone_number column may already exist: {e}")
        db.session.rollback()

    try:
        # Add google_profile_picture column for storing the Google profile pic URL
        db.session.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS google_profile_picture VARCHAR(500);
        """))
        print("Added google_profile_picture column")
    except Exception as e:
        print(f"google_profile_picture column may already exist: {e}")
        db.session.rollback()

    try:
        db.session.commit()
        print("Migration completed successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"Migration failed: {e}")
