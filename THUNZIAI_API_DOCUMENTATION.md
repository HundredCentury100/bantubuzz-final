# ThunziAI API Reference

Base URL:

```text
https://app.thunzi.co
```

Every request must include:

```http
x-api-key: soFzZyadXRLP8ypT1mIkhB8
```

This document lists request bodies, response bodies, examples, and BantuBuzz integration notes for the current ThunziAI API. Fields marked required must be supplied.

## Authentication

### POST /api/register

Request body:

- `email`: string, required
- `password`: string, required

Response body:

- `id`: number
- `email`: string
- `role`: string
- `companyId`: number or null
- `verified`: boolean
- `setupStep`: string
- `createdAt`: string
- `lastLoginAt`: string or null

Example request:

```json
{
  "email": "alice@example.com",
  "password": "s3cureP@ssw0rd"
}
```

Example response:

```json
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

Request body:

- `username`: string, required. Use email.
- `password`: string, required

Current examples and BantuBuzz code send `email` instead of `username`; verify with ThunziAI before changing production code.

Response body:

- `id`: number
- `email`: string
- `role`: string
- `companyId`: number or null
- `verified`: boolean
- `setupStep`: string
- `createdAt`: string
- `lastLoginAt`: string or null

Example request:

```json
{
  "email": "alice@example.com",
  "password": "s3cureP@ssw0rd"
}
```

Example response:

```json
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

Query parameters:

- `id`: number, required

Response body:

- `id`: number
- `email`: string
- `username`: string
- `role`: string
- `companyId`: number or null
- `verified`: boolean
- `setupStep`: string
- `createdAt`: string
- `lastLoginAt`: string or null
- `company`: object or null
- `subscription`: object or null

Company object fields:

- `id`: number
- `name`: string
- `contactEmail`: string
- `industry`: string
- `size`: string
- `address`: string
- `city`: string
- `country`: string
- `keywords`: string array

Example request:

```text
/api/user?id=8
```

### POST /api/invite

Request body:

- `email`: string, required
- `companyId`: number, required
- `role`: string, optional. One of `admin`, `viewer`.

For creators, ThunziAI recommends the `admin` role.

Example request:

```json
{
  "email": "example.co",
  "role": "admin",
  "companyId": 6
}
```

Example response:

```json
{
  "message": "User invited successfully"
}
```

The invited user receives an emailed password. They log in to Thunzi with that password and their email. The company must already exist.

### POST /api/verify

Request body:

- `email`: string, required
- `code`: string, required

### POST /api/request-password-reset

Request body:

- `email`: string, required

### POST /api/reset-password

Request body:

- `email`: string, required
- `code`: string, required
- `password`: string, required

### PUT /api/user/:id

Request body:

- `email`: string, optional
- `username`: string, optional
- `role`: string, optional
- `companyId`: number, optional
- `verified`: boolean, optional
- `setupStep`: string, optional

Response body:

- `email`: string
- `username`: string
- `role`: string
- `companyId`: number
- `verified`: boolean
- `setupStep`: string

Example request:

```json
{
  "email": "alice.new@example.com",
  "role": "viewer",
  "setupStep": "complete"
}
```

## Companies

### POST /api/company

Request body:

- `name`: string, required
- `size`: string, optional
- `description`: string, optional
- `industry`: string, optional
- `contactEmail`: string, optional
- `keywords`: string array, optional
- `address`: string, optional
- `city`: string, optional
- `country`: string, optional

Response body:

- `name`: string
- `size`: string
- `description`: string
- `industry`: string
- `contactEmail`: string
- `keywords`: string array
- `address`: string
- `city`: string
- `country`: string

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

Query parameters:

- `companyId`: number, required

Example request:

```text
/api/company?companyId=4
```

Response body is the same shape as `POST /api/company`.

### PUT /api/company/:id

Request body:

- Any company fields to update.
- `keywords` may be an array, CSV string, or JSON string.

## Platforms

### POST /api/platforms

Adds a platform and also attempts to connect it.

Request body:

- `companyId`: number, required
- `platform`: string, required. One of `youtube`, `twitter`, `instagram`, `facebook`, `tiktok`, `website`.
- `accountName`: string, required
- `accountId`: string, optional
- `accessToken`: string, optional
- `redirectUri`: string, optional

Notes:

- If `redirectUri` is omitted, ThunziAI's default redirect is used.
- For Instagram, TikTok, and YouTube, `accessToken` is actually expected to be the authorization code. ThunziAI exchanges the code on their backend.
- For Meta platforms, pass the User Access Token so ThunziAI can sync later.
- ThunziAI prevents duplicate platform connections with the same `companyId`, `platform`, and `accountId`.

Response body:

- `id`: number
- `companyId`: number
- `platform`: string
- `accountName`: string
- `isConnected`: boolean
- `accountId`: string
- `accountIdSecondary`: string
- `profileUrl`: string
- `accessToken`: string or null
- `refreshToken`: string or null
- `tokenExpiry`: string or null
- `followers`: number
- `posts`: number
- `lastSynced`: string or null
- `lastSyncedAt`: string or null
- `syncStatus`: string. One of `success`, `failure`, `in_progress`, `pending`.
- `createdAt`: string

Example request:

```json
{
  "companyId": 45,
  "platform": "youtube",
  "accountName": "acme-channel",
  "accessToken": "sa89-21343",
  "redirectUri": "https://app.thunzi/settings/auth/yoututube/callback"
}
```

Example response:

```json
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

Meta OAuth:

- Current app ID: `1863571634283956`
- Legacy config ID: `1233734415390648`
- New Facebook business portfolio config ID: `1404830888084532`
- New Facebook personal account config ID: `1501393338364917`

YouTube OAuth:

- OAuth client ID: `1052058162489-6522oei5bjsalcgm0hmgku927lumqa06.apps.googleusercontent.com`
- Client secret: `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`
- Approved scope: `https://www.googleapis.com/auth/yt-analytics.readonly`
- More reliable additional scope: `https://www.googleapis.com/auth/youtube.readonly`
- Adding the second scope may show an unsafe-app warning until Thunzi passes verification.
- Old username-only YouTube connection is still supported for now.

TikTok OAuth:

- Client key: `awvmbhpbq9t9e1p9`
- Client secret: `0cnKZ5CgGOhndxJ5AGFPtGI1f2b5iMli`
- Redirect URI: `https://bantubuzz.com/api/creator/platforms/tiktok/callback`
- Approved scopes:
  - `user.info.basic`
  - `user.info.profile`
  - `user.info.stats`
  - `video.list`
- Current limitation: comments cannot be fetched, so no sentiment is available.

Instagram OAuth:

- App ID: `1909200419710706`
- Client secret: `8a83d231abc2f9e9bdadc76467daa3b0`
- Redirect URI: `https://bantubuzz.com/api/creator/platforms/instagram/callback`
- Required scopes:
  - `instagram_business_basic`
  - `instagram_business_manage_insights`

### GET /api/platforms

Query parameters:

- `companyId`: number, required

Response body:

Array of platform objects:

- `id`: number
- `companyId`: number
- `platform`: string
- `accountName`: string
- `isConnected`: boolean
- `accountId`: string
- `profileUrl`: string
- `followers`: number
- `posts`: number
- `lastSynced`: string or null
- `lastSyncedAt`: string or null
- `syncStatus`: string
- `createdAt`: string
- `scopes`: string array

Example request:

```text
/api/platforms?companyId=43
```

Example response:

```json
[
  {
    "id": 47,
    "companyId": 45,
    "platform": "twitter",
    "accountName": "acme-channel",
    "isConnected": true,
    "accountId": "662odsi25asmx",
    "profileUrl": "https://x.com/@acme-channel",
    "followers": 23,
    "posts": 4,
    "syncStatus": "pending",
    "lastSyncedAt": null,
    "scopes": []
  },
  {
    "id": 44,
    "companyId": 45,
    "platform": "youtube",
    "accountName": "acme-channel",
    "isConnected": true,
    "accountId": "uJodsi2561m4",
    "profileUrl": "https://youtube.com/@acme-channel",
    "followers": 23,
    "posts": 4,
    "syncStatus": "pending",
    "lastSyncedAt": null,
    "scopes": [
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/youtube.readonly"
    ]
  }
]
```

### PUT /api/platforms/:id

Request body:

- Same fields as `POST /api/platforms`.

Response body:

- Same shape as `POST /api/platforms`.

### PUT /api/connect-platform/:id

Request body:

- No body required.

Response body:

- Same shape as `POST /api/platforms`.

### POST /api/sync

Synchronous or legacy sync endpoint.

Request body:

- `platformId`: number, required
- `accountId`: string, optional
- `companyId`: number, optional
- `platform`: string, optional

Example request:

```json
{
  "platformId": 900,
  "accountId": "UCxxxxx",
  "companyId": 45,
  "platform": "youtube"
}
```

### POST /api/platforms/sync

Asynchronous platform sync endpoint.

Request body:

- `platformId`: number, required

Response body:

- `status`: string
- `pollUrl`: string

Example request:

```json
{
  "platformId": 559
}
```

Example response:

```json
{
  "status": "in_progress",
  "pollUrl": "https://app.thunzi.co/api/platforms/559/status"
}
```

This endpoint starts syncing but does not mean sync is complete. Poll the provided URL until status is `failed` or `success`.

### GET /api/platforms/:platformId/status

Response body:

- `status`: string. One of `in_progress`, `failed`, `success`, `pending`.

Example:

```json
{
  "status": "in_progress"
}
```

### PUT /api/platforms/:platformId/reconnect

Used when a token becomes invalid because a user revoked access, changed password, or the token expired.

Request body:

- `accountName`: string
- `accessToken`: string

Response body:

- Platform connection object.

### DELETE /api/platforms/:id

Deletes the platform and associated posts.

## Creators

### POST /api/creators

Request body:

- `name`: string, required
- `email`: string, required
- `bantuBuzzId`: string, required
- `companyId`: number, required

Response body:

- `name`: string
- `email`: string
- `bantuBuzzId`: string
- `companyId`: number
- `status`: boolean

Example request:

```json
{
  "name": "Influencer 1",
  "email": "Influence1@gmail.com",
  "bantuBuzzId": "sa90!1mb",
  "companyId": 54
}
```

Example response:

```json
{
  "name": "Influencer 1",
  "email": "Influence1@gmail.com",
  "bantuBuzzId": "sa90!1mb",
  "companyId": 54,
  "status": true
}
```

### POST /api/creator/register

Shortcut registration endpoint that bypasses onboarding. The updated notes also refer to `POST /api/creators/register`; the provided curl still uses `/api/creator/register`, which is what BantuBuzz currently uses.

Headers:

- `x-api-key`: `WsoFzZyadXRLP8ypT1mIkhB8`

Request body:

- `email`: string, required
- `password`: string, required

Example:

```bash
curl -X POST \
  'https://app.thunzi.co/api/creator/register' \
  --header 'x-api-key: WsoFzZyadXRLP8ypT1mIkhB8' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "email": "creator@bantubuzz.com",
    "password": "Password123!"
  }'
```

Response:

```json
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

You still need to create a corresponding company before connecting platforms.

### GET /api/platforms/creators/:bantuBuzzId

Response body:

- `id`: number
- `companyId`: number
- `bantuBuzzId`: string
- `status`: boolean
- `createdAt`: string
- `updatedAt`: string

### GET /api/platforms/creator

Query parameters:

- `id`: string, required. This is the `bantuBuzzId` used when the creator was created.

Response body:

Array of platform objects:

- `id`: number
- `companyId`: number
- `platform`: string
- `accountName`: string
- `isConnected`: boolean
- `accountId`: string
- `profileUrl`: string
- `followers`: number
- `posts`: number
- `averageEngagementRate`: number
- `averageSentimentScore`: number
- `averageViews`: number
- `averageReach`: number
- `averageComments`: number
- `averageLikes`: number
- `totalViews`: number
- `averageShares`: number
- `averageSaves`: number
- `lastSynced`: string
- `syncStatus`: string
- `createdAt`: string
- `scopes`: string array

### GET /api/creators/:bantuBuzzId/platforms

Response body:

Array of platform objects:

- `id`: number
- `companyId`: number
- `platform`: string. One of `facebook`, `youtube`, `twitter`, `instagram`, `website`.
- `isConnected`: boolean
- `accountName`: string
- `profileUrl`: string
- `accountId`: string
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
- `syncStatus`: string. One of `in_progress`, `success`, `failed`, `pending`.
- `lastSyncAt`: string
- `scopes`: string array

### PUT /api/creators/:bantuBuzzId

Request body:

- `companyId`: number, optional
- `name`: string, optional

## Posts, Metrics, and Comments

### GET /api/creators/:bantuBuzzId/posts

Query parameters:

- `startDate`: string, required
- `endDate`: string, required

Response body:

Array of post objects:

- `id`: number. This is Thunzi's internal ID.
- `platform`: string. One of `facebook`, `instagram`, `website`, `youtube`, `twitter`.
- `companyId`: integer
- `originalPostId`: string
- `username`: string
- `content`: string
- `sentiment`: string. One of `positive`, `negative`, `neutral`.
- `sentimentScore`: number
- `likes`: number
- `dislikes`: number
- `shares`: number or null
- `saves`: number or null
- `reach`: number or null
- `engagementRate`: number or null
- `comments`: number or null
- `publishedAt`: string

### GET /api/creators/:originalPostId/comments

Query parameters:

- `startDate`: string, required
- `endDate`: string, required

Response body:

Array of comment objects:

- `id`: number. This is Thunzi's internal ID.
- `platform`: string. One of `facebook`, `instagram`, `website`, `youtube`, `twitter`.
- `companyId`: integer
- `originalPostId`: string
- `originalId`: string
- `username`: string
- `content`: string
- `sentiment`: string. One of `positive`, `negative`, `neutral`.
- `sentimentScore`: number
- `likes`: number
- `publishedAt`: string
- `postUrl`: string

### GET /api/platforms/:accountId/insights

Response body:

- `id`: number
- `followers`: number
- `posts`: number
- `accountName`: string
- `accountId`: string
- `platform`: string
- `companyId`: number
- `averageSentimentScore`: number
- `averageEngagementRate`: number

### GET /api/posts/:originalPostId

Response body:

- `id`: number. This is Thunzi's internal ID.
- `platform`: string. One of `facebook`, `instagram`, `website`, `youtube`, `twitter`.
- `companyId`: integer
- `originalPostId`: string
- `username`: string
- `content`: string
- `likes`: number
- `dislikes`: number
- `shares`: number or null
- `saves`: number or null
- `reach`: number or null
- `engagementRate`: number or null
- `comments`: number or null
- `publishedAt`: string
- `postUrl`: string

### GET /api/posts/:originalPostId/insights

Response body:

- `postId`: string
- `sentiment`: number
- `post`: object
- `commentSentiment`: object

`post` fields:

- `id`: number. This is Thunzi's internal ID.
- `platform`: string. One of `facebook`, `instagram`, `website`, `youtube`, `twitter`.
- `companyId`: integer
- `originalPostId`: string
- `username`: string
- `content`: string
- `likes`: number
- `dislikes`: number
- `shares`: number or null
- `saves`: number or null
- `reach`: number or null
- `engagementRate`: number or null
- `comments`: number or null
- `publishedAt`: string

`commentSentiment` fields:

- `positive`: number
- `neutral`: number
- `negative`: number
- `critical`: number

### GET /api/posts/:originalPostId/comments

Query parameters:

- `startDate`: string, required
- `endDate`: string, required

Response body:

- `postId`: string
- `comments`: array

Comment fields:

- `id`: number
- `companyId`: number
- `platform`: string. One of `facebook`, `instagram`, `twitter`, `youtube`, `website`.
- `username`: string
- `content`: string
- `sentiment`: string. One of `positive`, `neutral`, `negative`, `critical`.
- `sentimentScore`: number
- `likes`: number
- `views`: number
- `publishedAt`: string

### POST /api/posts/find-by-url

Request body:

- `url`: string, required
- `companyId`: string or number, required

Response body:

- `id`: number. This is Thunzi's internal ID.
- `platform`: string. One of `facebook`, `instagram`, `website`, `youtube`, `twitter`.
- `companyId`: integer
- `originalPostId`: string
- `username`: string
- `content`: string
- `likes`: number
- `dislikes`: number
- `shares`: number or null
- `saves`: number or null
- `reach`: number or null
- `engagementRate`: number or null
- `comments`: number or null
- `publishedAt`: string
- `postUrl`: string

Notes:

- Getting Facebook posts by URL is difficult because Facebook exposes alphanumeric IDs to users but the API uses numeric IDs.
- Post URLs only started being saved after April 13, 2026, so older posts will not have URLs unless synced again.

## Audience

### GET /api/platforms/:platformId/audience

Response body:

- `id`: number
- `platormConnectionId`: number. Note the typo in ThunziAI's field name.
- `age`: array of `{ "breakdown": string, "value": number }`
- `countries`: array of `{ "breakdown": string, "value": number }`
- `cities`: array of `{ "breakdown": string, "value": number }`
- `gender`: array of `{ "breakdown": string, "value": number }`

Example:

```text
https://app.thunzi.co/api/platforms/227/audience
```

The `breakdown` field is the category and `value` is the number in that category. Example: `{ "breakdown": "M", "value": 78 }`.

## BantuBuzz Integration Notes

- Existing BantuBuzz service currently adds the API key only to the creator-registration call. The updated API says every request must include `x-api-key`; update code before relying on endpoints that now enforce this.
- There are two API key strings in the latest notes: the global request key is documented as `soFzZyadXRLP8ypT1mIkhB8`, while creator registration examples use `WsoFzZyadXRLP8ypT1mIkhB8`. Verify with ThunziAI before changing production credentials.
- Prefer async sync with `POST /api/platforms/sync` plus `GET /api/platforms/:platformId/status` for long-running sync flows.
- Prefer `POST /api/posts/find-by-url` for matching submitted deliverable URLs when available, especially for Facebook URL edge cases.
- Keep handling field drift: `lastSynced` vs `lastSyncedAt`, `lastSyncAt`, `originalPostId`, `originalId`, and typo `platormConnectionId`.
