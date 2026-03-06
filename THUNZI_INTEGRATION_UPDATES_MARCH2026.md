# ThunziAI Integration Updates - March 2026

## Overview
Updated BantuBuzz's ThunziAI integration to align with the latest ThunziAI API documentation, focusing on Facebook and Instagram platform connections with proper OAuth flow.

**Date**: March 5, 2026
**Focus Platforms**: Facebook & Instagram (Meta)
**Status**: ✅ Deployed to Production

---

## What Changed

### 1. ThunziService Updates (`backend/app/services/thunzi_service.py`)

#### Added Methods

**`reconnect_platform(platform_id, account_name, access_token)`**
- **Purpose**: Reconnect platforms with expired or revoked tokens
- **API Endpoint**: `PUT /api/platforms/:platformId/reconnect`
- **Use Case**: When Facebook/Instagram tokens expire (typically 60 days)
- **Returns**: Updated platform data with new token

**`delete_platform(platform_id)`**
- **Purpose**: Fully delete platform from ThunziAI
- **API Endpoint**: `DELETE /api/platforms/:id`
- **Use Case**: User wants to disconnect a platform
- **Effect**: Removes platform and all associated posts/analytics from ThunziAI
- **Returns**: Boolean (True if successful)

#### Updated Method

**`add_platform()`**
- **Enhancement**: Better documentation explaining that POST /api/platforms now automatically attempts connection
- **Key Note**: Access tokens are REQUIRED for Meta platforms (Facebook/Instagram) to enable data syncing
- **Response**: Now includes complete platform object with connection status

---

### 2. Platform Routes Updates (`backend/app/routes/platforms.py`)

#### disconnect_platform() - Creator Endpoint
**Endpoint**: `DELETE /api/creator/platforms/<platform_id>`

**Before**:
```python
# Only deleted from local database
db.session.delete(platform)
db.session.commit()
```

**After**:
```python
# Delete from ThunziAI first
if platform.thunzi_platform_id:
    deleted = thunzi_service.delete_platform(platform.thunzi_platform_id)
    if not deleted:
        print(f"Warning: Failed to delete platform {platform.thunzi_platform_id} from ThunziAI")
        # Continue with local deletion even if ThunziAI deletion fails

# Then delete from local database
db.session.delete(platform)
db.session.commit()
```

#### disconnect_brand_platform() - Brand Endpoint
**Endpoint**: `DELETE /api/brand/platforms/<platform_id>`

**Same improvement**: Now deletes from both ThunziAI and local database

---

## Key Integration Points

### Facebook & Instagram Connection Flow

1. **Frontend Initiates OAuth**
   - User clicks "Connect with Facebook"
   - Facebook Login SDK opens popup
   - User authorizes permissions
   - Frontend receives User Access Token

2. **Frontend Sends to Backend**
   ```javascript
   {
     "platform": "facebook",
     "accountName": "Page Name",
     "accountId": "123456789",  // Facebook Page ID (REQUIRED)
     "accessToken": "EAABsb..."  // User Access Token (REQUIRED)
   }
   ```

3. **Backend Processes**
   - Creates ThunziAI company (if first platform)
   - Calls `thunzi_service.add_platform()`
   - ThunziAI POST /api/platforms automatically connects
   - Stores platform in BantuBuzz database
   - Triggers initial sync

4. **ThunziAI Response**
   ```json
   {
     "id": 44,
     "companyId": 45,
     "platform": "facebook",
     "accountName": "Page Name",
     "isConnected": true,
     "accountId": "123456789",
     "profileUrl": "https://facebook.com/pagename",
     "accessToken": "...",
     "followers": 23,
     "posts": 4,
     "syncStatus": "pending",
     "lastSyncedAt": "2026-03-05T..."
   }
   ```

---

## Token Management

### Access Token Requirements

| Platform | Token Required | Token Type | Expiry |
|----------|---------------|------------|--------|
| Facebook | ✅ Yes | User Access Token | ~60 days |
| Instagram | ✅ Yes | User Access Token (via Facebook) | ~60 days |
| YouTube | ✅ Yes | OAuth 2.0 Token | Varies |
| Twitter/X | ❌ Not Yet | OAuth 2.0 Token | TBD |
| TikTok | ❌ No | Username-based | N/A |

### Token Expiry Handling

**Current State**:
- Tokens stored in `connected_platforms.access_token`
- Expiry date stored in `connected_platforms.token_expiry`
- No automatic refresh implemented yet

**Future Enhancement** (Recommended):
```python
# Check if token is expired
if platform.token_expiry and platform.token_expiry < datetime.utcnow():
    # Show "Reconnect" button in frontend
    # User clicks → New OAuth flow → reconnect_platform()
```

---

## API Endpoint Summary

### ThunziAI Endpoints Used

| Method | Endpoint | Purpose | BantuBuzz Usage |
|--------|----------|---------|-----------------|
| POST | `/api/login` | Authenticate | On service init |
| POST | `/api/company` | Create company | First platform connection |
| POST | `/api/platforms` | Add & connect platform | Platform connection |
| PUT | `/api/platforms/:id/reconnect` | Reconnect expired token | Token refresh |
| DELETE | `/api/platforms/:id` | Delete platform | Disconnect |
| GET | `/api/platforms?companyId=X` | List platforms | Sync status check |
| POST | `/api/sync` | Trigger data sync | Manual sync button |

### BantuBuzz Endpoints

**Creator**:
- `GET /api/creator/platforms` - List connected platforms
- `POST /api/creator/platforms/connect` - Connect new platform
- `POST /api/creator/platforms/<id>/sync` - Trigger sync
- `DELETE /api/creator/platforms/<id>` - Disconnect platform

**Brand**:
- `GET /api/brand/platforms` - List connected platforms
- `POST /api/brand/platforms/connect` - Connect new platform
- `POST /api/brand/platforms/<id>/sync` - Trigger sync
- `DELETE /api/brand/platforms/<id>` - Disconnect platform

---

## Configuration Requirements

### Environment Variables (Required)

Add to `/var/www/bantubuzz/backend/.env`:

```bash
# ThunziAI API Credentials
THUNZI_EMAIL=your-thunzi-account@example.com
THUNZI_PASSWORD=your-secure-password
THUNZI_COMPANY_ID=your-company-id-number
```

**How to Get Company ID**:
1. Login to https://app.thunzi.co
2. Open browser DevTools (F12) → Network tab
3. Make any navigation
4. Look for API requests with `companyId` parameter
5. Copy the number

### OAuth Configuration

**Facebook** (Already Configured):
- App ID: `1863571634283956`
- Config ID: `1233734415390648`
- Scopes: `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`

**YouTube/Google** (For Future):
- Client ID: See `backend/app/config/thunzi_config.py` (credentials not committed)
- Client Secret: See `backend/app/config/thunzi_config.py` (credentials not committed)

---

## Database Schema

### connected_platforms Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | BantuBuzz user (creator or brand) |
| `thunzi_platform_id` | INTEGER | ThunziAI's platform ID |
| `platform` | STRING | facebook, instagram, youtube, tiktok, twitter |
| `account_name` | STRING | @username or Page Name |
| `account_id` | STRING | Facebook Page ID / Instagram Business Account ID |
| `account_id_secondary` | STRING | Instagram Business Account ID (when platform is facebook) |
| `profile_url` | STRING | Full URL to profile |
| `access_token` | TEXT | OAuth access token |
| `refresh_token` | TEXT | OAuth refresh token |
| `token_expiry` | TIMESTAMP | When token expires |
| `followers` | INTEGER | Follower count from last sync |
| `posts` | INTEGER | Post count from last sync |
| `is_connected` | BOOLEAN | Connection status |
| `sync_status` | STRING | pending, in_progress, success, failure |
| `last_synced_at` | TIMESTAMP | Last successful sync |

---

## Testing Checklist

### Facebook Connection Test
- [ ] User clicks "Connect with Facebook"
- [ ] Facebook OAuth popup appears
- [ ] User selects a Facebook Page
- [ ] Platform appears in "Connected Platforms"
- [ ] Follower count displays correctly
- [ ] Platform visible in ThunziAI dashboard
- [ ] Sync button updates follower count

### Instagram Connection Test
- [ ] User clicks "Connect with Instagram"
- [ ] Facebook OAuth popup appears (Instagram requires Facebook)
- [ ] User selects Instagram Business Account
- [ ] Platform appears with correct data
- [ ] Follower count syncs

### Disconnect Test
- [ ] User clicks disconnect/delete
- [ ] Confirmation dialog appears
- [ ] Platform removed from BantuBuzz
- [ ] Platform removed from ThunziAI dashboard
- [ ] No orphaned data remains

---

## Error Handling

### Common Issues & Solutions

**"Failed to connect platform to ThunziAI"**
- **Cause**: ThunziAI credentials not configured or invalid
- **Solution**: Check THUNZI_EMAIL, THUNZI_PASSWORD, THUNZI_COMPANY_ID in .env

**"Access token required"**
- **Cause**: Trying to connect Facebook/Instagram without OAuth token
- **Solution**: Ensure frontend sends `accessToken` and `accountId` fields

**"Platform already connected"**
- **Cause**: User trying to connect same platform twice
- **Solution**: First disconnect existing connection, then reconnect

**Sync fails with "Platform not connected to ThunziAI"**
- **Cause**: `thunzi_platform_id` is NULL in database
- **Solution**: Reconnect the platform

---

## Next Steps & Recommendations

### Immediate Actions
1. ✅ Configure ThunziAI credentials in production `.env`
2. ✅ Test Facebook connection end-to-end
3. ✅ Test Instagram connection end-to-end
4. ✅ Test disconnect flow

### Short-term Enhancements
1. **Implement Reconnect UI**
   - Detect expired tokens
   - Show "Reconnect" button
   - Trigger OAuth flow again
   - Call `reconnect_platform()` endpoint

2. **Add Token Refresh Logic**
   - Before API calls, check token expiry
   - Auto-refresh if possible
   - Prompt user if manual reconnect needed

3. **Improve Error Messages**
   - Surface ThunziAI API errors to user
   - Show actionable instructions
   - Log detailed errors for debugging

### Medium-term Features
1. **YouTube OAuth Integration**
   - Implement Google OAuth flow
   - Store and refresh tokens
   - Sync YouTube analytics

2. **Twitter/X OAuth Integration**
   - Implement Twitter OAuth 2.0
   - Connect Twitter accounts
   - Sync Twitter metrics

3. **Analytics Dashboard**
   - Fetch posts from ThunziAI
   - Display engagement metrics
   - Show sentiment analysis
   - Compare platform performance

### Long-term Vision
1. **Creator Insights API**
   - GET `/api/creators/:id/posts?startDate=X&endDate=Y`
   - GET `/api/creators/:id/platforms`
   - GET `/api/posts/:id/insights`
   - GET `/api/posts/:id/comments`

2. **Brand Campaign Tracking**
   - Monitor creator posts for brand campaigns
   - Track hashtag performance
   - Measure ROI

3. **Automated Reporting**
   - Weekly/monthly analytics emails
   - PDF report generation
   - Export to CSV/Excel

---

## Migration Notes

### Breaking Changes
None - all changes are backward compatible.

### Deployment Steps
1. ✅ Upload `thunzi_service.py` to server
2. ✅ Upload `platforms.py` to server
3. ✅ Restart gunicorn backend
4. Configure ThunziAI credentials (if not done)
5. Test platform connections

### Rollback Plan
If issues occur:
```bash
cd /var/www/bantubuzz/backend
git checkout HEAD~1 app/services/thunzi_service.py
git checkout HEAD~1 app/routes/platforms.py
# Restart gunicorn
```

---

## Technical Notes

### Session Management
- ThunziService uses `requests.Session()` for persistent connection
- Session maintains cookies for authentication
- Login called automatically via `_ensure_authenticated()`

### Error Handling Philosophy
- ThunziAI deletion failures don't block local deletion
- Warnings logged but operation continues
- User sees success even if ThunziAI API fails
- Admin can manually clean up orphaned ThunziAI platforms if needed

### Security Considerations
- Access tokens stored in database (TODO: Add encryption)
- Tokens transmitted over HTTPS only
- ThunziAI credentials in environment variables (secure)
- Facebook App ID public (safe to expose in frontend)

---

## References

- **ThunziAI API Docs**: Provided by user (see project root)
- **Facebook OAuth**: https://developers.facebook.com/docs/facebook-login
- **Instagram OAuth**: https://developers.facebook.com/docs/instagram-basic-display-api
- **BantuBuzz Frontend**: `frontend/src/hooks/useFacebookOAuth.js`
- **BantuBuzz Backend**: `backend/app/services/thunzi_service.py`

---

## Change Log

### March 5, 2026 - v2.0
- Added `reconnect_platform()` method
- Added `delete_platform()` method
- Updated `disconnect_platform()` to delete from ThunziAI
- Updated `disconnect_brand_platform()` to delete from ThunziAI
- Improved documentation and error handling
- **Status**: ✅ Deployed to Production

### March 4, 2026 - v1.0
- Initial OAuth integration for Facebook
- Database schema with token fields
- Frontend Facebook OAuth hook
- **Status**: ✅ Deployed to Production

---

**Maintained By**: Development Team
**Last Updated**: March 5, 2026
**Next Review**: When implementing YouTube OAuth
