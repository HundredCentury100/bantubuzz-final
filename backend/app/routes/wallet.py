"""
Wallet Routes - Creator wallet and cashout endpoints
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import wallet_service, cashout_service

bp = Blueprint('wallet', __name__)


@bp.route('/wallet/balance', methods=['GET'])
@jwt_required()
def get_wallet_balance():
    """Get creator's wallet balance"""
    try:
        user_id = int(get_jwt_identity())
        wallet = wallet_service.calculate_wallet_balances(user_id)

        return jsonify({
            'success': True,
            'wallet': wallet.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/statistics', methods=['GET'])
@jwt_required()
def get_wallet_statistics():
    """Get comprehensive wallet statistics"""
    try:
        user_id = int(get_jwt_identity())
        stats = wallet_service.get_wallet_statistics(user_id)

        return jsonify({
            'success': True,
            'statistics': stats
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    """Get transaction history"""
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        transaction_type = request.args.get('type', None)

        result = wallet_service.get_transaction_history(
            user_id, limit, offset, transaction_type
        )

        return jsonify({
            'success': True,
            **result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/pending-clearance', methods=['GET'])
@jwt_required()
def get_pending_clearance():
    """Get transactions pending clearance with progress"""
    try:
        user_id = int(get_jwt_identity())
        transactions = wallet_service.get_pending_clearance_transactions(user_id)

        return jsonify({
            'success': True,
            'transactions': transactions
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/cashout', methods=['POST'])
@jwt_required()
def request_cashout():
    """Submit cashout request"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        # Validate required fields
        required_fields = ['amount', 'payment_method', 'payment_details']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        cashout = cashout_service.submit_cashout_request(user_id, data)

        # Notify admins (email will be sent in future implementation)
        cashout_service.notify_admins_cashout_request(cashout)

        return jsonify({
            'success': True,
            'message': 'Cashout request submitted successfully',
            'cashout': cashout.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/cashouts', methods=['GET'])
@jwt_required()
def get_cashout_requests():
    """Get creator's cashout history"""
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        result = cashout_service.get_creator_cashouts(user_id, limit, offset)

        return jsonify({
            'success': True,
            **result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/cashouts/<int:cashout_id>', methods=['GET'])
@jwt_required()
def get_cashout_details(cashout_id):
    """Get specific cashout request details"""
    try:
        user_id = int(get_jwt_identity())

        from app.models import CashoutRequest
        cashout = CashoutRequest.query.get(cashout_id)

        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        # Check ownership
        if cashout.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'success': True,
            'cashout': cashout.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/wallet/cashouts/<int:cashout_id>', methods=['DELETE'])
@jwt_required()
def cancel_cashout(cashout_id):
    """Cancel pending cashout request"""
    try:
        user_id = int(get_jwt_identity())

        from app.models import CashoutRequest
        cashout = CashoutRequest.query.get(cashout_id)

        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        # Check ownership
        if cashout.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        reason = data.get('reason', 'Cancelled by creator')

        cashout = cashout_service.cancel_cashout_request(
            cashout_id, user_id, reason
        )

        return jsonify({
            'success': True,
            'message': 'Cashout request cancelled',
            'cashout': cashout.to_dict()
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
