# ThunziAI — API Reference

**Base URL**: `https://app.thunzi.co`

This document lists explicit JSON request bodies (fields and examples) for endpoints that accept a body. Fields marked (required) must be supplied; others are optional.

---

## Authentication Endpoints

### POST /api/creator/register
**Purpose**: Register a creator without the onboarding process (bypasses OTP verification)

**Headers**:
- `x-api-key`: WsoFzZyadXRLP8ypT1mIkhB8 (required)

Request Body:
- `email`: string (required)
- `password`: string (required)

Response Body:
- `id`: number
- `email`: string
- `role`: string
- `companyId`: number | null
- `createdAt`: string
- `lastLoginAt`: string | null
- `setupStep`: string
- `verified`: boolean

**IMPORTANT NOTES**:
- This endpoint acts as a shortcut to register a user without the onboarding process
- You will still be expected to create a corresponding company afterwards before connecting their platforms
- After registration, creators can log in directly and connect their social media platforms

Example:
```bash
curl -X POST \
  'https://app.thunzi.co/api/creator/register' \
  --header 'x-api-key: WsoFzZyadXRLP8ypT1mIkhB8' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "email":"creator@bantubuzz.com",
  "password":"Password123!"
}'
```

```json
Response:
{
  "id": 55,
  "email": "creator@bantubuzz.com",
  "role": "admin",
  "companyId": null,
  "createdAt": "2026-04-16T21:45:32.627Z",
  "lastLoginAt": null,
  "setupStep": "complete",
  "verified": false
}
```

### POST /api/register
Request Body:
- `email`: string (required)
- `password`: string (required)

Response Body:
- `id`: number
- `email`: string
- `role`: string
- `companyId`: number
- `verified`: boolean
- `setupStep`: string
- `createdAt`: string
- `lastLoginAt`: string

Example:
```json
Request:
{
  "email": "alice@example.com",
  "password": "s3cureP@ssw0rd"
}

Response:
{
  "id": 27,
  "email": "alice@example.com",
  "role": "admin",
  "companyId": null,
  "verified": false,
  "setupStep": "verify",
  "createdAt": "2026-02-23T18:57:41.885Z",
  "lastLoginAt": "2026-02-23T18:57:41.885Z"
}
```

### POST /api/login
Request Body:
- `username`: string (required) — use email
- `password`: string (required)

Response Body:
- `id`: number
- `email`: string
- `role`: string
- `companyId`: number
- `verified`: boolean
- `setupStep`: string
- `createdAt`: string
- `lastLoginAt`: string

Example:
```json
Request:
{
  "email": "alice@example.com",
  "password": "s3cureP@ssw0rd"
}

Response:
{
  "id": 27,
  "email": "alice@example.com",
  "role": "admin",
  "companyId": null,
  "verified": false,
  "setupStep": "verify",
  "createdAt": "2026-02-23T18:57:41.885Z",
  "lastLoginAt": "2026-02-23T18:57:41.885Z"
}
```

### GET /api/user
Query Parameters:
- `id`: number (required)

Response Body:
- `id`: number
- `email`: string
- `role`: string
- `companyId`: number
- `verified`: boolean
- `setupStep`: string
- `createdAt`: string
- `lastLoginAt`: string
- `company`: object (if exists)
  - `id`: number
  - `name`: string
  - `contactEmail`: string
  - `industry`: string
  - `size`: string
  - `address`: string
  - `city`: string
  - `country`: string
  - `keywords`: string[]
- `subscription`: null or object

Example:
```
Request: /api/user?id=8

Response:
{
  "id": 27,
  "email": "alice@example.com",
  "role": "admin",
  "companyId": null,
  "verified": false,
  "setupStep": "verify",
  "createdAt": "2026-02-23T18:57:41.885Z",
  "lastLoginAt": "2026-02-23T18:57:41.885Z"
}
```

### POST /api/invite
Request Body:
- `email`: string (required)
- `companyId`: number (required)
- `role`: string (optional) — `admin` or `viewer`

**Note**: For creators it is recommended you use the `admin` role.

Example:
```json
Request:
{
  "email": "example@co",
  "role": "admin",
  "companyId": 6
}

Response:
{
  "message": "User invited successfully"
}
```

The invited user is emailed a password they can use to log in to Thunzi using that password and their email. Note the company has to already exist.

### POST /api/verify
Request Body:
- `email`: string (required)
- `code`: string (required)

### POST /api/request-password-reset
Request Body:
- `email`: string (required)

### POST /api/reset-password
Request Body:
- `email`: string (required)
- `code`: string (required)
- `password`: string (required)

### PUT /api/user/:id
Request Body:
- `email`: string (optional)
- `username`: string (optional)
- `role`: string (optional)
- `companyId`: number (optional)
- `verified`: boolean (optional)
- `setupStep`: string (optional)

Response Body:
- `email`: string
- `username`: string
- `role`: string
- `companyId`: number
- `verified`: boolean
- `setupStep`: string

Example:
```json
{
  "email": "alice.new@example.com",
  "role": "viewer",
  "setupStep": "complete"
}
```

---

## Company Endpoints

### POST /api/company
Request Body:
- `name`: string (required)
- `size`: string (optional)
- `description`: string (optional)
- `industry`: string (optional)
- `contactEmail`: string (optional)
- `keywords`: string[] (optional)
- `address`: string (optional)
- `city`: string (optional)
- `country`: string (optional)

Response Body:
- Same as request body fields

Example:
```json
{
  "name": "Acme Corp",
  "description": "We build websites for small and medium companies",
  "industry": "Software",
  "size": "15",
  "contactEmail": "acme@gmail.com",
  "address": "74th Boulevard",
  "city": "Harare",
  "country": "Zimbabwe",
  "keywords": ["acme", "widgets"]
}
```

### GET /api/company
Query Parameters:
- `companyId`: number (required)

Response Body:
- Same fields as POST /api/company

Example:
```
Request: /api/company?companyId=4

Response:
{
  "name": "Acme Corp",
  "description": "We build websites for small and medium companies",
  "industry": "Software",
  "size": "15",
  "contactEmail": "acme@gmail.com",
  "address": "74th Boulevard",
  "city": "Harare",
  "country": "Zimbabwe",
  "keywords": ["acme", "widgets"]
}
```

### PUT /api/company/:id
Request Body:
- Any company fields to update; `keywords` may be array or CSV/JSON string

---

## Platform Connection Endpoints

### POST /api/platforms
**Purpose**: Add a new social media platform to a company. Also attempts to connect platforms after adding them.

Request Body:
- `companyId`: number (required)
- `platform`: string (required) — one of: `youtube` | `twitter` | `instagram` | `facebook` | `tiktok` | `website`
- `accountName`: string (required)
- `accountId`: string (optional)
- `accessToken`: string (optional) — **REQUIRED for OAuth platforms**
- `redirectUri`: string (optional) — **If not provided, ThunziAI's default redirect URI will be used**

Response Body:
- `id`: number
- `companyId`: number
- `platform`: string — one of: `youtube` | `twitter` | `instagram` | `facebook` | `tiktok` | `website`
- `accountName`: string
- `isConnected`: boolean
- `accountId`: string
- `accountIdSecondary`: string
- `profileUrl`: string
- `accessToken`: string
- `refreshToken`: string
- `tokenExpiry`: string
- `followers`: number
- `posts`: number
- `lastSynced`: string
- `syncStatus`: string — one of: `success` | `failure` | `in_progress` | `pending`
- `createdAt`: string

**IMPORTANT NOTES**:

1. **For Instagram, TikTok, and YouTube**: The `accessToken` field should contain the **authorization code** (not the actual access token). ThunziAI will perform the token exchange on the backend.

2. **Custom Redirect URI**: Pass your own `redirectUri` to receive the OAuth callback at your application. This is recommended to avoid routing issues.

3. **Platform-Specific OAuth Credentials**:

#### YouTube OAuth
- **OAuth Client ID**: `1052058162489-6522oei5bjsalcgm0hmgku927lumqa06.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Approved Scope**: `https://www.googleapis.com/auth/yt-analytics.readonly`
- **Additional Scope (more reliable but not verified)**: `https://www.googleapis.com/auth/youtube.readonly`
  - Note: Including the second scope will show users that "Thunzi is unsafe" during login because it's not verified yet
  - For now, the app functions using only the first scope
- **Legacy Support**: Old method of passing just a username is still supported (ThunziAI hasn't passed data access verification)

#### TikTok OAuth
- **Client Key**: `awvmbhpbq9t9e1p9`
- **Client Secret**: `0cnKZ5CgGOhndxJ5AGFPtGI1f2b5iMli`
- **Redirect URI**: `https://bantubuzz.com/api/creator/platforms/tiktok/callback`
- **Approved Scopes**:
  - `user.info.basic`
  - `user.info.profile`
  - `user.info.stats`
  - `video.list`
- **Limitation**: Cannot fetch comments currently, so no sentiment analysis available

#### Instagram Direct OAuth
- **App ID**: `1909200419710706`
- **Client Secret**: `8a83d231abc2f9e9bdadc76467daa3b0`
- **Redirect URI**: `https://bantubuzz.com/api/creator/platforms/instagram/callback`
- **Approved Scopes**:
  - `public_profile`
  - `instagram_basic`
  - `instagram_manage_insights`
  - `pages_read_engagement`
- **Under Review**: `instagram_manage_comments`

#### Facebook OAuth
Facebook supports TWO login methods:

1. **Facebook Business Login** (for creators WITH business portfolio):
   - **Config ID**: `1404830888084532`
   - **App ID**: `1863571634283956`
   - Use Facebook Login for Business flow
   - Requires User Access Token in `accessToken` field

2. **Facebook Personal Login** (for creators WITHOUT business portfolio):
   - **Config ID**: `1501393338364917`
   - **App ID**: `1863571634283956`
   - Use standard Facebook Login flow
   - Requires User Access Token in `accessToken` field

**Legacy Config ID**: `1233734415390648` (maintained for backwards compatibility)

Example (YouTube):
```json
Request:
{
  "companyId": 45,
  "platform": "youtube",
  "accountName": "acme-channel",
  "accessToken": "4/0AeanS0a...",
  "redirectUri": "https://bantubuzz.com/api/creator/platforms/youtube/callback"
}

Response:
{
  "id": 44,
  "companyId": 45,
  "platform": "youtube",
  "accountName": "acme-channel",
  "isConnected": true,
  "accountId": "uJodsi2561m4",
  "accountIdSecondary": null,
  "profileUrl": "https://youtube.com/@acme-channel",
  "accessToken": null,
  "refreshToken": null,
  "tokenExpiry": null,
  "followers": 23,
  "posts": 4,
  "syncStatus": "pending",
  "lastSyncedAt": null
}
```

### GET /api/platforms
Query Parameters:
- `companyId`: number (required)

Response Body:
Array of platform objects with same structure as POST response

Example:
```
Request: /api/platforms?companyId=43

Response:
[
  {
    "id": 47,
    "companyId": 45,
    "platform": "twitter",
    "accountName": "acme-channel",
    "isConnected": true,
    "accountId": "662odsi25asmx",
    "accountIdSecondary": null,
    "profileUrl": "https://x.com/@acme-channel",
    "accessToken": null,
    "refreshToken": null,
    "tokenExpiry": null,
    "followers": 23,
    "posts": 4,
    "syncStatus": "pending",
    "lastSyncedAt": null
  },
  {
    "id": 44,
    "companyId": 45,
    "platform": "youtube",
    "accountName": "acme-channel",
    "isConnected": true,
    "accountId": "uJodsi2561m4",
    "accountIdSecondary": null,
    "profileUrl": "https://youtube.com/@acme-channel",
    "accessToken": null,
    "refreshToken": null,
    "tokenExpiry": null,
    "followers": 23,
    "posts": 4,
    "syncStatus": "pending",
    "lastSyncedAt": null
  }
]
```

### PUT /api/platforms/:id
Request Body: Same fields as POST /api/platforms
Response Body: Same fields as POST /api/platforms

### PUT /api/connect-platform/:id
**Purpose**: Connect a platform to start syncing data

Request Body: No body required
Response Body: Same fields as POST /api/platforms

### PUT /api/platforms/:platformId/reconnect
**Purpose**: Reconnect a platform with a new access token (when token becomes invalid)

Request Body:
- `accountName`: string
- `accessToken`: string

Response Body: Platform connection object

**Note**: Used when tokens become invalid due to user revoking permissions or password changes.

### DELETE /api/platforms/:id
**Purpose**: Delete a platform and its associated posts

No request body required.

### POST /api/sync
**Purpose**: Trigger sync for a platform to update followers/posts

Request Body:
- `platformId`: number (required)

Example:
```json
{
  "platformId": 900,
  "accountId": "UCxxxxx",
  "companyId": 45,
  "platform": "youtube"
}
```

---

## Creator Endpoints

### POST /api/creators
Request Body:
- `name`: string (required)
- `email`: string (required)
- `bantuBuzzId`: string (required)
- `companyId`: number (required)

Response Body:
- `name`: string
- `email`: string
- `bantuBuzzId`: string
- `companyId`: number
- `status`: boolean

Example:
```json
Request:
{
  "name": "Influencer 1",
  "email": "Influencer1@gmail.com",
  "bantuBuzzId": "sa90!1mb",
  "companyId": 54
}

Response:
{
  "name": "Influencer 1",
  "email": "Influencer1@gmail.com",
  "bantuBuzzId": "sa90!1mb",
  "companyId": 54,
  "status": true
}
```

### GET /api/platforms/creators/:bantuBuzzId
Response Body:
- `id`: number
- `companyId`: number
- `bantuBuzzId`: string
- `status`: boolean
- `createdAt`: string
- `updatedAt`: string

### GET /api/platforms/creator
Query Parameters:
- `id`: string (required) — The bantuBuzzId passed when creator was created

Response Body:
Array of platform objects with fields:
- `id`: number
- `companyId`: number
- `platform`: string — one of: `youtube` | `twitter` | `instagram` | `facebook` | `tiktok` | `website`
- `accountName`: string
- `isConnected`: boolean
- `accountId`: string
- `accountIdSecondary`: string
- `profileUrl`: string
- `accessToken`: string
- `refreshToken`: string
- `tokenExpiry`: string
- `followers`: number
- `posts`: number
- `averageEngagementRate`: number
- `averageSentimentScore`: number
- `averageViews`: number
- `averageReach`: number
- `averageComments`: number
- `averageLikes`: number
- `averageShares`: number
- `averageSaves`: number
- `lastSynced`: string
- `syncStatus`: string — one of: `success` | `failure` | `in_progress` | `pending`
- `createdAt`: string

### GET /api/creators/:bantuBuzzId/posts
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body:
Array of post objects with fields:
- `id`: number (Thunzi's internal ID)
- `platform`: string — one of: `facebook` | `instagram` | `youtube` | `twitter` | `tiktok` | `website`
- `companyId`: number
- `originalPostId`: string — The native platform post ID
- `username`: string
- `content`: string
- `sentiment`: string — one of: `positive` | `negative` | `neutral`
- `sentimentScore`: number
- `likes`: number
- `dislikes`: number
- `shares`: number | null
- `saves`: number | null
- `reach`: number | null
- `engagementRate`: number | null
- `comments`: number | null
- `publishedAt`: string

### GET /api/creators/:originalPostId/comments
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body:
Array of comment objects:
- `id`: number (Thunzi's internal ID)
- `platform`: string — one of: `facebook` | `instagram` | `youtube` | `twitter` | `tiktok` | `website`
- `companyId`: number
- `originalPostId`: string
- `originalId`: string
- `username`: string
- `content`: string
- `sentiment`: string — one of: `positive` | `neutral` | `negative`
- `sentimentScore`: number
- `likes`: number
- `publishedAt`: string

### GET /api/creators/:bantuBuzzId/platforms
Response Body:
Array of platform objects with fields:
- `id`: number
- `companyId`: number
- `platform`: string — one of: `facebook` | `youtube` | `twitter` | `instagram` | `tiktok` | `website`
- `isConnected`: boolean
- `accountName`: string
- `profileUrl`: string
- `accessToken`: string
- `refreshToken`: string
- `tokenExpiry`: string
- `accountId`: string
- `accountIdSecondary`: string
- `followers`: number
- `posts`: number
- `averageEngagementRate`: number
- `averageSentimentScore`: number
- `averageViews`: number
- `averageReach`: number
- `averageComments`: number
- `averageLikes`: number
- `averageShares`: number
- `averageSaves`: number
- `syncStatus`: string — one of: `in_progress` | `success` | `failed` | `pending`
- `lastSyncAt`: string

### PUT /api/creators/:bantuBuzzId
Request Body:
- `companyId`: number (optional)
- `name`: string (optional)

---

## Platform Insights Endpoints

### GET /api/platforms/:accountId/insights
Response Body:
- `id`: number
- `followers`: number
- `posts`: number
- `accountName`: string
- `accountId`: string
- `platform`: string
- `companyId`: number
- `averageSentimentScore`: number
- `averageEngagementRate`: number

---

## Post Endpoints

### GET /api/posts/:originalPostId
Response Body:
- `id`: number (Thunzi's internal ID)
- `platform`: string — one of: `facebook` | `instagram` | `youtube` | `twitter` | `tiktok` | `website`
- `companyId`: number
- `originalPostId`: string
- `username`: string
- `content`: string
- `likes`: number
- `dislikes`: number
- `shares`: number | null
- `saves`: number | null
- `reach`: number | null
- `engagementRate`: number | null
- `comments`: number | null
- `publishedAt`: string

### GET /api/posts/:originalPostId/insights
Response Body:
- `postId`: string
- `sentiment`: number
- `post`: object (same fields as GET /api/posts/:originalPostId)
- `commentSentiment`: object
  - `positive`: number
  - `neutral`: number
  - `negative`: number
  - `critical`: number

### GET /api/posts/:originalPostId/comments
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body:
- `postId`: string
- `comments`: array of objects:
  - `id`: number
  - `companyId`: number
  - `platform`: string — one of: `facebook` | `instagram` | `twitter` | `youtube` | `tiktok` | `website`
  - `username`: string
  - `content`: string
  - `sentiment`: string — one of: `positive` | `neutral` | `negative` | `critical`
  - `sentimentScore`: number
  - `likes`: number
  - `views`: number
  - `publishedAt`: string

---

## Audience Insights

### GET /api/platforms/:platformId/audience
Response Body:
- `id`: number
- `platformConnectionId`: number
- `age`: array of objects
  - `breakdown`: string (age range)
  - `value`: number (count in that age range)
- `countries`: array of objects
  - `breakdown`: string (country name)
  - `value`: number (count in that country)
- `cities`: array of objects
  - `breakdown`: string (city name)
  - `value`: number (count in that city)
- `gender`: array of objects
  - `breakdown`: string (gender category)
  - `value`: number (count for that gender)

**Note**: The `breakdown` field represents a category and `value` is the count in that category.

Example: `{breakdown: 'M', value: 78}` means 78 male followers.

Example request: `https://app.thunzi.co/api/platforms/227/audience`

---

## Summary: Key Points for OAuth Integration

### Authorization Code Flow (YouTube, TikTok, Instagram)

1. **Get authorization code** from OAuth provider (YouTube, TikTok, Instagram)
2. **Send authorization code** to ThunziAI via POST `/api/platforms` in the `accessToken` field
3. **Include your redirect URI** in the `redirectUri` field so callbacks come to your app
4. **ThunziAI exchanges** the authorization code for access tokens on the backend
5. **Platform connected** and ready for syncing

### Important Considerations

- Always pass `redirectUri` to ensure callbacks route to your application
- The `accessToken` field for OAuth platforms actually expects the authorization code
- ThunziAI handles token exchange internally
- Each platform has different scopes and limitations (see platform-specific notes above)
