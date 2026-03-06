# ThunziAI OAuth Implementation Plan
**Focus**: Creator Platform Connections Only
**Date**: March 4, 2026

## Overview
Simplified approach using ONE ThunziAI account for all BantuBuzz users.
OAuth happens on BantuBuzz side, tokens sent to ThunziAI.

---

## What We're Building

### User Flow:
1. Creator goes to `/creator/platforms`
2. Clicks "Connect Facebook" or "Connect YouTube"
3. OAuth popup opens (Facebook/Google branded)
4. User authorizes BantuBuzz
5. We receive access token
6. Send token to ThunziAI to connect platform
7. ThunziAI starts syncing followers/posts
8. Show connection success to creator

---

## Implementation Steps

### Step 1: Database Migration ✅
**File**: `backend/migrations/versions/202603041500_add_oauth_tokens_to_connected_platforms.py`

Add columns to `connected_platforms`:
- `thunzi_platform_id` (INTEGER) - ThunziAI's platform ID
- `refresh_token` (TEXT) - OAuth refresh token
- `token_expiry` (TIMESTAMP) - When token expires

**Run on server**:
```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
python migrations/versions/202603041500_add_oauth_tokens_to_connected_platforms.py
```

### Step 2: Backend Configuration
**File**: `backend/app/config/thunzi_config.py` ✅

Contains:
- ThunziAI credentials (email, password, company_id)
- Facebook OAuth config (App ID: 1863571634283956)
- YouTube OAuth config (Client ID provided)
- Platform name mapping

**TODO**: Add actual ThunziAI account credentials

### Step 3: Update Backend Route
**File**: `backend/app/routes/platforms.py`

Update `POST /api/creator/platforms/connect` to:
```python
@platforms_bp.route('/api/creator/platforms/connect', methods=['POST'])
@jwt_required()
def connect_platform():
    """
    New flow with OAuth tokens

    Request Body:
    {
        "platform": "facebook",
        "accountName": "@username",
        "accessToken": "EAAa...",  # From Facebook OAuth
        "refreshToken": "...",     # Optional
        "tokenExpiry": "2026-04-04T00:00:00Z"  # Optional
    }
    """
    data = request.get_json()
    platform = data.get('platform')
    access_token = data.get('accessToken')
    account_name = data.get('accountName')

    # Get ThunziAI account (shared for all users)
    thunzi_account = get_shared_thunzi_account()

    # Add platform to ThunziAI with access token
    thunzi_platform = thunzi_service.add_platform(
        company_id=thunzi_account.company_id,
        platform=platform,
        account_name=account_name,
        access_token=access_token
    )

    # Save to our database
    connected_platform = ConnectedPlatform(
        user_id=current_user_id,
        thunzi_platform_id=thunzi_platform['id'],
        platform=platform,
        account_name=account_name,
        access_token=access_token,  # Store for future use
        refresh_token=data.get('refreshToken'),
        token_expiry=data.get('tokenExpiry'),
        followers=thunzi_platform['followers'],
        is_connected=True
    )

    db.session.add(connected_platform)
    db.session.commit()

    return jsonify({'success': True, 'platform': connected_platform.to_dict()})
```

### Step 4: Frontend - Facebook OAuth
**File**: `frontend/src/components/FacebookOAuthButton.jsx` (NEW)

```jsx
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const FacebookOAuthButton = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);

    // Initialize Facebook SDK if not already loaded
    if (!window.FB) {
      loadFacebookSDK().then(() => connectFacebook());
    } else {
      connectFacebook();
    }
  };

  const loadFacebookSDK = () => {
    return new Promise((resolve) => {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: '1863571634283956',
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        resolve();
      };

      // Load SDK
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    });
  };

  const connectFacebook = () => {
    window.FB.login((response) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;

        // Get user's Facebook pages
        window.FB.api('/me/accounts', async (pagesResponse) => {
          if (pagesResponse.data && pagesResponse.data.length > 0) {
            const page = pagesResponse.data[0];

            // Send to backend
            try {
              await api.post('/creator/platforms/connect', {
                platform: 'facebook',
                accountName: page.name,
                accessToken: page.access_token || accessToken,
                tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
              });

              toast.success('Facebook page connected!');
              onSuccess();
            } catch (error) {
              toast.error('Failed to connect Facebook page');
              console.error(error);
            } finally {
              setLoading(false);
            }
          } else {
            toast.error('No Facebook pages found');
            setLoading(false);
          }
        });
      } else {
        toast.error('Facebook login cancelled');
        setLoading(false);
      }
    }, {
      scope: 'pages_show_list,instagram_basic,instagram_manage_insights,pages_read_engagement'
    });
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="w-full py-3 rounded-full font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Connecting...' : 'Connect Facebook Page'}
    </button>
  );
};
```

### Step 5: Frontend - YouTube OAuth
**File**: `frontend/src/components/YouTubeOAuthButton.jsx` (NEW)

```jsx
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// Get from environment or config - credentials not committed to repo
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const REDIRECT_URI = 'https://bantubuzz.com/oauth/youtube/callback';

export const YouTubeOAuthButton = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);

    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

    // Open popup
    const popup = window.open(authUrl, 'YouTube OAuth', 'width=600,height=700');

    // Listen for callback
    window.addEventListener('message', async (event) => {
      if (event.origin === window.location.origin && event.data.type === 'youtube-oauth') {
        const { code } = event.data;
        popup.close();

        try {
          // Exchange code for tokens (backend handles this)
          const response = await api.post('/oauth/youtube/exchange', { code });
          const { accessToken, refreshToken, channelName } = response.data;

          // Connect platform
          await api.post('/creator/platforms/connect', {
            platform: 'youtube',
            accountName: channelName,
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour
          });

          toast.success('YouTube channel connected!');
          onSuccess();
        } catch (error) {
          toast.error('Failed to connect YouTube channel');
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="w-full py-3 rounded-full font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? 'Connecting...' : 'Connect YouTube Channel'}
    </button>
  );
};
```

### Step 6: Update ConnectPlatforms.jsx
Replace the current platform connection cards with OAuth buttons:

```jsx
import { FacebookOAuthButton } from '../components/FacebookOAuthButton';
import { YouTubeOAuthButton } from '../components/YouTubeOAuthButton';

// In the platform grid:
{platform.id === 'facebook' && (
  <FacebookOAuthButton onSuccess={fetchPlatforms} />
)}

{platform.id === 'youtube' && (
  <YouTubeOAuthButton onSuccess={fetchPlatforms} />
)}
```

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] ThunziAI credentials configured in backend
- [ ] Facebook OAuth popup opens
- [ ] Facebook access token received
- [ ] Platform sent to ThunziAI successfully
- [ ] Platform appears in connected list
- [ ] Follower count syncs from ThunziAI
- [ ] YouTube OAuth flow works
- [ ] Can sync platforms manually

---

## Deployment Steps

1. **Backend**:
   - Upload migration file
   - Run migration on production DB
   - Upload updated models
   - Upload config file (with credentials added)
   - Upload updated platforms.py route
   - Restart gunicorn

2. **Frontend**:
   - Create OAuth button components
   - Update ConnectPlatforms.jsx
   - Build and deploy

3. **Configure**:
   - Add ThunziAI credentials to config
   - Test with one creator account
   - Monitor logs for errors

---

## Next Steps (After This Works)

1. Add TikTok connection (username-based, no OAuth)
2. Add Twitter/X OAuth
3. Add Instagram (via Facebook Business integration)
4. Add token refresh logic
5. Add analytics dashboard (Phase 2)
6. Add brand platform connections

---

## Notes

- **One ThunziAI Account**: All BantuBuzz users share one ThunziAI company account
- **OAuth on Our Side**: We handle Facebook/YouTube OAuth, not ThunziAI
- **Token Storage**: Access tokens stored encrypted (TODO: add encryption)
- **Token Refresh**: Implement later when tokens start expiring
- **Rate Limits**: Monitor ThunziAI API rate limits

---

## Support

If issues arise, check:
1. ThunziAI API logs (their dashboard)
2. BantuBuzz backend logs (`gunicorn.log`)
3. Browser console for OAuth errors
4. Facebook App dashboard for permissions issues
