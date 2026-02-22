from app import create_app, db
from datetime import datetime, timedelta
from sqlalchemy import func, extract

app = create_app()
with app.app_context():
    try:
        from app.models import Payment, CreatorProfile, Collaboration, BrandProfile, Booking

        months = 6
        start_date = datetime.utcnow() - timedelta(days=months * 30)

        print('Testing revenue endpoint queries...')

        # Test top creators query
        print('\n1. Top creators query...')
        top_creators = db.session.query(
            CreatorProfile.id,
            CreatorProfile.username,
            CreatorProfile.display_name,
            func.sum(Collaboration.amount).label('total_earned'),
            func.count(Collaboration.id).label('collaborations')
        ).join(
            Collaboration, CreatorProfile.id == Collaboration.creator_id
        ).filter(
            Collaboration.status == 'completed',
            Collaboration.created_at >= start_date
        ).group_by(
            CreatorProfile.id, CreatorProfile.username, CreatorProfile.display_name
        ).order_by(func.sum(Collaboration.amount).desc()).limit(10).all()

        print(f'✓ Top creators: {len(top_creators)} results')

        # Test top brands query
        print('\n2. Top brands query...')
        top_brands = db.session.query(
            BrandProfile.id,
            BrandProfile.company_name,
            func.sum(Booking.total_amount).label('total_spent'),
            func.count(Booking.id).label('bookings')
        ).join(
            Booking, BrandProfile.id == Booking.brand_id
        ).filter(
            Booking.status.in_(['confirmed', 'completed']),
            Booking.created_at >= start_date
        ).group_by(
            BrandProfile.id, BrandProfile.company_name
        ).order_by(func.sum(Booking.total_amount).desc()).limit(10).all()

        print(f'✓ Top brands: {len(top_brands)} results')

        print('\n✓ All revenue queries succeeded!')

    except Exception as e:
        print(f'\n✗ Error: {e}')
        import traceback
        traceback.print_exc()
