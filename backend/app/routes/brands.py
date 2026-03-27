from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import BrandProfile, SavedCreator, CreatorProfile, User
from app.utils import save_profile_picture, delete_profile_picture
from app.utils.file_upload import save_and_compress_image
from app.utils.image_compression import delete_image_variants

bp = Blueprint('brands', __name__)


@bp.route('/<int:brand_id>', methods=['GET'])
def get_brand(brand_id):
    """Get a specific brand"""
    try:
        brand = BrandProfile.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        return jsonify(brand.to_dict(include_user=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_own_profile():
    """Get current user's brand profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Brand profile not found'}), 404

        brand = user.brand_profile
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        return jsonify(brand.to_dict(include_user=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update brand profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Not authorized'}), 403

        brand = user.brand_profile
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()

        # Update fields if provided
        if 'company_name' in data:
            brand.company_name = data['company_name']

        if 'logo' in data:
            brand.logo = data['logo']

        if 'description' in data:
            brand.description = data['description']

        if 'website' in data:
            brand.website = data['website']

        if 'industry' in data:
            brand.industry = data['industry']

        if 'company_size' in data:
            if data['company_size'] in ['1-10', '11-50', '51-200', '201-500', '500+']:
                brand.company_size = data['company_size']

        if 'location' in data:
            brand.location = data['location']

        if 'social_links' in data:
            brand.social_links = data['social_links']

        brand.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'brand': brand.to_dict(include_user=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/logo', methods=['POST'])
@jwt_required()
def upload_logo():
    """Upload brand logo with automatic compression"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Not authorized'}), 403

        brand = user.brand_profile
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Delete old logo variants if they exist
        if brand.logo_sizes:
            delete_image_variants(brand.logo_sizes)
        elif brand.logo:
            # Fallback: delete old single file
            delete_profile_picture(brand.logo)

        # Save and compress new logo
        try:
            image_data = save_and_compress_image(file, folder='profiles/brands')

            # Store multi-size paths
            brand.logo_sizes = {
                'thumbnail': image_data['thumbnail'],
                'medium': image_data['medium'],
                'large': image_data['large']
            }

            # Backward compatibility: store medium size as main logo
            brand.logo = image_data['medium']
            brand.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'message': 'Logo updated successfully',
                'logo': image_data['medium'],
                'logo_sizes': brand.logo_sizes
            }), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/saved-creators', methods=['GET'])
@jwt_required()
def get_saved_creators():
    """Get saved creators for current brand"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        saved = SavedCreator.query.filter_by(brand_id=brand.id).all()
        creators = [CreatorProfile.query.get(s.creator_id).to_dict(include_user=True) for s in saved]

        return jsonify({'creators': creators}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/saved-creators/<int:creator_id>', methods=['POST'])
@jwt_required()
def save_creator(creator_id):
    """Save a creator"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Check if already saved
        existing = SavedCreator.query.filter_by(
            brand_id=brand.id,
            creator_id=creator_id
        ).first()

        if existing:
            return jsonify({'message': 'Creator already saved'}), 200

        saved = SavedCreator(brand_id=brand.id, creator_id=creator_id)
        db.session.add(saved)
        db.session.commit()

        return jsonify({'message': 'Creator saved successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/saved-creators/<int:creator_id>', methods=['DELETE'])
@jwt_required()
def unsave_creator(creator_id):
    """Unsave a creator"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        saved = SavedCreator.query.filter_by(
            brand_id=brand.id,
            creator_id=creator_id
        ).first()

        if not saved:
            return jsonify({'error': 'Creator not in saved list'}), 404

        db.session.delete(saved)
        db.session.commit()

        return jsonify({'message': 'Creator unsaved successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ========================================
# ANALYTICS ENDPOINTS - Audience Demographics
# ========================================

@bp.route('/audience', methods=['GET'])
@jwt_required()
def get_brand_audience():
    """
    Get aggregated audience demographics across ALL brand campaigns/collaborations

    Shows combined reach across all campaigns and collaborations
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Get all collaborations for this brand
        from app.models.collaboration import Collaboration
        from app.models.thunzi_account import ThunziAccount
        from app.services.thunzi_service import thunzi_service

        collaborations = Collaboration.query.filter_by(brand_id=brand.id).all()

        if not collaborations:
            return jsonify({'error': 'No collaborations found'}), 404

        # Get Instagram platform IDs only (only Instagram has audience data currently)
        instagram_platform_ids = []

        for collab in collaborations:
            thunzi_account = ThunziAccount.query.filter_by(
                user_id=collab.creator.user_id
            ).first()

            if thunzi_account and thunzi_account.bantubuzz_id and thunzi_account.thunzi_email:
                # ThunziAI: email is the password
                thunzi_service.login(email=thunzi_account.thunzi_email, password=thunzi_account.thunzi_email)
                # get_creator_platforms accepts bantubuzz_id directly
                platforms = thunzi_service.get_creator_platforms(thunzi_account.bantubuzz_id)
                if platforms:
                    # Filter for Instagram platforms only
                    ig_platforms = [p['id'] for p in platforms if p.get('isConnected') and p.get('platform') == 'instagram']
                    instagram_platform_ids.extend(ig_platforms)

        if not instagram_platform_ids:
            return jsonify({
                'error': 'No audience data available',
                'message': 'Audience demographics are currently only available for Instagram platforms. Please ensure creators have connected Instagram accounts with synced data.'
            }), 404

        # Get aggregated audience data from Instagram platforms only
        audience_data = thunzi_service.get_aggregated_audience(instagram_platform_ids)

        if not audience_data:
            return jsonify({
                'error': 'No audience data available',
                'message': 'Instagram platforms found but no audience data available yet. Data may need to be synced in ThunziAI.'
            }), 404

        # Add additional context
        from app.models.campaign import Campaign
        campaigns = Campaign.query.filter_by(brand_id=brand.id).all()

        return jsonify({
            **audience_data,
            'totalCollaborations': len(collaborations),
            'totalCampaigns': len(campaigns)
        }), 200

    except Exception as e:
        print(f"Error getting brand audience: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
