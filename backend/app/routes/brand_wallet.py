"""
Brand Wallet Routes - API endpoints for brand wallet operations
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.wallet_service import get_or_create_wallet, get_wallet_transactions
from app.models import User

bp = Blueprint('brand_wallet', __name__, url_prefix='/api/brand/wallet')


@bp.route('/', methods=['GET'])
@jwt_required()
def get_brand_wallet():
    """Get brand wallet balance and details"""
    try:
        current_user_id = get_jwt_identity()

        # Verify user is a brand
        user = User.query.get(current_user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized - Brand access only'}), 403

        wallet = get_or_create_wallet(current_user_id)
        return jsonify({
            'success': True,
            'wallet': wallet.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_brand_transactions():
    """Get brand wallet transaction history"""
    try:
        current_user_id = get_jwt_identity()

        # Verify user is a brand
        user = User.query.get(current_user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized - Brand access only'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result = get_wallet_transactions(current_user_id, page, per_page)
        return jsonify({
            'success': True,
            **result
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
