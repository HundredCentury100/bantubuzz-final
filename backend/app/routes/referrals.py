import secrets

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import ReferralCode
from app.services.referral_service import referral_dashboard, record_click


bp = Blueprint('referrals', __name__)


@bp.route('/resolve/<code>', methods=['POST'])
def resolve_referral(code):
    data = request.get_json(silent=True) or {}
    visitor_token = data.get('visitor_token') or secrets.token_urlsafe(16)
    referral_code = record_click(
        code,
        visitor_token=visitor_token,
        referrer_url=request.referrer,
        user_agent=request.headers.get('User-Agent'),
        source=data.get('source'),
    )
    if not referral_code:
        return jsonify({'error': 'Referral link not found'}), 404
    db.session.commit()
    return jsonify({
        'code': referral_code.code,
        'visitor_token': visitor_token,
        'signup_url': '/register/brand',
    }), 200


@bp.route('/validate/<code>', methods=['GET'])
def validate_referral(code):
    exists = ReferralCode.query.filter_by(code=(code or '').strip().upper(), is_active=True).first()
    return jsonify({'valid': bool(exists)}), 200


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_referrals():
    user_id = int(get_jwt_identity())
    data = referral_dashboard(user_id)
    db.session.commit()
    return jsonify(data), 200
