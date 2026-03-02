"""
Creator Subscription Routes
Handles creator subscriptions for Featured and Verification services
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    CreatorProfile, CreatorSubscriptionPlan, CreatorSubscription,
    User
)
from app.services.payment_service import PaymentService
from datetime import datetime, timedelta
import os
from werkzeug.utils import secure_filename

creator_subscriptions_bp = Blueprint('creator_subscriptions', __name__)

UPLOAD_FOLDER = '/var/www/bantubuzz/backend/uploads/payment_proofs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@creator_subscriptions_bp.route('/api/creator/subscriptions/plans', methods=['GET'])
def get_subscription_plans():
    """Get all active creator subscription plans"""
    try:
        subscription_type = request.args.get('type')  # 'featured' or 'verification'

        query = CreatorSubscriptionPlan.query.filter_by(is_active=True)

        if subscription_type:
            query = query.filter_by(subscription_type=subscription_type)

        plans = query.order_by(CreatorSubscriptionPlan.price.asc()).all()

        return jsonify({
            'plans': [plan.to_dict() for plan in plans]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@creator_subscriptions_bp.route('/api/creator/subscriptions', methods=['GET'])
@jwt_required()
def get_my_subscriptions():
    """Get current user's active subscriptions"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        subscriptions = CreatorSubscription.query.filter_by(
            creator_id=creator.id
        ).order_by(CreatorSubscription.created_at.desc()).all()

        return jsonify({
            'subscriptions': [sub.to_dict() for sub in subscriptions]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@creator_subscriptions_bp.route('/api/creator/subscriptions/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_plan():
    """Subscribe to a creator subscription plan"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.json
        plan_id = data.get('plan_id')
        payment_method = data.get('payment_method', 'paynow')

        if not plan_id:
            return jsonify({'error': 'Plan ID is required'}), 400

        # Get the plan
        plan = CreatorSubscriptionPlan.query.get(plan_id)
        if not plan or not plan.is_active:
            return jsonify({'error': 'Invalid or inactive plan'}), 400

        # Check if already has active subscription for this plan type
        if plan.subscription_type == 'featured':
            # For featured, check specific category
            existing = CreatorSubscription.query.join(
                CreatorSubscriptionPlan
            ).filter(
                CreatorSubscription.creator_id == creator.id,
                CreatorSubscription.status == 'active',
                CreatorSubscriptionPlan.subscription_type == 'featured',
                CreatorSubscriptionPlan.featured_category == plan.featured_category,
                CreatorSubscription.end_date > datetime.utcnow()
            ).first()

            if existing:
                return jsonify({
                    'error': f'You already have an active {plan.featured_category} featured subscription'
                }), 400

        elif plan.subscription_type == 'verification':
            # Check if already verified
            if creator.is_verified:
                return jsonify({'error': 'You are already verified'}), 400

            # Check if has pending verification application
            from app.models import VerificationApplication
            pending_app = VerificationApplication.query.filter_by(
                creator_id=creator.id,
                status='pending'
            ).first()

            if pending_app:
                return jsonify({'error': 'You already have a pending verification application'}), 400

        # Create subscription record
        subscription = CreatorSubscription(
            creator_id=creator.id,
            plan_id=plan.id,
            status='pending_payment',
            payment_method=payment_method
        )

        db.session.add(subscription)
        db.session.commit()

        # Initialize payment
        if payment_method == 'paynow':
            payment_result = PaymentService.initiate_paynow_payment(
                amount=plan.price,
                email=user.email,
                reference=f"CREATOR_SUB_{subscription.id}",
                description=f"{plan.name} Subscription"
            )

            if payment_result['success']:
                subscription.payment_reference = payment_result['reference']
                subscription.paynow_poll_url = payment_result['poll_url']
                db.session.commit()

                return jsonify({
                    'message': 'Subscription created, awaiting payment',
                    'subscription': subscription.to_dict(),
                    'payment': {
                        'redirect_url': payment_result['redirect_url'],
                        'poll_url': payment_result['poll_url'],
                        'reference': payment_result['reference']
                    }
                }), 201
            else:
                db.session.delete(subscription)
                db.session.commit()
                return jsonify({'error': payment_result['message']}), 400

        elif payment_method == 'manual':
            # Manual payment - admin will verify
            return jsonify({
                'message': 'Subscription created. Please make payment and contact admin for verification',
                'subscription': subscription.to_dict(),
                'payment_details': {
                    'amount': plan.price,
                    'reference': f"CREATOR_SUB_{subscription.id}"
                }
            }), 201

        else:
            db.session.delete(subscription)
            db.session.commit()
            return jsonify({'error': 'Invalid payment method'}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@creator_subscriptions_bp.route('/api/creator/subscriptions/<int:subscription_id>/verify-payment', methods=['POST'])
@jwt_required()
def verify_subscription_payment(subscription_id):
    """Check payment status for a subscription"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        subscription = CreatorSubscription.query.get(subscription_id)
        if not subscription or subscription.creator_id != creator.id:
            return jsonify({'error': 'Subscription not found'}), 404

        if subscription.payment_verified:
            return jsonify({
                'message': 'Payment already verified',
                'subscription': subscription.to_dict()
            }), 200

        # Check payment status with Paynow
        if subscription.paynow_poll_url:
            payment_status = PaymentService.check_paynow_status(subscription.paynow_poll_url)

            if payment_status['status'] == 'paid':
                # Activate subscription
                subscription.activate_subscription()
                db.session.commit()

                return jsonify({
                    'message': 'Payment verified and subscription activated',
                    'subscription': subscription.to_dict()
                }), 200

            elif payment_status['status'] == 'cancelled':
                subscription.status = 'cancelled'
                db.session.commit()

                return jsonify({
                    'message': 'Payment was cancelled',
                    'subscription': subscription.to_dict()
                }), 200

            else:
                return jsonify({
                    'message': 'Payment still pending',
                    'subscription': subscription.to_dict()
                }), 200

        return jsonify({
            'message': 'Manual payment verification required',
            'subscription': subscription.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@creator_subscriptions_bp.route('/api/creator/subscriptions/<int:subscription_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription(subscription_id):
    """Cancel a subscription"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        subscription = CreatorSubscription.query.get(subscription_id)
        if not subscription or subscription.creator_id != creator.id:
            return jsonify({'error': 'Subscription not found'}), 404

        if subscription.status == 'cancelled':
            return jsonify({'error': 'Subscription already cancelled'}), 400

        subscription.status = 'cancelled'
        subscription.auto_renew = False
        db.session.commit()

        return jsonify({
            'message': 'Subscription cancelled successfully',
            'subscription': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@creator_subscriptions_bp.route('/api/creator/subscriptions/upload-proof', methods=['POST'])
@jwt_required()
def upload_payment_proof():
    """
    Upload manual payment proof for creator subscription
    Requires admin verification before subscription activates
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'success': False, 'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'success': False, 'error': 'Creator profile not found'}), 404

        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']
        subscription_id = request.form.get('subscription_id')

        if not subscription_id:
            return jsonify({'success': False, 'error': 'subscription_id is required'}), 400

        subscription = CreatorSubscription.query.get(subscription_id)
        if not subscription:
            return jsonify({'success': False, 'error': 'Subscription not found'}), 404

        # Verify ownership
        if subscription.creator_id != creator.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if file and allowed_file(file.filename):
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            # Generate unique filename
            filename = secure_filename(f"creator_sub_{subscription_id}_{creator.id}_{datetime.utcnow().timestamp()}.{file.filename.rsplit('.', 1)[1].lower()}")
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
                'message': 'Payment proof uploaded successfully',
                'subscription': subscription.to_dict()
            }), 200

        return jsonify({'success': False, 'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, pdf'}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@creator_subscriptions_bp.route('/api/creator/subscriptions/pay-with-wallet', methods=['POST'])
@jwt_required()
def pay_with_wallet():
    """Pay for subscription using wallet balance"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.json
        subscription_id = data.get('subscription_id')

        if not subscription_id:
            return jsonify({'error': 'Subscription ID is required'}), 400

        # Get the subscription
        subscription = CreatorSubscription.query.get(subscription_id)
        if not subscription or subscription.creator_id != creator.id:
            return jsonify({'error': 'Subscription not found'}), 404

        if subscription.status not in ['pending_payment', 'pending']:
            return jsonify({'error': 'Subscription already processed'}), 400

        # Get the plan
        plan = subscription.plan
        amount = plan.price

        # Get wallet
        from app.models import Wallet, WalletTransaction
        wallet = Wallet.query.filter_by(user_id=current_user_id).first()
        
        if not wallet:
            return jsonify({'error': 'Wallet not found'}), 404

        if wallet.available_balance < amount:
            return jsonify({
                'error': f'Insufficient wallet balance. Available: ${float(wallet.available_balance):.2f}, Required: ${float(amount):.2f}'
            }), 400

        # Deduct from wallet
        wallet.available_balance -= amount
        
        # Create wallet transaction
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=current_user_id,
            amount=amount,
            transaction_type='debit',
            status='completed',
            description=f'Payment for {plan.name} subscription',
            clearance_required=False
        )

        db.session.add(transaction)

        # Activate subscription
        subscription.payment_verified = True
        subscription.payment_method = 'wallet'
        subscription.status = 'active'
        subscription.start_date = datetime.utcnow()

        # Set end date based on plan duration
        if plan.duration_days:
            subscription.end_date = datetime.utcnow() + timedelta(days=plan.duration_days)
        else:
            # One-time verification
            subscription.end_date = None

        # Apply subscription effects
        if plan.subscription_type == 'verification':
            creator.is_verified = True
        elif plan.subscription_type == 'featured':
            if plan.featured_category == 'homepage':
                creator.is_featured_homepage = True
            elif plan.featured_category == 'category':
                creator.is_featured_category = True

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment successful. Your subscription is now active.',
            'subscription': subscription.to_dict(),
            'wallet_balance': float(wallet.available_balance)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
