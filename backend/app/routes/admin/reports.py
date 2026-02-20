"""
Admin Reports routes - Business intelligence and analytics
"""
from flask import jsonify, request
from sqlalchemy import func, case, and_, or_, extract
from datetime import datetime, timedelta
from app import db
from app.models import (
    User, CreatorProfile, BrandProfile, Collaboration, Payment,
    Booking, Review, Dispute, WalletTransaction, CashoutRequest
)
from app.decorators.admin import admin_required
from . import bp


@bp.route('/reports/growth', methods=['GET'])
@admin_required
def get_growth_report():
    """
    Growth metrics - user acquisition and activation

    Query params:
        days: int (30, 90, 365) - default 30
    """
    try:
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)

        # Total users over time (daily signup counts)
        daily_signups = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count'),
            func.sum(case((User.user_type == 'creator', 1), else_=0)).label('creators'),
            func.sum(case((User.user_type == 'brand', 1), else_=0)).label('brands')
        ).filter(
            User.created_at >= start_date
        ).group_by(
            func.date(User.created_at)
        ).order_by('date').all()

        # Activation rate (users who made at least one booking)
        total_users = User.query.filter(User.created_at >= start_date).count()

        activated_users = db.session.query(func.count(func.distinct(User.id))).join(
            BrandProfile, User.id == BrandProfile.user_id
        ).join(
            Booking, BrandProfile.id == Booking.brand_id
        ).filter(
            User.created_at >= start_date,
            Booking.status.in_(['confirmed', 'completed'])
        ).scalar() or 0

        activation_rate = (activated_users / total_users * 100) if total_users > 0 else 0

        # Current totals
        total_creators = User.query.filter_by(user_type='creator', is_active=True).count()
        total_brands = User.query.filter_by(user_type='brand', is_active=True).count()

        return jsonify({
            'success': True,
            'data': {
                'period_days': days,
                'daily_signups': [
                    {
                        'date': str(row.date),
                        'total': row.count,
                        'creators': row.creators,
                        'brands': row.brands
                    }
                    for row in daily_signups
                ],
                'activation_rate': round(activation_rate, 2),
                'total_users': total_users,
                'activated_users': activated_users,
                'current_totals': {
                    'creators': total_creators,
                    'brands': total_brands,
                    'total': total_creators + total_brands
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to generate growth report',
            'message': str(e)
        }), 500


@bp.route('/reports/revenue', methods=['GET'])
@admin_required
def get_revenue_report():
    """
    Revenue metrics - platform earnings and transaction volume

    Query params:
        months: int (3, 6, 12) - default 6
    """
    try:
        months = int(request.args.get('months', 6))
        start_date = datetime.utcnow() - timedelta(days=months * 30)

        # Monthly transaction volume and platform fees
        monthly_revenue = db.session.query(
            extract('year', Payment.created_at).label('year'),
            extract('month', Payment.created_at).label('month'),
            func.sum(Payment.amount).label('volume'),
            func.count(Payment.id).label('transaction_count')
        ).filter(
            Payment.status.in_(['completed', 'paid']),
            Payment.created_at >= start_date
        ).group_by('year', 'month').order_by('year', 'month').all()

        # Platform fees from wallet transactions
        monthly_fees = db.session.query(
            extract('year', WalletTransaction.created_at).label('year'),
            extract('month', WalletTransaction.created_at).label('month'),
            func.sum(WalletTransaction.platform_fee).label('fees')
        ).filter(
            WalletTransaction.transaction_type == 'earning',
            WalletTransaction.platform_fee.isnot(None),
            WalletTransaction.created_at >= start_date
        ).group_by('year', 'month').order_by('year', 'month').all()

        # Combine revenue and fees
        revenue_by_month = {}
        for row in monthly_revenue:
            key = f"{int(row.year)}-{int(row.month):02d}"
            revenue_by_month[key] = {
                'volume': float(row.volume or 0),
                'transactions': row.transaction_count,
                'fees': 0
            }

        for row in monthly_fees:
            key = f"{int(row.year)}-{int(row.month):02d}"
            if key in revenue_by_month:
                revenue_by_month[key]['fees'] = float(row.fees or 0)
            else:
                revenue_by_month[key] = {
                    'volume': 0,
                    'transactions': 0,
                    'fees': float(row.fees or 0)
                }

        # Refund rate
        total_payments = Payment.query.filter(
            Payment.status.in_(['completed', 'paid', 'refunded']),
            Payment.created_at >= start_date
        ).count()

        refunded_payments = Payment.query.filter_by(status='refunded').filter(
            Payment.created_at >= start_date
        ).count()

        refund_rate = (refunded_payments / total_payments * 100) if total_payments > 0 else 0

        # Top creators by revenue
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

        # Top brands by spend
        top_brands = db.session.query(
            BrandProfile.id,
            BrandProfile.company_name,
            func.sum(Booking.amount).label('total_spent'),
            func.count(Booking.id).label('bookings')
        ).join(
            Booking, BrandProfile.id == Booking.brand_id
        ).filter(
            Booking.status.in_(['confirmed', 'completed']),
            Booking.created_at >= start_date
        ).group_by(
            BrandProfile.id, BrandProfile.company_name
        ).order_by(func.sum(Booking.amount).desc()).limit(10).all()

        return jsonify({
            'success': True,
            'data': {
                'period_months': months,
                'monthly_data': [
                    {
                        'month': month,
                        'volume': data['volume'],
                        'fees': data['fees'],
                        'transactions': data['transactions']
                    }
                    for month, data in sorted(revenue_by_month.items())
                ],
                'refund_rate': round(refund_rate, 2),
                'top_creators': [
                    {
                        'id': c.id,
                        'name': c.username,
                        'total_earned': float(c.total_earned or 0),
                        'collaborations': c.collaborations
                    }
                    for c in top_creators
                ],
                'top_brands': [
                    {
                        'id': b.id,
                        'name': b.company_name,
                        'total_spent': float(b.total_spent or 0),
                        'bookings': b.bookings
                    }
                    for b in top_brands
                ]
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to generate revenue report',
            'message': str(e)
        }), 500


@bp.route('/reports/marketplace-health', methods=['GET'])
@admin_required
def get_marketplace_health_report():
    """
    Marketplace health metrics - collaboration quality and delivery
    """
    try:
        # Active vs completed ratio
        active_collabs = Collaboration.query.filter_by(status='in_progress').count()
        completed_collabs = Collaboration.query.filter_by(status='completed').count()
        total_collabs = active_collabs + completed_collabs

        # Dispute rate
        total_disputes = Dispute.query.count()
        dispute_rate = (total_disputes / total_collabs * 100) if total_collabs > 0 else 0

        # On-time delivery rate
        completed_on_time = Collaboration.query.filter(
            Collaboration.status == 'completed',
            Collaboration.expected_completion_date.isnot(None),
            Collaboration.actual_completion_date <= Collaboration.expected_completion_date
        ).count()

        completed_with_dates = Collaboration.query.filter(
            Collaboration.status == 'completed',
            Collaboration.expected_completion_date.isnot(None),
            Collaboration.actual_completion_date.isnot(None)
        ).count()

        on_time_rate = (completed_on_time / completed_with_dates * 100) if completed_with_dates > 0 else 0

        # Cancellation rate by month (last 6 months)
        six_months_ago = datetime.utcnow() - timedelta(days=180)

        monthly_cancellations = db.session.query(
            extract('year', Collaboration.updated_at).label('year'),
            extract('month', Collaboration.updated_at).label('month'),
            func.count(Collaboration.id).label('cancelled')
        ).filter(
            Collaboration.status == 'cancelled',
            Collaboration.updated_at >= six_months_ago
        ).group_by('year', 'month').order_by('year', 'month').all()

        monthly_total = db.session.query(
            extract('year', Collaboration.created_at).label('year'),
            extract('month', Collaboration.created_at).label('month'),
            func.count(Collaboration.id).label('total')
        ).filter(
            Collaboration.created_at >= six_months_ago
        ).group_by('year', 'month').order_by('year', 'month').all()

        # Combine cancellation data
        cancellation_by_month = {}
        for row in monthly_total:
            key = f"{int(row.year)}-{int(row.month):02d}"
            cancellation_by_month[key] = {'total': row.total, 'cancelled': 0}

        for row in monthly_cancellations:
            key = f"{int(row.year)}-{int(row.month):02d}"
            if key in cancellation_by_month:
                cancellation_by_month[key]['cancelled'] = row.cancelled

        # Average rating
        avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0
        total_reviews = Review.query.count()

        return jsonify({
            'success': True,
            'data': {
                'collaboration_ratio': {
                    'active': active_collabs,
                    'completed': completed_collabs,
                    'total': total_collabs
                },
                'dispute_rate': round(dispute_rate, 2),
                'on_time_delivery_rate': round(on_time_rate, 2),
                'cancellation_by_month': [
                    {
                        'month': month,
                        'total': data['total'],
                        'cancelled': data['cancelled'],
                        'rate': round((data['cancelled'] / data['total'] * 100) if data['total'] > 0 else 0, 2)
                    }
                    for month, data in sorted(cancellation_by_month.items())
                ],
                'average_rating': round(float(avg_rating), 2),
                'total_reviews': total_reviews
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to generate marketplace health report',
            'message': str(e)
        }), 500


@bp.route('/reports/risk', methods=['GET'])
@admin_required
def get_risk_report():
    """
    Risk metrics - flagged users and suspicious activity
    """
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Users with multiple disputes
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

        # Users with multiple recent cancellations (creators)
        creator_cancellations = db.session.query(
            User.id,
            User.email,
            User.user_type,
            func.count(Collaboration.id).label('cancellation_count')
        ).join(
            CreatorProfile, User.id == CreatorProfile.user_id
        ).join(
            Collaboration, CreatorProfile.id == Collaboration.creator_id
        ).filter(
            Collaboration.status == 'cancelled',
            Collaboration.updated_at >= thirty_days_ago
        ).group_by(User.id, User.email, User.user_type).having(
            func.count(Collaboration.id) >= 2
        ).order_by(func.count(Collaboration.id).desc()).all()

        # Users with multiple recent cancellations (brands)
        brand_cancellations = db.session.query(
            User.id,
            User.email,
            User.user_type,
            func.count(Collaboration.id).label('cancellation_count')
        ).join(
            BrandProfile, User.id == BrandProfile.user_id
        ).join(
            Collaboration, BrandProfile.id == Collaboration.brand_id
        ).filter(
            Collaboration.status == 'cancelled',
            Collaboration.updated_at >= thirty_days_ago
        ).group_by(User.id, User.email, User.user_type).having(
            func.count(Collaboration.id) >= 2
        ).order_by(func.count(Collaboration.id).desc()).all()

        # Combine both lists
        users_with_cancellations = list(creator_cancellations) + list(brand_cancellations)

        # Failed payment accounts
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

        # Suspended accounts log
        suspended_users = User.query.filter_by(is_active=False).order_by(
            User.updated_at.desc()
        ).limit(20).all()

        # High-value transactions (top 20)
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

        return jsonify({
            'success': True,
            'data': {
                'users_with_multiple_disputes': [
                    {
                        'user_id': u.id,
                        'email': u.email,
                        'user_type': u.user_type,
                        'dispute_count': u.dispute_count
                    }
                    for u in users_with_disputes
                ],
                'users_with_recent_cancellations': [
                    {
                        'user_id': u.id,
                        'email': u.email,
                        'user_type': u.user_type,
                        'cancellation_count': u.cancellation_count
                    }
                    for u in users_with_cancellations
                ],
                'failed_payment_accounts': [
                    {
                        'user_id': u.id,
                        'email': u.email,
                        'user_type': u.user_type,
                        'failed_count': u.failed_count
                    }
                    for u in failed_payment_users
                ],
                'suspended_accounts': [
                    {
                        'user_id': u.id,
                        'email': u.email,
                        'user_type': u.user_type,
                        'suspended_at': u.updated_at.isoformat()
                    }
                    for u in suspended_users
                ],
                'high_value_transactions': [
                    {
                        'payment_id': t.id,
                        'amount': float(t.amount),
                        'status': t.status,
                        'date': t.created_at.isoformat(),
                        'booking_id': t.booking_id,
                        'brand': t.company_name,
                        'creator': t.username
                    }
                    for t in high_value_transactions
                ]
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to generate risk report',
            'message': str(e)
        }), 500
