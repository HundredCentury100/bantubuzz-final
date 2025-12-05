"""
Reset users and create demo data
- Deletes all users (and cascades to profiles, campaigns, packages, etc.)
- Creates 1 demo brand with campaigns
- Creates 1 demo creator with packages
"""
from app import create_app, db
from app.models import (
    User, BrandProfile, CreatorProfile, Campaign, Package,
    Booking, Collaboration, Message, Notification, Review,
    Payment, PaymentVerification, WalletTransaction, Wallet, CashoutRequest,
    SavedCreator, Analytics, OTP, CampaignApplication
)
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

app = create_app()

def delete_all_users():
    """Delete all users and related data"""
    with app.app_context():
        print("🗑️  Deleting all existing data...")

        # Delete in correct order to avoid foreign key issues
        print("  - Deleting cashouts...")
        CashoutRequest.query.delete()

        print("  - Deleting saved creators...")
        SavedCreator.query.delete()

        print("  - Deleting campaign applications...")
        CampaignApplication.query.delete()

        print("  - Deleting analytics...")
        Analytics.query.delete()

        print("  - Deleting OTPs...")
        OTP.query.delete()

        print("  - Deleting wallet transactions...")
        WalletTransaction.query.delete()

        print("  - Deleting wallets...")
        Wallet.query.delete()

        print("  - Deleting payment verifications...")
        PaymentVerification.query.delete()

        print("  - Deleting payments...")
        Payment.query.delete()

        print("  - Deleting reviews...")
        Review.query.delete()

        print("  - Deleting notifications...")
        Notification.query.delete()

        print("  - Deleting messages...")
        Message.query.delete()

        print("  - Deleting collaborations...")
        Collaboration.query.delete()

        print("  - Deleting bookings...")
        Booking.query.delete()

        print("  - Deleting packages...")
        Package.query.delete()

        print("  - Deleting campaigns...")
        Campaign.query.delete()

        print("  - Deleting creator profiles...")
        CreatorProfile.query.delete()

        print("  - Deleting brand profiles...")
        BrandProfile.query.delete()

        print("  - Deleting users...")
        User.query.delete()

        db.session.commit()
        print("✅ All data deleted successfully!\n")


def create_demo_users():
    """Create demo brand and creator users"""
    with app.app_context():
        print("👥 Creating demo users...\n")

        # Create Brand User
        print("📢 Creating demo brand user...")
        brand_user = User(
            email='brand@demo.com',
            password='password123',
            user_type='brand'
        )
        brand_user.is_verified = True
        brand_user.created_at = datetime.utcnow()
        db.session.add(brand_user)
        db.session.flush()

        brand_profile = BrandProfile(
            user_id=brand_user.id,
            company_name='TechStartup Co',
            industry='Technology',
            company_size='11-50',
            website='https://techstartup.demo',
            description='A fast-growing tech startup looking to boost our brand awareness through influencer collaborations.',
            location='Harare, Zimbabwe',
            verified_status=True
        )
        db.session.add(brand_profile)
        print(f"   ✅ Brand created: {brand_profile.company_name} ({brand_user.email})")

        # Create Creator User
        print("\n🎨 Creating demo creator user...")
        creator_user = User(
            email='creator@demo.com',
            password='password123',
            user_type='creator'
        )
        creator_user.is_verified = True
        creator_user.created_at = datetime.utcnow()
        db.session.add(creator_user)
        db.session.flush()

        creator_profile = CreatorProfile(
            user_id=creator_user.id,
            username='creativepro',
            bio='Professional content creator specializing in tech reviews, lifestyle content, and brand collaborations. 50K+ followers across platforms.',
            categories=['Technology', 'Lifestyle', 'Reviews'],
            location='Harare, Zimbabwe',
            follower_count=50000,
            engagement_rate=4.5,
            social_links={
                'instagram': 'https://instagram.com/creativepro',
                'tiktok': 'https://tiktok.com/@creativepro',
                'youtube': 'https://youtube.com/c/creativepro'
            },
            portfolio_url='https://creativepro.demo',
            availability_status='available',
            is_featured=True,
            featured_type='general',
            featured_order=1
        )
        db.session.add(creator_profile)
        print(f"   ✅ Creator created: {creator_profile.username} ({creator_user.email})")

        db.session.commit()
        print("\n✅ Demo users created successfully!\n")

        return brand_profile.id, creator_profile.id


def create_demo_campaigns(brand_profile_id):
    """Create demo campaigns for the brand"""
    with app.app_context():
        print("📋 Creating demo campaigns...\n")

        # Re-fetch brand_profile in this context
        from app.models import BrandProfile
        brand_profile = BrandProfile.query.get(brand_profile_id)

        campaigns = [
            {
                'title': 'New Product Launch Campaign',
                'description': 'We\'re launching our revolutionary new app and need creators to showcase its features to their audience. Looking for authentic reviews and demonstration videos.',
                'objectives': 'Generate buzz and awareness for our new app launch, reach tech-savvy audience',
                'budget': 500.00,
                'category': 'Technology',
                'requirements': {
                    'audience': 'Tech-focused audience, minimum 10K followers',
                    'quality': 'Professional video quality',
                    'deliverables': ['1 Instagram Reel (60s)', '2 Instagram Stories', '1 TikTok video'],
                    'timeline': '2 weeks'
                },
                'status': 'active'
            },
            {
                'title': 'Brand Awareness Campaign',
                'description': 'Seeking creators to help us build brand awareness in the Zimbabwean market. Focus on lifestyle content that naturally integrates our brand.',
                'objectives': 'Build brand awareness and recognition in the Zimbabwean market',
                'budget': 350.00,
                'category': 'Lifestyle',
                'requirements': {
                    'location': 'Zimbabwe-based creators',
                    'audience': 'Engaged audience, creative storytelling',
                    'deliverables': ['3 Instagram posts', '5 Stories', '1 Blog post (optional)'],
                    'timeline': '3 weeks'
                },
                'status': 'active'
            },
            {
                'title': 'Holiday Season Promotion',
                'description': 'Special holiday campaign offering exclusive deals. Need creators to promote our limited-time offers with festive, engaging content.',
                'objectives': 'Drive sales during holiday season with limited-time promotional offers',
                'budget': 400.00,
                'category': 'E-commerce',
                'requirements': {
                    'experience': 'Experience with promotional content, high engagement rate',
                    'deliverables': ['2 Instagram Reels', '1 YouTube Short', 'Multiple Stories'],
                    'timeline': '1 week (urgent)'
                },
                'status': 'active'
            }
        ]

        for idx, camp_data in enumerate(campaigns, 1):
            campaign = Campaign(
                brand_id=brand_profile.id,
                title=camp_data['title'],
                description=camp_data['description'],
                objectives=camp_data['objectives'],
                budget=camp_data['budget'],
                category=camp_data['category'],
                requirements=camp_data['requirements'],
                status=camp_data['status'],
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=30),
                created_at=datetime.utcnow() - timedelta(days=idx)
            )
            db.session.add(campaign)
            print(f"   ✅ Campaign {idx}: {campaign.title}")

        db.session.commit()
        print("\n✅ Demo campaigns created successfully!\n")


def create_demo_packages(creator_profile_id):
    """Create demo packages for the creator"""
    with app.app_context():
        print("📦 Creating demo packages...\n")

        # Re-fetch creator_profile in this context
        from app.models import CreatorProfile
        creator_profile = CreatorProfile.query.get(creator_profile_id)

        packages = [
            {
                'title': 'Instagram Starter Pack',
                'description': 'Perfect for brands just starting with influencer marketing. Includes 1 feed post and 3 stories showcasing your product/service. Platform: Instagram.',
                'price': 150.00,
                'duration_days': 7,
                'deliverables': ['1 Instagram Feed Post', '3 Instagram Stories', 'Content review & approval'],
                'category': 'Social Media',
                'is_active': True
            },
            {
                'title': 'TikTok Viral Package',
                'description': 'Get maximum visibility with trending TikTok content. Includes 2 creative videos optimized for virality and engagement. Platform: TikTok.',
                'price': 200.00,
                'duration_days': 10,
                'deliverables': ['2 TikTok Videos (30-60s)', 'Trending sound integration', '3 follow-up stories'],
                'category': 'Video Content',
                'is_active': True
            },
            {
                'title': 'Multi-Platform Premium',
                'description': 'Comprehensive package covering Instagram, TikTok, and YouTube. Maximum reach across all platforms with cohesive messaging.',
                'price': 400.00,
                'duration_days': 14,
                'deliverables': [
                    '2 Instagram Feed Posts',
                    '5 Instagram Stories',
                    '1 TikTok Video',
                    '1 YouTube Short',
                    'Detailed analytics report'
                ],
                'category': 'Multi-Platform',
                'is_active': True
            },
            {
                'title': 'Product Review Special',
                'description': 'In-depth, authentic product review with professional photography and videography. Ideal for tech products and gadgets. Platforms: Instagram, YouTube.',
                'price': 250.00,
                'duration_days': 10,
                'deliverables': [
                    '1 Detailed Review Video (3-5 min)',
                    '5 Professional Product Photos',
                    '1 Instagram Reel',
                    'Honest written review'
                ],
                'category': 'Product Review',
                'is_active': True
            }
        ]

        for idx, pkg_data in enumerate(packages, 1):
            package = Package(
                creator_id=creator_profile.id,
                title=pkg_data['title'],
                description=pkg_data['description'],
                price=pkg_data['price'],
                duration_days=pkg_data['duration_days'],
                deliverables=pkg_data['deliverables'],
                category=pkg_data['category'],
                is_active=pkg_data['is_active'],
                created_at=datetime.utcnow() - timedelta(days=idx)
            )
            db.session.add(package)
            print(f"   ✅ Package {idx}: {package.title} - ${package.price}")

        db.session.commit()
        print("\n✅ Demo packages created successfully!\n")


def main():
    """Main execution"""
    print("\n" + "="*80)
    print("🔄 BANTUBUZZ DEMO DATA RESET AND SEED")
    print("="*80 + "\n")

    # Step 1: Delete all users
    delete_all_users()

    # Step 2: Create demo users
    brand_profile_id, creator_profile_id = create_demo_users()

    # Step 3: Create demo campaigns
    create_demo_campaigns(brand_profile_id)

    # Step 4: Create demo packages
    create_demo_packages(creator_profile_id)

    print("="*80)
    print("✅ DEMO DATA SETUP COMPLETE!")
    print("="*80)
    print("\n📋 Login Credentials:")
    print("\n🏢 BRAND ACCOUNT:")
    print("   Email: brand@demo.com")
    print("   Password: password123")
    print("   Company: TechStartup Co")
    print("   Campaigns: 3 active campaigns")

    print("\n🎨 CREATOR ACCOUNT:")
    print("   Email: creator@demo.com")
    print("   Password: password123")
    print("   Username: @creativepro")
    print("   Packages: 4 available packages")

    print("\n" + "="*80 + "\n")


if __name__ == '__main__':
    main()
