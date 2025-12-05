"""
Migration script to add admin functionality and categories/niches tables
Run this with: python migrations/add_admin_and_categories.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    app = create_app()

    with app.app_context():
        print("Starting migration: Adding admin and categories tables...")

        try:
            # 1. Add admin columns to users table
            print("1. Adding admin columns to users table...")
            db.session.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS admin_role VARCHAR(20)
            """))
            db.session.commit()
            print("✓ Admin columns added to users table")

            # 2. Create categories table
            print("2. Creating categories table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    image VARCHAR(255),
                    is_active BOOLEAN DEFAULT TRUE,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
            print("✓ Categories table created")

            # 3. Create niches table
            print("3. Creating niches table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS niches (
                    id SERIAL PRIMARY KEY,
                    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(100) NOT NULL,
                    description TEXT,
                    image VARCHAR(255),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    CONSTRAINT unique_category_niche UNIQUE (category_id, name),
                    CONSTRAINT unique_category_niche_slug UNIQUE (category_id, slug)
                )
            """))
            db.session.commit()
            print("✓ Niches table created")

            # 4. Insert default categories
            print("4. Inserting default categories...")
            db.session.execute(text("""
                INSERT INTO categories (name, slug, description, display_order) VALUES
                ('Fashion & Style', 'fashion-style', 'Fashion, clothing, accessories, and style content', 1),
                ('Beauty & Cosmetics', 'beauty-cosmetics', 'Makeup, skincare, haircare, and beauty products', 2),
                ('Lifestyle', 'lifestyle', 'Daily life, vlogs, and lifestyle content', 3),
                ('Food & Beverage', 'food-beverage', 'Cooking, recipes, restaurants, and food reviews', 4),
                ('Technology', 'technology', 'Tech reviews, gadgets, and digital products', 5),
                ('Fitness & Health', 'fitness-health', 'Workout, nutrition, wellness, and health', 6),
                ('Travel', 'travel', 'Travel experiences, destinations, and tourism', 7),
                ('Entertainment', 'entertainment', 'Movies, music, gaming, and entertainment', 8)
                ON CONFLICT (slug) DO NOTHING
            """))
            db.session.commit()
            print("✓ Default categories inserted")

            # 5. Create uploads directory structure
            print("5. Creating uploads directory structure...")
            import os
            base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
            uploads_dir = os.path.join(base_dir, 'uploads', 'categories')
            os.makedirs(uploads_dir, exist_ok=True)
            print(f"✓ Uploads directory created at: {uploads_dir}")

            print("\n✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Create an admin user by running: python scripts/create_admin.py")
            print("2. Start the backend server")
            print("3. Login with admin credentials")

        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    run_migration()
