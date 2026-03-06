# ThunziAI — API Reference

**Base URL**: `https://app.thunzi.co`

This document lists explicit JSON request bodies (fields and examples) for endpoints that accept a body. Fields marked (required) must be supplied; others are optional.

---

## Authentication Endpoints

### POST /api/register
Request Body:
- `email`: string (required)
- `password`: string (required)

Response Body:
- `id`: number
- `email`: string
- `role`: string
- `companyId`: number
- `verifiedAt`: boolean
- `createdAt`: string
- `lastLoginAt`: string
- `setUpStep`: string

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

---

## Company Endpoints

### POST /api/company
Request Body:
- `name`: string (required)
- `size`: string (optional)
- `description`: string (optional)
- `contactEmail`: string (optional)
- `keywords`: string[] (optional)
- `address`: string (optional)
- `city`: string (optional)
- `country`: string (optional)

### GET /api/company
Query Parameters:
- `companyId`: number (required)

---

## Platform Connection Endpoints

### POST /api/platforms
**Purpose**: Add a new social media platform to a company. For Meta platforms (Facebook/Instagram), this also attempts to connect and sync if `accessToken` is provided.

Request Body:
- `companyId`: number (required)
- `platform`: string (required) — one of: `youtube` | `twitter` | `instagram` | `facebook` | `website`
- `accountName`: string (required)
- `accountId`: string (optional) — Facebook Page ID or Instagram Business Account ID
- `accessToken`: string (optional) — **REQUIRED for Meta platforms (Facebook/Instagram)** to enable syncing. Must be User Access Token from Facebook Login.

Response Body:
- `id`: number
- `companyId`: number
- `platform`: string
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
- `syncStatus`: string — one of `success` | `failure` | `in_progress` | `pending`
- `createdAt`: string

**Important Notes**:
- This endpoint automatically attempts to connect platforms after adding them
- For Meta platforms, `accessToken` contains the **User Access Token** (not Page Access Token)
- User Access Token must be acquired from Facebook Login for Business
- Facebook App ID: `1863571634283956`
- Facebook Config ID: `1233734415390648`

Example (YouTube):
```json
Request:
{
  "companyId": 45,
  "platform": "youtube",
  "accountName": "acme-channel"
}

Response:
{
  "id": 44,
  "companyId": 45,
  "platform": "youtube",
  "accountName": "acme-channel",
  "isConnected": true,
  "accountId": "uJodsi2561m4",
  "accountIdSecondary": "UULuLc_i2-Mu28OXjKwnnXWw",
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

Response Body: Array of platform objects (same structure as POST response)

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

### DELETE /api/platforms/:id
**Purpose**: Delete a platform and its associated posts

No request body required.

---

## Sync Endpoint

### POST /api/sync
**Purpose**: Trigger sync for a platform to update followers/posts

Request Body:
- `platformId`: number (required)
- `accountId`: string (optional)
- `companyId`: number (optional)
- `platform`: string (optional)

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

### GET /api/creators/:creatorId/platforms
Response Body: Array of platform objects

### GET /api/creators/:creatorId/posts
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body: Array of post objects with fields:
- `companyId`: integer
- `title`: string
- `description`: string
- `platform`: string
- `likes`: number
- `dislikes`: number
- `accountId`: string
- `publishedAt`: string

---

## Important OAuth Configuration

### Facebook/Instagram:
- **App ID**: `1863571634283956`
- **Config ID**: `1233734415390648` (for Facebook Login for Business)
- **Token Type**: User Access Token (from `response.authResponse.accessToken`)
- **NOT** Page Access Token (from `/me/accounts` API)

### YouTube:
- **Client ID**: See `backend/app/config/thunzi_config.py` (not committed to repo)
- **Client Secret**: See `backend/app/config/thunzi_config.py` (not committed to repo)
- Currently supports both OAuth tokens and API key (legacy)
