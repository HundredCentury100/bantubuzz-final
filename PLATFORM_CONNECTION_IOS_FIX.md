# iOS Platform Connection Fix - TikTok & Instagram OAuth

**Date**: April 24, 2026
**Issue**: TikTok and Instagram OAuth not working on iOS (stuck on "Connecting...")
**Status**: ✅ Fixed and Deployed

---

## Problem Analysis

### Symptoms
- **iOS**: TikTok and Instagram connection buttons show "Connecting..." but don't open login pages
- **iOS**: Facebook OAuth works perfectly
- **Android**: All platforms (TikTok, Instagram, Facebook) work without issues

### Root Cause

**Different OAuth Flow Implementations:**

1. **Facebook OAuth** (Working on iOS):
   - Uses **full-page redirect** via `window.location.href`
   - No popup windows
   - iOS Safari handles this perfectly

2. **TikTok & Instagram OAuth** (Broken on iOS):
   - Used **popup windows** via `window.open()`
   - Relied on `window.postMessage()` for communication
   - iOS Safari blocks or severely restricts popup windows
   - `postMessage` communication unreliable on iOS

**Technical Details:**
```javascript
// ❌ OLD APPROACH (iOS incompatible)
const authWindow = window.open(authUrl, 'TikTok OAuth', 'width=600,height=700');
window.addEventListener('message', handleMessage); // Unreliable on iOS

// ✅ NEW APPROACH (iOS compatible)
window.location.href = authUrl; // Full page redirect
```

---

## Solution Implemented

### Changed OAuth Flow from Popup to Full-Page Redirect

#### 1. **TikTok OAuth Changes**

**Before** (Popup-based):
```javascript
const authWindow = window.open(response.data.authUrl, 'TikTok OAuth', '...');
// Listen for postMessage from popup
window.addEventListener('message', handleMessage);
```

**After** (Redirect-based):
```javascript
// Add state parameter for callback identification
const state = encodeURIComponent(JSON.stringify({
  action: 'tiktok_connect',
  timestamp: Date.now()
}));

// Modify authUrl to include state
const authUrl = response.data.authUrl.includes('?')
  ? `${response.data.authUrl}&state=${state}`
  : `${response.data.authUrl}?state=${state}`;

// Save state to session storage (survives page reload)
sessionStorage.setItem('oauth_connecting', 'tiktok');

// Full page redirect
window.location.href = authUrl;
```

**Callback Handler** (New):
```javascript
useEffect(() => {
  // Check if returning from OAuth redirect
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (code && state) {
    const stateData = JSON.parse(decodeURIComponent(state));

    if (stateData.action === 'tiktok_connect') {
      handleTikTokRedirect(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}, [user]);

const handleTikTokRedirect = async (code) => {
  setConnecting('tiktok');

  const connectResponse = await api.post('/creator/platforms/connect', {
    platform: 'tiktok',
    accountName: 'TikTok Account',
    accessToken: code  // Auth code - backend will exchange it
  });

  if (connectResponse.data.success) {
    toast.success('TikTok connected successfully!');
    fetchPlatforms();
  }
};
```

#### 2. **Instagram OAuth Changes**

Applied identical pattern as TikTok:
- Full-page redirect instead of popup
- State parameter for callback identification
- `handleInstagramRedirect()` callback handler
- Session storage for connection state persistence

#### 3. **Code Cleanup**

Removed unused popup-related code:
```javascript
// ❌ REMOVED
const [tiktokAuthWindow, setTiktokAuthWindow] = useState(null);
const [instagramAuthWindow, setInstagramAuthWindow] = useState(null);

// ✅ KEPT (still used by YouTube)
const [youtubeAuthWindow, setYoutubeAuthWindow] = useState(null);
```

---

## Files Modified

### Frontend
**File**: `frontend/src/pages/ConnectPlatforms.jsx`

**Changes**:
1. **Lines 109-131**: Added OAuth callback detection in `useEffect()`
   - Checks for `code` and `state` URL parameters
   - Routes to appropriate handler (`handleTikTokRedirect` or `handleInstagramRedirect`)
   - Cleans up URL after processing

2. **Lines 237-263**: New `handleTikTokRedirect()` function
   - Processes TikTok authorization code
   - Connects platform via API
   - Shows success/error messages

3. **Lines 265-298**: Updated `handleConnectTikTok()` function
   - Removed popup window logic
   - Added state parameter generation
   - Uses `window.location.href` for full-page redirect
   - Saves state to session storage

4. **Lines 300-326**: New `handleInstagramRedirect()` function
   - Identical pattern to TikTok handler

5. **Lines 328-361**: Updated `handleConnectInstagram()` function
   - Removed popup window logic
   - Added state parameter generation
   - Uses `window.location.href` for full-page redirect

6. **Lines 23-24**: Removed unused state variables
   - Deleted `tiktokAuthWindow` and `instagramAuthWindow`

---

## How It Works Now

### TikTok Connection Flow

1. **User clicks "Connect with TikTok"**
   - Frontend calls `/api/creator/platforms/tiktok/auth-url`
   - Backend returns TikTok OAuth URL

2. **Frontend adds state and redirects**
   - Generates state parameter: `{action: 'tiktok_connect', timestamp: ...}`
   - Appends state to OAuth URL
   - Saves 'tiktok' to `sessionStorage.oauth_connecting`
   - **Redirects entire page** to TikTok login

3. **User logs in on TikTok**
   - TikTok shows authorization screen
   - User approves permissions

4. **TikTok redirects back to BantuBuzz**
   - URL: `https://bantubuzz.com/creator/platforms?code=ABC123&state={...}`
   - Page loads with code and state in URL

5. **Frontend detects OAuth callback**
   - `useEffect` runs on page load
   - Extracts `code` and `state` from URL
   - Parses state: `{action: 'tiktok_connect'}`
   - Calls `handleTikTokRedirect(code)`

6. **Backend processes connection**
   - Frontend sends code to `/api/creator/platforms/connect`
   - Backend exchanges code for access token via ThunziAI
   - Platform connected successfully

7. **URL cleanup**
   - `window.history.replaceState()` removes code/state from URL
   - User sees clean `/creator/platforms` URL

### Instagram Connection Flow

Identical to TikTok, just different platform name and API endpoints.

---

## Why This Fixes iOS

### Popup Issues on iOS Safari
- **Strict Popup Blocker**: iOS Safari blocks most popup windows by default
- **Reduced Functionality**: Even when allowed, popups have limited features
- **postMessage Unreliable**: Cross-window communication often fails on iOS
- **User Experience**: Popups feel janky and confusing on mobile

### Full-Page Redirect Benefits
- ✅ **No popup blockers** - full page navigation always works
- ✅ **Native feel** - standard browser navigation on mobile
- ✅ **Reliable** - URL parameters are guaranteed to work
- ✅ **Consistent UX** - matches Facebook OAuth flow (already working)
- ✅ **Session storage** - state persists across page reloads
- ✅ **URL history** - proper back button behavior

---

## Testing Checklist

### iOS Testing (Safari)
- [x] TikTok connection redirects to TikTok login page
- [x] After TikTok approval, redirects back to BantuBuzz
- [x] TikTok account connected successfully
- [x] Instagram connection redirects to Instagram login page
- [x] After Instagram approval, redirects back to BantuBuzz
- [x] Instagram account connected successfully
- [x] Facebook connection still works (unchanged)
- [x] YouTube connection still works (unchanged - already uses popup)

### Android Testing (Chrome)
- [x] TikTok connection works
- [x] Instagram connection works
- [x] Facebook connection works
- [x] YouTube connection works

### Desktop Testing (Chrome/Safari/Firefox)
- [x] All platforms connect successfully
- [x] URL cleanup works (no code/state in final URL)
- [x] Loading states show correctly during redirect

---

## Backend Compatibility

**No backend changes required!**

The backend already supported this flow:
- ✅ TikTok callback endpoint: `/api/creator/platforms/tiktok/callback`
- ✅ Instagram callback endpoint: `/api/creator/platforms/instagram/callback`
- ✅ Both endpoints already handle authorization codes
- ✅ State parameter properly passed through OAuth flow

The existing backend implementation already supported full-page redirects, we just weren't using them from the frontend.

---

## Deployment

### Build & Deploy
```bash
cd frontend
npm run build
tar -czf dist.tar.gz dist/
scp dist.tar.gz root@173.212.245.22:/var/www/bantubuzz/frontend/
ssh root@173.212.245.22 "cd /var/www/bantubuzz/frontend && rm -rf dist && tar -xzf dist.tar.gz"
```

**Status**: ✅ Deployed to production (April 24, 2026 11:45 AM)

---

## User-Facing Changes

### Before
- iOS users: "Connect with TikTok" → spinner → nothing happens
- iOS users: "Connect with Instagram" → spinner → nothing happens

### After
- iOS users: "Connect with TikTok" → redirects to TikTok → back to BantuBuzz → connected!
- iOS users: "Connect with Instagram" → redirects to Instagram → back to BantuBuzz → connected!

### User Experience Notes
- Brief full-page redirect (standard OAuth flow)
- Loading indicator while processing callback
- Success message on completion
- Automatic platform list refresh

---

## Future Considerations

### YouTube OAuth
YouTube still uses popup-based OAuth. Consider migrating to full-page redirect for consistency, although it currently works on iOS (Google's SDK handles iOS differently).

### Alternative: Deep Links (Not Implemented)
Could use deep links on mobile:
```javascript
// iOS/Android app redirect flow
const deepLink = `bantubuzz://oauth/tiktok?code=${code}`;
```

Not needed for web app, but useful if native apps are built.

---

## Known Limitations

1. **Session Persistence**: Using session storage means connection state lost if user closes tab during OAuth
   - **Mitigation**: OAuth completes in seconds, unlikely to happen
   - **Alternative**: Could use localStorage, but security concerns

2. **Multiple Simultaneous Connections**: Can't connect multiple platforms at once
   - **Expected behavior**: Each connection is a separate flow
   - **Not a limitation**: Users connect one platform at a time anyway

3. **URL Parameter Leakage**: Authorization code briefly visible in URL
   - **Mitigation**: Immediately cleaned up via `history.replaceState()`
   - **Security**: Code is single-use and expires in 60 seconds
   - **Standard**: This is standard OAuth 2.0 authorization code flow

---

## Related Documentation
- OAuth 2.0 Authorization Code Flow: https://oauth.net/2/grant-types/authorization-code/
- iOS Safari Popup Restrictions: https://developer.apple.com/documentation/webkit
- Facebook OAuth Implementation: `frontend/src/hooks/useFacebookOAuth.js`

---

**Implementation Date**: April 24, 2026
**Tested On**: iOS Safari, Android Chrome, Desktop Chrome/Safari/Firefox
**Status**: ✅ Complete and Deployed
**Impact**: iOS creators can now connect TikTok and Instagram accounts
