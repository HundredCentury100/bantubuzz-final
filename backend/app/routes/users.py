from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User

bp = Blueprint('users', __name__)


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user's profile"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        profile = None
        if user.user_type == 'creator' and user.creator_profile:
            profile = user.creator_profile.to_dict()
        elif user.user_type == 'brand' and user.brand_profile:
            profile = user.brand_profile.to_dict()

        return jsonify({
            'user': user.to_dict(),
            'profile': profile
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user's profile"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # Update user-specific fields if provided
        if 'email' in data and data['email'] != user.email:
            # Check if new email is already taken
            existing_user = User.query.filter_by(email=data['email'].lower()).first()
            if existing_user:
                return jsonify({'error': 'Email already in use'}), 409
            user.email = data['email'].lower()
            user.is_verified = False  # Require re-verification

        # Update profile based on user type
        if user.user_type == 'creator' and user.creator_profile:
            profile = user.creator_profile
            updatable_fields = ['bio', 'profile_picture', 'portfolio_url', 'categories',
                              'follower_count', 'engagement_rate', 'location', 'languages',
                              'availability_status', 'social_links', 'success_stories']

            for field in updatable_fields:
                if field in data:
                    setattr(profile, field, data[field])

        elif user.user_type == 'brand' and user.brand_profile:
            profile = user.brand_profile
            updatable_fields = ['company_name', 'logo', 'description', 'website',
                              'industry', 'company_size', 'location', 'social_links']

            for field in updatable_fields:
                if field in data:
                    setattr(profile, field, data[field])

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict(),
            'profile': profile.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
