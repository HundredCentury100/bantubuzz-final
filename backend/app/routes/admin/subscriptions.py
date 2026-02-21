"""
Admin Subscriptions routes - Manage user subscriptions and plans
"""
from flask import jsonify, request
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from app import db
from app.models import User, Subscription, SubscriptionPlan
from app.decorators.admin import admin_required
from . import bp


@bp.route('/subscriptions/stats', methods=['GET'])
@admin_required
def get_subscription_stats():
    """
    Get subscription statistics for admin dashboard
    """
    try:
        # Active subscriptions
        active_subscriptions = Subscription.query.filter_by(status='active').count()

        # Subscription revenue (monthly)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        monthly_revenue = db.session.query(
            func.sum(Subscription.last_payment_amount)
        ).filter(
            Subscription.last_payment_date >= thirty_days_ago,
            Subscription.status == 'active'
        ).scalar() or 0

        # Failed renewals (past_due status)
        failed_renewals = Subscription.query.filter_by(status='past_due').count()

        # Cancellations this month
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        cancellations_this_month = Subscription.query.filter(
            Subscription.cancelled_at >= start_of_month,
            Subscription.status == 'cancelled'
        ).count()

        # Tier breakdown
        tier_breakdown = db.session.query(
            SubscriptionPlan.name,
            func.count(Subscription.id).label('count')
        ).join(
            Subscription, SubscriptionPlan.id == Subscription.plan_id
        ).filter(
            Subscription.status == 'active'
        ).group_by(SubscriptionPlan.name).all()

        tier_counts = {tier[0]: tier[1] for tier in tier_breakdown}

        # Users without subscriptions (on free plan)
        total_users = User.query.filter(User.user_type.in_(['creator', 'brand'])).count()
        subscribed_users = db.session.query(func.count(func.distinct(Subscription.user_id))).filter(
            Subscription.status == 'active'
        ).scalar() or 0
        free_users = total_users - subscribed_users

        return jsonify({
            'success': True,
            'data': {
                'active_subscriptions': active_subscriptions,
                'monthly_revenue': float(monthly_revenue),
                'failed_renewals': failed_renewals,
                'cancellations_this_month': cancellations_this_month,
                'tier_breakdown': {
                    'Free': free_users,
                    **tier_counts
                },
                'total_users': total_users
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription stats',
            'message': str(e)
        }), 500


@bp.route('/subscriptions', methods=['GET'])
@admin_required
def get_all_subscriptions():
    """
    Get all subscriptions with filtering
    Query params: plan, status, page, per_page
    """
    try:
        plan_id = request.args.get('plan')
        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)

        query = Subscription.query

        if plan_id:
            query = query.filter_by(plan_id=plan_id)
        if status:
            query = query.filter_by(status=status)

        # Order by created_at desc
        query = query.order_by(Subscription.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        subscriptions = []
        for sub in pagination.items:
            user = User.query.get(sub.user_id)
            sub_data = sub.to_dict()
            sub_data['user'] = {
                'id': user.id,
                'email': user.email,
                'user_type': user.user_type
            } if user else None
            subscriptions.append(sub_data)

        return jsonify({
            'success': True,
            'data': {
                'subscriptions': subscriptions,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscriptions',
            'message': str(e)
        }), 500


@bp.route('/subscriptions/<int:subscription_id>', methods=['GET'])
@admin_required
def get_subscription_details(subscription_id):
    """Get detailed subscription information"""
    try:
        subscription = Subscription.query.get_or_404(subscription_id)
        user = User.query.get(subscription.user_id)

        sub_data = subscription.to_dict()
        sub_data['user'] = {
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'created_at': user.created_at.isoformat() if user.created_at else None
        } if user else None

        return jsonify({
            'success': True,
            'data': sub_data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription details',
            'message': str(e)
        }), 500


@bp.route('/subscriptions/<int:subscription_id>/change-plan', methods=['PUT'])
@admin_required
def admin_change_plan(subscription_id):
    """
    Admin override: Change user's subscription plan
    Body: { plan_id: int, reason: string }
    """
    try:
        from flask_jwt_extended import get_jwt_identity

        subscription = Subscription.query.get_or_404(subscription_id)
        data = request.get_json()

        new_plan_id = data.get('plan_id')
        reason = data.get('reason', 'Admin override')

        if not new_plan_id:
            return jsonify({'success': False, 'error': 'plan_id is required'}), 400

        new_plan = SubscriptionPlan.query.get_or_404(new_plan_id)

        # Update subscription
        subscription.plan_id = new_plan_id
        subscription.admin_note = f"{datetime.utcnow().isoformat()}: {reason}"
        subscription.modified_by_admin = get_jwt_identity()
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Subscription changed to {new_plan.name}',
            'data': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to change subscription plan',
            'message': str(e)
        }), 500


@bp.route('/subscriptions/<int:subscription_id>/cancel', methods=['PUT'])
@admin_required
def admin_cancel_subscription(subscription_id):
    """
    Admin cancel subscription
    Body: { immediate: bool, reason: string }
    """
    try:
        from flask_jwt_extended import get_jwt_identity

        subscription = Subscription.query.get_or_404(subscription_id)
        data = request.get_json()

        immediate = data.get('immediate', False)
        reason = data.get('reason', 'Cancelled by admin')

        if immediate:
            subscription.status = 'cancelled'
            subscription.current_period_end = datetime.utcnow()
        else:
            subscription.cancel_at_period_end = True

        subscription.cancellation_reason = reason
        subscription.cancelled_at = datetime.utcnow()
        subscription.modified_by_admin = get_jwt_identity()
        subscription.admin_note = f"{datetime.utcnow().isoformat()}: {reason}"
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Subscription cancelled' if immediate else 'Subscription will cancel at period end',
            'data': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to cancel subscription',
            'message': str(e)
        }), 500


@bp.route('/subscriptions/<int:subscription_id>/reactivate', methods=['PUT'])
@admin_required
def admin_reactivate_subscription(subscription_id):
    """
    Admin reactivate cancelled subscription
    Body: { reason: string }
    """
    try:
        from flask_jwt_extended import get_jwt_identity

        subscription = Subscription.query.get_or_404(subscription_id)
        data = request.get_json()

        reason = data.get('reason', 'Reactivated by admin')

        subscription.status = 'active'
        subscription.cancel_at_period_end = False
        subscription.cancelled_at = None
        subscription.modified_by_admin = get_jwt_identity()
        subscription.admin_note = f"{datetime.utcnow().isoformat()}: {reason}"
        subscription.updated_at = datetime.utcnow()

        # Extend period if expired
        if subscription.current_period_end < datetime.utcnow():
            subscription.set_billing_period(subscription.billing_cycle)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Subscription reactivated',
            'data': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to reactivate subscription',
            'message': str(e)
        }), 500


@bp.route('/subscription-plans', methods=['GET'])
@admin_required
def get_all_plans():
    """Get all subscription plans"""
    try:
        plans = SubscriptionPlan.query.order_by(SubscriptionPlan.display_order).all()

        return jsonify({
            'success': True,
            'data': [plan.to_dict() for plan in plans]
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription plans',
            'message': str(e)
        }), 500


@bp.route('/subscription-plans/<int:plan_id>', methods=['PUT'])
@admin_required
def update_plan(plan_id):
    """
    Update subscription plan pricing and features
    Body: plan fields to update
    """
    try:
        plan = SubscriptionPlan.query.get_or_404(plan_id)
        data = request.get_json()

        # Update fields
        updatable_fields = [
            'name', 'description', 'price_monthly', 'price_yearly',
            'max_packages', 'max_bookings_per_month', 'can_access_briefs',
            'can_access_campaigns', 'can_create_custom_packages', 'featured_priority',
            'badge_label', 'search_boost', 'priority_support', 'analytics_access',
            'api_access', 'is_active', 'display_order'
        ]

        for field in updatable_fields:
            if field in data:
                setattr(plan, field, data[field])

        plan.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Subscription plan updated',
            'data': plan.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to update subscription plan',
            'message': str(e)
        }), 500
