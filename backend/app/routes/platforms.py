"""
Platform Connection Routes
Handles social media platform connections via ThunziAI
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, CreatorProfile, BrandProfile, ThunziAccount, ConnectedPlatform
from app.services.thunzi_service import thunzi_service
from datetime import datetime
import requests
import os

platforms_bp = Blueprint('platforms', __name__)


@platforms_bp.route('/api/creator/platforms', methods=['GET'])
@jwt_required()
def get_connected_platforms():
    """
    Get all connected platforms for current creator

    This endpoint syncs with ThunziAI to ensure we have all platforms,
    including Instagram accounts that were auto-created when connecting Facebook.
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        # Get ThunziAI account
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()

        if thunzi_account:
            # Fetch all platforms from ThunziAI
            thunzi_platforms = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)

            # Sync with local database - create missing platforms
            for thunzi_platform in thunzi_platforms:
                if not thunzi_platform.get('isConnected'):
                    continue  # Skip disconnected platforms

                platform_name = thunzi_platform.get('platform')
                thunzi_platform_id = thunzi_platform.get('id')

                # Check if this platform exists in our database
                existing = ConnectedPlatform.query.filter_by(
                    user_id=current_user_id,
                    thunzi_platform_id=thunzi_platform_id
                ).first()

                if not existing:
                    # Create new platform entry (ThunziAI auto-created it, e.g., Instagram)
                    new_platform = ConnectedPlatform(
                        user_id=current_user_id,
                        thunzi_platform_id=thunzi_platform_id,
                        platform=platform_name,
                        account_name=thunzi_platform.get('accountName'),
                        account_id=thunzi_platform.get('accountId'),
                        account_id_secondary=thunzi_platform.get('accountIdSecondary'),
                        profile_url=thunzi_platform.get('profileUrl'),
                        access_token=thunzi_platform.get('accessToken'),
                        refresh_token=thunzi_platform.get('refreshToken'),
                        followers=thunzi_platform.get('followers', 0),
                        posts=thunzi_platform.get('posts', 0),
                        is_connected=True,
                        sync_status=thunzi_platform.get('syncStatus', 'pending'),
                        last_synced_at=datetime.utcnow() if thunzi_platform.get('lastSyncedAt') else None
                    )
                    db.session.add(new_platform)

            db.session.commit()

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
        account_id = data.get('accountId')  # Facebook Page ID or Instagram Business Account ID
        access_token = data.get('accessToken')
        refresh_token = data.get('refreshToken')
        token_expiry = data.get('tokenExpiry')

        # Validate inputs
        if not platform or not account_name:
            return jsonify({'error': 'Platform and accountName are required'}), 400

        valid_platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter']
        if platform not in valid_platforms:
            return jsonify({'error': f'Platform must be one of: {", ".join(valid_platforms)}'}), 400

        # Require access token for Meta platforms (Facebook, Instagram)
        # NOTE: accountId is NOT required - ThunziAI extracts it from the accessToken
        if platform in ['facebook', 'instagram']:
            if not access_token:
                return jsonify({'error': f'{platform.title()} requires an access token from OAuth'}), 400

        # Check if platform already connected
        existing = ConnectedPlatform.query.filter_by(
            user_id=current_user_id,
            platform=platform
        ).first()

        if existing:
            return jsonify({'error': f'{platform.title()} is already connected'}), 400

        # Get or create individual ThunziAI account for this creator
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()

        if not thunzi_account:
            # Create ThunziAI company for this specific creator
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

        # Add platform to ThunziAI (use platform name as-is per API docs)
        thunzi_platform = thunzi_service.add_platform(
            company_id=thunzi_account.thunzi_company_id,
            platform=platform,
            account_name=account_name,
            account_id=account_id,  # Pass account_id to ThunziAI
            access_token=access_token
        )

        if not thunzi_platform:
            return jsonify({'error': 'Failed to connect platform to ThunziAI'}), 500

        # NOTE: As per new ThunziAI API, POST /api/platforms automatically attempts connection
        # No need for separate connect_platform() call

        # Parse token expiry if provided
        parsed_token_expiry = None
        if token_expiry:
            try:
                from dateutil import parser
                parsed_token_expiry = parser.parse(token_expiry)
            except:
                pass

        # Save connected platform to database
        connected_platform = ConnectedPlatform(
            user_id=current_user_id,
            thunzi_platform_id=thunzi_platform.get('id'),
            platform=platform,
            account_name=account_name,
            account_id=thunzi_platform.get('accountId'),
            account_id_secondary=thunzi_platform.get('accountIdSecondary'),
            profile_url=thunzi_platform.get('profileUrl'),
            access_token=access_token,  # Store OAuth access token
            refresh_token=refresh_token,  # Store OAuth refresh token
            token_expiry=parsed_token_expiry,  # Store token expiry
            followers=thunzi_platform.get('followers', 0),
            posts=thunzi_platform.get('posts', 0),
            is_connected=thunzi_platform.get('isConnected', True),
            sync_status=thunzi_platform.get('syncStatus', 'pending'),
            last_synced_at=datetime.utcnow() if thunzi_platform.get('lastSyncedAt') else None
        )

        db.session.add(connected_platform)

        # Update creator profile with follower count if this is their primary platform
        if connected_platform.followers and connected_platform.followers > 0:
            # Update if this is their first platform or has more followers
            if creator.follower_count is None or connected_platform.followers > creator.follower_count:
                creator.follower_count = connected_platform.followers

        db.session.commit()

        # Trigger initial sync (pass all required fields)
        if connected_platform.thunzi_platform_id:
            thunzi_service.sync_platform(
                platform_id=connected_platform.thunzi_platform_id,
                account_id=connected_platform.account_id,
                company_id=thunzi_account.thunzi_company_id,
                platform=platform
            )

        return jsonify({
            'success': True,
            'message': f'{platform.title()} connected successfully',
            'platform': connected_platform.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/facebook/exchange-code', methods=['POST'])
@jwt_required()
def exchange_facebook_code():
    """
    Exchange Facebook authorization code for access token

    This endpoint is used for Facebook Login for Business with authorization code grant flow.
    The code is exchanged for a long-lived access token.

    Request body:
    {
        "code": "authorization_code_from_facebook"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        data = request.json
        auth_code = data.get('code')

        if not auth_code:
            return jsonify({'error': 'Authorization code is required'}), 400

        # Get Facebook App credentials from environment
        app_id = os.getenv('FACEBOOK_APP_ID', '1863571634283956')
        app_secret = os.getenv('FACEBOOK_APP_SECRET')

        if not app_secret:
            return jsonify({'error': 'Facebook App Secret not configured'}), 500

        # Get the redirect_uri from request (must match the one used in OAuth dialog)
        redirect_uri = data.get('redirect_uri', f"{os.getenv('FRONTEND_URL', 'https://bantubuzz.com')}/creator/platforms")

        # Exchange authorization code for access token
        # Reference: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow#confirm
        token_url = 'https://graph.facebook.com/v19.0/oauth/access_token'
        params = {
            'client_id': app_id,
            'client_secret': app_secret,
            'redirect_uri': redirect_uri,
            'code': auth_code
        }

        response = requests.get(token_url, params=params)

        if response.status_code != 200:
            error_data = response.json()
            error_message = error_data.get('error', {}).get('message', 'Failed to exchange code')
            return jsonify({'error': f'Facebook API error: {error_message}'}), 400

        token_data = response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            return jsonify({'error': 'No access token received from Facebook'}), 400

        # Return the access token to the frontend
        return jsonify({
            'success': True,
            'accessToken': access_token,
            'tokenType': token_data.get('token_type', 'bearer')
        }), 200

    except Exception as e:
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

        # Trigger sync in ThunziAI (pass all required fields per API docs)
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()
        success = thunzi_service.sync_platform(
            platform_id=platform.thunzi_platform_id,
            account_id=platform.account_id,
            company_id=thunzi_account.thunzi_company_id if thunzi_account else None,
            platform=platform.platform
        )

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
    """
    Disconnect a platform

    This will delete the platform from both BantuBuzz database and ThunziAI,
    removing all associated posts and analytics data.
    """
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

        # Delete from ThunziAI first (if connected)
        if platform.thunzi_platform_id:
            deleted = thunzi_service.delete_platform(platform.thunzi_platform_id)
            if not deleted:
                print(f"Warning: Failed to delete platform {platform.thunzi_platform_id} from ThunziAI")
                # Continue with local deletion even if ThunziAI deletion fails

        # Delete from local database
        db.session.delete(platform)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Platform disconnected successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# ==================== BRAND PLATFORM ROUTES ====================

@platforms_bp.route('/api/brand/platforms', methods=['GET'])
@jwt_required()
def get_brand_connected_platforms():
    """Get all connected platforms for current brand"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Brand account required'}), 403

        # Get platforms from database
        platforms = ConnectedPlatform.query.filter_by(user_id=current_user_id).all()

        return jsonify({
            'success': True,
            'platforms': [p.to_dict() for p in platforms]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@platforms_bp.route('/api/brand/platforms/connect', methods=['POST'])
@jwt_required()
def connect_brand_platform():
    """Connect a new social media platform for brand"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Brand account required'}), 403

        brand = BrandProfile.query.filter_by(user_id=current_user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.json
        platform = data.get('platform', '').lower()
        account_name = data.get('accountName', '')
        account_id = data.get('accountId')  # Facebook Page ID or Instagram Business Account ID
        access_token = data.get('accessToken')
        refresh_token = data.get('refreshToken')
        token_expiry = data.get('tokenExpiry')

        if not platform or not account_name:
            return jsonify({'error': 'Platform and accountName are required'}), 400

        valid_platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter']
        if platform not in valid_platforms:
            return jsonify({'error': f'Platform must be one of: {", ".join(valid_platforms)}'}), 400

        # Require access token for Meta platforms (Facebook, Instagram)
        # NOTE: accountId is NOT required - ThunziAI extracts it from the accessToken
        if platform in ['facebook', 'instagram']:
            if not access_token:
                return jsonify({'error': f'{platform.title()} requires an access token from OAuth'}), 400

        existing = ConnectedPlatform.query.filter_by(user_id=current_user_id, platform=platform).first()
        if existing:
            return jsonify({'error': f'{platform.title()} is already connected'}), 400

        # Get or create individual ThunziAI account for this brand
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()

        if not thunzi_account:
            # Create ThunziAI company for this specific brand
            company_name = f"{brand.company_name or user.username} - BantuBuzz"
            company_id = thunzi_service.create_company(
                name=company_name,
                email=user.email,
                country=brand.country or "Zimbabwe"
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

        # Add platform to ThunziAI (use platform name as-is per API docs)
        thunzi_platform = thunzi_service.add_platform(company_id=thunzi_account.thunzi_company_id, platform=platform, account_name=account_name, account_id=account_id, access_token=access_token)

        if not thunzi_platform:
            return jsonify({'error': 'Failed to connect platform to ThunziAI'}), 500

        # NOTE: As per new ThunziAI API, POST /api/platforms automatically attempts connection
        # No need for separate connect_platform() call

        # Parse token expiry
        parsed_token_expiry = None
        if token_expiry:
            try:
                from dateutil import parser
                parsed_token_expiry = parser.parse(token_expiry)
            except:
                pass

        connected_platform = ConnectedPlatform(
            user_id=current_user_id, thunzi_platform_id=thunzi_platform.get('id'), platform=platform,
            account_name=account_name, account_id=thunzi_platform.get('accountId'),
            account_id_secondary=thunzi_platform.get('accountIdSecondary'), profile_url=thunzi_platform.get('profileUrl'),
            access_token=access_token, refresh_token=refresh_token, token_expiry=parsed_token_expiry,
            followers=thunzi_platform.get('followers', 0), posts=thunzi_platform.get('posts', 0),
            is_connected=thunzi_platform.get('isConnected', True), sync_status=thunzi_platform.get('syncStatus', 'pending'),
            last_synced_at=datetime.utcnow() if thunzi_platform.get('lastSyncedAt') else None
        )

        db.session.add(connected_platform)
        db.session.commit()

        # Trigger initial sync (pass all required fields)
        if connected_platform.thunzi_platform_id:
            thunzi_service.sync_platform(
                platform_id=connected_platform.thunzi_platform_id,
                account_id=connected_platform.account_id,
                company_id=thunzi_account.thunzi_company_id,
                platform=platform
            )

        return jsonify({'success': True, 'message': f'{platform.title()} connected successfully', 'platform': connected_platform.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/brand/platforms/<int:platform_id>/sync', methods=['POST'])
@jwt_required()
def sync_brand_platform(platform_id):
    """Trigger sync for brand platform"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Brand account required'}), 403

        platform = ConnectedPlatform.query.filter_by(id=platform_id, user_id=current_user_id).first()
        if not platform:
            return jsonify({'error': 'Platform not found'}), 404

        if not platform.thunzi_platform_id:
            return jsonify({'error': 'Platform not connected to ThunziAI'}), 400

        platform.sync_status = 'in_progress'
        db.session.commit()

        # Trigger sync with all required fields
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()
        success = thunzi_service.sync_platform(
            platform_id=platform.thunzi_platform_id,
            account_id=platform.account_id,
            company_id=thunzi_account.thunzi_company_id if thunzi_account else None,
            platform=platform.platform
        )

        if success:
            thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()
            if thunzi_account:
                platforms_data = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)
                updated_platform = next((p for p in platforms_data if p.get('id') == platform.thunzi_platform_id), None)

                if updated_platform:
                    platform.followers = updated_platform.get('followers', platform.followers)
                    platform.posts = updated_platform.get('posts', platform.posts)
                    platform.sync_status = updated_platform.get('syncStatus', 'success')
                    platform.last_synced_at = datetime.utcnow()
                    db.session.commit()

            return jsonify({'success': True, 'message': 'Sync completed', 'platform': platform.to_dict()}), 200
        else:
            platform.sync_status = 'failure'
            db.session.commit()
            return jsonify({'error': 'Sync failed'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/brand/platforms/<int:platform_id>', methods=['DELETE'])
@jwt_required()
def disconnect_brand_platform(platform_id):
    """
    Disconnect a platform for brand

    This will delete the platform from both BantuBuzz database and ThunziAI,
    removing all associated posts and analytics data.
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Brand account required'}), 403

        platform = ConnectedPlatform.query.filter_by(id=platform_id, user_id=current_user_id).first()
        if not platform:
            return jsonify({'error': 'Platform not found'}), 404

        # Delete from ThunziAI first (if connected)
        if platform.thunzi_platform_id:
            deleted = thunzi_service.delete_platform(platform.thunzi_platform_id)
            if not deleted:
                print(f"Warning: Failed to delete platform {platform.thunzi_platform_id} from ThunziAI")
                # Continue with local deletion even if ThunziAI deletion fails

        # Delete from local database
        db.session.delete(platform)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Platform disconnected successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
