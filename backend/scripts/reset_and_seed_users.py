"""
Reset Users and Create Sample Data
This script:
1. Deletes all existing non-admin users
2. Creates sample creators with usernames and social links
3. Creates sample brands with company names
4. Features some creators with different types
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, CreatorProfile, BrandProfile
from datetime import datetime
import random

def reset_and_seed():
    """Delete existing users and create sample data"""
    app = create_app()

    with app.app_context():
        try:
            print("\n" + "="*80)
            print("RESETTING USERS AND CREATING SAMPLE DATA")
            print("="*80 + "\n")

            # Delete all non-admin users and their related data
            print("1. Deleting existing non-admin users...")
            from sqlalchemy import text

            # Get count before deletion
            non_admin_count = User.query.filter(
                (User.is_admin == False) | (User.is_admin == None)
            ).count()

            # Delete using SQL to avoid cascade issues
            # First, delete related data in order of dependencies
            db.session.execute(text("DELETE FROM otps WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))
            db.session.execute(text("DELETE FROM wallet_transactions WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))
            db.session.execute(text("DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))
            db.session.execute(text("DELETE FROM cashout_requests WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))
            db.session.execute(text("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))
            db.session.execute(text("DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL) OR receiver_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))

            # Delete creator-related data (packages, bookings, reviews, etc.)
            db.session.execute(text("DELETE FROM reviews WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL))"))
            db.session.execute(text("DELETE FROM collaborations WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)) OR brand_id IN (SELECT id FROM brand_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL))"))
            db.session.execute(text("DELETE FROM bookings WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)) OR brand_id IN (SELECT id FROM brand_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL))"))
            db.session.execute(text("DELETE FROM saved_creators WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)) OR brand_id IN (SELECT id FROM brand_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL))"))
            db.session.execute(text("DELETE FROM packages WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL))"))

            # Delete brand-related data
            db.session.execute(text("DELETE FROM campaign_applications WHERE campaign_id IN (SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brand_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)))"))
            db.session.execute(text("DELETE FROM campaigns WHERE brand_id IN (SELECT id FROM brand_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL))"))

            # Delete profiles (which will cascade to their related data)
            db.session.execute(text("DELETE FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))
            db.session.execute(text("DELETE FROM brand_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin = FALSE OR is_admin IS NULL)"))

            # Finally delete users
            db.session.execute(text("DELETE FROM users WHERE is_admin = FALSE OR is_admin IS NULL"))

            db.session.commit()
            print(f"   ✓ Deleted {non_admin_count} non-admin users and their related data\n")

            # Sample creator data with different platforms
            creators_data = [
                {
                    "email": "sarah_tiktoker@example.com",
                    "username": "sarah_creates",
                    "bio": "TikTok content creator specializing in lifestyle and fashion content. 500K+ followers",
                    "categories": ["Fashion", "Lifestyle"],
                    "follower_count": 523000,
                    "engagement_rate": 8.5,
                    "location": "Nairobi, Kenya",
                    "social_links": {"tiktok": "https://tiktok.com/@sarah_creates", "instagram": "https://instagram.com/sarah_creates"},
                    "featured": True,
                    "featured_type": "tiktok"
                },
                {
                    "email": "mike_fitness@example.com",
                    "username": "fitlife_mike",
                    "bio": "Fitness coach and Instagram influencer. Transforming lives through health and wellness",
                    "categories": ["Fitness", "Health & Wellness"],
                    "follower_count": 342000,
                    "engagement_rate": 7.2,
                    "location": "Lagos, Nigeria",
                    "social_links": {"instagram": "https://instagram.com/fitlife_mike", "youtube": "https://youtube.com/@FitLifeMike"},
                    "featured": True,
                    "featured_type": "instagram"
                },
                {
                    "email": "tasha_food@example.com",
                    "username": "tasha_foodie",
                    "bio": "Food blogger sharing African cuisine recipes on TikTok and Instagram",
                    "categories": ["Food & Beverage"],
                    "follower_count": 287000,
                    "engagement_rate": 9.1,
                    "location": "Accra, Ghana",
                    "social_links": {"tiktok": "https://tiktok.com/@tasha_foodie", "instagram": "https://instagram.com/tasha_foodie"},
                    "featured": True,
                    "featured_type": "tiktok"
                },
                {
                    "email": "james_tech@example.com",
                    "username": "techguru_james",
                    "bio": "Tech reviewer and gadget enthusiast. Latest tech trends and reviews",
                    "categories": ["Technology"],
                    "follower_count": 198000,
                    "engagement_rate": 6.8,
                    "location": "Cape Town, South Africa",
                    "social_links": {"instagram": "https://instagram.com/techguru_james", "twitter": "https://twitter.com/techguru_james"},
                    "featured": True,
                    "featured_type": "instagram"
                },
                {
                    "email": "ada_beauty@example.com",
                    "username": "ada_glam",
                    "bio": "Beauty and makeup artist. Specializing in African beauty tutorials",
                    "categories": ["Beauty"],
                    "follower_count": 412000,
                    "engagement_rate": 8.9,
                    "location": "Kampala, Uganda",
                    "social_links": {"tiktok": "https://tiktok.com/@ada_glam", "instagram": "https://instagram.com/ada_glam"},
                    "featured": True,
                    "featured_type": "general"
                },
                {
                    "email": "leo_gaming@example.com",
                    "username": "leo_gamer",
                    "bio": "Gaming content creator and streamer. FIFA and action games specialist",
                    "categories": ["Gaming", "Entertainment"],
                    "follower_count": 156000,
                    "engagement_rate": 11.3,
                    "location": "Dar es Salaam, Tanzania",
                    "social_links": {"tiktok": "https://tiktok.com/@leo_gamer", "youtube": "https://youtube.com/@LeoGamer"},
                    "featured": False,
                    "featured_type": None
                },
                {
                    "email": "nina_travel@example.com",
                    "username": "wanderlust_nina",
                    "bio": "Travel vlogger exploring Africa. Sharing hidden gems and travel tips",
                    "categories": ["Travel"],
                    "follower_count": 234000,
                    "engagement_rate": 7.6,
                    "location": "Kigali, Rwanda",
                    "social_links": {"instagram": "https://instagram.com/wanderlust_nina", "youtube": "https://youtube.com/@WanderlustNina"},
                    "featured": False,
                    "featured_type": None
                },
                {
                    "email": "peter_comedy@example.com",
                    "username": "funny_pete",
                    "bio": "Comedy skits and entertainment. Making Africa laugh one video at a time",
                    "categories": ["Entertainment", "Comedy"],
                    "follower_count": 678000,
                    "engagement_rate": 12.4,
                    "location": "Johannesburg, South Africa",
                    "social_links": {"tiktok": "https://tiktok.com/@funny_pete", "instagram": "https://instagram.com/funny_pete"},
                    "featured": True,
                    "featured_type": "tiktok"
                }
            ]

            # Sample brand data
            brands_data = [
                {
                    "email": "marketing@afrishop.com",
                    "company_name": "AfriShop",
                    "description": "Leading e-commerce platform for African fashion and accessories",
                    "industry": "E-commerce",
                    "company_size": "51-200",
                    "location": "Nairobi, Kenya",
                    "website": "https://afrishop.com"
                },
                {
                    "email": "brand@fitnesshub.ng",
                    "company_name": "FitnessHub Nigeria",
                    "description": "Premium fitness equipment and wellness products",
                    "industry": "Health & Fitness",
                    "company_size": "11-50",
                    "location": "Lagos, Nigeria",
                    "website": "https://fitnesshub.ng"
                },
                {
                    "email": "contact@techstartup.gh",
                    "company_name": "TechStartup Ghana",
                    "description": "Innovative tech solutions for African businesses",
                    "industry": "Technology",
                    "company_size": "11-50",
                    "location": "Accra, Ghana",
                    "website": "https://techstartup.gh"
                },
                {
                    "email": "hello@beautybrand.co.za",
                    "company_name": "BeautyBrand SA",
                    "description": "Organic beauty and skincare products for African skin",
                    "industry": "Beauty & Cosmetics",
                    "company_size": "1-10",
                    "location": "Cape Town, South Africa",
                    "website": "https://beautybrand.co.za"
                }
            ]

            # Create creators
            print("2. Creating sample creators...")
            created_creators = []
            for idx, creator_data in enumerate(creators_data):
                # Create user
                user = User(
                    email=creator_data["email"],
                    password="password123",
                    user_type="creator"
                )
                user.is_verified = True
                user.is_active = True
                db.session.add(user)
                db.session.flush()

                # Create creator profile
                creator = CreatorProfile(
                    user_id=user.id,
                    username=creator_data["username"],
                    bio=creator_data["bio"],
                    categories=creator_data["categories"],
                    follower_count=creator_data["follower_count"],
                    engagement_rate=creator_data["engagement_rate"],
                    location=creator_data["location"],
                    social_links=creator_data["social_links"],
                    availability_status="available",
                    is_featured=creator_data["featured"],
                    featured_type=creator_data["featured_type"],
                    featured_order=idx if creator_data["featured"] else 0,
                    featured_since=datetime.utcnow() if creator_data["featured"] else None
                )
                db.session.add(creator)
                created_creators.append(creator_data["username"])

            db.session.commit()
            print(f"   ✓ Created {len(created_creators)} creators:")
            for username in created_creators:
                print(f"      - {username}")
            print()

            # Create brands
            print("3. Creating sample brands...")
            created_brands = []
            for brand_data in brands_data:
                # Create user
                user = User(
                    email=brand_data["email"],
                    password="password123",
                    user_type="brand"
                )
                user.is_verified = True
                user.is_active = True
                db.session.add(user)
                db.session.flush()

                # Create brand profile
                brand = BrandProfile(
                    user_id=user.id,
                    company_name=brand_data["company_name"],
                    description=brand_data["description"],
                    industry=brand_data["industry"],
                    company_size=brand_data["company_size"],
                    location=brand_data["location"],
                    website=brand_data["website"],
                    verified_status=True
                )
                db.session.add(brand)
                created_brands.append(brand_data["company_name"])

            db.session.commit()
            print(f"   ✓ Created {len(created_brands)} brands:")
            for company in created_brands:
                print(f"      - {company}")
            print()

            # Summary
            print("\n" + "="*80)
            print("SUMMARY")
            print("="*80)
            print(f"Total Creators: {len(created_creators)}")
            print(f"Featured Creators:")
            featured_count = sum(1 for c in creators_data if c["featured"])
            tiktok_count = sum(1 for c in creators_data if c.get("featured_type") == "tiktok")
            ig_count = sum(1 for c in creators_data if c.get("featured_type") == "instagram")
            general_count = sum(1 for c in creators_data if c.get("featured_type") == "general")
            print(f"  - TikTok Featured: {tiktok_count}")
            print(f"  - Instagram Featured: {ig_count}")
            print(f"  - General Featured: {general_count}")
            print(f"Total Brands: {len(created_brands)}")
            print("\nAll users created with password: password123")
            print("="*80 + "\n")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == '__main__':
    reset_and_seed()
