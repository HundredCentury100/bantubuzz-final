"""
User-facing Subscription routes - Subscribe, manage, and view plans
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from app import db
from app.models import BrandProfile, User, Subscription, SubscriptionPlan
from app.services.payment_service import initiate_subscription_payment, check_subscription_payment_status
from app.services.agency_subscription_service import apply_brand_subscription_entitlements

bp = Blueprint('subscriptions', __name__)

UPLOAD_FOLDER = '/var/www/bantubuzz/backend/uploads/payment_proofs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def apply_subscription_account_type(user_id, plan):
    """Keep brand profile positioning aligned with active subscription plans."""
    apply_brand_subscription_entitlements(user_id, plan)


@bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """
    Get all active subscription plans for public pricing page
    Query params: user_type (optional) - 'brand' or 'creator' to filter plans
    """
    try:
        user_type = request.args.get('user_type')  # 'brand' or 'creator'

        query = SubscriptionPlan.query.filter_by(is_active=True)

        # Filter by user_type if provided
        if user_type and user_type in ['brand', 'creator']:
            query = query.filter_by(user_type=user_type)

        plans = query.order_by(SubscriptionPlan.display_order).all()

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
        user = User.query.get(user_id)

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if not subscription:
            # User is on free plan - get default plan based on user type
            user_type = user.user_type if user.user_type in ['creator', 'brand'] else 'brand'
            free_plan = SubscriptionPlan.query.filter_by(
                user_type=user_type,
                is_default=True
            ).first()

            # Fallback to any free plan if no default found
            if not free_plan:
                free_plan = SubscriptionPlan.query.filter_by(
                    user_type=user_type,
                    price_monthly=0
                ).first()

            return jsonify({
                'success': True,
                'data': {
                    'has_subscription': False,
                    'plan': free_plan.to_dict() if free_plan else None,
                    'is_free': True,
                    'user_type': user_type
                }
            }), 200

        return jsonify({
            'success': True,
            'data': {
                'has_subscription': True,
                'subscription': subscription.to_dict(),
                'is_free': False,
                'user_type': user.user_type if user.user_type in ['creator', 'brand'] else 'brand'
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
    Subscribe user to a plan with Paynow payment
    Body: { plan_id: int, billing_cycle: 'monthly'|'yearly' }
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()

        plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle', 'monthly')

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

        # For free plan, activate immediately without payment
        if plan.slug == 'free' or (plan.price_monthly == 0 and plan.price_yearly == 0):
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan_id,
                status='active',
                billing_cycle=billing_cycle,
                payment_method='free'
            )
            subscription.set_billing_period(billing_cycle)
            subscription.last_payment_date = datetime.utcnow()
            db.session.add(subscription)
            apply_subscription_account_type(user_id, plan)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'Successfully subscribed to {plan.name} plan',
                'data': subscription.to_dict()
            }), 201

        # For paid plans, create subscription with pending status and initiate payment
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status='pending',  # Will activate after payment
            billing_cycle=billing_cycle
        )
        subscription.set_billing_period(billing_cycle)

        db.session.add(subscription)
        db.session.flush()  # Get subscription ID without committing

        # Calculate amount based on billing cycle
        amount = plan.price_yearly if billing_cycle == 'yearly' else plan.price_monthly

        # Initiate Paynow payment
        payment_result = initiate_subscription_payment(
            subscription=subscription,
            user_email=user.email,
            plan_name=plan.name,
            amount=amount,
            billing_cycle=billing_cycle
        )

        if payment_result['success']:
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Payment initiated successfully',
                'data': {
                    'subscription_id': subscription.id,
                    'redirect_url': payment_result['redirect_url'],
                    'poll_url': payment_result['poll_url'],
                    'payment_reference': payment_result['payment_reference']
                }
            }), 201
        else:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': payment_result.get('error', 'Payment initialization failed'),
                'message': payment_result.get('message', 'Unknown error')
            }), 400

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
    Upgrade to a different plan (requires payment like subscription)
    Body: { plan_id: int, billing_cycle: 'monthly'|'yearly' }
    Returns payment initiation data for Paynow (frontend handles wallet/bank transfer separately)
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()

        new_plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle', 'monthly')

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

        # Check if upgrading to same plan
        if current_sub.plan_id == new_plan_id:
            return jsonify({
                'success': False,
                'error': 'You are already on this plan.'
            }), 400

        # Check if upgrading to free plan (not allowed)
        if new_plan.price_monthly == 0 and new_plan.price_yearly == 0:
            return jsonify({
                'success': False,
                'error': 'Cannot upgrade to free plan. Please cancel your current subscription instead.'
            }), 400

        # Calculate upgrade amount
        amount = new_plan.price_yearly if billing_cycle == 'yearly' else new_plan.price_monthly

        # Update subscription to pending_payment status and new plan
        # Store old plan ID in case payment fails
        old_plan_id = current_sub.plan_id
        current_sub.plan_id = new_plan_id
        current_sub.billing_cycle = billing_cycle
        current_sub.status = 'pending_payment'  # Will revert to active if payment fails
        current_sub.updated_at = datetime.utcnow()

        db.session.flush()

        # Initiate Paynow payment
        payment_result = initiate_subscription_payment(
            subscription=current_sub,
            user_email=user.email,
            plan_name=new_plan.name,
            amount=amount,
            billing_cycle=billing_cycle
        )

        if payment_result['success']:
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Upgrade payment initiated successfully',
                'data': {
                    'subscription_id': current_sub.id,
                    'redirect_url': payment_result['redirect_url'],
                    'poll_url': payment_result['poll_url'],
                    'payment_reference': payment_result['payment_reference'],
                    'is_upgrade': True
                }
            }), 200
        else:
            # Revert changes on payment initiation failure
            current_sub.plan_id = old_plan_id
            current_sub.status = 'active'
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': payment_result.get('error', 'Payment initialization failed'),
                'message': payment_result.get('message', 'Unknown error')
            }), 400

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
        user = User.query.get(user_id)

        # Get active subscription or default to free plan
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if subscription:
            plan = subscription.plan
        else:
            # Free plan - get based on user type
            user_type = user.user_type if user.user_type in ['creator', 'brand'] else 'brand'
            plan = SubscriptionPlan.query.filter_by(
                user_type=user_type,
                is_default=True
            ).first()
            if not plan:
                plan = SubscriptionPlan.query.filter_by(
                    user_type=user_type,
                    price_monthly=0
                ).first()

        if not plan:
            return jsonify({
                'success': False,
                'error': 'No plan found'
            }), 404

        # Build response based on user type
        response_data = {
            'plan_name': plan.name,
            'user_type': plan.user_type,
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
                'api_access': plan.api_access,
                'has_advanced_analytics': plan.has_advanced_analytics,
                'has_priority_listing': plan.has_priority_listing,
                'has_custom_branding': plan.has_custom_branding,
                'has_dedicated_support': plan.has_dedicated_support,
                'has_api_access': plan.has_api_access,
            }
        }

        # Add brand-specific restrictions
        if plan.user_type == 'brand':
            response_data['restrictions'] = {
                'max_active_campaigns': plan.max_active_campaigns,
                'max_active_collaborations': plan.max_active_collaborations,
                'max_team_members': plan.max_team_members,
                'max_creator_lists': plan.max_creator_lists,
                'max_client_workspaces': plan.max_client_workspaces,
                'service_fee_percentage': float(plan.service_fee_percentage) if plan.service_fee_percentage else 12.00,
            }

        # Add creator-specific restrictions
        if plan.user_type == 'creator':
            response_data['restrictions'] = {
                'max_portfolio_items': plan.max_portfolio_items,
                'commission_percentage': float(plan.commission_percentage) if plan.commission_percentage else 15.00,
                'has_verified_badge': plan.has_verified_badge,
                'search_placement_priority': plan.search_placement_priority,
                'can_message_brands_first': plan.can_message_brands_first,
            }

        # Get current usage (to be implemented with actual counts)
        # For now, return limits only
        return jsonify({
            'success': True,
            'data': response_data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to check limits',
            'message': str(e)
        }), 500


@bp.route('/subscription/<int:subscription_id>/payment-status', methods=['GET'])
@jwt_required()
def check_payment_status_endpoint(subscription_id):
    """
    Check payment status for a subscription
    """
    try:
        user_id = get_jwt_identity()

        subscription = Subscription.query.get_or_404(subscription_id)

        # Verify ownership
        if subscription.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized'
            }), 403

        # Check payment status
        payment_status = check_subscription_payment_status(subscription)

        return jsonify({
            'success': True,
            'data': {
                'subscription': subscription.to_dict(),
                'payment': payment_status
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to check payment status',
            'message': str(e)
        }), 500


@bp.route('/upload-proof', methods=['POST'])
@jwt_required()
def upload_payment_proof():
    """
    Upload manual payment proof for subscription
    Requires admin verification before subscription activates
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']
        subscription_id = request.form.get('subscription_id')

        if not subscription_id:
            return jsonify({'success': False, 'error': 'subscription_id is required'}), 400

        subscription = Subscription.query.get(subscription_id)
        if not subscription:
            return jsonify({'success': False, 'error': 'Subscription not found'}), 404

        # Verify ownership
        if subscription.user_id != user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if file and allowed_file(file.filename):
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            # Generate unique filename
            filename = secure_filename(f"sub_{subscription_id}_{user_id}_{datetime.utcnow().timestamp()}.{file.filename.rsplit('.', 1)[1].lower()}")
            filepath = os.path.join(UPLOAD_FOLDER, filename)

            file.save(filepath)

            # Update subscription with payment proof path
            subscription.payment_proof_path = f"/uploads/payment_proofs/{filename}"
            subscription.payment_method = 'manual'
            subscription.payment_status = 'pending_verification'  # Awaiting admin verification
            subscription.updated_at = datetime.utcnow()

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Payment proof uploaded successfully. Awaiting admin verification.',
                'data': {
                    'subscription_id': subscription.id,
                    'proof_path': subscription.payment_proof_path,
                    'status': subscription.payment_status
                }
            }), 200

        return jsonify({'success': False, 'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, PDF'}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to upload payment proof',
            'message': str(e)
        }), 500


@bp.route('/pay-with-wallet', methods=['POST'])
@jwt_required()
def pay_subscription_with_wallet():
    """
    Pay for brand subscription using wallet balance
    Body: { subscription_id: int, billing_cycle: 'monthly'|'yearly' }
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()

        subscription_id = data.get('subscription_id')
        billing_cycle = data.get('billing_cycle', 'monthly')

        if not subscription_id:
            return jsonify({'success': False, 'error': 'subscription_id is required'}), 400

        # Get the subscription
        subscription = Subscription.query.get(subscription_id)
        if not subscription:
            return jsonify({'success': False, 'error': 'Subscription not found'}), 404

        # Verify ownership
        if subscription.user_id != user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Check subscription status
        if subscription.status not in ['pending', 'pending_payment']:
            return jsonify({'success': False, 'error': 'Subscription already processed or active'}), 400

        # Get the plan
        plan = subscription.plan
        if not plan:
            return jsonify({'success': False, 'error': 'Subscription plan not found'}), 404

        # Calculate amount based on billing cycle
        amount = plan.price_yearly if billing_cycle == 'yearly' else plan.price_monthly

        # Brands use the shared Wallet model with user_type='brand'.
        from app.models import Wallet, WalletTransaction, BrandProfile
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'success': False, 'error': 'Brand profile not found'}), 404

        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            return jsonify({'success': False, 'error': 'Wallet not found'}), 404

        # Check sufficient balance
        if wallet.available_balance < amount:
            return jsonify({
                'success': False,
                'error': f'Insufficient wallet balance. Available: ${float(wallet.available_balance):.2f}, Required: ${float(amount):.2f}'
            }), 400

        # Deduct from wallet
        wallet.available_balance -= amount
        wallet.total_spent = float(wallet.total_spent or 0) + float(amount)
        wallet.updated_at = datetime.utcnow()

        # Create wallet transaction
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            amount=-abs(float(amount)),
            transaction_type='payment',
            status='available',
            clearance_required=False,
            description=f'Payment for {plan.name} subscription ({billing_cycle})',
            transaction_metadata={
                'payment_type': 'subscription',
                'subscription_id': subscription.id,
                'plan_id': plan.id,
                'plan_name': plan.name,
                'billing_cycle': billing_cycle
            }
        )
        db.session.add(transaction)
        db.session.flush()

        # Activate subscription
        subscription.status = 'active'
        subscription.payment_method = 'wallet'
        subscription.last_payment_date = datetime.utcnow()
        subscription.last_payment_amount = amount
        subscription.billing_cycle = billing_cycle
        subscription.payment_reference = f'WALLET-{transaction.id}'
        subscription.updated_at = datetime.utcnow()

        # Paid subscription periods start when the payment is completed.
        subscription.set_billing_period(billing_cycle)

        apply_subscription_account_type(user_id, plan)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment successful! Your subscription is now active.',
            'data': {
                'subscription': subscription.to_dict(),
                'wallet_balance': float(wallet.available_balance),
                'transaction_id': transaction.id
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to process wallet payment',
            'message': str(e)
        }), 500
