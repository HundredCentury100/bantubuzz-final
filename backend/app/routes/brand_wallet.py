"""
Brand Wallet Routes - Brand wallet and deposit endpoints
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import brand_wallet_service
from app.models import User

bp = Blueprint('brand_wallet', __name__)


@bp.route('/brand/wallet/balance', methods=['GET'])
@jwt_required()
def get_wallet_balance():
    """Get brand's wallet balance"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        wallet = brand_wallet_service.calculate_brand_wallet_balance(user_id)

        return jsonify({
            'success': True,
            'wallet': wallet.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/statistics', methods=['GET'])
@jwt_required()
def get_wallet_statistics():
    """Get comprehensive wallet statistics"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        stats = brand_wallet_service.get_wallet_statistics(user_id)

        return jsonify({
            'success': True,
            'statistics': stats
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    """Get transaction history"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        transaction_type = request.args.get('type', None)

        result = brand_wallet_service.get_brand_wallet_transactions(
            user_id, page, per_page, transaction_type
        )

        return jsonify({
            'success': True,
            **result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/deposit', methods=['POST'])
@jwt_required()
def create_deposit():
    """Initiate wallet deposit request"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json()

        # Validate required fields
        if 'amount' not in data or 'payment_method' not in data:
            return jsonify({'error': 'Missing required fields: amount, payment_method'}), 400

        amount = data.get('amount')
        payment_method = data.get('payment_method')
        metadata = data.get('metadata', {})

        # Create deposit request
        deposit = brand_wallet_service.create_deposit_request(
            user_id, amount, payment_method, metadata
        )

        # If Paynow, initiate payment
        if payment_method == 'paynow':
            from app.services.payment_service import PaymentService
            from app.models import BrandProfile
            from app import db

            # Get user email
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            email = user.email
            reference = deposit.reference
            description = f'Wallet Deposit - ${amount}'

            # Initiate Paynow payment
            paynow_result = PaymentService.initiate_paynow_payment(
                amount=amount,
                email=email,
                reference=reference,
                description=description
            )

            if paynow_result.get('success'):
                # Update deposit with Paynow URLs
                deposit.paynow_poll_url = paynow_result.get('poll_url')
                deposit.paynow_redirect_url = paynow_result.get('redirect_url')
                deposit.paynow_payment_reference = paynow_result.get('reference')
                db.session.commit()

                return jsonify({
                    'success': True,
                    'message': 'Paynow payment initiated',
                    'deposit': deposit.to_dict(include_relations=True),
                    'redirect_url': paynow_result.get('redirect_url'),
                    'poll_url': paynow_result.get('poll_url')
                }), 201
            else:
                # Paynow initiation failed, mark deposit as failed
                deposit.status = 'failed'
                deposit.admin_notes = f"Paynow initiation failed: {paynow_result.get('message')}"
                db.session.commit()

                return jsonify({
                    'success': False,
                    'error': paynow_result.get('message', 'Failed to initiate Paynow payment')
                }), 400

        return jsonify({
            'success': True,
            'message': 'Deposit request created successfully',
            'deposit': deposit.to_dict(include_relations=True)
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/deposits', methods=['GET'])
@jwt_required()
def get_deposits():
    """Get brand's deposit history"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', None)

        result = brand_wallet_service.get_brand_deposit_requests(
            user_id, page, per_page, status
        )

        return jsonify({
            'success': True,
            **result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/deposits/<int:deposit_id>', methods=['GET'])
@jwt_required()
def get_deposit_details(deposit_id):
    """Get specific deposit request details"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        from app.models import DepositRequest
        deposit = DepositRequest.query.get(deposit_id)

        if not deposit:
            return jsonify({'error': 'Deposit request not found'}), 404

        # Check ownership
        if deposit.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'success': True,
            'deposit': deposit.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/deposits/<int:deposit_id>/upload-proof', methods=['POST'])
@jwt_required()
def upload_proof_of_deposit(deposit_id):
    """Upload proof of payment for bank transfer deposit"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        from app.models import DepositRequest
        deposit = DepositRequest.query.get(deposit_id)

        if not deposit:
            return jsonify({'error': 'Deposit request not found'}), 404

        # Check ownership
        if deposit.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        if deposit.payment_method != 'bank_transfer':
            return jsonify({'error': 'Proof of payment only required for bank transfers'}), 400

        # Handle file upload
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file to storage
        import os
        from werkzeug.utils import secure_filename
        from flask import current_app
        from app import db

        # Create uploads directory if it doesn't exist
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        deposit_proofs_folder = os.path.join(upload_folder, 'deposit_proofs')
        os.makedirs(deposit_proofs_folder, exist_ok=True)

        # Generate secure filename
        filename = secure_filename(file.filename)
        unique_filename = f'{deposit_id}_{filename}'
        file_path = os.path.join(deposit_proofs_folder, unique_filename)

        # Save file
        file.save(file_path)

        # Update deposit with file path
        deposit.proof_of_payment = file_path
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Proof of payment uploaded successfully',
            'deposit': deposit.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/deposits/<int:deposit_id>', methods=['DELETE'])
@jwt_required()
def cancel_deposit(deposit_id):
    """Cancel pending deposit request"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json() or {}
        reason = data.get('reason', 'Cancelled by brand')

        deposit = brand_wallet_service.cancel_deposit_request(
            deposit_id, user_id, reason
        )

        return jsonify({
            'success': True,
            'message': 'Deposit request cancelled',
            'deposit': deposit.to_dict(include_relations=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/brand/wallet/check-balance', methods=['POST'])
@jwt_required()
def check_balance():
    """Check if brand has sufficient balance for a specific amount"""
    try:
        user_id = int(get_jwt_identity())

        # Verify user is a brand
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json()
        if 'amount' not in data:
            return jsonify({'error': 'Missing required field: amount'}), 400

        amount = data.get('amount')
        sufficient = brand_wallet_service.check_sufficient_balance(user_id, amount)

        wallet = brand_wallet_service.get_or_create_brand_wallet(user_id)

        return jsonify({
            'success': True,
            'sufficient': sufficient,
            'available_balance': float(wallet.available_balance),
            'requested_amount': float(amount),
            'shortfall': max(0, float(amount) - float(wallet.available_balance))
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
