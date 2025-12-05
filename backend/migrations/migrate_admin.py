"""
Simple migration script that works with both SQLite and PostgreSQL
Run this with: python migrations/migrate_admin.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Category, Niche, User

def run_migration():
    app = create_app()

    with app.app_context():
        print("Starting migration: Adding admin and categories tables...")
        print("=" * 60)

        try:
            # Create all tables (this will only create missing tables)
            print("\n1. Creating new tables (categories, niches)...")
            db.create_all()
            print("   Tables created successfully!")

            # Check if default categories exist
            existing_categories = Category.query.count()
            if existing_categories == 0:
                print("\n2. Inserting default categories...")

                categories_data = [
                    ('Fashion & Style', 'fashion-style', 'Fashion, clothing, accessories, and style content', 1),
                    ('Beauty & Cosmetics', 'beauty-cosmetics', 'Makeup, skincare, haircare, and beauty products', 2),
                    ('Lifestyle', 'lifestyle', 'Daily life, vlogs, and lifestyle content', 3),
                    ('Food & Beverage', 'food-beverage', 'Cooking, recipes, restaurants, and food reviews', 4),
                    ('Technology', 'technology', 'Tech reviews, gadgets, and digital products', 5),
                    ('Fitness & Health', 'fitness-health', 'Workout, nutrition, wellness, and health', 6),
                    ('Travel', 'travel', 'Travel experiences, destinations, and tourism', 7),
                    ('Entertainment', 'entertainment', 'Movies, music, gaming, and entertainment', 8)
                ]

                for name, slug, description, order in categories_data:
                    category = Category(
                        name=name,
                        slug=slug,
                        description=description,
                        display_order=order,
                        is_active=True
                    )
                    db.session.add(category)

                db.session.commit()
                print(f"   Inserted {len(categories_data)} default categories")
            else:
                print(f"\n2. Skipping default categories ({existing_categories} already exist)")

            # Create uploads directory structure
            print("\n3. Creating uploads directory structure...")
            base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
            uploads_dir = os.path.join(base_dir, 'uploads', 'categories')
            os.makedirs(uploads_dir, exist_ok=True)
            print(f"   Uploads directory: {uploads_dir}")

            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("=" * 60)
            print("\nNext steps:")
            print("1. Create an admin user: python scripts/create_admin.py")
            print("2. Restart the backend server if it's running")
            print("3. Login with admin credentials")
            print("\nNote: The User model now supports admin fields (is_admin, admin_role)")
            print("      but existing user records won't have these fields populated.")
            print("      Use create_admin.py to create proper admin users.")

        except Exception as e:
            print(f"\nMigration failed: {str(e)}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            raise

if __name__ == '__main__':
    run_migration()
