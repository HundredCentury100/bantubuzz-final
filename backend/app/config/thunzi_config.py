"""
ThunziAI API Configuration
Contains credentials for ThunziAI and OAuth providers
"""

# ThunziAI API Configuration
THUNZI_CONFIG = {
    'base_url': 'https://app.thunzi.co',
    'api_key': 'WsoFzZyadXRLP8ypT1mIkhB8',  # API key for creator registration (bypasses OTP)
    'company_id': None,  # TODO: Add your ThunziAI company ID here after registration
    'email': None,  # TODO: Add ThunziAI account email
    'password': None,  # TODO: Add ThunziAI account password
}

# Facebook OAuth Configuration
# Facebook now supports TWO login methods for different creator types
# https://developers.facebook.com/apps/1863571634283956

# For creators WITH business portfolio
FACEBOOK_BUSINESS_OAUTH_CONFIG = {
    'app_id': '1863571634283956',
    'config_id': '1404830888084532',
    'redirect_uri': 'https://bantubuzz.com/oauth/facebook/business/callback',
    'scopes': [
        'pages_show_list',
        'instagram_basic',
        'instagram_manage_insights',
        'pages_read_engagement',
        'read_insights'
    ]
}

# For creators WITHOUT business portfolio (personal accounts)
FACEBOOK_PERSONAL_OAUTH_CONFIG = {
    'app_id': '1863571634283956',
    'config_id': '1501393338364917',
    'redirect_uri': 'https://bantubuzz.com/oauth/facebook/personal/callback',
    'scopes': [
        'pages_show_list',
        'instagram_basic',
        'instagram_manage_insights',
        'pages_read_engagement'
    ]
}

# Legacy Facebook config (maintained for backwards compatibility)
FACEBOOK_OAUTH_CONFIG = FACEBOOK_BUSINESS_OAUTH_CONFIG

# Instagram OAuth Configuration (uses Facebook Login)
INSTAGRAM_OAUTH_CONFIG = {
    'app_id': '1863571634283956',
    'config_id': '1233734415390648',
    'redirect_uri': 'https://bantubuzz.com/oauth/instagram/callback',
    'scopes': [
        'instagram_basic',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement'
    ]
}

# Instagram Direct OAuth Configuration (for accounts not connected to Facebook)
# https://developers.facebook.com/apps/1909200419710706
# Using Instagram Basic Display API
INSTAGRAM_DIRECT_OAUTH_CONFIG = {
    'app_id': '1909200419710706',
    'app_secret': '8a83d231abc2f9e9bdadc76467daa3b0',
    'redirect_uri': 'https://bantubuzz.com/api/creator/platforms/instagram/callback',
    'scopes': [
        'instagram_business_basic',
        'instagram_business_manage_messages',
        'instagram_business_manage_comments',
        'instagram_business_content_publish'
    ]
}

# YouTube/Google OAuth Configuration
# https://console.cloud.google.com/
GOOGLE_OAUTH_CONFIG = {
    'client_id': '1052058162489-6522oei5bjsalcgm0hmgku927lumqa06.apps.googleusercontent.com',
    'client_secret': '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',
    'redirect_uri': 'https://bantubuzz.com/api/creator/platforms/youtube/callback',
    'scopes': [
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        # 'https://www.googleapis.com/auth/youtube.readonly'  # More reliable but not verified - shows unsafe warning
    ]
}

# TikTok OAuth Configuration
# https://developers.tiktok.com/
TIKTOK_OAUTH_CONFIG = {
    'client_key': 'awvmbhpbq9t9e1p9',
    'client_secret': '0cnKZ5CgGOhndxJ5AGFPtGI1f2b5iMli',
    'redirect_uri': 'https://bantubuzz.com/api/creator/platforms/tiktok/callback',
    'scopes': [
        'user.info.basic',
        'user.info.profile',
        'user.info.stats',
        'video.list'
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
    'tiktok': 'tiktok',
    'website': 'website'
}
