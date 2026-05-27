# BantuBuzz AI Guide V2

This file is a living handoff guide for future AI/Codex sessions working on the BantuBuzz Platform. Start here before making changes, deploying, or debugging production.

## Current Project Context

- Workspace: `D:\Bantubuzz Platform`
- Main production server: `173.212.245.22`
- SSH user: `root`
- Production app root: `/var/www/bantubuzz`
- Backend root: `/var/www/bantubuzz/backend`
- Frontend production folder: `/var/www/bantubuzz/frontend`
- Backend API: Flask served by Gunicorn on port `8002`
- Web server: Apache2
- Database: PostgreSQL, not SQLite

## Current Important Branch State

- Recent bugfix commit on `development`: `4487d01 Fix collaboration workflow and creator profile polish`
- `main` was fast-forwarded to the previous `development` tip before this bugfix commit.
- After making deployment helper changes, check `git status --short` before committing anything else because deployment helper files may be untracked or modified.

## Deployment Lessons Learned

### Frontend Deploy Location

The live frontend is served from:

```text
/var/www/bantubuzz/frontend
```

Do not deploy to:

```text
/var/www/bantubuzz/frontend/dist
```

Local build still creates:

```text
frontend/dist
```

But deployment should package the contents of `frontend/dist`, not the `dist` folder itself:

```bat
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
```

Then extract on the server into:

```bash
/var/www/bantubuzz/frontend
```

### Frontend Deploy Pattern

Build locally:

```bat
cd /d "D:\Bantubuzz Platform\frontend"
call npm run build
```

Create tarball from the contents of `dist`:

```bat
tar -czf "%FRONTEND_TAR%" -C "D:\Bantubuzz Platform\frontend\dist" .
```

Upload:

```bat
scp "%FRONTEND_TAR%" root@173.212.245.22:/tmp/bantubuzz_frontend_dist.tar.gz
```

Extract:

```bash
cd /var/www/bantubuzz
rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json
tar -xzf /tmp/bantubuzz_frontend_dist.tar.gz -C frontend
systemctl restart apache2
```

### Backend Deploy Pattern

For small backend fixes, deploy changed files directly with `scp`, file by file.

Example:

```bat
scp "D:\Bantubuzz Platform\backend\app\routes\bookings.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/bookings.py
scp "D:\Bantubuzz Platform\backend\app\routes\creators.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/creators.py
scp "D:\Bantubuzz Platform\backend\app\routes\admin\payments.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/admin/payments.py
```

Backend should not be deployed as a tarball for these small fixes unless explicitly needed.

### Backend Restart

Use the Gunicorn restart command from the original guide. Avoid `pkill -f gunicorn` because it can kill the SSH command that is trying to restart Gunicorn.

Correct restart pattern:

```bash
pkill gunicorn || true
sleep 2
cd /var/www/bantubuzz/backend
venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
systemctl restart apache2
```

Verify:

```bash
ps aux | grep '[g]unicorn'
netstat -tlnp | grep 8002 || ss -tlnp | grep 8002
curl -s -i http://localhost:8002/api/health
```

Public health endpoint:

```text
https://bantubuzz.com/api/health
```

Expected backend JSON:

```json
{"status":"healthy","message":"BantuBuzz API is running"}
```

## Deployment Helper Scripts Added

### `deployment/DEPLOY-CURRENT-BUGFIXES.bat`

Purpose:

- Builds frontend locally.
- Packages contents of `frontend/dist`.
- Uploads frontend tarball.
- Backs up selected production files.
- Uploads changed backend files with direct `scp`.
- Extracts frontend into `/var/www/bantubuzz/frontend`.
- Restarts Gunicorn and Apache.
- Optionally runs bank-transfer collaboration backfill.

Run:

```powershell
.\deployment\DEPLOY-CURRENT-BUGFIXES.bat
```

### `deployment/RUN-BANK-TRANSFER-BACKFILL.bat`

Purpose:

- Uploads only `backend/scripts/backfill_verified_bank_transfer_collaborations.py`.
- Runs the backfill script on production.

Run:

```powershell
.\deployment\RUN-BANK-TRANSFER-BACKFILL.bat
```

### `deployment/RESTART-BACKEND-NOW.bat`

Purpose:

- Restarts Gunicorn and Apache.
- Checks Gunicorn process, port `8002`, and health endpoint.

Run:

```powershell
.\deployment\RESTART-BACKEND-NOW.bat
```

### `deployment/DEPLOY-THUNZIAI-V2.bat`

Purpose:

- Builds frontend locally.
- Packages contents of `frontend/dist`.
- Uploads frontend tarball.
- Uploads only the ThunziAI backend files changed for the V2 API update.
- Uploads `202605271015_add_scopes_to_connected_platforms.py`.
- Runs backend `py_compile` and `flask db upgrade`.
- Restarts Gunicorn with `pkill gunicorn`, restarts Apache, and checks local/public health endpoints.

Run:

```powershell
.\deployment\DEPLOY-THUNZIAI-V2.bat
```

## Bank Transfer Collaboration Fix

Problem:

- Admin verified direct bank-transfer bookings, but collaborations did not appear for the creator or brand.
- Root cause: verification paths could mark bookings paid/verified without creating the missing direct-booking collaboration.

Relevant files:

- `backend/app/routes/bookings.py`
- `backend/app/routes/admin/payments.py`
- `backend/scripts/backfill_verified_bank_transfer_collaborations.py`

Important helper:

```python
ensure_direct_booking_collaboration(booking)
```

This creates the collaboration for verified direct bookings when missing.

Backfill script:

```text
backend/scripts/backfill_verified_bank_transfer_collaborations.py
```

The script must add the backend root to `sys.path` before importing `app`, because production runs it as:

```bash
python scripts/backfill_verified_bank_transfer_collaborations.py
```

Required import setup:

```python
import os
import sys

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
```

## Creator Profile / Frontend Fixes Recently Added

Recent changes included:

- Share Profile button on creator profile.
- Share options for WhatsApp, Instagram, LinkedIn, and copy link.
- Brands I've Worked With section pulls brand logos from active/completed collaborations.
- Public creator API includes `brands_worked_with`.

Relevant files:

- `frontend/src/pages/CreatorProfile.jsx`
- `backend/app/routes/creators.py`

## Known Deployment Gotchas

- Do not assume `/var/www/bantubuzz/frontend/dist` exists.
- Production frontend files are directly inside `/var/www/bantubuzz/frontend`.
- Do not use `pkill -f gunicorn` inside an SSH restart command.
- If the backend is down after a deployment or backfill, run `deployment/RESTART-BACKEND-NOW.bat`.
- If a Python production script cannot import `app`, add the backend root to `sys.path`.
- Always verify production with `curl -s -i http://localhost:8002/api/health` from the server after restarting.
- Keep PostgreSQL intact. Never change production database settings to SQLite.

## ThunziAI Integration Notes

Read these before touching social platform connection, creator analytics, post metrics, audience demographics, or brand analytics.

### Important Files

- API docs: `THUNZIAI_API_DOCUMENTATION.md`
- V2 rebuild plan: `THUNZIAI_V2_IMPLEMENTATION_PLAN.md`
- Historical analytics plan: `THUNZIAI_ANALYTICS_IMPLEMENTATION_PLAN.md`
- Brand analytics plan: `BRAND_ANALYTICS_THUNZI_IMPLEMENTATION_PLAN.md`
- OAuth docs: `THUNZI_OAUTH_IMPLEMENTATION.md`, `THUNZI_OAUTH_SETUP_COMPLETE.md`, `THUNZI_INTEGRATION_UPDATES_MARCH2026.md`
- Audience docs: `THUNZI_AUDIENCE_ANALYTICS_IMPLEMENTATION.md`
- Auto creator registration docs: `AUTO_CREATOR_REGISTRATION_COMPLETE.md`
- Main service: `backend/app/services/thunzi_service.py`
- Platform routes: `backend/app/routes/platforms.py`
- Models: `backend/app/models/thunzi_account.py`, `backend/app/models/connected_platform.py`, `backend/app/models/post_metrics.py`
- Metrics service: `backend/app/services/post_metrics_service.py`
- Creator analytics service: `backend/app/services/creator_analytics_service.py`
- URL parsing: `backend/app/utils/post_url_parser.py`

### Current Architecture

- ThunziAI base URL in live service: `https://app.thunzi.co`
- BantuBuzz creates a `ThunziAccount` per BantuBuzz user, not one shared account in the current route implementation.
- `ThunziAccount` maps BantuBuzz user IDs to:
  - `thunzi_company_id`
  - `thunzi_email`
  - `bantubuzz_id`
  - deprecated `thunzi_creator_id`
- For creators, `bantubuzz_id` is usually `creator_<creator_profile_id>` and is the preferred identifier for creator analytics endpoints.
- `ConnectedPlatform` stores platform records connected through ThunziAI, including `thunzi_platform_id`, account IDs, followers/posts, sync status, OAuth tokens, and token expiry.

### Authentication Pattern

- ThunziAI uses session/cookie auth through `requests.Session()`.
- `ThunziAIService.login(email, password)` posts to `/api/login`.
- BantuBuzz convention in several places is `password == thunzi_email`.
- `ensure_user_registered(email)` first tries login, then registers with `POST /api/creator/register` using the API key if needed.
- API-key-created accounts can be unverified; the service may still mark itself authenticated for integration flow purposes.
- Do not put real Thunzi credentials in docs or commits. Production credentials belong in `/var/www/bantubuzz/backend/.env`.

### Core ThunziAI Endpoints Used

- Current API docs now say every request must include `x-api-key`. Existing code only sends the key for creator registration, so check this before changing or debugging Thunzi calls.
- `POST /api/creator/register`: API-key creator registration, bypasses normal OTP onboarding.
- `POST /api/login`: session login.
- `POST /api/company`: create a company/account container for a BantuBuzz user.
- `POST /api/creators`: register creator entity with `name`, `email`, `bantuBuzzId`, `companyId`.
- `GET /api/creators/<bantuBuzzId>/platforms`: check creator/platform analytics.
- `POST /api/platforms`: add/connect a platform.
- `GET /api/platforms?companyId=<id>`: list connected platforms for a company.
- `POST /api/sync`: trigger platform sync.
- `PUT /api/platforms/<id>/reconnect`: reconnect expired/revoked tokens.
- `DELETE /api/platforms/<id>`: delete platform in ThunziAI.
- `GET /api/posts?companyId=<id>&startDate=<yyyy-mm-dd>&endDate=<yyyy-mm-dd>`: reliable post lookup by company.
- `GET /api/posts/<originalPostId>/insights`: post insights by original platform ID.
- `GET /api/posts/<originalPostId>/comments`: comments and sentiment.
- `GET /api/platforms/<platformId>/audience`: audience demographics.
- `POST /api/posts/find-by-url`: find post metrics by URL and company ID. This is useful for deliverable URL matching.
- `POST /api/platforms/sync`: new async sync endpoint. Returns `status` and `pollUrl`.
- `GET /api/platforms/<platformId>/status`: poll async sync status until `success` or `failed`.

### Platform Connection Flow

Creator route: `POST /api/creator/platforms/connect`

1. Validate creator user and `CreatorProfile`.
2. Require platform and account name.
3. Require OAuth token for `facebook`, `instagram`, `youtube`, and `tiktok`.
4. Get or create `ThunziAccount`.
5. Register/login Thunzi user via `ensure_user_registered`.
6. Create Thunzi company if needed.
7. Ensure creator entity with `create_creator` / `ensure_creator_registered`.
8. Add platform through `thunzi_service.add_platform`.
9. Save local `ConnectedPlatform`.
10. Trigger background sync through `app.tasks.platform_sync.sync_platform.delay(...)`.

Brand route: `POST /api/brand/platforms/connect` follows a similar pattern but creates a Thunzi company for the brand and does not create a creator entity.

### Meta Platform Rule

For Facebook and Instagram, do not send `accountId` to ThunziAI in `add_platform`.

Reason: ThunziAI extracts account IDs from the access token. Sending `accountId` for Meta platforms caused `400 Invalid platform connection data`.

The service intentionally sends `accountId` only for non-Meta platforms.

### OAuth Routes

Implemented backend routes include:

- `GET /api/creator/platforms/youtube/auth-url`
- `GET /api/creator/platforms/youtube/callback`
- `POST /api/creator/platforms/youtube/exchange-code`
- `POST /api/creator/platforms/facebook/exchange-code`
- `GET /api/creator/platforms/tiktok/auth-url`
- `GET /api/creator/platforms/tiktok/callback`
- `POST /api/creator/platforms/tiktok/exchange-code`
- `GET /api/creator/platforms/instagram/auth-url`
- `GET /api/creator/platforms/instagram/callback`

For YouTube, TikTok, and Instagram OAuth, ThunziAI documentation says the `accessToken` field may actually receive an authorization code for ThunziAI to exchange. The current BantuBuzz route often exchanges OAuth codes itself first, then sends tokens to platform connect.

### Analytics Flow

There are two analytics paths:

1. Live platform analytics via `CreatorAnalyticsService`.
   - Gets platforms from `GET /api/platforms?companyId=...`.
   - Uses Thunzi pre-calculated fields like `averageEngagementRate`, `averageViews`, `averageReach`, `averageComments`, `averageLikes`, `averageShares`, `averageSaves`.
   - Used as a fallback when no local `PostMetrics` exist.

2. Stored post metrics via `PostMetricsService`.
   - Deliverable URLs are parsed and validated.
   - Sync searches Thunzi posts by company ID because creator-specific post endpoints have returned empty results in practice.
   - Matches by `originalId`, extracting the portion after the first underscore when needed.
   - Fetches insights by original post ID.
   - Stores results in `post_metrics`.

### Deliverable Metrics

Routes in `backend/app/routes/collaborations.py` support:

- Sync one milestone deliverable.
- Sync all collaboration metrics.
- Fetch cached deliverable metrics.
- Sync one package deliverable.
- Fetch collaboration-level aggregated analytics.

The `PostMetrics` model stores:

- Post URL, platform, native post ID, Thunzi platform/post IDs.
- Reach, impressions, likes, comments, shares, saves.
- Video metrics.
- Engagement rate.
- Sentiment and comment sentiment counts.
- Sync status/errors.

### URL Parsing Gotchas

`PostURLParser` supports Instagram, Facebook, YouTube, TikTok, and Twitter/X.

Special behavior:

- TikTok short links are resolved with HTTP redirects to find numeric video IDs.
- Facebook `pfbid...` URLs may be converted to numeric IDs via Graph API if a Facebook access token is available.
- Instagram URL parsing tries to scrape the page for Graph API media IDs because those can differ from shortcode IDs.

These network calls can fail, so code using the parser should handle `None` or unresolved IDs gracefully.

### Audience Demographics

Audience API:

```text
GET /api/platforms/<platformId>/audience
```

Current implementation:

- Mostly useful for Instagram.
- Public creator audience endpoint returns empty arrays with helpful messages instead of hard failure when no demographic data exists.
- Brand and collaboration audience endpoints aggregate Instagram platform IDs from relevant creators.
- Thunzi response has known typos/inconsistencies:
  - `platormConnectionId` typo.
  - Docs mention `ageGender`; current service reads `age`.
  - Nested arrays need flattening.

### Known Thunzi Gotchas

- Some docs are historical and conflict with current implementation. Trust `backend/app/services/thunzi_service.py` and `backend/app/routes/platforms.py` first.
- Old docs mention one shared ThunziAI account; current route code creates per-user Thunzi companies.
- Latest docs mention a global `x-api-key` for all requests, but the provided key differs from the creator registration example by the leading `W`. Verify with ThunziAI before changing production code.
- Existing sync code calls `POST /api/sync`; latest docs add async `POST /api/platforms/sync` with polling.
- Latest docs add `POST /api/posts/find-by-url`; this may reduce custom URL matching, especially for Facebook URL issues.
- Token encryption is noted as TODO; access/refresh tokens are currently database fields.
- Creator entity registration is best-effort in platform connect. If it fails, platform connection may still succeed but analytics may be limited.
- `get_posts_by_company_id` is more reliable than creator-specific post fetching for metrics sync.
- Audience data may require Instagram Business/Creator accounts and enough followers/data.
- Check for field name drift: `lastSynced` vs `lastSyncedAt`, `positive` vs `postive`, `platformConnectionId` vs `platormConnectionId`, `originalId` vs `originalPostId`.

## How Future AI Sessions Should Work

1. Read this file first.
2. Then read `AI_GUIDE.md` for the larger historical context.
3. Check `git status --short`.
4. Check recent commits with `git log --oneline -10`.
5. Before deployment, verify which files changed.
6. For frontend changes, build locally and deploy `frontend/dist` contents into `/var/www/bantubuzz/frontend`.
7. For small backend changes, upload changed files directly with `scp`.
8. Restart Gunicorn using `pkill gunicorn`, not `pkill -f gunicorn`.
9. Test health endpoints before declaring deployment complete.
