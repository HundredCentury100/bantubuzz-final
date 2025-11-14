from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db
from app.models import Analytics, Booking, Package, Campaign
from sqlalchemy import func

bp = Blueprint('analytics', __name__)


@bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for current user"""
    try:
        user_id = get_jwt_identity()
        from app.models import User, CreatorProfile, BrandProfile

        user = User.query.get(user_id)
        stats = {}

        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()

            # Total bookings
            total_bookings = Booking.query.filter_by(creator_id=creator.id).count()

            # Total earnings
            total_earnings = db.session.query(func.sum(Booking.amount)).filter(
                Booking.creator_id == creator.id,
                Booking.payment_status == 'paid'
            ).scalar() or 0

            # Active bookings
            active_bookings = Booking.query.filter_by(
                creator_id=creator.id,
                status='in_progress'
            ).count()

            # Total packages
            total_packages = Package.query.filter_by(creator_id=creator.id).count()

            stats = {
                'total_bookings': total_bookings,
                'total_earnings': total_earnings,
                'active_bookings': active_bookings,
                'total_packages': total_packages
            }

        else:  # brand
            brand = BrandProfile.query.filter_by(user_id=user_id).first()

            # Total campaigns
            total_campaigns = Campaign.query.filter_by(brand_id=brand.id).count()

            # Total spending
            total_spending = db.session.query(func.sum(Booking.amount)).filter(
                Booking.brand_id == brand.id,
                Booking.payment_status == 'paid'
            ).scalar() or 0

            # Active bookings
            active_bookings = Booking.query.filter_by(
                brand_id=brand.id,
                status='in_progress'
            ).count()

            # Completed bookings
            completed_bookings = Booking.query.filter_by(
                brand_id=brand.id,
                status='completed'
            ).count()

            stats = {
                'total_campaigns': total_campaigns,
                'total_spending': total_spending,
                'active_bookings': active_bookings,
                'completed_bookings': completed_bookings
            }

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/earnings', methods=['GET'])
@jwt_required()
def get_earnings():
    """Get earnings over time (creators only)"""
    try:
        user_id = get_jwt_identity()
        from app.models import User, CreatorProfile

        user = User.query.get(user_id)
        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can view earnings'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get earnings grouped by date
        earnings = db.session.query(
            func.date(Booking.booking_date).label('date'),
            func.sum(Booking.amount).label('amount')
        ).filter(
            Booking.creator_id == creator.id,
            Booking.payment_status == 'paid',
            Booking.booking_date >= start_date
        ).group_by(func.date(Booking.booking_date)).all()

        return jsonify({
            'earnings': [{'date': e.date.isoformat(), 'amount': float(e.amount)} for e in earnings]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
