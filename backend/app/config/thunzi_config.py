"""
ThunziAI API Configuration
Contains credentials for ThunziAI and OAuth providers
"""

# ThunziAI API Configuration
THUNZI_CONFIG = {
    'base_url': 'https://app.thunzi.co',
    'company_id': None,  # TODO: Add your ThunziAI company ID here after registration
    'email': None,  # TODO: Add ThunziAI account email
    'password': None,  # TODO: Add ThunziAI account password
}

# Facebook OAuth Configuration
# https://developers.facebook.com/apps/1863571634283956
FACEBOOK_OAUTH_CONFIG = {
    'app_id': '1863571634283956',
    'config_id': '1233734415390648',
    'redirect_uri': 'https://bantubuzz.com/oauth/facebook/callback',
    'scopes': [
        'pages_show_list',
        'instagram_basic',
        'instagram_manage_insights',
        'pages_read_engagement'
    ]
}

# YouTube/Google OAuth Configuration
GOOGLE_OAUTH_CONFIG = {
    'client_id': None,  # TODO: Add YouTube OAuth 2.0 client ID from Google Cloud Console
    'client_secret': None,  # TODO: Add YouTube OAuth 2.0 client secret
    'redirect_uri': 'https://bantubuzz.com/oauth/youtube/callback',
    'scopes': [
        'https://www.googleapis.com/auth/youtube.readonly'
    ]
}

# Twitter OAuth Configuration (v2)
TWITTER_OAUTH_CONFIG = {
    'client_id': None,  # TODO: Add Twitter OAuth 2.0 client ID
    'client_secret': None,  # TODO: Add Twitter OAuth 2.0 client secret
    'redirect_uri': 'https://bantubuzz.com/oauth/twitter/callback',
    'scopes': [
        'tweet.read',
        'users.read',
        'follows.read'
    ]
}

# Platform name mapping (BantuBuzz -> ThunziAI)
PLATFORM_MAPPING = {
    'facebook': 'facebook',
    'instagram': 'instagram',
    'youtube': 'youtube',
    'twitter': 'twitter',
    'tiktok': 'tiktok'  # TikTok doesn't require OAuth for now (username-based)
}
