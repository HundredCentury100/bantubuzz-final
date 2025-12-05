"""
Admin Wallet Routes - Payment verification and cashout management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services import payment_service, cashout_service

bp = Blueprint('admin_wallet', __name__)


def admin_required(fn):
    """Decorator to require admin privileges"""
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get('is_admin'):
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper


# ============================================================================
# PAYMENT MANAGEMENT
# ============================================================================

@bp.route('/admin/payments/pending', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_payments():
    """Get all payments pending verification"""
    try:
        payments = payment_service.get_pending_payments_for_admin()

        return jsonify({
            'success': True,
            'payments': payments,
            'count': len(payments)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/payments/<int:payment_id>/verify', methods=['PUT'])
@jwt_required()
@admin_required
def verify_payment(payment_id):
    """Verify manual payment"""
    try:
        admin_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Validate required fields
        required_fields = ['amount', 'payment_method']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        payment = payment_service.verify_manual_payment(
            payment_id,
            admin_user_id,
            data
        )

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully',
            'payment': payment.to_dict(include_relations=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/payments/manual', methods=['POST'])
@jwt_required()
@admin_required
def add_manual_payment():
    """Add a manual payment record"""
    try:
        admin_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Validate required fields
        required_fields = ['booking_id', 'amount', 'payment_method']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        payment = payment_service.add_manual_payment(
            admin_user_id,
            data
        )

        return jsonify({
            'success': True,
            'message': 'Manual payment added successfully',
            'payment': payment.to_dict(include_relations=True)
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/payments/statistics', methods=['GET'])
@jwt_required()
@admin_required
def get_payment_statistics():
    """Get payment statistics for dashboard"""
    try:
        stats = payment_service.get_payment_statistics()

        return jsonify({
            'success': True,
            'statistics': stats
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# CASHOUT MANAGEMENT
# ============================================================================

@bp.route('/admin/cashouts', methods=['GET'])
@jwt_required()
@admin_required
def get_all_cashouts():
    """Get all cashout requests with filtering"""
    try:
        status = request.args.get('status', None)
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        result = cashout_service.get_all_cashouts(status, limit, offset)

        return jsonify({
            'success': True,
            **result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/cashouts/pending', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_cashouts():
    """Get pending cashout requests"""
    try:
        cashouts = cashout_service.get_pending_cashouts()

        return jsonify({
            'success': True,
            'cashouts': cashouts,
            'count': len(cashouts)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/cashouts/<int:cashout_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_cashout_details(cashout_id):
    """Get specific cashout details"""
    try:
        from app.models import CashoutRequest
        cashout = CashoutRequest.query.get(cashout_id)

        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        return jsonify({
            'success': True,
            'cashout': cashout.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/cashouts/<int:cashout_id>/assign', methods=['PUT'])
@jwt_required()
@admin_required
def assign_cashout(cashout_id):
    """Assign cashout to admin"""
    try:
        admin_user_id = int(get_jwt_identity())

        cashout = cashout_service.assign_cashout_to_admin(
            cashout_id,
            admin_user_id
        )

        return jsonify({
            'success': True,
            'message': 'Cashout assigned successfully',
            'cashout': cashout.to_dict(include_relations=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/cashouts/<int:cashout_id>/complete', methods=['PUT'])
@jwt_required()
@admin_required
def complete_cashout(cashout_id):
    """Mark cashout as completed"""
    try:
        admin_user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        cashout = cashout_service.process_cashout_complete(
            cashout_id,
            admin_user_id,
            data
        )

        return jsonify({
            'success': True,
            'message': 'Cashout completed successfully',
            'cashout': cashout.to_dict(include_relations=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/cashouts/<int:cashout_id>/cancel', methods=['PUT'])
@jwt_required()
@admin_required
def admin_cancel_cashout(cashout_id):
    """Admin cancels a cashout request"""
    try:
        admin_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or 'reason' not in data:
            return jsonify({'error': 'Cancellation reason required'}), 400

        cashout = cashout_service.cancel_cashout_request(
            cashout_id,
            admin_user_id,
            data['reason']
        )

        return jsonify({
            'success': True,
            'message': 'Cashout cancelled successfully',
            'cashout': cashout.to_dict(include_relations=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/admin/cashouts/statistics', methods=['GET'])
@jwt_required()
@admin_required
def get_cashout_statistics():
    """Get cashout statistics for dashboard"""
    try:
        stats = cashout_service.get_cashout_statistics()

        return jsonify({
            'success': True,
            'statistics': stats
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
