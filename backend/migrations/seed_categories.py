"""
Seed categories table with existing static categories
Creates the categories table if it doesn't exist and populates it with default categories
"""

from app import create_app, db
from app.models.category import Category
from sqlalchemy import text

# Static categories that were previously hardcoded
STATIC_CATEGORIES = [
    'Fashion & Beauty',
    'Fitness & Health',
    'Food & Beverage',
    'Travel & Tourism',
    'Technology',
    'Gaming',
    'Lifestyle',
    'Entertainment',
    'Education',
    'Business & Finance',
    'Art & Design'
]

def run_migration():
    app = create_app()
    with app.app_context():
        print("Starting categories migration...")

        # Create categories table if it doesn't exist
        print("Creating categories table...")
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.session.commit()
        print("✓ Categories table created")

        # Seed categories
        print("\nSeeding categories...")
        for cat_name in STATIC_CATEGORIES:
            # Create slug from name
            slug = cat_name.lower().replace(' & ', '-').replace(' ', '-')

            # Check if category already exists
            existing = Category.query.filter_by(slug=slug).first()
            if existing:
                print(f"  - {cat_name} already exists, skipping")
                continue

            # Create new category
            category = Category(
                name=cat_name,
                slug=slug,
                description=f"{cat_name} category",
                is_active=True
            )
            db.session.add(category)
            print(f"  + Added: {cat_name} (slug: {slug})")

        db.session.commit()

        # Show all categories
        print("\n✓ Migration completed successfully!")
        print("\nAll categories:")
        categories = Category.query.order_by(Category.name).all()
        for cat in categories:
            status = "✓ Active" if cat.is_active else "✗ Inactive"
            print(f"  {cat.id}. {cat.name} ({cat.slug}) - {status}")

        print(f"\nTotal categories: {len(categories)}")

if __name__ == '__main__':
    run_migration()
