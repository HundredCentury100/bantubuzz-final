import os
from app import create_app, socketio, db

app = create_app(os.getenv('FLASK_ENV', 'development'))


@app.cli.command()
def init_db():
    """Initialize the database"""
    db.create_all()
    print('Database initialized successfully!')


@app.cli.command()
def seed_db():
    """Seed the database with sample data"""
    from app.models import User, CreatorProfile, BrandProfile, Package

    # Create sample creator
    creator_user = User(
        email='creator@example.com',
        password='password123',
        user_type='creator'
    )
    creator_user.is_verified = True
    db.session.add(creator_user)
    db.session.flush()

    creator_profile = CreatorProfile(
        user_id=creator_user.id,
        bio='Professional content creator specializing in tech and lifestyle',
        categories=['Technology', 'Lifestyle'],
        follower_count=50000,
        engagement_rate=4.5,
        location='Harare, Zimbabwe',
        languages=['English', 'Shona'],
        availability_status='available'
    )
    db.session.add(creator_profile)

    # Create sample brand
    brand_user = User(
        email='brand@example.com',
        password='password123',
        user_type='brand'
    )
    brand_user.is_verified = True
    db.session.add(brand_user)
    db.session.flush()

    brand_profile = BrandProfile(
        user_id=brand_user.id,
        company_name='Tech Startup Inc',
        description='Innovative tech company based in Africa',
        industry='Technology',
        company_size='11-50',
        location='Harare, Zimbabwe'
    )
    db.session.add(brand_profile)
    db.session.flush()

    # Create sample packages
    package1 = Package(
        creator_id=creator_profile.id,
        title='Instagram Post + Stories',
        description='One high-quality Instagram post + 3 stories featuring your product',
        price=150.00,
        duration_days=7,
        deliverables=['1 Instagram Post', '3 Instagram Stories', 'Usage Rights'],
        category='Social Media Marketing'
    )

    package2 = Package(
        creator_id=creator_profile.id,
        title='YouTube Video Review',
        description='Dedicated product review video on my YouTube channel (50K+ subscribers)',
        price=500.00,
        duration_days=14,
        deliverables=['YouTube Video (5-8 min)', 'Custom Thumbnail', 'Video Description'],
        category='Video Content'
    )

    db.session.add(package1)
    db.session.add(package2)

    db.session.commit()
    print('Database seeded successfully!')


if __name__ == '__main__':
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(
        app,
        debug=app.config['DEBUG'],
        host='0.0.0.0',
        port=5000
    )
