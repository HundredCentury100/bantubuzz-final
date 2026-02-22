from app import create_app, db
from datetime import datetime, timedelta
from sqlalchemy import func, extract, case, and_, or_

app = create_app()
with app.app_context():
    from app.models import (
        Payment, WalletTransaction, CreatorProfile, BrandProfile,
        Collaboration, Booking, Dispute, Review, User
    )

    months = 6
    start_date = datetime.utcnow() - timedelta(days=months * 30)

    print("=" * 60)
    print("TESTING REVENUE ENDPOINT")
    print("=" * 60)

    try:
        # Monthly transaction volume and platform fees
        print("\n1. Monthly revenue query...")
        monthly_revenue = db.session.query(
            extract('year', Payment.created_at).label('year'),
            extract('month', Payment.created_at).label('month'),
            func.sum(Payment.amount).label('volume'),
            func.count(Payment.id).label('transaction_count')
        ).filter(
            Payment.status.in_(['completed', 'paid']),
            Payment.created_at >= start_date
        ).group_by('year', 'month').order_by('year', 'month').all()
        print(f"✓ Monthly revenue: {len(monthly_revenue)} months")

        # Platform fees
        print("\n2. Monthly fees query...")
        monthly_fees = db.session.query(
            extract('year', WalletTransaction.created_at).label('year'),
            extract('month', WalletTransaction.created_at).label('month'),
            func.sum(WalletTransaction.platform_fee).label('fees')
        ).filter(
            WalletTransaction.transaction_type == 'earning',
            WalletTransaction.platform_fee.isnot(None),
            WalletTransaction.created_at >= start_date
        ).group_by('year', 'month').order_by('year', 'month').all()
        print(f"✓ Monthly fees: {len(monthly_fees)} months")

        # Refund rate
        print("\n3. Refund rate query...")
        total_payments = Payment.query.filter(
            Payment.status.in_(['completed', 'paid', 'refunded']),
            Payment.created_at >= start_date
        ).count()
        refunded_payments = Payment.query.filter_by(status='refunded').filter(
            Payment.created_at >= start_date
        ).count()
        print(f"✓ Total payments: {total_payments}, Refunded: {refunded_payments}")

        # Top creators
        print("\n4. Top creators query...")
        top_creators = db.session.query(
            CreatorProfile.id,
            CreatorProfile.username,
            func.sum(Collaboration.amount).label('total_earned'),
            func.count(Collaboration.id).label('collaborations')
        ).join(
            Collaboration, CreatorProfile.id == Collaboration.creator_id
        ).filter(
            Collaboration.status == 'completed',
            Collaboration.created_at >= start_date
        ).group_by(
            CreatorProfile.id, CreatorProfile.username
        ).order_by(func.sum(Collaboration.amount).desc()).limit(10).all()
        print(f"✓ Top creators: {len(top_creators)} results")

        # Top brands
        print("\n5. Top brands query...")
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
        print(f"✓ Top brands: {len(top_brands)} results")

        print("\n✅ REVENUE ENDPOINT: ALL QUERIES PASSED")

    except Exception as e:
        print(f"\n❌ REVENUE ENDPOINT ERROR: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("TESTING MARKETPLACE HEALTH ENDPOINT")
    print("=" * 60)

    try:
        print("\n1. Active vs completed collabs...")
        active_collabs = Collaboration.query.filter_by(status='in_progress').count()
        completed_collabs = Collaboration.query.filter_by(status='completed').count()
        print(f"✓ Active: {active_collabs}, Completed: {completed_collabs}")

        print("\n2. Dispute rate...")
        total_disputes = Dispute.query.count()
        print(f"✓ Total disputes: {total_disputes}")

        print("\n3. On-time delivery rate...")
        completed_on_time = Collaboration.query.filter(
            Collaboration.status == 'completed',
            Collaboration.expected_completion_date.isnot(None),
            Collaboration.actual_completion_date <= Collaboration.expected_completion_date
        ).count()
        print(f"✓ Completed on time: {completed_on_time}")

        print("\n4. Monthly cancellations...")
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        monthly_cancellations = db.session.query(
            extract('year', Collaboration.updated_at).label('year'),
            extract('month', Collaboration.updated_at).label('month'),
            func.count(Collaboration.id).label('cancelled')
        ).filter(
            Collaboration.status == 'cancelled',
            Collaboration.updated_at >= six_months_ago
        ).group_by('year', 'month').order_by('year', 'month').all()
        print(f"✓ Monthly cancellations: {len(monthly_cancellations)} months")

        print("\n5. Average rating...")
        avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0
        total_reviews = Review.query.count()
        print(f"✓ Avg rating: {avg_rating}, Total reviews: {total_reviews}")

        print("\n✅ MARKETPLACE HEALTH ENDPOINT: ALL QUERIES PASSED")

    except Exception as e:
        print(f"\n❌ MARKETPLACE HEALTH ERROR: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("TESTING RISK ENDPOINT")
    print("=" * 60)

    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        print("\n1. Users with multiple disputes...")
        users_with_disputes = db.session.query(
            User.id,
            User.email,
            User.user_type,
            func.count(Dispute.id).label('dispute_count')
        ).join(
            Dispute, or_(
                User.id == Dispute.raised_by_user_id,
                User.id == Dispute.against_user_id
            )
        ).group_by(User.id, User.email, User.user_type).having(
            func.count(Dispute.id) >= 2
        ).order_by(func.count(Dispute.id).desc()).all()
        print(f"✓ Users with disputes: {len(users_with_disputes)}")

        print("\n2. Users with recent cancellations...")
        users_with_cancellations = db.session.query(
            User.id,
            User.email,
            User.user_type,
            func.count(Collaboration.id).label('cancellation_count')
        ).join(
            CreatorProfile, User.id == CreatorProfile.user_id
        ).join(
            Collaboration, or_(
                CreatorProfile.id == Collaboration.creator_id,
                and_(
                    User.user_type == 'brand',
                    Collaboration.brand_id == BrandProfile.id,
                    BrandProfile.user_id == User.id
                )
            )
        ).filter(
            Collaboration.status == 'cancelled',
            Collaboration.updated_at >= thirty_days_ago
        ).group_by(User.id, User.email, User.user_type).having(
            func.count(Collaboration.id) >= 2
        ).order_by(func.count(Collaboration.id).desc()).all()
        print(f"✓ Users with cancellations: {len(users_with_cancellations)}")

        print("\n3. Failed payment accounts...")
        failed_payment_users = db.session.query(
            User.id,
            User.email,
            User.user_type,
            func.count(Booking.id).label('failed_count')
        ).join(
            BrandProfile, User.id == BrandProfile.user_id
        ).join(
            Booking, BrandProfile.id == Booking.brand_id
        ).filter(
            Booking.payment_status == 'failed'
        ).group_by(User.id, User.email, User.user_type).order_by(
            func.count(Booking.id).desc()
        ).limit(20).all()
        print(f"✓ Failed payment users: {len(failed_payment_users)}")

        print("\n4. Suspended accounts...")
        suspended_users = User.query.filter_by(is_active=False).order_by(
            User.updated_at.desc()
        ).limit(20).all()
        print(f"✓ Suspended users: {len(suspended_users)}")

        print("\n5. High-value transactions...")
        high_value_transactions = db.session.query(
            Payment.id,
            Payment.amount,
            Payment.status,
            Payment.created_at,
            Booking.id.label('booking_id'),
            BrandProfile.company_name,
            CreatorProfile.username
        ).join(
            Booking, Payment.booking_id == Booking.id
        ).join(
            BrandProfile, Booking.brand_id == BrandProfile.id
        ).join(
            CreatorProfile, Booking.creator_id == CreatorProfile.id
        ).order_by(Payment.amount.desc()).limit(20).all()
        print(f"✓ High-value transactions: {len(high_value_transactions)}")

        print("\n✅ RISK ENDPOINT: ALL QUERIES PASSED")

    except Exception as e:
        print(f"\n❌ RISK ENDPOINT ERROR: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
