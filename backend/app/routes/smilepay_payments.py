"""
SmilePay Payment Routes
API endpoints for processing payments through SmilePay gateway
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import logging

from app import db
from app.models import SmilePayTransaction, User
from app.services.smilepay_service import smilepay_service
from app.config.smilepay_config import config as smilepay_config

logger = logging.getLogger(__name__)

bp = Blueprint('smilepay_payments', __name__, url_prefix='/api/payments/smilepay')


def get_user_display_name(user):
    """
    Get display name from user profile

    Returns tuple: (first_name, last_name)
    - For creators: username as first_name
    - For brands: company_name as first_name
    - Fallback: 'User' if no profile found
    """
    try:
        if user.user_type == 'creator' and user.creator_profile:
            display_name = user.creator_profile.username or 'Creator'
            return display_name, ''
        elif user.user_type == 'brand' and user.brand_profile:
            display_name = user.brand_profile.company_name or 'Brand'
            return display_name, ''
        else:
            return 'User', ''
    except Exception as e:
        logger.warning(f"Error getting display name for user {user.id}: {str(e)}")
        return 'User', ''


@bp.route('/ecocash', methods=['POST'])
@jwt_required()
def initiate_ecocash_payment():
    """
    Initiate Ecocash payment via Express Checkout

    Request Body:
    {
        "payment_type": "subscription|booking|campaign|cart|collaboration",
        "payment_id": 123,
        "amount": 100.00,
        "currency": "USD",
        "ecocash_mobile": "0771234567",
        "item_name": "Premium Subscription",
        "item_description": "Monthly premium plan",
        "return_url": "https://...",
        "result_url": "https://...",
        "cancel_url": "https://...",
        "failure_url": "https://..."
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['payment_type', 'amount', 'ecocash_mobile', 'item_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate unique order reference
        order_reference = SmilePayTransaction.generate_order_reference(
            data['payment_type'],
            data.get('payment_id')
        )

        # Get customer name from profile
        customer_first_name, customer_last_name = get_user_display_name(user)

        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data['payment_type'],
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='ecocash',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_mobile=data['ecocash_mobile'],
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data=data,
            otp_required=False
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created Ecocash transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_ecocash_payment(
            order_reference=order_reference,
            amount=data['amount'],
            ecocash_mobile=data['ecocash_mobile'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            # Update transaction with SmilePay response
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.extra_data = response_data

            db.session.commit()

            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'transaction_reference': transaction.transaction_reference,
                'message': 'Check your phone for Ecocash prompt',
                'status': 'PENDING',
                'response': response_data
            }), 200
        else:
            # Payment initiation failed
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error', 'Payment initiation failed')
            db.session.commit()

            return jsonify({
                'success': False,
                'error': result.get('error', 'Payment initiation failed'),
                'order_reference': order_reference
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Ecocash payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500


@bp.route('/innbucks', methods=['POST'])
@jwt_required()
def initiate_innbucks_payment():
    """
    Initiate Innbucks payment via Express Checkout

    Returns a payment code that customer enters in Innbucks app
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['payment_type', 'amount', 'item_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate unique order reference
        order_reference = SmilePayTransaction.generate_order_reference(
            data['payment_type'],
            data.get('payment_id')
        )

        # Get customer name from profile
        customer_first_name, customer_last_name = get_user_display_name(user)

        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data['payment_type'],
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='innbucks',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_phone=data.get('phone', ''),
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data=data,
            otp_required=False
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created Innbucks transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_innbucks_payment(
            order_reference=order_reference,
            amount=data['amount'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_phone=data.get('phone', ''),
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            # Update transaction with SmilePay response
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.payment_code = response_data.get('paymentCode')  # Innbucks payment code
            transaction.extra_data = response_data

            db.session.commit()

            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'transaction_reference': transaction.transaction_reference,
                'payment_code': transaction.payment_code,
                'message': 'Enter this code in your Innbucks app',
                'status': 'PENDING',
                'response': response_data
            }), 200
        else:
            # Payment initiation failed
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error', 'Payment initiation failed')
            db.session.commit()

            return jsonify({
                'success': False,
                'error': result.get('error', 'Payment initiation failed'),
                'order_reference': order_reference
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Innbucks payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500


@bp.route('/smilecash', methods=['POST'])
@jwt_required()
def initiate_smilecash_payment():
    """
    Initiate SmileCash payment via Express Checkout

    SmileCash is OTP-based mobile wallet
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['payment_type', 'amount', 'smilecash_mobile', 'otp', 'item_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate unique order reference
        order_reference = SmilePayTransaction.generate_order_reference(
            data['payment_type'],
            data.get('payment_id')
        )

        # Get customer name from profile
        customer_first_name, customer_last_name = get_user_display_name(user)

        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data['payment_type'],
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='smilecash',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_mobile=data['smilecash_mobile'],
            otp=data['otp'],
            otp_required=True,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data=data
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created SmileCash transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_smilecash_payment(
            order_reference=order_reference,
            amount=data['amount'],
            smilecash_mobile=data['smilecash_mobile'],
            otp=data['otp'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.extra_data = response_data
            db.session.commit()

            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'transaction_reference': transaction.transaction_reference,
                'message': 'SmileCash payment initiated successfully',
                'status': 'PENDING',
                'response': response_data
            }), 200
        else:
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error', 'Payment initiation failed')
            db.session.commit()

            return jsonify({
                'success': False,
                'error': result.get('error', 'Payment initiation failed'),
                'order_reference': order_reference
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"SmileCash payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500


@bp.route('/omari', methods=['POST'])
@jwt_required()
def initiate_omari_payment():
    """
    Initiate Omari payment via Express Checkout

    Omari is OTP-based payment platform
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['payment_type', 'amount', 'omari_mobile', 'otp', 'item_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate unique order reference
        order_reference = SmilePayTransaction.generate_order_reference(
            data['payment_type'],
            data.get('payment_id')
        )

        # Get customer name from profile
        customer_first_name, customer_last_name = get_user_display_name(user)

        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data['payment_type'],
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='omari',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            customer_mobile=data['omari_mobile'],
            otp=data['otp'],
            otp_required=True,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data=data
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created Omari transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_omari_payment(
            order_reference=order_reference,
            amount=data['amount'],
            omari_mobile=data['omari_mobile'],
            otp=data['otp'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.extra_data = response_data
            db.session.commit()

            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'transaction_reference': transaction.transaction_reference,
                'message': 'Omari payment initiated successfully',
                'status': 'PENDING',
                'response': response_data
            }), 200
        else:
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error', 'Payment initiation failed')
            db.session.commit()

            return jsonify({
                'success': False,
                'error': result.get('error', 'Payment initiation failed'),
                'order_reference': order_reference
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Omari payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500


@bp.route('/card', methods=['POST'])
@jwt_required()
def initiate_card_payment():
    """
    Initiate card payment (Visa/Mastercard) via Express Checkout

    May return 3D Secure HTML for authentication
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['payment_type', 'amount', 'card_number', 'expiry_month',
                          'expiry_year', 'cvv', 'cardholder_name', 'item_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate unique order reference
        order_reference = SmilePayTransaction.generate_order_reference(
            data['payment_type'],
            data.get('payment_id')
        )

        # Get customer name from profile
        customer_first_name, customer_last_name = get_user_display_name(user)

        # Create transaction record
        transaction = SmilePayTransaction(
            payment_type=data['payment_type'],
            payment_id=data.get('payment_id'),
            user_id=user_id,
            user_type=user.user_type,
            order_reference=order_reference,
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            currency_code=smilepay_config.get_currency_code(data.get('currency', 'USD')),
            payment_method='card',
            status='PENDING',
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            request_data=data,
            otp_required=False
        )

        db.session.add(transaction)
        db.session.commit()

        logger.info(f"Created Card transaction {order_reference} for user {user_id}")

        # Initiate payment with SmilePay
        result = smilepay_service.initiate_card_payment(
            order_reference=order_reference,
            amount=data['amount'],
            card_number=data['card_number'],
            expiry_month=data['expiry_month'],
            expiry_year=data['expiry_year'],
            cvv=data['cvv'],
            cardholder_name=data['cardholder_name'],
            item_name=data['item_name'],
            item_description=data.get('item_description', ''),
            customer_email=user.email,
            customer_first_name=customer_first_name,
            customer_last_name=customer_last_name,
            return_url=data.get('return_url', ''),
            result_url=data.get('result_url', ''),
            cancel_url=data.get('cancel_url', ''),
            failure_url=data.get('failure_url', ''),
            currency=data.get('currency', 'USD')
        )

        if result.get('success'):
            response_data = result.get('data', {})
            transaction.transaction_reference = response_data.get('transactionReference')
            transaction.response_code = response_data.get('responseCode')
            transaction.response_message = response_data.get('responseMessage')
            transaction.extra_data = response_data
            db.session.commit()

            # Check if 3D Secure is required
            if result.get('requires_3ds'):
                return jsonify({
                    'success': True,
                    'order_reference': order_reference,
                    'transaction_reference': transaction.transaction_reference,
                    'requires_3ds': True,
                    'three_d_secure_html': response_data.get('threeDSecureHtml'),
                    'redirect_url': response_data.get('redirectUrl'),
                    'message': '3D Secure authentication required',
                    'status': 'PENDING',
                    'response': response_data
                }), 200
            else:
                return jsonify({
                    'success': True,
                    'order_reference': order_reference,
                    'transaction_reference': transaction.transaction_reference,
                    'message': 'Card payment initiated successfully',
                    'status': 'PENDING',
                    'response': response_data
                }), 200
        else:
            transaction.status = 'FAILED'
            transaction.response_message = result.get('error', 'Payment initiation failed')
            db.session.commit()

            return jsonify({
                'success': False,
                'error': result.get('error', 'Payment initiation failed'),
                'order_reference': order_reference
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Card payment error: {str(e)}")
        return jsonify({'error': f'Payment failed: {str(e)}'}), 500


@bp.route('/<order_reference>/status', methods=['GET'])
@jwt_required()
def check_payment_status(order_reference):
    """
    Check payment status for a transaction

    Used for polling payment status
    """
    try:
        user_id = int(get_jwt_identity())

        # Get transaction
        transaction = SmilePayTransaction.get_by_order_reference(order_reference)

        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404

        # Verify user owns this transaction
        if transaction.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # If already completed, return cached status
        if transaction.is_complete():
            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'status': transaction.status,
                'transaction': transaction.to_dict()
            }), 200

        # Check status with SmilePay
        result = smilepay_service.check_payment_status(order_reference)

        if result.get('success'):
            status_data = result.get('data', {})
            new_status = status_data.get('status', 'PENDING')

            # Update transaction if status changed
            if new_status != transaction.status:
                transaction.update_status(
                    new_status,
                    smilepay_reference=status_data.get('reference'),
                    payment_option=status_data.get('paymentOption'),
                    client_fee=status_data.get('clientFee'),
                    merchant_fee=status_data.get('merchantFee')
                )
                db.session.commit()

                # Handle payment completion
                if new_status == 'PAID':
                    smilepay_service._handle_successful_payment(transaction)
                elif new_status == 'FAILED':
                    smilepay_service._handle_failed_payment(transaction)
                elif new_status == 'CANCELED':
                    smilepay_service._handle_canceled_payment(transaction)

            return jsonify({
                'success': True,
                'order_reference': order_reference,
                'status': new_status,
                'transaction': transaction.to_dict(),
                'smilepay_data': status_data
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Status check failed'),
                'order_reference': order_reference,
                'status': transaction.status
            }), 400

    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({'error': f'Status check failed: {str(e)}'}), 500


@bp.route('/<order_reference>/cancel', methods=['POST'])
@jwt_required()
def cancel_payment(order_reference):
    """
    Cancel a pending payment
    """
    try:
        user_id = int(get_jwt_identity())

        # Get transaction
        transaction = SmilePayTransaction.get_by_order_reference(order_reference)

        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404

        # Verify user owns this transaction
        if transaction.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Can only cancel pending transactions
        if not transaction.is_pending():
            return jsonify({
                'error': 'Cannot cancel transaction',
                'status': transaction.status
            }), 400

        # Cancel with SmilePay
        result = smilepay_service.cancel_payment(order_reference)

        if result.get('success'):
            # Update transaction
            transaction.update_status('CANCELED')
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Payment canceled successfully',
                'order_reference': order_reference
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Cancellation failed')
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Cancel payment error: {str(e)}")
        return jsonify({'error': f'Cancellation failed: {str(e)}'}), 500


@bp.route('/webhook/callback', methods=['POST'])
def webhook_callback():
    """
    Webhook endpoint for SmilePay payment status callbacks

    NO AUTHENTICATION REQUIRED - SmilePay needs to call this

    Webhook payload format:
    {
        "merchantId": "",
        "reference": "",
        "orderReference": "",
        "itemName": "",
        "amount": null,
        "currency": "",
        "paymentOption": "",
        "status": "PAID|FAILED|CANCELED",
        "createdDate": "",
        "returnUrl": "",
        "resultUrl": "",
        "clientFee": null,
        "merchantFee": null
    }
    """
    try:
        webhook_data = request.get_json()

        logger.info(f"Received SmilePay webhook: {webhook_data}")

        # Validate webhook data
        if not webhook_data or 'orderReference' not in webhook_data:
            logger.error("Invalid webhook payload")
            return jsonify({'error': 'Invalid payload'}), 400

        # Process webhook
        result = smilepay_service.process_webhook_callback(webhook_data)

        if result.get('success'):
            logger.info(f"Webhook processed successfully: {webhook_data.get('orderReference')}")
            return jsonify({
                'success': True,
                'message': 'Webhook processed successfully'
            }), 200
        else:
            logger.error(f"Webhook processing failed: {result.get('error')}")
            return jsonify({
                'error': result.get('error', 'Processing failed')
            }), 400

    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return jsonify({'error': f'Webhook processing failed: {str(e)}'}), 500


@bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_user_transactions():
    """
    Get user's SmilePay transactions
    """
    try:
        user_id = int(get_jwt_identity())

        limit = request.args.get('limit', 50, type=int)
        limit = min(limit, 100)  # Max 100

        transactions = SmilePayTransaction.get_user_transactions(user_id, limit)

        return jsonify({
            'success': True,
            'transactions': [t.to_dict() for t in transactions],
            'count': len(transactions)
        }), 200

    except Exception as e:
        logger.error(f"Get transactions error: {str(e)}")
        return jsonify({'error': 'Failed to fetch transactions'}), 500


@bp.route('/<order_reference>', methods=['GET'])
@jwt_required()
def get_transaction(order_reference):
    """
    Get transaction details by order reference
    """
    try:
        user_id = int(get_jwt_identity())

        transaction = SmilePayTransaction.get_by_order_reference(order_reference)

        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404

        # Verify user owns this transaction
        if transaction.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'success': True,
            'transaction': transaction.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Get transaction error: {str(e)}")
        return jsonify({'error': 'Failed to fetch transaction'}), 500
