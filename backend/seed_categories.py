"""
Seed database with initial categories and niches
Run this script once to populate the categories table
"""

import os
import sys
from app import create_app, db
from app.models import Category, Niche

# Add the current directory to the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))


def seed_categories():
    """Seed the database with initial categories"""

    # List of categories matching the hardcoded ones in frontend
    categories_data = [
        {
            'name': 'Fashion & Beauty',
            'slug': 'fashion-beauty',
            'description': 'Fashion trends, beauty tips, makeup tutorials, and style guides',
            'display_order': 1
        },
        {
            'name': 'Food & Beverage',
            'slug': 'food-beverage',
            'description': 'Cooking recipes, restaurant reviews, food photography, and culinary experiences',
            'display_order': 2
        },
        {
            'name': 'Technology',
            'slug': 'technology',
            'description': 'Tech reviews, gadgets, software, apps, and digital innovations',
            'display_order': 3
        },
        {
            'name': 'Lifestyle',
            'slug': 'lifestyle',
            'description': 'Daily life, home decor, organization, and lifestyle tips',
            'display_order': 4
        },
        {
            'name': 'Travel',
            'slug': 'travel',
            'description': 'Travel destinations, tourism, adventure, and travel tips',
            'display_order': 5
        },
        {
            'name': 'Fitness & Health',
            'slug': 'fitness-health',
            'description': 'Workout routines, nutrition, wellness, and healthy living',
            'display_order': 6
        },
        {
            'name': 'Gaming',
            'slug': 'gaming',
            'description': 'Video games, gaming reviews, esports, and game streaming',
            'display_order': 7
        },
        {
            'name': 'Education',
            'slug': 'education',
            'description': 'Learning resources, tutorials, courses, and educational content',
            'display_order': 8
        },
        {
            'name': 'Entertainment',
            'slug': 'entertainment',
            'description': 'Movies, TV shows, music, events, and entertainment news',
            'display_order': 9
        },
        {
            'name': 'Other',
            'slug': 'other',
            'description': 'Miscellaneous content that doesn\'t fit other categories',
            'display_order': 10
        }
    ]

    print("Seeding categories...")

    for cat_data in categories_data:
        # Check if category already exists
        existing = Category.query.filter_by(slug=cat_data['slug']).first()

        if existing:
            print(f"  ✓ Category '{cat_data['name']}' already exists (ID: {existing.id})")
        else:
            category = Category(
                name=cat_data['name'],
                slug=cat_data['slug'],
                description=cat_data['description'],
                display_order=cat_data['display_order'],
                is_active=True
            )
            db.session.add(category)
            db.session.commit()
            print(f"  + Created category '{cat_data['name']}' (ID: {category.id})")

    print("\nCategories seeded successfully!")
    print(f"Total categories in database: {Category.query.count()}")


def seed_sample_niches():
    """Seed some sample niches for demonstration"""

    niches_data = [
        # Fashion & Beauty niches
        ('fashion-beauty', 'Streetwear', 'streetwear', 'Urban fashion and street style'),
        ('fashion-beauty', 'Luxury Fashion', 'luxury-fashion', 'High-end and designer fashion'),
        ('fashion-beauty', 'Makeup Tutorials', 'makeup-tutorials', 'Beauty tutorials and makeup guides'),
        ('fashion-beauty', 'Skincare', 'skincare', 'Skincare routines and product reviews'),

        # Food & Beverage niches
        ('food-beverage', 'Vegan & Vegetarian', 'vegan-vegetarian', 'Plant-based recipes and lifestyle'),
        ('food-beverage', 'Baking', 'baking', 'Baking recipes and techniques'),
        ('food-beverage', 'Fine Dining', 'fine-dining', 'Restaurant reviews and fine dining experiences'),
        ('food-beverage', 'Quick Meals', 'quick-meals', 'Fast and easy meal ideas'),

        # Technology niches
        ('technology', 'Mobile Apps', 'mobile-apps', 'App reviews and mobile technology'),
        ('technology', 'Gaming Tech', 'gaming-tech', 'Gaming hardware and peripherals'),
        ('technology', 'Software', 'software', 'Software reviews and recommendations'),

        # Fitness & Health niches
        ('fitness-health', 'Yoga', 'yoga', 'Yoga practices and mindfulness'),
        ('fitness-health', 'Weight Training', 'weight-training', 'Strength training and bodybuilding'),
        ('fitness-health', 'Nutrition', 'nutrition', 'Diet plans and nutritional advice'),

        # Travel niches
        ('travel', 'Adventure Travel', 'adventure-travel', 'Extreme sports and adventure tourism'),
        ('travel', 'Luxury Travel', 'luxury-travel', 'Luxury resorts and premium experiences'),
        ('travel', 'Budget Travel', 'budget-travel', 'Budget-friendly travel tips'),

        # Gaming niches
        ('gaming', 'FPS Games', 'fps-games', 'First-person shooter games'),
        ('gaming', 'RPG Games', 'rpg-games', 'Role-playing games'),
        ('gaming', 'Mobile Gaming', 'mobile-gaming', 'Mobile and casual games'),
    ]

    print("\nSeeding sample niches...")

    for category_slug, niche_name, niche_slug, description in niches_data:
        category = Category.query.filter_by(slug=category_slug).first()

        if not category:
            print(f"  ⚠ Category '{category_slug}' not found, skipping niche '{niche_name}'")
            continue

        # Check if niche already exists
        existing = Niche.query.filter_by(category_id=category.id, slug=niche_slug).first()

        if existing:
            print(f"  ✓ Niche '{niche_name}' already exists in '{category.name}'")
        else:
            niche = Niche(
                category_id=category.id,
                name=niche_name,
                slug=niche_slug,
                description=description,
                is_active=True
            )
            db.session.add(niche)
            db.session.commit()
            print(f"  + Created niche '{niche_name}' in '{category.name}'")

    print("\nNiches seeded successfully!")
    print(f"Total niches in database: {Niche.query.count()}")


def main():
    """Main function to run the seeding"""
    # Determine environment
    env = os.getenv('FLASK_ENV', 'development')
    print(f"Running in {env} environment")

    app = create_app(env)

    with app.app_context():
        try:
            # Seed categories
            seed_categories()

            # Ask if user wants to seed niches too
            response = input("\nDo you want to seed sample niches as well? (y/n): ")
            if response.lower() == 'y':
                seed_sample_niches()

            print("\n✓ Database seeding completed successfully!")

        except Exception as e:
            print(f"\n✗ Error seeding database: {e}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    main()
