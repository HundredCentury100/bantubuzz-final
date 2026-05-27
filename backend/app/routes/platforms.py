"""
Platform Connection Routes
Handles social media platform connections via ThunziAI
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, CreatorProfile, BrandProfile, ThunziAccount, ConnectedPlatform
from app.services.thunzi_service import thunzi_service
from app.utils.logger import log_incoming_request, log_response, log_error
from datetime import datetime
import requests
import os

platforms_bp = Blueprint('platforms', __name__)


def _parse_thunzi_datetime(value):
    if not value or str(value).lower() == 'never':
        return None

    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).replace(tzinfo=None)
    except (TypeError, ValueError):
        return None


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
                        scopes=thunzi_platform.get('scopes') or [],
                        followers=thunzi_platform.get('followers', 0),
                        posts=thunzi_platform.get('posts', 0),
                        is_connected=True,
                        sync_status=thunzi_platform.get('syncStatus', 'pending'),
                        last_synced_at=_parse_thunzi_datetime(thunzi_platform.get('lastSyncedAt'))
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

        # Log incoming request
        log_incoming_request(
            method='POST',
            path='/api/creator/platforms/connect',
            body=request.json,
            user_id=current_user_id
        )

        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.json
        platform = data.get('platform', '').lower()
        account_name = data.get('accountName', '')
        account_id = data.get('accountId')  # Facebook Page ID or Instagram Business Account ID or YouTube Channel ID
        access_token = data.get('accessToken')
        refresh_token = data.get('refreshToken')
        token_expiry = data.get('tokenExpiry')

        # Validate inputs
        if not platform or not account_name:
            return jsonify({'error': 'Platform and accountName are required'}), 400

        valid_platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter']
        if platform not in valid_platforms:
            return jsonify({'error': f'Platform must be one of: {", ".join(valid_platforms)}'}), 400

        # Require access token for OAuth platforms (Facebook, Instagram, YouTube, TikTok)
        # NOTE: For Meta platforms, accountId is NOT required - ThunziAI extracts it from the accessToken
        if platform in ['facebook', 'instagram', 'youtube', 'tiktok']:
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
            # Ensure user is registered in ThunziAI (register if needed)
            # NOTE: This may create an unverified account via API key that cannot login
            user_registered = thunzi_service.ensure_user_registered(email=user.email)
            if not user_registered:
                return jsonify({'error': 'Failed to register with ThunziAI'}), 500

            # After ensure_user_registered, the thunzi_service singleton is authenticated
            # (either via login for existing users, or session-based for new API key registrations)

            # Create ThunziAI company for this specific creator
            company_name = f"{creator.username or user.username} - BantuBuzz"
            company_id = thunzi_service.create_company(
                name=company_name,
                email=user.email,
                country=creator.country or "Zimbabwe"
            )

            if not company_id:
                return jsonify({'error': 'Failed to create ThunziAI account'}), 500

            # Create bantubuzz_id for this creator
            bantubuzz_id = f"creator_{creator.id}"

            # Create creator entity in ThunziAI
            creator_result = thunzi_service.create_creator(
                name=creator.username or user.username,
                email=user.email,
                bantubuzz_id=bantubuzz_id,
                company_id=company_id
            )

            if not creator_result:
                print(f"Warning: Failed to create creator entity in ThunziAI for {user.email}")
                # Continue anyway - creator entity is optional

            # Save ThunziAI account with bantubuzz_id
            thunzi_account = ThunziAccount(
                user_id=current_user_id,
                thunzi_company_id=company_id,
                thunzi_email=user.email,
                bantubuzz_id=bantubuzz_id
            )
            db.session.add(thunzi_account)
            db.session.commit()
        else:
            # Existing account - ensure bantubuzz_id is set
            if not thunzi_account.bantubuzz_id:
                # Set bantubuzz_id for existing accounts that don't have it
                bantubuzz_id = f"creator_{creator.id}"
                thunzi_account.bantubuzz_id = bantubuzz_id

                # Ensure authenticated (try login, fallback to session from ensure_user_registered)
                # This handles both verified users (can login) and API key-registered users (session-based auth)
                user_registered = thunzi_service.ensure_user_registered(email=thunzi_account.thunzi_email)

                if user_registered:
                    # Create the creator entity in ThunziAI if it doesn't exist
                    creator_result = thunzi_service.create_creator(
                        name=creator.username or user.username,
                        email=thunzi_account.thunzi_email,
                        bantubuzz_id=bantubuzz_id,
                        company_id=thunzi_account.thunzi_company_id
                    )

                    if not creator_result:
                        print(f"Note: Creator entity may already exist in ThunziAI for {thunzi_account.thunzi_email}")

                db.session.commit()
            else:
                # bantubuzz_id already set, ensure authenticated
                # Use ensure_user_registered instead of login to handle both verified and unverified accounts
                user_registered = thunzi_service.ensure_user_registered(email=thunzi_account.thunzi_email)

                if not user_registered:
                    return jsonify({'error': 'Failed to authenticate with ThunziAI'}), 500

        # Add platform to ThunziAI (use platform name as-is per API docs)
        thunzi_platform = thunzi_service.add_platform(
            company_id=thunzi_account.thunzi_company_id,
            platform=platform,
            account_name=account_name,
            account_id=account_id,  # Pass account_id to ThunziAI
            access_token=access_token,
            refresh_token=refresh_token  # Pass refresh_token for OAuth renewal
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
        # NOTE: Always set is_connected=True when we successfully create the platform
        # ThunziAI sometimes returns isConnected=false initially, but we can still use the platform
        connected_platform = ConnectedPlatform(
            user_id=current_user_id,
            thunzi_platform_id=thunzi_platform.get('id'),
            platform=platform,
            account_name=thunzi_platform.get('accountName') or account_name,  # Use ThunziAI's account name if available
            account_id=thunzi_platform.get('accountId'),
            account_id_secondary=thunzi_platform.get('accountIdSecondary'),
            profile_url=thunzi_platform.get('profileUrl'),
            access_token=access_token,  # Store OAuth access token
            refresh_token=refresh_token,  # Store OAuth refresh token
            token_expiry=parsed_token_expiry,  # Store token expiry
            scopes=thunzi_platform.get('scopes') or [],
            followers=thunzi_platform.get('followers', 0),
            posts=thunzi_platform.get('posts', 0),
            is_connected=True,  # Always True when successfully added
            sync_status=thunzi_platform.get('syncStatus', 'pending'),
            last_synced_at=_parse_thunzi_datetime(thunzi_platform.get('lastSyncedAt'))
        )

        db.session.add(connected_platform)

        # Update creator profile with follower count if this is their primary platform
        if connected_platform.followers and connected_platform.followers > 0:
            # Update if this is their first platform or has more followers
            if creator.follower_count is None or connected_platform.followers > creator.follower_count:
                creator.follower_count = connected_platform.followers

        db.session.commit()

        # IMPORTANT: Ensure creator entity is registered in ThunziAI after platform connection
        # This ensures analytics endpoints will work properly
        # This is a best-effort operation - we don't fail the request if it doesn't work
        if thunzi_account and thunzi_account.bantubuzz_id:
            try:
                creator_registered = thunzi_service.ensure_creator_registered(
                    bantubuzz_id=thunzi_account.bantubuzz_id,
                    name=creator.username or user.username,
                    email=user.email,
                    company_id=thunzi_account.thunzi_company_id
                )

                if creator_registered:
                    print(f"✓ Creator entity {thunzi_account.bantubuzz_id} ensured in ThunziAI")
                else:
                    print(f"⚠ Warning: Could not ensure creator entity {thunzi_account.bantubuzz_id} in ThunziAI (analytics may be limited)")
            except Exception as e:
                print(f"⚠ Warning: Exception ensuring creator entity in ThunziAI: {str(e)}")

        # TEST: Facebook pfbid to numeric ID conversion (if Facebook platform)
        if platform == 'facebook' and access_token:
            print("\n" + "="*80)
            print("TESTING FACEBOOK PFBID TO NUMERIC ID CONVERSION")
            print("="*80)

            from app.utils.post_url_parser import PostURLParser

            # Test URL with pfbid
            test_url = 'https://www.facebook.com/61557380578873/posts/pfbid0vaZPdb7hkorj3abgyvcdwysdd64w8Vn6gZN3nAXQoNg2FBSByaPyedgJPxw1MbuSl/'

            print(f"Test URL: {test_url}")
            print(f"Using Access Token: {access_token[:30]}...")
            print()

            # Parse URL with access token
            result = PostURLParser.parse_url(test_url, facebook_access_token=access_token)

            if result:
                print("✅ PARSE SUCCESSFUL!")
                print(f"Platform: {result.get('platform')}")
                print(f"Post ID: {result.get('post_id')}")
                print()

                if result.get('post_id').startswith('pfbid'):
                    print("⚠️  Post ID is still in pfbid format (conversion failed)")
                    print("   This means the Graph API call failed or didn't return numeric ID")
                elif '_' in result.get('post_id'):
                    print("🎉 SUCCESS! Post ID converted to numeric format!")
                    print(f"   Format: page_id_post_id")
                    print(f"   This matches ThunziAI's format!")
                else:
                    print("❓ Post ID format unclear")
            else:
                print("❌ Failed to parse URL")

            print("="*80 + "\n")

        # Trigger initial sync via Celery background task
        # NOTE: thunzi_service singleton is already authenticated from ensure_user_registered() above
        if connected_platform.thunzi_platform_id:
            from app.tasks.platform_sync import sync_platform as sync_platform_task
            sync_platform_task.delay(connected_platform.id)

        response_data = {
            'success': True,
            'message': f'{platform.title()} connected successfully',
            'platform': connected_platform.to_dict()
        }

        # Log successful response
        log_response(
            method='POST',
            path='/api/creator/platforms/connect',
            status_code=201,
            response_body=response_data
        )

        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()

        # Log error with full traceback
        log_error(
            context='connect_platform',
            error=e
        )

        error_response = {'error': str(e)}

        # Log error response
        log_response(
            method='POST',
            path='/api/creator/platforms/connect',
            status_code=500,
            error=str(e)
        )

        return jsonify(error_response), 500


@platforms_bp.route('/api/creator/platforms/youtube/auth-url', methods=['GET'])
@jwt_required()
def get_youtube_auth_url():
    """
    Get YouTube OAuth authorization URL

    Returns the URL to redirect the user to for YouTube OAuth consent
    """
    try:
        # YouTube OAuth credentials from config file
        from app.config.thunzi_config import GOOGLE_OAUTH_CONFIG

        client_id = GOOGLE_OAUTH_CONFIG['client_id']
        redirect_uri = GOOGLE_OAUTH_CONFIG['redirect_uri']
        scopes = GOOGLE_OAUTH_CONFIG['scopes']

        auth_url = (
            'https://accounts.google.com/o/oauth2/v2/auth?'
            f'client_id={client_id}&'
            f'redirect_uri={redirect_uri}&'
            'response_type=code&'
            f'scope={" ".join(scopes)}&'
            'access_type=offline&'
            'prompt=consent'
        )

        return jsonify({
            'success': True,
            'authUrl': auth_url,
            'redirectUri': redirect_uri
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/youtube/callback', methods=['GET'])
def youtube_oauth_callback():
    """
    YouTube OAuth callback endpoint - NO JWT REQUIRED (called from OAuth redirect)

    This receives the authorization code from YouTube in the callback URL
    The frontend will then call /exchange-code with JWT to exchange it for tokens
    """
    # Just redirect to frontend callback page with the code
    code = request.args.get('code')
    error = request.args.get('error')

    frontend_url = os.getenv('FRONTEND_URL', 'https://bantubuzz.com')

    if error:
        return f"""
        <html>
        <body>
        <script>
            window.opener.postMessage({{
                type: 'youtube-oauth-error',
                error: '{error}'
            }}, '{frontend_url}');
            window.close();
        </script>
        </body>
        </html>
        """

    if code:
        # Send code back to parent window immediately via postMessage
        # Parent window will exchange the code for tokens using its JWT token
        return f"""
        <html>
        <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #FFDD00; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p>Completing authentication...</p>
            </div>
        </div>
        <style>
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
        <script>
            console.log('[Backend Callback] Received code, sending to parent');
            // Send code to parent window immediately
            if (window.opener) {{
                console.log('[Backend Callback] window.opener exists, sending postMessage');
                window.opener.postMessage({{
                    type: 'youtube-oauth-code',
                    code: '{code}'
                }}, '{frontend_url}');
                setTimeout(() => window.close(), 500);
            }} else {{
                console.error('[Backend Callback] No window.opener!');
                document.body.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>Please close this window and try again.</p></div>';
            }}
        </script>
        </body>
        </html>
        """

    return jsonify({'error': 'No code or error received'}), 400


@platforms_bp.route('/api/creator/platforms/youtube/exchange-code', methods=['POST'])
@jwt_required()
def exchange_youtube_code():
    """
    Exchange YouTube authorization code for access tokens

    This endpoint is used after the OAuth callback to exchange the code for tokens
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

        # YouTube OAuth credentials from config file
        from app.config.thunzi_config import GOOGLE_OAUTH_CONFIG

        client_id = GOOGLE_OAUTH_CONFIG['client_id']
        client_secret = GOOGLE_OAUTH_CONFIG['client_secret']
        redirect_uri = GOOGLE_OAUTH_CONFIG['redirect_uri']

        # Exchange code for tokens
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'code': auth_code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }

        response = requests.post(token_url, data=token_data)

        if response.status_code != 200:
            return jsonify({'error': f'Failed to exchange code: {response.text}'}), 400

        tokens = response.json()
        access_token = tokens.get('access_token')
        refresh_token = tokens.get('refresh_token')
        expires_in = tokens.get('expires_in', 3600)

        if not access_token:
            return jsonify({'error': 'No access token received'}), 400

        # Get YouTube channel info
        youtube_api_url = 'https://www.googleapis.com/youtube/v3/channels'
        youtube_response = requests.get(
            youtube_api_url,
            params={'part': 'snippet,statistics', 'mine': 'true'},
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if youtube_response.status_code != 200:
            return jsonify({'error': 'Failed to fetch YouTube channel info'}), 400

        channel_data = youtube_response.json()
        if not channel_data.get('items'):
            return jsonify({'error': 'No YouTube channel found'}), 404

        channel = channel_data['items'][0]
        channel_id = channel['id']
        channel_title = channel['snippet']['title']

        # Return tokens and channel info to frontend
        return jsonify({
            'success': True,
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'expiresIn': expires_in,
            'channelId': channel_id,
            'channelTitle': channel_title
        }), 200

    except Exception as e:
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
        "code": "authorization_code_from_facebook",
        "accountType": "business" or "personal"  // optional, defaults to business
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        data = request.json
        auth_code = data.get('code')
        account_type = data.get('accountType', 'business')  # 'business' or 'personal'

        if not auth_code:
            return jsonify({'error': 'Authorization code is required'}), 400

        # Get Facebook App credentials from environment
        app_id = os.getenv('FACEBOOK_APP_ID', '1863571634283956')
        app_secret = os.getenv('FACEBOOK_APP_SECRET')

        if not app_secret:
            return jsonify({'error': 'Facebook App Secret not configured'}), 500

        # Get the redirect_uri from request (must match the one used in OAuth dialog)
        # Different redirect URIs for business vs personal
        if account_type == 'personal':
            redirect_uri = data.get('redirect_uri', f"{os.getenv('FRONTEND_URL', 'https://bantubuzz.com')}/oauth/facebook/personal/callback")
        else:
            redirect_uri = data.get('redirect_uri', f"{os.getenv('FRONTEND_URL', 'https://bantubuzz.com')}/oauth/facebook/business/callback")

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
            'tokenType': token_data.get('token_type', 'bearer'),
            'accountType': account_type
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/tiktok/callback', methods=['GET'])
def tiktok_oauth_callback():
    """
    TikTok OAuth callback endpoint - NO JWT REQUIRED (called from OAuth redirect)

    This receives the authorization code from TikTok in the callback URL.
    The frontend will then call /exchange-code with JWT to exchange it for tokens.
    """
    code = request.args.get('code')
    error = request.args.get('error')
    error_description = request.args.get('error_description')

    frontend_url = os.getenv('FRONTEND_URL', 'https://bantubuzz.com')

    if error:
        return f"""
        <html>
        <body>
        <script>
            window.opener.postMessage({{
                type: 'tiktok-oauth-error',
                error: '{error}',
                errorDescription: '{error_description or ""}'
            }}, '{frontend_url}');
            window.close();
        </script>
        </body>
        </html>
        """

    if code:
        # Send code back to parent window immediately via postMessage
        return f"""
        <html>
        <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #00F7EF; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p>Completing TikTok authentication...</p>
            </div>
        </div>
        <style>
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
        <script>
            console.log('[TikTok Callback] Received code, sending to parent');
            if (window.opener) {{
                console.log('[TikTok Callback] window.opener exists, sending postMessage');
                window.opener.postMessage({{
                    type: 'tiktok-oauth-code',
                    code: '{code}'
                }}, '{frontend_url}');
                setTimeout(() => window.close(), 500);
            }} else {{
                console.error('[TikTok Callback] No window.opener!');
                document.body.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>Please close this window and try again.</p></div>';
            }}
        </script>
        </body>
        </html>
        """

    return jsonify({'error': 'No code or error received'}), 400


@platforms_bp.route('/api/creator/platforms/tiktok/exchange-code', methods=['POST'])
@jwt_required()
def exchange_tiktok_code():
    """
    Exchange TikTok authorization code for access tokens

    Request body:
    {
        "code": "authorization_code_from_tiktok"
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

        # TikTok OAuth credentials from config
        from app.config.thunzi_config import TIKTOK_OAUTH_CONFIG
        client_key = TIKTOK_OAUTH_CONFIG['client_key']
        client_secret = TIKTOK_OAUTH_CONFIG['client_secret']
        redirect_uri = TIKTOK_OAUTH_CONFIG['redirect_uri']

        # Exchange code for access token
        # Reference: https://developers.tiktok.com/doc/login-kit-web
        token_url = 'https://open.tiktokapis.com/v2/oauth/token/'
        token_data = {
            'client_key': client_key,
            'client_secret': client_secret,
            'code': auth_code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri
        }

        response = requests.post(
            token_url,
            data=token_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        if response.status_code != 200:
            return jsonify({'error': f'Failed to exchange code: {response.text}'}), 400

        tokens = response.json()
        access_token = tokens.get('data', {}).get('access_token')
        refresh_token = tokens.get('data', {}).get('refresh_token')
        expires_in = tokens.get('data', {}).get('expires_in', 86400)  # 24 hours default
        open_id = tokens.get('data', {}).get('open_id')  # TikTok user ID

        if not access_token:
            return jsonify({'error': 'No access token received'}), 400

        # Get TikTok user info
        user_info_url = 'https://open.tiktokapis.com/v2/user/info/'
        user_info_params = {
            'fields': 'open_id,union_id,avatar_url,display_name,username,follower_count,video_count'
        }
        user_info_response = requests.get(
            user_info_url,
            params=user_info_params,
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if user_info_response.status_code != 200:
            return jsonify({'error': 'Failed to fetch TikTok user info'}), 400

        user_data = user_info_response.json()
        user_info = user_data.get('data', {}).get('user', {})

        # Return tokens and user info to frontend
        return jsonify({
            'success': True,
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'expiresIn': expires_in,
            'openId': open_id,
            'username': user_info.get('username', ''),
            'displayName': user_info.get('display_name', ''),
            'followerCount': user_info.get('follower_count', 0),
            'videoCount': user_info.get('video_count', 0)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/tiktok/auth-url', methods=['GET'])
@jwt_required()
def get_tiktok_auth_url():
    """
    Get TikTok OAuth authorization URL

    Returns the URL to redirect the user to for TikTok OAuth consent
    """
    try:
        from app.config.thunzi_config import TIKTOK_OAUTH_CONFIG

        client_key = TIKTOK_OAUTH_CONFIG['client_key']
        redirect_uri = TIKTOK_OAUTH_CONFIG['redirect_uri']
        scopes = ','.join(TIKTOK_OAUTH_CONFIG['scopes'])

        # Generate random state for CSRF protection
        import secrets
        state = secrets.token_urlsafe(32)

        # Build TikTok OAuth URL
        auth_url = (
            'https://www.tiktok.com/v2/auth/authorize?'
            f'client_key={client_key}&'
            f'scope={scopes}&'
            'response_type=code&'
            f'redirect_uri={redirect_uri}&'
            f'state={state}'
        )

        return jsonify({
            'success': True,
            'authUrl': auth_url,
            'redirectUri': redirect_uri,
            'state': state
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/instagram/auth-url', methods=['GET'])
@jwt_required()
def get_instagram_auth_url():
    """
    Get Instagram Direct OAuth authorization URL

    Returns the URL to redirect the user to for Instagram OAuth consent
    Uses Instagram Basic Display API for accounts not connected to Facebook
    """
    try:
        from app.config.thunzi_config import INSTAGRAM_DIRECT_OAUTH_CONFIG

        app_id = INSTAGRAM_DIRECT_OAUTH_CONFIG['app_id']
        redirect_uri = INSTAGRAM_DIRECT_OAUTH_CONFIG['redirect_uri']
        scopes = ','.join(INSTAGRAM_DIRECT_OAUTH_CONFIG['scopes'])

        # Generate random state for CSRF protection
        import secrets
        state = secrets.token_urlsafe(32)

        # Build Instagram OAuth URL
        # Reference: https://developers.facebook.com/docs/instagram-basic-display-api/getting-started
        auth_url = (
            'https://api.instagram.com/oauth/authorize?'
            f'client_id={app_id}&'
            f'redirect_uri={redirect_uri}&'
            f'scope={scopes}&'
            'response_type=code&'
            f'state={state}'
        )

        return jsonify({
            'success': True,
            'authUrl': auth_url,
            'redirectUri': redirect_uri,
            'state': state
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platforms_bp.route('/api/creator/platforms/instagram/callback', methods=['GET'])
def instagram_oauth_callback():
    """
    Instagram OAuth callback endpoint - NO JWT REQUIRED (called from OAuth redirect)

    This receives the authorization code from Instagram in the callback URL.
    The frontend will then call /exchange-code with JWT to exchange it for tokens.
    """
    code = request.args.get('code')
    error = request.args.get('error')
    error_description = request.args.get('error_description')

    frontend_url = os.getenv('FRONTEND_URL', 'https://bantubuzz.com')

    if error:
        return f"""
        <html>
        <body>
        <script>
            window.opener.postMessage({{
                type: 'instagram-oauth-error',
                error: '{error}',
                errorDescription: '{error_description or ""}'
            }}, '{frontend_url}');
            window.close();
        </script>
        </body>
        </html>
        """

    if code:
        # Send code back to parent window immediately via postMessage
        return f"""
        <html>
        <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #E4405F; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p>Completing Instagram authentication...</p>
            </div>
        </div>
        <style>
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
        <script>
            console.log('[Instagram Callback] Received code, sending to parent');
            if (window.opener) {{
                console.log('[Instagram Callback] window.opener exists, sending postMessage');
                window.opener.postMessage({{
                    type: 'instagram-oauth-code',
                    code: '{code}'
                }}, '{frontend_url}');
                setTimeout(() => window.close(), 500);
            }} else {{
                console.error('[Instagram Callback] No window.opener!');
                document.body.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>Please close this window and try again.</p></div>';
            }}
        </script>
        </body>
        </html>
        """

    return jsonify({'error': 'No code or error received'}), 400


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

        # Get ThunziAI account
        thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()
        if not thunzi_account:
            return jsonify({'error': 'ThunziAI account not found'}), 404

        # Ensure authenticated (handles both verified and API key-registered users)
        user_registered = thunzi_service.ensure_user_registered(email=thunzi_account.thunzi_email)

        if not user_registered:
            platform.sync_status = 'failure'
            db.session.commit()
            return jsonify({'error': 'Failed to authenticate with ThunziAI'}), 401

        # Trigger sync in ThunziAI using async endpoint with legacy fallback
        sync_result = thunzi_service.sync_platform_and_poll(
            platform_id=platform.thunzi_platform_id,
            timeout_seconds=120,
            poll_interval_seconds=5
        )
        success = sync_result.get('success')

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
                    platform.account_name = updated_platform.get('accountName') or platform.account_name  # Update account name from ThunziAI
                    platform.followers = updated_platform.get('followers', platform.followers)
                    platform.posts = updated_platform.get('posts', platform.posts)
                    platform.sync_status = updated_platform.get('syncStatus', 'success')
                    platform.scopes = updated_platform.get('scopes') or platform.scopes
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
            platform.sync_status = sync_result.get('status', 'failed')
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
            # Ensure user is registered in ThunziAI (register if needed, then login)
            user_registered = thunzi_service.ensure_user_registered(email=user.email)
            if not user_registered:
                return jsonify({'error': 'Failed to register with ThunziAI'}), 500

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
        else:
            # Existing account - ensure authenticated (handles both verified and API key-registered users)
            user_registered = thunzi_service.ensure_user_registered(email=thunzi_account.thunzi_email)

            if not user_registered:
                return jsonify({'error': 'Failed to authenticate with ThunziAI'}), 500

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
            scopes=thunzi_platform.get('scopes') or [],
            followers=thunzi_platform.get('followers', 0), posts=thunzi_platform.get('posts', 0),
            is_connected=thunzi_platform.get('isConnected', True), sync_status=thunzi_platform.get('syncStatus', 'pending'),
            last_synced_at=_parse_thunzi_datetime(thunzi_platform.get('lastSyncedAt'))
        )

        db.session.add(connected_platform)
        db.session.commit()

        # Trigger initial async sync without blocking the platform connection response.
        if connected_platform.thunzi_platform_id:
            sync_started = thunzi_service.start_async_platform_sync(connected_platform.thunzi_platform_id)
            if sync_started:
                connected_platform.sync_status = sync_started.get('status', connected_platform.sync_status)
                db.session.commit()

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
        sync_result = thunzi_service.sync_platform_and_poll(
            platform_id=platform.thunzi_platform_id,
            timeout_seconds=120,
            poll_interval_seconds=5
        )
        success = sync_result.get('success')

        if success:
            thunzi_account = ThunziAccount.query.filter_by(user_id=current_user_id).first()
            if thunzi_account:
                platforms_data = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)
                updated_platform = next((p for p in platforms_data if p.get('id') == platform.thunzi_platform_id), None)

                if updated_platform:
                    platform.followers = updated_platform.get('followers', platform.followers)
                    platform.posts = updated_platform.get('posts', platform.posts)
                    platform.sync_status = updated_platform.get('syncStatus', 'success')
                    platform.scopes = updated_platform.get('scopes') or platform.scopes
                    platform.last_synced_at = datetime.utcnow()
                    db.session.commit()

            return jsonify({'success': True, 'message': 'Sync completed', 'platform': platform.to_dict()}), 200
        else:
            platform.sync_status = sync_result.get('status', 'failed')
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
