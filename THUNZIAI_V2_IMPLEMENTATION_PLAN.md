# ThunziAI V2 Implementation Plan

Purpose: rebuild and verify BantuBuzz's ThunziAI integration against the updated ThunziAI API so creator social stats, collaboration post tracking, and brand analytics all work reliably.

Updated API reference: `THUNZIAI_API_DOCUMENTATION.md`

## Goals

1. Creators can connect Facebook, Instagram, YouTube, and TikTok accounts.
2. Connected social profiles sync real stats from ThunziAI: followers, posts, engagement rate, reach, views, likes, comments, shares, saves, and sentiment where available.
3. Public creator profiles show useful verified social analytics so brands can assess creators while browsing.
4. Creators can paste delivered post URLs inside collaborations.
5. BantuBuzz can find and track those posts through ThunziAI.
6. Brands can see post/collaboration analytics inside collaboration detail pages.
7. Brand analytics pages aggregate tracked post performance across collaborations and campaigns.
8. Syncing uses the new async ThunziAI sync endpoint where appropriate.

## Current Integration Reality

The current code already has a partial integration:

- `backend/app/services/thunzi_service.py`
- `backend/app/routes/platforms.py`
- `backend/app/services/post_metrics_service.py`
- `backend/app/services/creator_analytics_service.py`
- `backend/app/models/thunzi_account.py`
- `backend/app/models/connected_platform.py`
- `backend/app/models/post_metrics.py`
- `backend/app/utils/post_url_parser.py`
- Collaboration metric endpoints in `backend/app/routes/collaborations.py`
- Creator profile analytics endpoints in `backend/app/routes/creators.py`
- Brand audience endpoint in `backend/app/routes/brands.py`

But the updated API changes what must be verified or redone:

- Every request may now require `x-api-key`.
- Async sync is available via `POST /api/platforms/sync` and `GET /api/platforms/:platformId/status`.
- URL matching is now directly supported by `POST /api/posts/find-by-url`.
- Platform responses include `scopes`.
- Creator platform endpoints include stronger pre-calculated averages.
- The docs show an API-key mismatch: global key is `soFzZyadXRLP8ypT1mIkhB8`; creator-register examples use `WsoFzZyadXRLP8ypT1mIkhB8`.

## Target User Flows

### Creator Connects Platforms

1. Creator opens platform connection page.
2. Creator chooses Facebook, Instagram, YouTube, or TikTok.
3. BantuBuzz runs OAuth where needed.
4. BantuBuzz sends the correct token/code to ThunziAI.
5. ThunziAI creates or connects the platform.
6. BantuBuzz stores the returned `thunzi_platform_id`, account metadata, scopes, followers, posts, sync status, and token expiry.
7. BantuBuzz triggers async sync.
8. BantuBuzz polls sync status and updates local platform metrics.
9. Creator sees connected platform and stats.

### Brand Browses Creators

1. Brand opens creator profile.
2. BantuBuzz loads public creator profile data.
3. BantuBuzz loads creator platform analytics from local metrics first, then ThunziAI live fallback.
4. Profile shows verified-by-Thunzi platform stats where available.
5. Audience data is shown only when available, mostly Instagram and only when Thunzi has demographics.

### Creator Submits Delivered Post URL

1. Creator opens active collaboration deliverable.
2. Creator pastes post URL.
3. BantuBuzz validates supported platform and stores URL.
4. BantuBuzz calls ThunziAI `POST /api/posts/find-by-url` with `url` and the creator's Thunzi company ID.
5. If found, BantuBuzz stores/updates `PostMetrics`.
6. If not found, BantuBuzz prompts sync and retries after Thunzi finishes.

### Brand Views Collaboration Analytics

1. Brand opens collaboration.
2. BantuBuzz shows submitted URLs and current sync status.
3. Brand can manually sync one deliverable or all deliverables.
4. BantuBuzz fetches/caches metrics from ThunziAI.
5. Collaboration page displays reach, engagement, views, likes, comments, shares, saves, engagement rate, and sentiment where available.

### Brand Analytics Dashboard

1. Brand opens analytics page.
2. BantuBuzz aggregates `PostMetrics` across collaborations/campaigns.
3. Dashboard shows total reach/views/engagement, cost per engagement, platform mix, creator performance, campaign performance, and tracked post list.
4. Empty states distinguish "no tracked URLs yet" from "waiting for Thunzi sync" and "creator has not connected platforms".

## Phase 1: API Client Hardening

Files:

- `backend/app/services/thunzi_service.py`
- `backend/app/config/thunzi_config.py`

Tasks:

1. Add a shared request helper in `ThunziAIService`.
2. Ensure every request sends `x-api-key`.
3. Make the API key environment-driven:
   - `THUNZI_API_KEY`
   - keep fallback only if already acceptable for local dev.
4. Resolve API key discrepancy before production change:
   - test global key `soFzZyadXRLP8ypT1mIkhB8`
   - test creator-register key `WsoFzZyadXRLP8ypT1mIkhB8`
   - document which one works for which endpoint.
5. Normalize response field drift:
   - `lastSynced`
   - `lastSyncedAt`
   - `lastSyncAt`
   - `syncStatus` values `failure` vs `failed`
6. Store `scopes` in local data if useful.
7. Add methods:
   - `find_post_by_url(url, company_id)`
   - `start_async_platform_sync(platform_id)`
   - `get_platform_sync_status(platform_id)`
   - `sync_platform_and_poll(platform_id, timeout_seconds=120)`
8. Keep legacy `POST /api/sync` available while moving new code to async sync.

Acceptance criteria:

- One service method handles headers consistently.
- Existing endpoints still work.
- New async sync and find-by-url endpoints are callable from service.

## Phase 2: Data Model Updates

Files:

- `backend/app/models/connected_platform.py`
- `backend/app/models/post_metrics.py`
- new migration under `backend/migrations/versions/`

Tasks:

1. Add `scopes` to `connected_platforms` as JSON if not already present.
2. Add async sync fields if needed:
   - `sync_poll_url`
   - `sync_started_at`
   - `sync_completed_at`
   - `sync_error`
3. Ensure `post_metrics` can store:
   - `post_url`
   - `postUrl` from Thunzi
   - `originalPostId`
   - Thunzi internal `id`
   - platform
   - engagement metrics
   - sentiment counts
4. Check existing migration state before adding fields; do not duplicate columns.

Acceptance criteria:

- Migrations run on PostgreSQL.
- Existing connected platforms and metrics remain readable.
- No SQLite-specific assumptions.

## Phase 3: Platform Connection Rework

Files:

- `backend/app/routes/platforms.py`
- relevant frontend platform connection page/hooks

Tasks:

1. Audit current routes for Facebook, Instagram, YouTube, and TikTok.
2. Ensure each connect flow passes exactly what Thunzi expects:
   - Facebook: User Access Token from Facebook Login.
   - Instagram: authorization code or token per current Thunzi behavior; use redirect `https://bantubuzz.com/api/creator/platforms/instagram/callback`.
   - YouTube: authorization code or OAuth token; approved scope is `yt-analytics.readonly`, optional `youtube.readonly` may cause unsafe warning.
   - TikTok: authorization code, redirect `https://bantubuzz.com/api/creator/platforms/tiktok/callback`, approved scopes from docs.
3. Preserve Meta rule: do not send `accountId` for Facebook/Instagram unless testing proves Thunzi now accepts it.
4. After platform creation, store all returned metadata.
5. Trigger async sync using `POST /api/platforms/sync`.
6. Poll until `success`, `failed`, or timeout.
7. Update local platform stats after sync by calling `GET /api/platforms?companyId=...`.
8. Show connection status and sync status in UI.

Acceptance criteria:

- Creator can connect FB, IG, YouTube, TikTok.
- Brand can connect platforms if still required.
- Duplicate connection errors are handled clearly.
- Failed/expired tokens prompt reconnect.

## Phase 4: Creator Entity Registration

Files:

- `backend/app/services/thunzi_service.py`
- `backend/app/routes/platforms.py`

Tasks:

1. Keep `ensure_creator_registered` idempotent.
2. Confirm correct check endpoint:
   - `GET /api/platforms/creators/:bantuBuzzId`
   - or `GET /api/creators/:bantuBuzzId/platforms`
3. Register creator with:
   - `name`
   - `email`
   - `bantuBuzzId`
   - `companyId`
4. Run after creator account/company setup and after platform connection.
5. Add repair/backfill script for creators with connected platforms but missing `bantubuzz_id` or missing Thunzi creator entity.

Acceptance criteria:

- Every creator with connected platforms has `ThunziAccount.bantubuzz_id`.
- Thunzi creator platform endpoints return data for connected creators.

## Phase 5: Deliverable URL Tracking

Files:

- `backend/app/utils/post_url_parser.py`
- `backend/app/routes/collaborations.py`
- deliverable models:
  - `backend/app/models/milestone_deliverable.py`
  - `backend/app/models/package_deliverable.py`
- frontend collaboration detail pages/components

Tasks:

1. Verify both milestone and package deliverables support URL submission.
2. Use parser only for local validation and platform hints.
3. Prefer Thunzi `POST /api/posts/find-by-url` for actual matching.
4. Use creator's `ThunziAccount.thunzi_company_id` as `companyId`.
5. Store:
   - URL
   - parsed platform
   - native/Thunzi post IDs
   - validation status
   - sync status
6. If Thunzi cannot find post:
   - trigger platform sync
   - poll
   - retry find-by-url
   - return helpful status if still not found.
7. Keep Facebook special-case fallback because older posts may lack `postUrl` and Facebook IDs can be difficult.

Acceptance criteria:

- Creator can paste FB, IG, YouTube, TikTok URLs.
- URL state persists.
- Brand and creator can see whether the URL is tracked, pending sync, or not found.

## Phase 6: Post Metrics Sync

Files:

- `backend/app/services/post_metrics_service.py`
- `backend/app/models/post_metrics.py`

Tasks:

1. Refactor `sync_deliverable_metrics` to try this order:
   - `POST /api/posts/find-by-url`
   - `GET /api/posts/:originalPostId/insights`
   - `GET /api/posts/:originalPostId/comments`
   - fallback: `GET /api/posts?companyId=...`
2. Normalize Thunzi response into `PostMetrics`.
3. Store metric availability per platform.
4. Do not treat unavailable metrics as zero unless Thunzi actually returns zero.
5. Keep sentiment optional:
   - TikTok currently has no comments/sentiment.
   - YouTube and Meta support may vary.
6. Add clear sync errors for:
   - platform not connected
   - post not found
   - sync still in progress
   - Thunzi auth/API error

Acceptance criteria:

- Sync one deliverable works.
- Sync all collaboration deliverables works.
- Cached metrics return in frontend-friendly shape.

## Phase 7: Collaboration Analytics UI

Files:

- frontend collaboration detail pages/components
- `backend/app/routes/collaborations.py`

Tasks:

1. Show submitted post URL per deliverable.
2. Show tracking status.
3. Add "Sync metrics" button per URL.
4. Add "Sync all" for collaboration.
5. Display metrics:
   - reach
   - views
   - likes
   - comments
   - shares
   - saves
   - engagement rate
   - sentiment when available
6. Use platform-specific labels:
   - YouTube: views/subscribers
   - Instagram/Facebook: reach/engagement
   - TikTok: views/engagement, no comments sentiment
7. Add empty states:
   - no URLs submitted
   - waiting for Thunzi sync
   - creator platform not connected

Acceptance criteria:

- Brand can understand delivered post performance inside a collaboration.
- Creator can see the same data where appropriate.

## Phase 8: Brand Analytics Dashboard

Files:

- `backend/app/services/analytics_service.py`
- `backend/app/services/campaign_analytics_service.py`
- relevant brand analytics routes/pages

Tasks:

1. Audit existing brand analytics pages and endpoints.
2. Ensure dashboard reads from `PostMetrics`.
3. Add aggregate metrics:
   - total spend
   - tracked posts
   - total reach
   - total views
   - total engagement
   - average engagement rate
   - cost per engagement
   - cost per reach/view where possible
4. Add breakdowns:
   - by campaign
   - by creator
   - by platform
   - by collaboration
5. Add date filters.
6. Exclude missing metrics from averages instead of forcing zero.
7. Surface which data is verified by ThunziAI.

Acceptance criteria:

- Brand analytics dashboard shows tracked social performance.
- Dashboard handles no-data and partial-data states cleanly.

## Phase 9: Public Creator Profile Analytics

Files:

- `backend/app/routes/creators.py`
- `backend/app/services/creator_analytics_service.py`
- `frontend/src/pages/CreatorProfile.jsx`

Tasks:

1. Keep hybrid approach:
   - local `PostMetrics` first
   - live Thunzi platform analytics fallback
2. Show connected platform cards with:
   - account name
   - followers/subscribers
   - posts
   - engagement rate
   - average views/reach/likes/comments where available
   - last synced
   - scopes if useful for debugging/admin only
3. Show audience demographics only when available.
4. Do not show scary errors to public profile viewers; use calm empty states.
5. Add "verified by ThunziAI" indicator where data comes from Thunzi.

Acceptance criteria:

- Brand browsing creator profiles can see useful stats for FB, IG, YouTube, TikTok when connected.
- No connected platforms still looks professional.

## Phase 10: Testing Matrix

### Backend Tests

Add focused tests for:

- Thunzi request headers include `x-api-key`.
- Platform response normalization.
- Async sync polling.
- `find_post_by_url`.
- Post metrics normalization.
- URL submission and tracking states.
- Creator analytics fallback behavior.

### Manual Production/Staging Tests

Test with one creator per platform:

- Facebook connect
- Instagram connect
- YouTube connect
- TikTok connect
- Manual platform sync
- URL submission for each platform
- Find-by-url
- Collaboration metric sync
- Brand dashboard aggregation
- Public creator profile analytics

### API Smoke Commands

Server-side backend health:

```bash
curl -s -i http://localhost:8002/api/health
```

Thunzi platform list:

```bash
curl -H "x-api-key: <key>" "https://app.thunzi.co/api/platforms?companyId=<companyId>"
```

Async sync:

```bash
curl -X POST \
  -H "x-api-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"platformId":559}' \
  "https://app.thunzi.co/api/platforms/sync"
```

Find by URL:

```bash
curl -X POST \
  -H "x-api-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"url":"<post-url>","companyId":"<company-id>"}' \
  "https://app.thunzi.co/api/posts/find-by-url"
```

## Rollout Plan

1. Update Thunzi service client and add tests.
2. Add database migration if needed.
3. Update platform connection/sync flow.
4. Update deliverable URL tracking and post metric sync.
5. Update collaboration analytics UI.
6. Update brand analytics dashboard.
7. Update public creator profile analytics.
8. Run local build/type checks.
9. Deploy backend files and frontend build.
10. Run production smoke tests.
11. Test with real platform connections and real deliverable URLs.

## Risks

- API key discrepancy could break all calls if the wrong key is used.
- Thunzi may still accept session cookies for some endpoints but require API key for others.
- OAuth behavior differs by platform; YouTube/Instagram/TikTok may expect authorization code, not access token.
- Facebook URL matching remains difficult for older posts without saved `postUrl`.
- Audience data may be unavailable despite successful platform connection.
- Existing stored tokens are not encrypted.
- Long-running syncs need async polling to avoid request timeouts.

## Open Questions

1. Which API key is authoritative for all requests: `soFz...` or `WsoFz...`?
2. Should BantuBuzz send authorization codes directly to Thunzi for YouTube/Instagram/TikTok instead of exchanging them first?
3. Does `POST /api/platforms/sync` replace `POST /api/sync`, or should both remain?
4. Does `POST /api/posts/find-by-url` require a numeric `companyId` or accept a string as documented?
5. Should brands connect their own platforms, or is creator platform connection enough for analytics?
6. Should creator profile analytics be public for all viewers or only authenticated brands?

## Done Definition

This work is complete when:

- Creators can connect Facebook, Instagram, YouTube, and TikTok.
- Connected platform stats sync successfully.
- Creator profiles show verified social stats.
- Creators can submit post URLs in collaborations.
- Submitted URLs can be found/tracked through ThunziAI.
- Collaboration pages show post metrics.
- Brand analytics pages aggregate tracked post performance.
- All new behavior is documented in `AI_GUIDE_V2.md`.
- Production health and Thunzi smoke checks pass after deployment.
