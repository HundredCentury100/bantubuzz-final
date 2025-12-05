"""
Admin Dashboard routes - Overview statistics and quick actions
"""
from flask import jsonify
from sqlalchemy import func, cast, String
from datetime import datetime, timedelta
from app import db
from app.models import (
    User, CreatorProfile, BrandProfile, Collaboration, CashoutRequest,
    Payment, Campaign, Booking, Review, Wallet, WalletTransaction
)
from app.decorators.admin import admin_required
from . import bp


@bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """
    Get comprehensive dashboard statistics for admin overview

    Returns:
        - User statistics (total, creators, brands, verifications)
        - Collaboration statistics (active, completed)
        - Financial statistics (revenue, pending cashouts)
        - Platform activity metrics
        - Recent activity feed
    """
    try:
        # ===== USER STATISTICS =====
        total_users = User.query.filter_by(is_active=True).count()

        creators_count = User.query.filter_by(
            user_type='creator',
            is_active=True
        ).count()

        brands_count = User.query.filter_by(
            user_type='brand',
            is_active=True
        ).count()

        # Unverified users needing attention
        unverified_creators = User.query.join(CreatorProfile).filter(
            User.user_type == 'creator',
            User.is_verified == False,
            User.is_active == True
        ).count()

        unverified_brands = User.query.join(BrandProfile).filter(
            User.user_type == 'brand',
            User.is_verified == False,
            User.is_active == True
        ).count()

        # New users this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_users_this_week = User.query.filter(
            User.created_at >= week_ago
        ).count()

        # ===== COLLABORATION STATISTICS =====
        active_collaborations = Collaboration.query.filter_by(
            status='in_progress'
        ).count()

        completed_collaborations = Collaboration.query.filter_by(
            status='completed'
        ).count()

        cancelled_collaborations = Collaboration.query.filter_by(
            status='cancelled'
        ).count()

        # Pending cancellation requests
        pending_cancellations = Collaboration.query.filter(
            Collaboration.cancellation_request.isnot(None),
            cast(Collaboration.cancellation_request['status'], String) == 'pending'
        ).count()

        # ===== CASHOUT STATISTICS =====
        pending_cashouts = CashoutRequest.query.filter_by(
            status='pending'
        ).count()

        pending_cashouts_amount = db.session.query(
            func.sum(CashoutRequest.amount)
        ).filter_by(status='pending').scalar() or 0

        approved_cashouts_pending_processing = CashoutRequest.query.filter_by(
            status='approved'
        ).count()

        # ===== FINANCIAL STATISTICS =====
        # Total platform revenue
        total_revenue = db.session.query(
            func.sum(Payment.amount)
        ).filter_by(status='completed').scalar() or 0

        # Revenue this month
        first_day_month = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        month_revenue = db.session.query(
            func.sum(Payment.amount)
        ).filter(
            Payment.status == 'completed',
            Payment.created_at >= first_day_month
        ).scalar() or 0

        # Revenue this week
        week_revenue = db.session.query(
            func.sum(Payment.amount)
        ).filter(
            Payment.status == 'completed',
            Payment.created_at >= week_ago
        ).scalar() or 0

        # Total in escrow (pending collaborations)
        escrow_amount = db.session.query(
            func.sum(Collaboration.amount)
        ).filter_by(status='in_progress').scalar() or 0

        # ===== PLATFORM ACTIVITY =====
        active_campaigns = Campaign.query.filter(
            Campaign.status.in_(['active', 'published'])
        ).count()

        active_bookings = Booking.query.filter_by(
            status='confirmed'
        ).count()

        total_reviews = Review.query.count()

        # Average platform rating
        avg_rating = db.session.query(
            func.avg(Review.rating)
        ).scalar() or 0

        # ===== FEATURED CREATORS =====
        # Check if featured field exists
        try:
            featured_count = CreatorProfile.query.filter_by(
                is_featured=True
            ).count()
        except:
            featured_count = 0

        # ===== RECENT ACTIVITY =====
        # Recent cashout requests (last 10)
        recent_cashouts = CashoutRequest.query.join(
            Wallet
        ).join(
            User
        ).join(
            CreatorProfile
        ).order_by(
            CashoutRequest.created_at.desc()
        ).limit(10).all()

        cashouts_data = []
        for cashout in recent_cashouts:
            creator = cashout.wallet.user.creator_profile
            cashouts_data.append({
                'id': cashout.id,
                'creator_name': creator.username or cashout.wallet.user.email,
                'creator_id': creator.id,
                'amount': float(cashout.amount),
                'status': cashout.status,
                'created_at': cashout.created_at.isoformat(),
                'payment_method': cashout.payment_method
            })

        # Recent user registrations (last 10)
        recent_users = User.query.order_by(
            User.created_at.desc()
        ).limit(10).all()

        users_data = []
        for user in recent_users:
            users_data.append({
                'id': user.id,
                'email': user.email,
                'user_type': user.user_type,
                'is_verified': user.is_verified,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat()
            })

        # Recent cancellation requests (last 5)
        recent_cancellations = Collaboration.query.filter(
            Collaboration.cancellation_request.isnot(None),
            cast(Collaboration.cancellation_request['status'], String) == 'pending'
        ).order_by(
            Collaboration.created_at.desc()
        ).limit(5).all()

        cancellations_data = []
        for collab in recent_cancellations:
            cancellations_data.append({
                'id': collab.id,
                'title': collab.title,
                'brand_id': collab.brand_id,
                'creator_id': collab.creator_id,
                'amount': float(collab.amount),
                'requested_by': collab.cancellation_request.get('requested_by'),
                'reason': collab.cancellation_request.get('reason'),
                'requested_at': collab.cancellation_request.get('requested_at')
            })

        # ===== CONSTRUCT RESPONSE =====
        return jsonify({
            'success': True,
            'data': {
                'users': {
                    'total': total_users,
                    'creators': creators_count,
                    'brands': brands_count,
                    'unverified_creators': unverified_creators,
                    'unverified_brands': unverified_brands,
                    'new_this_week': new_users_this_week
                },
                'collaborations': {
                    'active': active_collaborations,
                    'completed': completed_collaborations,
                    'cancelled': cancelled_collaborations,
                    'pending_cancellations': pending_cancellations
                },
                'cashouts': {
                    'pending_count': pending_cashouts,
                    'pending_amount': float(pending_cashouts_amount),
                    'approved_pending_processing': approved_cashouts_pending_processing
                },
                'revenue': {
                    'total': float(total_revenue),
                    'this_month': float(month_revenue),
                    'this_week': float(week_revenue),
                    'in_escrow': float(escrow_amount)
                },
                'platform': {
                    'active_campaigns': active_campaigns,
                    'active_bookings': active_bookings,
                    'total_reviews': total_reviews,
                    'average_rating': float(avg_rating) if avg_rating else 0
                },
                'featured_creators': featured_count,
                'recent_activity': {
                    'cashouts': cashouts_data,
                    'users': users_data,
                    'cancellations': cancellations_data
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch dashboard statistics',
            'message': str(e)
        }), 500


@bp.route('/dashboard/quick-actions', methods=['GET'])
@admin_required
def get_quick_actions():
    """
    Get counts for quick action items that need admin attention
    """
    try:
        unverified_count = User.query.filter_by(
            is_verified=False,
            is_active=True
        ).count()

        pending_cashouts = CashoutRequest.query.filter_by(
            status='pending'
        ).count()

        pending_cancellations = Collaboration.query.filter(
            Collaboration.cancellation_request.isnot(None),
            cast(Collaboration.cancellation_request['status'], String) == 'pending'
        ).count()

        return jsonify({
            'success': True,
            'data': {
                'unverified_users': unverified_count,
                'pending_cashouts': pending_cashouts,
                'pending_cancellations': pending_cancellations
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch quick actions',
            'message': str(e)
        }), 500
