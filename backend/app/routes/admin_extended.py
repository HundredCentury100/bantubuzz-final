"""
Extended admin routes for collaborations, bookings, campaigns, and reviews management
This file should be imported alongside the main admin.py
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from sqlalchemy import func, or_, desc
from datetime import datetime, timedelta
from app import db
from app.models import (
    User, Campaign, Booking, Collaboration, Review,
    CampaignApplication, Package, CreatorProfile, BrandProfile
)

bp = Blueprint('admin_extended', __name__, url_prefix='/admin')


def admin_required(fn):
    """Decorator to ensure only admins can access a route"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        return fn(*args, **kwargs)
    return wrapper


# ============================================================================
# COLLABORATION MANAGEMENT
# ============================================================================

@bp.route('/collaborations', methods=['GET'])
@admin_required
def list_collaborations():
    """List all collaborations with filters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')  # 'in_progress', 'completed', 'cancelled'
        collaboration_type = request.args.get('type')  # 'campaign', 'package'

        query = Collaboration.query

        # Apply filters
        if status:
            query = query.filter_by(status=status)
        if collaboration_type:
            query = query.filter_by(collaboration_type=collaboration_type)

        # Order by created_at descending
        query = query.order_by(desc(Collaboration.created_at))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        collaborations = [collab.to_dict(include_relations=True) for collab in pagination.items]

        return jsonify({
            'collaborations': collaborations,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/collaborations/<int:collaboration_id>', methods=['GET'])
@admin_required
def get_collaboration(collaboration_id):
    """Get detailed collaboration information"""
    try:
        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        return jsonify(collaboration.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/collaborations/<int:collaboration_id>/status', methods=['PUT'])
@admin_required
def update_collaboration_status(collaboration_id):
    """Update collaboration status (admin intervention)"""
    try:
        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        data = request.get_json()
        new_status = data.get('status')
        admin_notes = data.get('notes')

        if new_status not in ['in_progress', 'completed', 'cancelled']:
            return jsonify({'error': 'Invalid status'}), 400

        collaboration.status = new_status
        if admin_notes:
            collaboration.notes = (collaboration.notes or '') + f"\n[Admin Note - {datetime.utcnow().isoformat()}]: {admin_notes}"

        db.session.commit()

        return jsonify({
            'message': 'Collaboration status updated successfully',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# BOOKING & PAYMENT MANAGEMENT
# ============================================================================

@bp.route('/bookings', methods=['GET'])
@admin_required
def list_bookings():
    """List all bookings with filters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        query = Booking.query

        # Apply filters
        if status:
            query = query.filter_by(status=status)
        if payment_status:
            query = query.filter_by(payment_status=payment_status)
        if date_from:
            query = query.filter(Booking.booking_date >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(Booking.booking_date <= datetime.fromisoformat(date_to))

        # Order by booking_date descending
        query = query.order_by(desc(Booking.booking_date))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        bookings = [booking.to_dict(include_relations=True) for booking in pagination.items]

        return jsonify({
            'bookings': bookings,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/bookings/<int:booking_id>', methods=['GET'])
@admin_required
def get_booking(booking_id):
    """Get detailed booking information"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        return jsonify(booking.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/bookings/revenue', methods=['GET'])
@admin_required
def get_revenue_stats():
    """Get revenue statistics"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        query = db.session.query(
            func.sum(Booking.amount).label('total_revenue'),
            func.count(Booking.id).label('total_bookings'),
            func.avg(Booking.amount).label('avg_booking_value')
        ).filter(Booking.payment_status == 'paid')

        if date_from:
            query = query.filter(Booking.booking_date >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(Booking.booking_date <= datetime.fromisoformat(date_to))

        result = query.first()

        # Revenue by month (last 6 months)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        monthly_revenue = db.session.query(
            func.date_trunc('month', Booking.booking_date).label('month'),
            func.sum(Booking.amount).label('revenue')
        ).filter(
            Booking.payment_status == 'paid',
            Booking.booking_date >= six_months_ago
        ).group_by('month').order_by('month').all()

        return jsonify({
            'total_revenue': float(result.total_revenue or 0),
            'total_bookings': result.total_bookings or 0,
            'avg_booking_value': float(result.avg_booking_value or 0),
            'monthly_revenue': [
                {
                    'month': month.isoformat(),
                    'revenue': float(revenue)
                }
                for month, revenue in monthly_revenue
            ]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# CAMPAIGN MANAGEMENT
# ============================================================================

@bp.route('/campaigns', methods=['GET'])
@admin_required
def list_campaigns():
    """List all campaigns with filters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        category = request.args.get('category')
        search = request.args.get('search')

        query = Campaign.query

        # Apply filters
        if status:
            query = query.filter_by(status=status)
        if category:
            query = query.filter_by(category=category)
        if search:
            query = query.filter(Campaign.title.ilike(f'%{search}%'))

        # Order by created_at descending
        query = query.order_by(desc(Campaign.created_at))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        campaigns = [campaign.to_dict(include_brand=True) for campaign in pagination.items]

        return jsonify({
            'campaigns': campaigns,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/campaigns/<int:campaign_id>', methods=['GET'])
@admin_required
def get_campaign(campaign_id):
    """Get detailed campaign information"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        return jsonify(campaign.to_dict(include_brand=True, include_applicants=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/campaigns/<int:campaign_id>/status', methods=['PUT'])
@admin_required
def update_campaign_status(campaign_id):
    """Update campaign status"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        data = request.get_json()
        new_status = data.get('status')

        if new_status not in ['draft', 'active', 'paused', 'completed', 'cancelled']:
            return jsonify({'error': 'Invalid status'}), 400

        campaign.status = new_status
        campaign.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Campaign status updated successfully',
            'campaign': campaign.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/campaigns/<int:campaign_id>', methods=['DELETE'])
@admin_required
def delete_campaign(campaign_id):
    """Delete a campaign"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        db.session.delete(campaign)
        db.session.commit()

        return jsonify({'message': 'Campaign deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# REVIEW MANAGEMENT
# ============================================================================

@bp.route('/reviews', methods=['GET'])
@admin_required
def list_reviews():
    """List all reviews with filters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        rating = request.args.get('rating', type=int)
        creator_id = request.args.get('creator_id', type=int)
        brand_id = request.args.get('brand_id', type=int)

        query = Review.query

        # Apply filters
        if rating:
            query = query.filter_by(rating=rating)
        if creator_id:
            query = query.filter_by(creator_id=creator_id)
        if brand_id:
            query = query.filter_by(brand_id=brand_id)

        # Order by created_at descending
        query = query.order_by(desc(Review.created_at))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        reviews = [review.to_dict(include_relations=True) for review in pagination.items]

        return jsonify({
            'reviews': reviews,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/reviews/<int:review_id>', methods=['GET'])
@admin_required
def get_review(review_id):
    """Get detailed review information"""
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404

        return jsonify(review.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/reviews/<int:review_id>', methods=['DELETE'])
@admin_required
def delete_review(review_id):
    """Delete a review (for moderation purposes)"""
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404

        db.session.delete(review)
        db.session.commit()

        return jsonify({'message': 'Review deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/reviews/stats', methods=['GET'])
@admin_required
def get_review_stats():
    """Get review statistics"""
    try:
        total_reviews = Review.query.count()
        avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0

        # Rating distribution
        rating_distribution = db.session.query(
            Review.rating,
            func.count(Review.id).label('count')
        ).group_by(Review.rating).all()

        # Top rated creators
        top_creators = db.session.query(
            Review.creator_id,
            func.avg(Review.rating).label('avg_rating'),
            func.count(Review.id).label('review_count')
        ).group_by(Review.creator_id).order_by(desc('avg_rating')).limit(10).all()

        top_creators_data = []
        for creator_id, avg_rating, review_count in top_creators:
            creator = CreatorProfile.query.get(creator_id)
            if creator:
                top_creators_data.append({
                    'creator': creator.to_dict(include_user=True),
                    'avg_rating': round(float(avg_rating), 2),
                    'review_count': review_count
                })

        return jsonify({
            'total_reviews': total_reviews,
            'avg_rating': round(float(avg_rating), 2),
            'rating_distribution': [
                {'rating': rating, 'count': count}
                for rating, count in rating_distribution
            ],
            'top_creators': top_creators_data
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# PACKAGE MANAGEMENT
# ============================================================================

@bp.route('/packages', methods=['GET'])
@admin_required
def list_packages():
    """List all packages"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        creator_id = request.args.get('creator_id', type=int)
        is_available = request.args.get('is_available')

        query = Package.query

        if creator_id:
            query = query.filter_by(creator_id=creator_id)
        if is_available is not None:
            query = query.filter_by(is_available=is_available == 'true')

        query = query.order_by(desc(Package.created_at))

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        packages = [pkg.to_dict() for pkg in pagination.items]

        return jsonify({
            'packages': packages,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/packages/<int:package_id>', methods=['DELETE'])
@admin_required
def delete_package(package_id):
    """Delete a package"""
    try:
        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        db.session.delete(package)
        db.session.commit()

        return jsonify({'message': 'Package deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
