"""
Platform Connection Routes
Handles social media platform connections via ThunziAI
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, CreatorProfile, ThunziAccount, ConnectedPlatform
from app.services.thunzi_service import thunzi_service
from datetime import datetime

platforms_bp = Blueprint('platforms', __name__)


@platforms_bp.route('/api/creator/platforms', methods=['GET'])
@jwt_required()
def get_connected_platforms():
    """Get all connected platforms for current creator"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        # Get platforms from database
        platforms = ConnectedPlatform.query.filter_by(user_id=current_user_id).all()

        return jsonify({
            'success': True,
            'platforms': [p.to_dict() for p in platforms]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/connect', methods=['POST'])
@jwt_required()
def connect_platform():
    """
    Connect a new social media platform

    Request body:
    {
        "platform": "instagram",  // instagram, tiktok, youtube, facebook, twitter
        "accountName": "@username",
        "accessToken": "token"  // Required for instagram/facebook
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.json
        platform = data.get('platform', '').lower()
        account_name = data.get('accountName', '')
        access_token = data.get('accessToken')

        # Validate inputs
        if not platform or not account_name:
            return jsonify({'error': 'Platform and accountName are required'}), 400

        valid_platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter']
        if platform not in valid_platforms:
            return jsonify({'error': f'Platform must be one of: {", ".join(valid_platforms)}'}), 400

        # Check if platform already connected
        existing = ConnectedPlatform.query.filter_by(
            user_id=current_user_id,
            platform=platform
        ).first()

        if existing:
            return jsonify({'error': f'{platform.title()} is already connected'}), 400

        # Get or create ThunziAI account
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()

        if not thunzi_account:
            # Create ThunziAI company for this creator
            company_name = f"{creator.username or user.username} - BantuBuzz"
            company_id = thunzi_service.create_company(
                name=company_name,
                email=user.email,
                country=creator.country or "Zimbabwe"
            )

            if not company_id:
                return jsonify({'error': 'Failed to create ThunziAI account'}), 500

            # Save ThunziAI account
            thunzi_account = ThunziAccount(
                user_id=current_user_id,
                thunzi_company_id=company_id,
                thunzi_email=user.email
            )
            db.session.add(thunzi_account)
            db.session.commit()

        # Add platform to ThunziAI
        thunzi_platform = thunzi_service.add_platform(
            company_id=thunzi_account.thunzi_company_id,
            platform=platform,
            account_name=account_name,
            access_token=access_token
        )

        if not thunzi_platform:
            return jsonify({'error': 'Failed to connect platform to ThunziAI'}), 500

        # Save connected platform to database
        connected_platform = ConnectedPlatform(
            user_id=current_user_id,
            thunzi_platform_id=thunzi_platform.get('id'),
            platform=platform,
            account_name=account_name,
            account_id=thunzi_platform.get('accountId'),
            account_id_secondary=thunzi_platform.get('accountIdSecondary'),
            profile_url=thunzi_platform.get('profileUrl'),
            followers=thunzi_platform.get('followers', 0),
            posts=thunzi_platform.get('posts', 0),
            is_connected=thunzi_platform.get('isConnected', True),
            sync_status=thunzi_platform.get('syncStatus', 'pending'),
            last_synced_at=datetime.utcnow() if thunzi_platform.get('lastSyncedAt') else None
        )

        db.session.add(connected_platform)

        # Update creator profile with follower count if this is their primary platform
        if connected_platform.followers > 0:
            # Update if this is their first platform or has more followers
            if creator.follower_count is None or connected_platform.followers > creator.follower_count:
                creator.follower_count = connected_platform.followers

        db.session.commit()

        # Trigger initial sync
        if connected_platform.thunzi_platform_id:
            thunzi_service.sync_platform(connected_platform.thunzi_platform_id)

        return jsonify({
            'success': True,
            'message': f'{platform.title()} connected successfully',
            'platform': connected_platform.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/<int:platform_id>/sync', methods=['POST'])
@jwt_required()
def sync_platform(platform_id):
    """Trigger sync to update follower counts and posts"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        # Get platform
        platform = ConnectedPlatform.query.filter_by(
            id=platform_id,
            user_id=current_user_id
        ).first()

        if not platform:
            return jsonify({'error': 'Platform not found'}), 404

        if not platform.thunzi_platform_id:
            return jsonify({'error': 'Platform not connected to ThunziAI'}), 400

        # Update sync status
        platform.sync_status = 'in_progress'
        db.session.commit()

        # Trigger sync in ThunziAI
        success = thunzi_service.sync_platform(platform.thunzi_platform_id)

        if success:
            # Fetch updated data
            thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()
            if thunzi_account:
                platforms_data = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)
                updated_platform = next(
                    (p for p in platforms_data if p.get('id') == platform.thunzi_platform_id),
                    None
                )

                if updated_platform:
                    # Update local database
                    platform.followers = updated_platform.get('followers', platform.followers)
                    platform.posts = updated_platform.get('posts', platform.posts)
                    platform.sync_status = updated_platform.get('syncStatus', 'success')
                    platform.last_synced_at = datetime.utcnow()

                    # Update creator profile with latest follower count
                    creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
                    if creator and platform.followers > (creator.follower_count or 0):
                        creator.follower_count = platform.followers

                    db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Sync completed',
                'platform': platform.to_dict()
            }), 200
        else:
            platform.sync_status = 'failure'
            db.session.commit()
            return jsonify({'error': 'Sync failed'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/<int:platform_id>', methods=['DELETE'])
@jwt_required()
def disconnect_platform(platform_id):
    """Disconnect a platform"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        # Get platform
        platform = ConnectedPlatform.query.filter_by(
            id=platform_id,
            user_id=current_user_id
        ).first()

        if not platform:
            return jsonify({'error': 'Platform not found'}), 404

        # Delete from database
        db.session.delete(platform)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Platform disconnected successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
