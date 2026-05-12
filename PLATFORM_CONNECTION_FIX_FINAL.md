# Platform Connection Fix - FINAL

## Date: 2026-04-20

## Problem Identified

TikTok and YouTube platform connections were failing with "connecting" status but nothing happening. The browser console showed:

```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('http://localhost:3000')
does not match the recipient window's origin ('https://bantubuzz.com').
```

## Root Cause

The production backend had `FRONTEND_URL=http://localhost:3000` in the `.env` file, which caused OAuth callback popups to send postMessage to the wrong origin. The frontend at `https://bantubuzz.com` couldn't receive messages intended for `http://localhost:3000`.

## Issues Fixed

### 1. Backend Environment Variable (CRITICAL)
**File**: `/var/www/bantubuzz/backend/.env`

**Before:**
```bash
FRONTEND_URL=http://localhost:3000
```

**After:**
```bash
FRONTEND_URL=https://bantubuzz.com
```

This environment variable is used in all OAuth callback endpoints (YouTube, TikTok, Instagram) at lines:
- [platforms.py:669](backend/app/routes/platforms.py#L669) - TikTok callback
- [platforms.py:753](backend/app/routes/platforms.py#L753) - YouTube callback
- [platforms.py:936](backend/app/routes/platforms.py#L936) - Instagram callback

Each callback sends postMessage like:
```javascript
window.opener.postMessage({
    type: 'tiktok-oauth-code',
    code: 'auth_code_here'
}, '{frontend_url}');  // <-- This was http://localhost:3000!
```

### 2. Frontend Origin Check Enhancement
**File**: [frontend/src/pages/ConnectPlatforms.jsx](frontend/src/pages/ConnectPlatforms.jsx)

**Before:**
```javascript
// Security check
if (event.origin !== window.location.origin) {
    console.log('[ConnectPlatforms] Origin mismatch, ignoring message');
    return;
}
```

**After:**
```javascript
// Security check - allow messages from same domain (http or https)
const allowedOrigins = [window.location.origin, 'https://bantubuzz.com', 'http://bantubuzz.com'];
if (!allowedOrigins.includes(event.origin)) {
    console.log('[ConnectPlatforms] Origin not in allowed list, ignoring message');
    return;
}
```

**Lines Updated:**
- Lines 155-158: YouTube OAuth handler
- Lines 243-246: TikTok OAuth handler
- Lines 330-333: Instagram OAuth handler

**Added Enhanced Logging:**
- Log event origin and window origin for debugging
- More descriptive error messages

### 3. Backend Authentication (From Previous Fix)
**File**: [backend/app/routes/platforms.py](backend/app/routes/platforms.py)

Replaced all `login()` calls with `ensure_user_registered()` to handle API key-registered users:
- Lines 208-231: Creator platform connection
- Lines 327-331: Removed redundant login before sync
- Lines 981-987: Platform sync endpoint
- Lines 1179-1183: Brand platform connection

## How OAuth Flow Works

1. **User clicks "Connect TikTok"** on frontend
2. **Frontend requests auth URL** from `/api/creator/platforms/tiktok/auth-url`
3. **Frontend opens popup** with TikTok OAuth consent page
4. **User authorizes** on TikTok
5. **TikTok redirects** to `https://bantubuzz.com/api/creator/platforms/tiktok/callback?code=xxx`
6. **Backend callback** returns HTML with JavaScript that sends postMessage:
   ```javascript
   window.opener.postMessage({
       type: 'tiktok-oauth-code',
       code: 'auth_code_here'
   }, 'https://bantubuzz.com');  // <-- NOW CORRECT!
   ```
7. **Frontend receives message** (now that origins match!)
8. **Frontend calls** `/api/creator/platforms/connect` with the code
9. **Backend calls** ThunziAI `add_platform()` with the code
10. **ThunziAI exchanges** code for access token and stores platform connection

## Deployment Steps

### 1. Fix Backend Environment Variable
```bash
ssh root@173.212.245.22
sed -i 's|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=https://bantubuzz.com|g' /var/www/bantubuzz/backend/.env
```

### 2. Restart Backend
```bash
pkill -f 'gunicorn.*8002'
cd /var/www/bantubuzz/backend
/var/www/bantubuzz/backend/venv/bin/gunicorn --bind 0.0.0.0:8002 --workers 4 --timeout 300 'app:create_app()' --daemon
```

### 3. Deploy Frontend
```bash
# Build locally
cd "d:\Bantubuzz Platform\frontend"
npm run build
tar -czf dist.tar.gz dist/

# Upload and deploy
scp dist.tar.gz root@173.212.245.22:/tmp/
ssh root@173.212.245.22 "cd /var/www/bantubuzz/frontend && rm -rf dist && tar -xzf /tmp/dist.tar.gz"
```

## Testing

✅ Backend health check passing
✅ FRONTEND_URL correctly set to https://bantubuzz.com
✅ Frontend deployed with enhanced origin checks
✅ Backend deployed with authentication fixes

### How to Test:
1. Go to https://bantubuzz.com/creator/platforms
2. Click "Connect TikTok" or "Connect YouTube"
3. Authorize on the OAuth screen
4. Check browser console for logs:
   - Should see: `[ConnectPlatforms] Received TikTok code, connecting platform...`
   - Should NOT see: `Failed to execute 'postMessage'`
5. Platform should connect successfully

## Logs Analysis

Using the RequestLog table to track the flow:

### Before Fix:
```
✅ GET platforms.get_tiktok_auth_url - Status: 200
✅ GET platforms.tiktok_oauth_callback - Status: 200, User: None
❌ NO /connect endpoint calls (postMessage blocked)
❌ NO ThunziAI API calls (never got to that point)
```

### After Fix (Expected):
```
✅ GET platforms.get_tiktok_auth_url - Status: 200
✅ GET platforms.tiktok_oauth_callback - Status: 200, User: None
✅ POST platforms.connect_platform - Status: 200, User: 130
✅ ThunziAI.POST /api/platforms - Status: 200
```

## Console Logs to Look For

### Success:
```
[ConnectPlatforms] Received message: MessageEvent {...}
[ConnectPlatforms] Event origin: https://bantubuzz.com
[ConnectPlatforms] Window origin: https://bantubuzz.com
[ConnectPlatforms] Received TikTok code, connecting platform...
```

### Failure (Previous Issue):
```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided
('http://localhost:3000') does not match the recipient window's origin
('https://bantubuzz.com').
```

## Files Modified

1. **Backend**:
   - `/var/www/bantubuzz/backend/.env` - Fixed FRONTEND_URL
   - `backend/app/routes/platforms.py` - Authentication fixes (from previous session)

2. **Frontend**:
   - `frontend/src/pages/ConnectPlatforms.jsx` - Enhanced origin checks and logging

## Related Documentation

- [PLATFORM_AUTH_FIX_SUMMARY.md](PLATFORM_AUTH_FIX_SUMMARY.md) - Previous authentication fix
- [THUNZIAI_API_DOCUMENTATION.md](THUNZIAI_API_DOCUMENTATION.md) - ThunziAI API reference
- Backend platforms endpoints: [platforms.py](backend/app/routes/platforms.py)
- Frontend connect page: [ConnectPlatforms.jsx](frontend/src/pages/ConnectPlatforms.jsx)

## Conclusion

The platform connection issue was caused by a misconfigured `FRONTEND_URL` environment variable pointing to `localhost:3000` instead of the production domain. This prevented OAuth callback popups from sending postMessage to the correct origin, breaking the entire OAuth flow.

With both fixes deployed (backend environment variable + frontend origin checks), TikTok, YouTube, and Instagram connections should now work correctly.
