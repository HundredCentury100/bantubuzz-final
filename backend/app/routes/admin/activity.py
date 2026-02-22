"""
Admin Activity Feed - Aggregated platform activity from all tables
"""
from flask import jsonify, request
from sqlalchemy import or_
from datetime import datetime, timedelta
from app import db
from app.models import (
    User, CreatorProfile, BrandProfile, Collaboration,
    CashoutRequest, Payment, Campaign, Booking, Review
)
from app.decorators.admin import admin_required
from . import bp


def _format_dt(dt):
    if dt is None:
        return None
    return dt.isoformat()


@bp.route('/activity/feed', methods=['GET'])
@admin_required
def get_activity_feed():
    """
    Aggregated activity feed across all platform tables.

    Query params:
      - category: all | bookings | collaborations | payments | users | campaigns | reviews
      - days: 1 | 7 | 30 | 90  (default 7)
      - high_value: true  (filter to amounts > $100)
      - page: int (default 1)
      - per_page: int (default 50, max 100)
    """
    try:
        category = request.args.get('category', 'all')
        days = int(request.args.get('days', 7))
        high_value = request.args.get('high_value', 'false').lower() == 'true'
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)

        since = datetime.utcnow() - timedelta(days=days)
        HIGH_VALUE_THRESHOLD = 100  # USD

        events = []

        # ── USERS ──────────────────────────────────────────────────────────
        if category in ('all', 'users'):
            users = User.query.filter(
                User.created_at >= since
            ).order_by(User.created_at.desc()).limit(200).all()

            for u in users:
                if high_value:
                    continue  # user events have no amount
                events.append({
                    'id': f'user-{u.id}',
                    'type': 'user_registered',
                    'category': 'users',
                    'title': f'New {u.user_type} registered',
                    'description': u.email,
                    'amount': None,
                    'status': 'verified' if u.is_verified else 'pending',
                    'created_at': _format_dt(u.created_at),
                    'link': f'/admin/users/{u.id}',
                    'meta': {
                        'user_id': u.id,
                        'user_type': u.user_type,
                        'is_verified': u.is_verified,
                    }
                })

        # ── BOOKINGS ───────────────────────────────────────────────────────
        if category in ('all', 'bookings'):
            bookings = Booking.query.filter(
                Booking.created_at >= since
            ).order_by(Booking.created_at.desc()).limit(200).all()

            for b in bookings:
                amount = float(b.total_amount or b.amount or 0)
                if high_value and amount < HIGH_VALUE_THRESHOLD:
                    continue

                # Resolve names safely
                brand_user = User.query.get(b.brand_id) if b.brand_id else None
                creator_user = User.query.get(b.creator_id) if b.creator_id else None
                brand_name = brand_user.email if brand_user else 'Unknown Brand'
                creator_name = creator_user.email if creator_user else 'Unknown Creator'

                # Try to get display names from profiles
                try:
                    bp_profile = BrandProfile.query.filter_by(user_id=b.brand_id).first()
                    if bp_profile and bp_profile.company_name:
                        brand_name = bp_profile.company_name
                except Exception:
                    pass
                try:
                    cp = CreatorProfile.query.filter_by(user_id=b.creator_id).first()
                    if cp and cp.username:
                        creator_name = cp.username
                except Exception:
                    pass

                event_type = 'booking_created'
                if b.status == 'completed':
                    event_type = 'booking_completed'
                elif b.status == 'cancelled':
                    event_type = 'booking_cancelled'

                events.append({
                    'id': f'booking-{b.id}',
                    'type': event_type,
                    'category': 'bookings',
                    'title': f'Booking {b.status}',
                    'description': f'{brand_name} → {creator_name}',
                    'amount': amount,
                    'status': b.status,
                    'payment_status': b.payment_status,
                    'created_at': _format_dt(b.created_at),
                    'link': f'/admin/bookings',
                    'meta': {
                        'booking_id': b.id,
                        'brand': brand_name,
                        'creator': creator_name,
                        'package_id': b.package_id,
                    }
                })

        # ── COLLABORATIONS ─────────────────────────────────────────────────
        if category in ('all', 'collaborations'):
            collabs = Collaboration.query.filter(
                Collaboration.created_at >= since
            ).order_by(Collaboration.created_at.desc()).limit(200).all()

            for c in collabs:
                amount = float(c.amount or 0)
                if high_value and amount < HIGH_VALUE_THRESHOLD:
                    continue

                brand_user = User.query.get(c.brand_id) if c.brand_id else None
                creator_user = User.query.get(c.creator_id) if c.creator_id else None
                brand_name = brand_user.email if brand_user else 'Unknown Brand'
                creator_name = creator_user.email if creator_user else 'Unknown Creator'

                try:
                    bp_profile = BrandProfile.query.filter_by(user_id=c.brand_id).first()
                    if bp_profile and bp_profile.company_name:
                        brand_name = bp_profile.company_name
                except Exception:
                    pass
                try:
                    cp = CreatorProfile.query.filter_by(user_id=c.creator_id).first()
                    if cp and cp.username:
                        creator_name = cp.username
                except Exception:
                    pass

                # Flag anomalies
                flags = []
                if c.status == 'in_progress' and c.expected_completion:
                    if c.expected_completion < datetime.utcnow():
                        flags.append('overdue')
                if c.cancellation_request:
                    flags.append('cancellation_requested')

                event_type = 'collaboration_started'
                if c.status == 'completed':
                    event_type = 'collaboration_completed'
                elif c.status == 'cancelled':
                    event_type = 'collaboration_cancelled'

                events.append({
                    'id': f'collab-{c.id}',
                    'type': event_type,
                    'category': 'collaborations',
                    'title': c.title or 'Untitled Collaboration',
                    'description': f'{brand_name} ↔ {creator_name}',
                    'amount': amount,
                    'status': c.status,
                    'created_at': _format_dt(c.created_at),
                    'link': f'/admin/collaborations',
                    'flags': flags,
                    'meta': {
                        'collaboration_id': c.id,
                        'brand': brand_name,
                        'creator': creator_name,
                    }
                })

        # ── PAYMENTS / CASHOUTS ────────────────────────────────────────────
        if category in ('all', 'payments'):
            payments = Payment.query.filter(
                Payment.created_at >= since
            ).order_by(Payment.created_at.desc()).limit(200).all()

            for p in payments:
                amount = float(p.amount or 0)
                if high_value and amount < HIGH_VALUE_THRESHOLD:
                    continue

                events.append({
                    'id': f'payment-{p.id}',
                    'type': 'payment_made',
                    'category': 'payments',
                    'title': f'Payment {p.status}',
                    'description': f'Ref: {p.reference or p.id}',
                    'amount': amount,
                    'status': p.status,
                    'created_at': _format_dt(p.created_at),
                    'link': f'/admin/payments',
                    'meta': {
                        'payment_id': p.id,
                        'method': getattr(p, 'payment_method', None),
                        'reference': p.reference,
                    }
                })

            cashouts = CashoutRequest.query.filter(
                CashoutRequest.created_at >= since
            ).order_by(CashoutRequest.created_at.desc()).limit(100).all()

            for co in cashouts:
                amount = float(co.amount or 0)
                if high_value and amount < HIGH_VALUE_THRESHOLD:
                    continue

                wallet_user = None
                creator_name = 'Unknown'
                try:
                    if co.wallet:
                        wallet_user = User.query.get(co.wallet.user_id)
                        cp = CreatorProfile.query.filter_by(
                            user_id=co.wallet.user_id
                        ).first()
                        creator_name = cp.username if cp else (
                            wallet_user.email if wallet_user else 'Unknown'
                        )
                except Exception:
                    pass

                events.append({
                    'id': f'cashout-{co.id}',
                    'type': 'cashout_requested',
                    'category': 'payments',
                    'title': f'Cashout {co.status}',
                    'description': creator_name,
                    'amount': amount,
                    'status': co.status,
                    'created_at': _format_dt(co.created_at),
                    'link': f'/admin/cashouts',
                    'meta': {
                        'cashout_id': co.id,
                        'creator': creator_name,
                        'method': co.payment_method,
                    }
                })

        # ── CAMPAIGNS ─────────────────────────────────────────────────────
        if category in ('all', 'campaigns'):
            campaigns = Campaign.query.filter(
                Campaign.created_at >= since
            ).order_by(Campaign.created_at.desc()).limit(100).all()

            for camp in campaigns:
                budget = float(camp.budget or 0)
                if high_value and budget < HIGH_VALUE_THRESHOLD:
                    continue

                brand_user = User.query.get(camp.brand_id) if camp.brand_id else None
                brand_name = brand_user.email if brand_user else 'Unknown Brand'
                try:
                    bp_profile = BrandProfile.query.filter_by(user_id=camp.brand_id).first()
                    if bp_profile and bp_profile.company_name:
                        brand_name = bp_profile.company_name
                except Exception:
                    pass

                events.append({
                    'id': f'campaign-{camp.id}',
                    'type': 'campaign_launched',
                    'category': 'campaigns',
                    'title': camp.title or 'Untitled Campaign',
                    'description': f'By {brand_name}',
                    'amount': budget,
                    'status': camp.status,
                    'created_at': _format_dt(camp.created_at),
                    'link': f'/admin/campaigns',
                    'meta': {
                        'campaign_id': camp.id,
                        'brand': brand_name,
                    }
                })

        # ── REVIEWS ───────────────────────────────────────────────────────
        if category in ('all', 'reviews'):
            reviews = Review.query.filter(
                Review.created_at >= since
            ).order_by(Review.created_at.desc()).limit(100).all()

            for r in reviews:
                if high_value:
                    continue

                reviewer = User.query.get(r.reviewer_id) if r.reviewer_id else None
                reviewer_name = reviewer.email if reviewer else 'Unknown'

                events.append({
                    'id': f'review-{r.id}',
                    'type': 'review_posted',
                    'category': 'reviews',
                    'title': f'Review posted — {r.rating}★',
                    'description': reviewer_name,
                    'amount': None,
                    'status': 'published',
                    'created_at': _format_dt(r.created_at),
                    'link': f'/admin/reviews',
                    'meta': {
                        'review_id': r.id,
                        'rating': r.rating,
                        'reviewer': reviewer_name,
                    }
                })

        # ── ANOMALIES ─────────────────────────────────────────────────────
        # Overdue collaborations (in_progress, past expected_completion)
        overdue_collabs = Collaboration.query.filter(
            Collaboration.status == 'in_progress',
            Collaboration.expected_completion.isnot(None),
            Collaboration.expected_completion < datetime.utcnow()
        ).count()

        # Bookings stuck pending > 7 days
        stuck_threshold = datetime.utcnow() - timedelta(days=7)
        stuck_bookings = Booking.query.filter(
            Booking.status == 'pending',
            Booking.created_at <= stuck_threshold
        ).count()

        # ── SORT + PAGINATE ────────────────────────────────────────────────
        events.sort(key=lambda e: e['created_at'] or '', reverse=True)
        total = len(events)
        start = (page - 1) * per_page
        end = start + per_page
        paginated = events[start:end]

        return jsonify({
            'success': True,
            'data': {
                'events': paginated,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page,
                },
                'anomalies': {
                    'overdue_collaborations': overdue_collabs,
                    'stuck_bookings': stuck_bookings,
                },
                'filters': {
                    'category': category,
                    'days': days,
                    'high_value': high_value,
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch activity feed',
            'message': str(e)
        }), 500
