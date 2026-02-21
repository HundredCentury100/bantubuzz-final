"""
User-facing Subscription routes - Subscribe, manage, and view plans
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import User, Subscription, SubscriptionPlan

bp = Blueprint('subscriptions', __name__)


@bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """
    Get all active subscription plans for public pricing page
    """
    try:
        plans = SubscriptionPlan.query.filter_by(is_active=True).order_by(
            SubscriptionPlan.display_order
        ).all()

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


@bp.route('/my-subscription', methods=['GET'])
@jwt_required()
def get_my_subscription():
    """
    Get current user's active subscription
    """
    try:
        user_id = get_jwt_identity()

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if not subscription:
            # User is on free plan
            free_plan = SubscriptionPlan.query.filter_by(is_default=True).first()
            return jsonify({
                'success': True,
                'data': {
                    'has_subscription': False,
                    'plan': free_plan.to_dict() if free_plan else None,
                    'is_free': True
                }
            }), 200

        return jsonify({
            'success': True,
            'data': {
                'has_subscription': True,
                'subscription': subscription.to_dict(),
                'is_free': False
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription',
            'message': str(e)
        }), 500


@bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    """
    Subscribe user to a plan
    Body: { plan_id: int, billing_cycle: 'monthly'|'yearly', payment_method: string, payment_reference: string }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle', 'monthly')
        payment_method = data.get('payment_method')
        payment_reference = data.get('payment_reference')

        if not plan_id:
            return jsonify({'success': False, 'error': 'plan_id is required'}), 400

        plan = SubscriptionPlan.query.get_or_404(plan_id)

        # Check if user already has active subscription
        existing = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if existing:
            return jsonify({
                'success': False,
                'error': 'You already have an active subscription. Cancel it first or upgrade instead.'
            }), 400

        # Create new subscription
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status='active',
            billing_cycle=billing_cycle,
            payment_method=payment_method,
            payment_reference=payment_reference
        )

        # Set billing period and payment dates
        subscription.set_billing_period(billing_cycle)

        # Record payment
        if billing_cycle == 'yearly':
            subscription.last_payment_amount = plan.price_yearly
        else:
            subscription.last_payment_amount = plan.price_monthly

        subscription.last_payment_date = datetime.utcnow()

        db.session.add(subscription)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Successfully subscribed to {plan.name} plan',
            'data': subscription.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to create subscription',
            'message': str(e)
        }), 500


@bp.route('/upgrade', methods=['PUT'])
@jwt_required()
def upgrade_subscription():
    """
    Upgrade to a different plan
    Body: { plan_id: int, payment_reference: string }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        new_plan_id = data.get('plan_id')
        payment_reference = data.get('payment_reference')

        if not new_plan_id:
            return jsonify({'success': False, 'error': 'plan_id is required'}), 400

        new_plan = SubscriptionPlan.query.get_or_404(new_plan_id)

        # Get current subscription
        current_sub = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if not current_sub:
            return jsonify({
                'success': False,
                'error': 'No active subscription found. Use /subscribe instead.'
            }), 400

        # Update to new plan
        current_sub.plan_id = new_plan_id
        current_sub.payment_reference = payment_reference
        current_sub.updated_at = datetime.utcnow()

        # Record payment for upgrade
        if current_sub.billing_cycle == 'yearly':
            current_sub.last_payment_amount = new_plan.price_yearly
        else:
            current_sub.last_payment_amount = new_plan.price_monthly

        current_sub.last_payment_date = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Successfully upgraded to {new_plan.name} plan',
            'data': current_sub.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to upgrade subscription',
            'message': str(e)
        }), 500


@bp.route('/cancel', methods=['PUT'])
@jwt_required()
def cancel_subscription():
    """
    Cancel subscription (will cancel at end of period)
    Body: { reason: string (optional) }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        reason = data.get('reason', 'User requested cancellation')

        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if not subscription:
            return jsonify({
                'success': False,
                'error': 'No active subscription found'
            }), 404

        # Set to cancel at period end
        subscription.cancel_at_period_end = True
        subscription.cancelled_at = datetime.utcnow()
        subscription.cancellation_reason = reason
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Subscription will cancel at the end of your billing period',
            'data': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to cancel subscription',
            'message': str(e)
        }), 500


@bp.route('/reactivate', methods=['PUT'])
@jwt_required()
def reactivate_subscription():
    """
    Reactivate a cancelled subscription (before period ends)
    """
    try:
        user_id = get_jwt_identity()

        subscription = Subscription.query.filter_by(
            user_id=user_id
        ).filter(
            Subscription.cancel_at_period_end == True
        ).first()

        if not subscription:
            return jsonify({
                'success': False,
                'error': 'No cancelled subscription found'
            }), 404

        # Reactivate
        subscription.cancel_at_period_end = False
        subscription.cancelled_at = None
        subscription.cancellation_reason = None
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Subscription reactivated successfully',
            'data': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to reactivate subscription',
            'message': str(e)
        }), 500


@bp.route('/check-limits', methods=['GET'])
@jwt_required()
def check_subscription_limits():
    """
    Check user's current subscription limits and usage
    """
    try:
        user_id = get_jwt_identity()

        # Get active subscription or default to free plan
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if subscription:
            plan = subscription.plan
        else:
            # Free plan
            plan = SubscriptionPlan.query.filter_by(is_default=True).first()

        if not plan:
            return jsonify({
                'success': False,
                'error': 'No plan found'
            }), 404

        # Get current usage (to be implemented with actual counts)
        # For now, return limits only
        return jsonify({
            'success': True,
            'data': {
                'plan_name': plan.name,
                'limits': {
                    'max_packages': plan.max_packages,
                    'max_bookings_per_month': plan.max_bookings_per_month,
                    'can_access_briefs': plan.can_access_briefs,
                    'can_access_campaigns': plan.can_access_campaigns,
                    'can_create_custom_packages': plan.can_create_custom_packages,
                },
                'features': {
                    'priority_support': plan.priority_support,
                    'analytics_access': plan.analytics_access,
                    'api_access': plan.api_access
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to check limits',
            'message': str(e)
        }), 500
