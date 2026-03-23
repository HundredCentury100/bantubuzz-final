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
- `email`: string (required) — **NOTE: Use 'email' field, not 'username'**
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

### POST /api/invite
Request Body:
- `email`: string (required)
- `companyId`: number (required)
- `role`: string (required)

Response Body:
- `message`: string — either "User invited successfully" or "Could not invite user"

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

### PUT /api/company/:id
Request Body:
- Any company fields to update; `keywords` may be array or CSV/JSON string

---

## Platform Connection Endpoints

### POST /api/platforms
**Purpose**: Add a new social media platform to a company. Also attempts to connect platforms after adding them.

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
- YouTube OAuth Client ID: `1052058162489-6522oei5bjsalcgm0hmgku927lumqa06.apps.googleusercontent.com`
- YouTube Client Secret: `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`

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

**Note**: Used when tokens become invalid due to user revoking permissions or password changes

### DELETE /api/platforms/:id
**Purpose**: Delete a platform and its associated posts

No request body required.

---

## Sync Endpoint

### POST /api/sync
**Purpose**: Trigger sync for a platform to update followers/posts

Request Body:
- `platformId`: number (required)

Example:
```json
{
  "platformId": 900
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

### GET /api/creators/:creatorId/platforms
Response Body: Array of platform objects with fields:
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
- `averageEngagementRate`: number
- `lastSynced`: string
- `syncStatus`: string
- `createdAt`: string

### GET /api/creators/:creatorId/posts
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body: Array of post objects with fields:
- `id`: number (Thunzi's internal ID)
- `platform`: string — one of `facebook` | `instagram` | `youtube` | `twitter` | `website`
- `companyId`: number
- `originalPostId`: string — **The native platform post ID**
- `username`: string
- `content`: string
- `sentiment`: string — one of `positive` | `negative` | `neutral`
- `sentimentScore`: number
- `likes`: number
- `dislikes`: number
- `shares`: number | null
- `saves`: number | null
- `reach`: number | null
- `engagementRate`: number | null
- `comments`: number | null
- `publishedAt`: string

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

### GET /api/posts/:postId
Response Body:
- `id`: number (Thunzi's internal ID)
- `platform`: string
- `companyId`: number
- `originalPostId`: string
- `username`: string
- `content`: string
- `sentiment`: string
- `sentimentScore`: number
- `likes`: number
- `dislikes`: number
- `shares`: number | null
- `saves`: number | null
- `reach`: number | null
- `engagementRate`: number | null
- `comments`: number | null
- `publishedAt`: string

### GET /api/posts/:postId/insights
Response Body:
- `postId`: string
- `post`: object (same fields as GET /api/posts/:postId)
- `commentSentiment`: object
  - `positive`: number
  - `neutral`: number
  - `negative`: number
  - `critical`: number

### GET /api/posts/:postId/comments
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body:
- `postId`: string
- `comments`: array of objects:
  - `id`: number
  - `companyId`: number
  - `platform`: string
  - `username`: string
  - `content`: string
  - `sentiment`: string — one of `positive` | `neutral` | `negative` | `critical`
  - `sentimentScore`: number
  - `likes`: number
  - `views`: number
  - `publishedAt`: string

---

## Creator Post Comments

### GET /api/creators/:postId/comments
Query Parameters:
- `startDate`: string (required)
- `endDate`: string (required)

Response Body: Array of comment objects:
- `id`: number
- `platform`: string
- `companyId`: number
- `originalPostId`: string
- `originalId`: string
- `username`: string
- `content`: string
- `sentiment`: string — one of `positive` | `neutral` | `negative`
- `sentimentScore`: number
- `likes`: number
- `publishedAt`: string
