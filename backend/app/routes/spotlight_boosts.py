from datetime import datetime, timedelta
from decimal import Decimal

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import BrandProfile, Campaign, CreatorProfile, SpotlightBoost, User, Wallet, WalletTransaction
from app.services.spotlight_boost_service import active_boost_for


bp = Blueprint('spotlight_boosts', __name__, url_prefix='/api/spotlight-boosts')

BOOST_OPTIONS = {
    3: Decimal('3.00'),
    7: Decimal('6.00'),
    30: Decimal('18.00'),
}


@bp.route('/options', methods=['GET'])
def boost_options():
    return jsonify({
        'options': [
            {'duration_days': days, 'price': float(price), 'label': f'{days}-Day'}
            for days, price in BOOST_OPTIONS.items()
        ]
    }), 200


@bp.route('/my', methods=['GET'])
@jwt_required()
def my_boosts():
    user_id = int(get_jwt_identity())
    boosts = SpotlightBoost.query.filter_by(user_id=user_id).order_by(SpotlightBoost.created_at.desc()).all()
    return jsonify({'boosts': [boost.to_dict() for boost in boosts]}), 200


@bp.route('/purchase', methods=['POST'])
@jwt_required()
def purchase_boost():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        target_type = data.get('target_type')
        target_id = data.get('target_id')
        duration_days = int(data.get('duration_days') or 0)
        payment_method = data.get('payment_method', 'wallet')

        if target_type not in ['creator_profile', 'campaign']:
            return jsonify({'error': 'target_type must be creator_profile or campaign'}), 400
        if duration_days not in BOOST_OPTIONS:
            return jsonify({'error': 'Invalid boost duration'}), 400
        if not target_id:
            return jsonify({'error': 'target_id is required'}), 400
        if payment_method != 'wallet':
            return jsonify({'error': 'Only wallet boost purchases are supported right now'}), 400

        target = None
        if target_type == 'creator_profile':
            if user.user_type != 'creator':
                return jsonify({'error': 'Creator account required for profile boosts'}), 403
            target = CreatorProfile.query.filter_by(user_id=user_id).first()
            if not target or int(target_id) != target.id:
                return jsonify({'error': 'Creator profile not found'}), 404
        else:
            if user.user_type != 'brand':
                return jsonify({'error': 'Brand account required for campaign boosts'}), 403
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            target = Campaign.query.get(target_id)
            if not brand or not target or target.brand_id != brand.id:
                return jsonify({'error': 'Campaign not found'}), 404

        amount = BOOST_OPTIONS[duration_days]
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet or Decimal(str(wallet.available_balance or 0)) < amount:
            available = Decimal(str(wallet.available_balance or 0)) if wallet else Decimal('0.00')
            return jsonify({
                'error': f'Insufficient wallet balance. Available: ${available:.2f}, Required: ${amount:.2f}'
            }), 400

        now = datetime.utcnow()
        existing = active_boost_for(target_type, int(target_id))
        starts_at = now
        ends_at = now + timedelta(days=duration_days)
        if existing and existing.ends_at > now:
            starts_at = existing.starts_at
            ends_at = existing.ends_at + timedelta(days=duration_days)
            existing.status = 'expired'

        wallet.available_balance = Decimal(str(wallet.available_balance or 0)) - amount
        if user.user_type == 'brand':
            wallet.total_spent = Decimal(str(wallet.total_spent or 0)) + amount
        wallet.updated_at = now

        reference = f'BOOST-{target_type.upper()}-{int(target_id)}-{int(now.timestamp())}'
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            transaction_type='payment',
            amount=-amount,
            status='available',
            clearance_required=False,
            description=f'{duration_days}-day Spotlight Boost',
            transaction_metadata={
                'target_type': target_type,
                'target_id': int(target_id),
                'duration_days': duration_days,
                'payment_reference': reference,
            }
        )
        db.session.add(transaction)
        db.session.flush()

        boost = SpotlightBoost(
            user_id=user_id,
            target_type=target_type,
            target_id=int(target_id),
            duration_days=duration_days,
            amount=amount,
            status='active',
            payment_method='wallet',
            payment_reference=reference,
            wallet_transaction_id=transaction.id,
            starts_at=starts_at,
            ends_at=ends_at,
        )
        db.session.add(boost)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Spotlight Boost is active',
            'boost': boost.to_dict(),
            'wallet_balance': float(wallet.available_balance),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
