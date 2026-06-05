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

### `deployment/DEPLOY-COLLABORATION-PAYMENT-CART-FIXES.bat`

Purpose:

- Builds frontend locally.
- Packages contents of `frontend/dist`.
- Uploads frontend tarball.
- Uploads only the backend files changed for the collaboration/payment/cart QA bugfix batch.
- Hardens product notification/email side effects so successful user actions do not return false 500s after database changes.
- Deploys the YES-track progress/live URL counting fix and brand-only cart behavior.
- Runs backend `py_compile`.
- Restarts Gunicorn with `pkill gunicorn`, restarts Apache, and checks local/public health endpoints.

Run:

```powershell
.\deployment\DEPLOY-COLLABORATION-PAYMENT-CART-FIXES.bat
```

Notes learned from this batch:

- Server timestamps from Flask are often UTC ISO strings without a `Z`; frontend relative-time UI should parse those as UTC or messages/notifications can appear two hours old in the South Africa/Zimbabwe timezone.
- Do not let notification/email side effects fail the already-completed collaboration/payment action. Product notification helpers should log notification/email failures instead of bubbling them into the route response.
- For YES-track package collaborations, approved draft content has a `url` but it is not a live post URL. Progress should count only deliverables with `post_url_validated=True`; approval caps progress at 80%, and 100% is reached only after every live URL/Post ID is submitted.
- The package cart is brand-only state. Frontend cart storage should be scoped to the brand user and hidden/cleared for creator sessions to prevent a shared-browser creator account from seeing a brand's cart.

## Campaign Draft And Sourcing Flow

- Campaign creation should save the campaign as `draft` first, then route the brand to `/brand/campaigns/:id/created`.
- The post-creation screen offers `Add Creators` or `Save as Draft`.
- `Add Creators` routes to `/brand/campaigns/:id/source-creators`, which presents the three sourcing choices: invite creators, browse/add packages, or publish for applications.
- Creator opportunity browsing only uses active campaigns, so draft campaigns stay hidden from creators.
- Campaign edit must update the full brief/setup surface, including participation mode, budget fields, targeting, dates, and milestones. Editing the brief should not notify creators automatically.

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

## Collaboration Post URL Analytics

When creators paste post URLs inside collaborations, BantuBuzz should use ThunziAI to turn those URLs into cached `PostMetrics` rows.

Relevant backend files:

- `backend/app/routes/collaborations.py`
- `backend/app/services/post_metrics_service.py`
- `backend/app/services/analytics_service.py`
- `backend/app/services/thunzi_service.py`
- `backend/app/models/post_metrics.py`
- `backend/app/models/package_deliverable.py`
- `backend/app/models/milestone_deliverable.py`

Important behavior:

- Package URL submit route: `PUT /api/collaborations/<collab_id>/deliverables/<deliverable_id>/submit-url`
- Milestone URL submit route: `PUT /api/collaborations/<collab_id>/milestones/<milestone_id>/deliverables/<deliverable_id>/submit-url`
- Both routes parse the social URL into `post_platform` and `post_id`.
- Both routes now attempt a best-effort Thunzi metrics sync immediately after successful URL validation.
- Manual sync still exists:
  - `POST /api/collaborations/<collab_id>/deliverables/<deliverable_id>/sync-metrics`
  - `POST /api/collaborations/<collab_id>/milestones/<milestone_id>/deliverables/<deliverable_id>/sync-metrics`
  - `POST /api/collaborations/<collab_id>/sync-all-metrics`

ThunziAI URL lookup:

- Prefer `POST https://app.thunzi.co/api/posts/find-by-url` with `{ "url": "...", "companyId": "..." }`.
- This matters especially for Facebook because public URLs may not expose the same numeric IDs used internally.
- If direct URL lookup fails, fall back to fetching recent company posts and matching by parsed platform/post ID.

Analytics response shape:

- `GET /api/collaborations/<collab_id>/analytics` must support two frontend consumers:
  - The collaboration detail analytics widget expects top-level totals like `total_reach`, `total_engagement`, `platforms`, `posts`, and `metrics_availability`.
  - The brand analytics page expects richer fields like `raw_data`, `insights`, `sentiment`, `mentions`, `deliverables`, and `creator`.
- Keep the endpoint backward-compatible by returning both shapes in the same `analytics` object.
- Overall brand analytics summary is `GET /api/collaborations/analytics/summary` and should include both package and milestone deliverable metrics.

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

## Reviews And Creator Ratings

Creator ratings must only come from real brand reviews after completed collaborations.

Important rules:

- New creators should have `total_reviews: 0` and no displayed rating (`null`/`--`), never a default 5-star score.
- Brands can review only completed collaborations.
- A collaboration can have only one review.
- Review submission requires the four detailed ratings:
  - communication
  - quality
  - professionalism
  - timeliness
- The displayed overall rating is the average of those four detailed ratings.
- `Review.rating` is still an integer legacy database field, but API responses expose the calculated detailed-rating average.
- Creator profile/listing ratings should use review stats and show “No reviews” when total reviews is zero.

Relevant files:

- `backend/app/models/review.py`
- `backend/app/models/creator_profile.py`
- `backend/app/routes/reviews.py`
- `backend/app/routes/creators.py`
- `frontend/src/pages/ReviewForm.jsx`
- `frontend/src/pages/CreatorProfile.jsx`
- `frontend/src/pages/Creators.jsx`
- `frontend/src/components/ReviewCard.jsx`

## Known Deployment Gotchas

- Do not assume `/var/www/bantubuzz/frontend/dist` exists.
- Production frontend files are directly inside `/var/www/bantubuzz/frontend`.
- Do not use `pkill -f gunicorn` inside an SSH restart command.
- If the backend is down after a deployment or backfill, run `deployment/RESTART-BACKEND-NOW.bat`.
- If a Python production script cannot import `app`, add the backend root to `sys.path`.
- Always verify production with `curl -s -i http://localhost:8002/api/health` from the server after restarting.
- Keep PostgreSQL intact. Never change production database settings to SQLite.

## Auth Security Learned

- Welcome email is sent only after OTP activation, not immediately at raw signup.
  - OTP activation route: `POST /api/auth/verify-otp`
  - Email helper: `send_welcome_email(user)`
- Failed login lockout is account-level for both brands and creators:
  - Fields on `users`: `failed_login_attempts`, `locked_until`
  - After 5 failed password attempts, login is blocked for 15 minutes.
  - Password reset clears failed-login counters and lockout.
- Password reset already uses email links for both brands and creators:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password/<token>`
- Email 2FA is available only for paid-tier users:
  - Field on `users`: `two_factor_enabled`
  - Settings endpoint: `PUT /api/auth/security`
  - Login challenge endpoint: `POST /api/auth/login/verify-2fa`
  - Brands qualify through active paid `subscriptions`.
  - Creators qualify through active verified paid `creator_subscriptions`, with fallback support for paid main `subscriptions`.
  - Frontend profile edit pages show the 2FA toggle for both user types, but backend enforces paid eligibility.
- Migration:
  - `backend/migrations/versions/202606041300_add_user_login_security_fields.py`
- Deployment script:
  - `deployment/DEPLOY-AUTH-SECURITY.bat`

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

- ThunziAI documents audience demographics as platform-generic: `GET /api/platforms/<platformId>/audience`.
- Public creator audience endpoint aggregates all connected ThunziAI platform IDs and returns empty arrays with helpful messages instead of hard failure when no demographic data exists.
- Brand and collaboration audience endpoints also aggregate all connected platform IDs from relevant creators.
- In practice, some platforms may still return no audience data; the service skips empty responses and uses whichever platform demographics ThunziAI returns.
- Thunzi response has known typos/inconsistencies:
  - `platormConnectionId` typo.
  - Docs mention `ageGender`; current service reads `age`.
  - Audience arrays may arrive either as direct arrays (`[{breakdown, value}]`) or nested arrays (`[[{breakdown, value}]]`); parser must accept both.

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

## Product Notifications Learned

Notification product events now live in `backend/app/services/product_notifications.py`.

Rules:

- Product notifications must create both an in-app notification and an email.
- Use the product helper instead of pairing an old generic `notify_collaboration_update`/Celery email task with a new email, otherwise users receive duplicates.
- New booking received uses `notify_creator_new_booking(booking)` after the booking commit.
- Payment confirmed uses `notify_collaboration_active(collaboration)` only after a collaboration exists and payment is confirmed.
- Content review events use:
  - `notify_brand_content_submitted(collaboration, deliverable_title)`
  - `notify_creator_content_approved(collaboration, deliverable_title)`
  - `notify_creator_revision_requested(collaboration, deliverable_title, revision_notes)`
- Live post submissions use `notify_brand_live_urls_submitted(collaboration)` from the actual URL/ID submission routes, not from the delayed auto-complete date task, to avoid duplicate brand notifications.
- Complete events use `notify_collaboration_completed(collaboration, auto_completed=False)` for manual completion and `auto_completed=True` from the Celery auto-complete task.
- Message notifications have two paths:
  - Flask REST `/api/messages` calls `notify_message_received(message)`.
  - Node Socket.IO messaging calls Flask `/api/internal/trigger-email-notification`, which now creates both the notification and email through `notify_message_received_for_user(...)`.

Deployment note:

- Notification deploys must include `backend/app/services/product_notifications.py`, `backend/app/routes/internal.py`, `backend/app/routes/bookings.py`, `backend/app/routes/collaborations.py`, `backend/app/routes/messages.py`, `backend/app/services/payment_service.py`, `backend/app/tasks/collaboration_tasks.py`, and `messaging-service/server.js`.
- Restart both Gunicorn and the PM2 messaging service when `messaging-service/server.js` changes.

## Billing And Delivery Autosync Learned

- The manual delivery metrics Sync button should stay hidden from Collaboration Delivery. Metrics are expected to refresh automatically.
- Platform sync now runs every 4 hours from `backend/app/celery_app.py` through `app.tasks.platform_sync.sync_all_platforms`.
- Submitted collaboration post metrics also autosync every 4 hours through `app.tasks.collaboration_tasks.sync_submitted_post_metrics`.
- When deploying autosync schedule changes, restart Celery worker/beat if configured, not only Gunicorn.
- Package deliverables do not have `live_post_url`; they store submitted live post references in `PackageDeliverable.url`, with compatibility fields exposed as `post_url` in `to_dict()`.
- Billing endpoints live at `backend/app/routes/billing.py`.
  - `GET /api/billing/invoices` returns `past_invoices` and `upcoming_invoices`.
  - `GET /api/billing/invoices/<source_type>/<id>/download` returns printable invoice HTML.
- The frontend billing page is `frontend/src/pages/Billing.jsx`.
  - Creator route: `/billing`
  - Brand route: `/brand/billing`
  - Download/open invoice uses authenticated axios, because direct anchor navigation would not include the JWT header.

## Agency Client Workspaces Learned

- Multi-client agency workspace foundation lives in:
  - `backend/app/models/client_workspace.py`
  - `backend/app/routes/workspaces.py`
  - `backend/app/services/workspace_service.py`
  - `frontend/src/contexts/WorkspaceContext.jsx`
  - `frontend/src/pages/AgencyDashboard.jsx`
  - `frontend/src/pages/WorkspaceManage.jsx`
- Agency and Enterprise share the same workspace engine. The distinction is language and positioning:
  - Agency says clients, client workspaces, all clients, account managers, client reports.
  - Enterprise says brands, brand workspaces, all brands, brand managers, stakeholder reports.
- Brand profiles now store:
  - `account_type`: `brand`, `agency`, or `enterprise`
  - `expected_workspace_count`: signup/onboarding estimate for clients or brands.
- Brand registration accepts `account_type` and `expected_workspace_count`.
- Frontend brand signup is now a two-step flow:
  - Choose Brand, Agency, or Enterprise.
  - Fill a tailored form with Company Name, Agency Name, or Organisation Name and the relevant expected count.
- Database migration:
  - `backend/migrations/versions/202606021000_add_client_workspaces.py`
- Workspace-aware backend columns are nullable for compatibility with old production records:
  - `campaigns.workspace_id`
  - `bookings.workspace_id`
  - `collaborations.workspace_id`
  - `briefs.workspace_id`
  - `campaign_payments.workspace_id`
- The frontend stores selected workspace in `localStorage.selected_workspace_id`.
- `frontend/src/services/api.js` sends selected workspace as `X-Workspace-Id` on authenticated requests.
- Agency route:
  - `/brand/agency`
- Workspace management route:
  - `/brand/workspaces/<id>`
- Workspace selector is in `frontend/src/components/Navbar.jsx` for brand agency accounts.
- Workspace selector currently reloads the page after switching clients so existing pages refetch with the new `X-Workspace-Id` header.
- API routes:
  - `GET /api/workspaces`
  - `POST /api/workspaces`
  - `GET /api/workspaces/master-dashboard`
  - `GET/PUT/DELETE /api/workspaces/<id>`
  - `GET/POST /api/workspaces/<id>/members`
  - `DELETE /api/workspaces/<id>/members/<member_id>`
- Subscription plans already had `max_client_workspaces`; agency plan should set this to 10.
- Agency/Enterprise access must be unlocked through real subscription activation, not manual account-type shortcuts:
  - Pricing can deep-link to subscription management with the Agency plan selected.
  - Smile&Pay subscription payments are completed through `backend/app/services/smilepay_service.py`.
  - A paid Smile&Pay subscription must set `subscriptions.status = active`, `payment_status = paid`, `payment_verified = true`, billing dates, payment metadata, and then align `brand_profiles.account_type`.
  - Brand wallet subscription payments activate the subscription after wallet deduction and then align `brand_profiles.account_type`.
  - Brand bank-transfer subscription proofs upload through `POST /api/subscriptions/upload-proof`.
  - Admin verification for brand subscription bank transfers is handled by `PUT /api/admin/payments/brand-subscription/<id>/verify`.
  - Paid subscription periods should start at payment completion/verification time, not when the pending subscription row is first created.
  - Admin pending payments includes brand subscription proofs so QA/admin can verify them from the normal Admin Payments screen.
- Brand subscription manual payment fields live on `backend/app/models/subscription.py` and migration `backend/migrations/versions/202606031200_add_brand_subscription_payment_fields.py`.
- Extra workspace billing uses real `WorkspaceAddon` payment records:
  - Monthly extra workspace: `$30`
  - Annual extra workspace: `$300` (same 2 months free rule)
  - Workspaces created above the included limit are created inactive.
  - They activate only after real payment through Smile&Pay, brand wallet, or admin-verified bank-transfer proof.
  - Smile&Pay uses `paymentType="workspace_addon"` and is completed from `backend/app/services/smilepay_service.py`.
  - Wallet payment uses `POST /api/workspaces/addons/<addon_id>/pay-with-wallet` and deducts the brand wallet before activation.
  - Bank transfer proof uses `POST /api/workspaces/addons/<addon_id>/upload-proof` and appears in Admin Payments for verification.
  - Admin endpoints:
    - `PUT /api/admin/payments/workspace-addon/<addon_id>/verify`
    - `PUT /api/admin/payments/workspace-addon/<addon_id>/reject`
  - `GET /api/workspaces` includes `pending_addons` so an agency can refresh the dashboard and still finish or track pending extra workspace payment.
- Workspace add-on payment fields live in migration:
  - `backend/migrations/versions/202606031330_add_workspace_addon_payment_fields.py`
- Current implementation is foundation + first scoping pass:
  - Campaign create/list respects workspace.
  - Brief create/list respects workspace, and converted campaigns inherit the brief workspace.
  - Booking create/list respects workspace.
  - Collaboration brand list respects workspace.
  - Billing can filter by workspace.
  - Saved creators respect the selected workspace through `saved_creators.workspace_id`.
  - Master dashboard shows workspace totals and links into workspace management.
  - Master dashboard supports `start_date`/`end_date` filters and exports:
    - CSV: `/api/workspaces/master-dashboard/export?format=csv`
    - Printable HTML report: `/api/workspaces/master-dashboard/export?format=html`
  - Printable workspace reports use the brand profile logo/name and `brand_profiles.report_brand_color`.
  - Workspace management supports editing workspace details and assigning existing BantuBuzz users by email.
  - Workspace management now supports pending email invitations:
    - Existing BantuBuzz users are assigned immediately.
    - Unknown emails create a `WorkspaceInvitation` row and receive `/brand/workspace-invite/<token>`.
    - Invite acceptance requires the user to be signed in with the invited email.
- Analytics scoping now includes:
  - Brand dashboard analytics route `GET /api/analytics/dashboard`.
  - Brand audience route `GET /api/brands/audience`.
  - Collaboration summary `GET /api/collaborations/analytics/summary`.
  - Collaboration analytics/audience endpoints.
  - Campaign performance and audience endpoints.
- Permission hardening now checks workspace permissions on campaign/collaboration reads and mutations where a workspace is attached.
- White-label reports are implemented without custom sender-domain DNS for now:
  - Agency/Enterprise report settings live on `brand_profiles`.
  - Fields include `report_logo`, `report_logo_sizes`, `report_brand_color`, `report_secondary_color`, `report_email_signature`, `report_sender_name`, and `report_reply_to_email`.
  - Migration: `backend/migrations/versions/202606041000_add_white_label_report_settings.py`.
  - Dedicated report logo upload route: `POST /api/brands/profile/report-logo`.
  - PDF generation uses Pillow in `backend/app/services/white_label_report_service.py`; no Playwright/WeasyPrint server dependency is required.
  - Master dashboard supports branded PDF export: `/api/workspaces/master-dashboard/export?format=pdf`.
  - Master dashboard supports emailing the branded PDF: `POST /api/workspaces/master-dashboard/email-report`.
  - Report PDFs remove the BantuBuzz logo and keep the small locked `Powered by BantuBuzz` footer.
  - Report emails currently send through the configured BantuBuzz SMTP sender with the agency sender display name and agency reply-to email. Custom `no-reply@agency-domain.com` requires a future DNS/domain-verification provider integration.
- Workspace team seat limits and audit logging:
  - Brand workspace team invites are plan-limited by total seats, including the owner.
  - Product limits are:
    - Free: 1 seat
    - Starter: 2 seats
    - Pro: 3 seats
    - Premium: 5 seats
    - Agency/Enterprise: 10 seats
  - `subscription_plans.max_team_members` is used, with code fallbacks to these product limits so older plan rows do not block QA.
  - Pending unexpired invitations count toward the seat limit until accepted, cancelled, or expired.
  - Workspace invitations expire after 7 days.
  - New workspace invites only accept Admin, Manager, or Viewer roles.
  - Browser-provided custom permission payloads are ignored; permissions come from the selected server-side role.
  - Removed members lose access immediately because their `workspace_member_permissions` row is deleted.
  - Workspace member/invitation events are recorded in `workspace_audit_logs`.
  - Workspace management UI displays seat usage and the latest team audit log.
  - Migration: `backend/migrations/versions/202606041500_add_workspace_audit_logs.py`.
  - Deploy script: `deployment/DEPLOY-WORKSPACE-TEAM.bat`.
- Product QA bug batch after workspace teams:
  - Deploy script: `deployment/DEPLOY-PRODUCT-QA-FIXES.bat`.
  - Agency/Enterprise signup must normalize `expected_workspace_count` to an integer or `null`.
    - Frontend dropdown values map to: `1-2 => 2`, `3-5 => 5`, `5-10 => 10`, `more-than-10 => 11`.
    - Backend registration also defensively parses these values and returns a generic registration error instead of raw DB stack traces.
  - Brand billing invoices should include a collaboration subtotal plus a BantuBuzz service-fee line calculated from `subscription_plans.service_fee_percentage`.
  - Creator billing should show BantuBuzz-to-creator subscription invoices only, not collaboration earning records.
  - Campaign payment calculations and records should use the brand plan service fee, not a hardcoded 10%.
  - Success story and collaboration Thunzi metrics must tolerate Thunzi responses that are either a dict or a list of dicts.
  - Collaboration analytics should query `CollaborationMilestone` directly because `Collaboration` does not define a `milestones` relationship.
  - Delivery notifications to brands should use product language: `Creator submitted delivery`.
  - Creators get an hourly Celery-checked 12-hour delivery reminder notification/email before `expected_completion_date`; duplicate reminders are prevented by checking existing notifications.
  - Delivery UI copy should say `Submit URL / Post ID / Delivery`.
  - Navbar unread message badge should use the Flask messages API as the source of truth and refresh on read/send/new-message events.
  - Background messaging socket failures should not show `Unable to load messages` toast on every site load.
- Campaign creator application flow:
  - Campaigns are still created as drafts first, then brands choose sourcing from `/brand/campaigns/<id>/source-creators`.
  - `Publish for Applications` now goes through `/brand/campaigns/<id>/publish` so brands can review target locations, categories, follower range, and application deadline before going live.
  - Backend publishing is handled by `POST /api/campaigns/<id>/publish`; it validates that the campaign accepts applications and that the application deadline is not in the past.
  - Creator discovery uses `GET /api/campaigns/browse`; it matches active application campaigns against the logged-in creator's categories, location/city/country, and connected-platform follower count, then sorts by application deadline soonest first.
  - Creator opportunity cards show brand, budget, campaign dates, red application deadline, milestone count, and separate View Details / Apply actions.
  - Creator applications use locked campaign milestones/deliverables. Creators can only add proposed due dates, choose total vs per-milestone pricing, write a cover letter, and optionally set an overall timeline.
- Campaign proposal statuses are:
    - `pending`: creator submitted, brand reviewing.
    - `awaiting_payment`: brand added the proposal to campaign cart.
    - `accepted`: payment confirmed and collaboration started.
    - `rejected`: brand did not select the proposal.
  - Campaign cart application items must point to `campaign_proposals`, not the older brief `proposals` table. Migration: `backend/migrations/versions/202606041700_fix_campaign_cart_proposal_fk.py`.
- Campaign cart/payments production flow:
  - Campaign cart checkout now creates a real `CampaignPayment` before any payment method completes.
  - Shared activation logic lives in `backend/app/services/campaign_cart_payment_service.py`.
  - Wallet campaign cart payments must debit the brand wallet in the same DB transaction that creates collaborations and marks cart items paid; do not use helpers that commit early or partial wallet-loss bugs can return.
  - Smile&Pay campaign cart payments use `paymentType="campaign_cart"` and must pass the `CampaignPayment.id`, not the campaign id.
  - Bank-transfer cart payments upload proof to `POST /api/campaigns/<campaign_id>/cart/payments/<payment_id>/upload-proof`.
  - Admin verification for bank-transfer campaign cart payments is `PUT /api/admin/payments/campaign-cart/<payment_id>/verify`.
  - Campaign cart invoices:
    - Pro-forma PDF: `POST /api/campaigns/<campaign_id>/cart/invoice/pro-forma`.
    - Paid invoice attachment is generated from `send_campaign_payment_notification_email()` once the `CampaignPayment` is completed.
  - `Campaign` completion is inferred through paid `CampaignCartItem.collaboration_id` rows because `Collaborations` does not have a direct `campaign_id` column.
  - Campaign performance analytics should aggregate `PostMetrics` by `collaboration_id` for paid campaign cart collaborations, never by all posts from a creator.
- Agency subscription onboarding and activation flow:
  - Deploy script: `deployment/DEPLOY-AGENCY-PLAN-FLOW.bat`.
  - Commit: `c344abf Implement agency subscription onboarding flow`.
  - `backend/app/services/agency_subscription_service.py` is the central helper for aligning an activated subscription plan with `brand_profiles.account_type`.
  - Existing brand accounts become agency/enterprise accounts only through a real paid Agency subscription activation.
  - New Agency/Enterprise signups land on `/brand/agency` but see a subscription gate until the Agency subscription is paid.
  - Agency payments can complete through brand wallet, Smile&Pay, or admin-verified bank transfer.
  - After Agency payment, `/brand/agency` shows the setup checklist and prominent actions for:
    - Adding the first client/brand workspace.
    - Uploading report/agency branding assets.
    - Managing team access.
    - Viewing billing/reporting links.
  - Normal brand tools run inside a selected workspace using the navbar workspace selector and `X-Workspace-Id`.
  - `backend/normalize_agency_plan.py` is used in deployment to normalize existing production Agency plan rows.
- QA unblock batch for subscription, success story, booking access, creator dashboard, and creator billing:
  - Deploy script: `deployment/DEPLOY-QA-UNBLOCK-FIXES.bat`.
  - Commit: `e3e64ac Fix QA subscription and creator flow blockers`.
  - Shared axios client `frontend/src/services/api.js` removes the forced JSON `Content-Type` header whenever the request body is `FormData`; this is required for proof uploads and other multipart requests to reach Flask as `request.files`.
  - Brand subscription bank-transfer proof upload remains `POST /api/subscriptions/upload-proof`.
  - Creator subscription endpoints in `frontend/src/pages/SubscriptionPayment.jsx` must not include a second `/api` prefix because the shared client already uses `/api` as `baseURL`.
  - Success stories created from collaborations must read `BrandProfile.company_name`; `business_name` does not exist on `BrandProfile`.
  - Booking list/details routes are brand-only:
    - Frontend `/bookings` and `/bookings/:id` use `ProtectedRoute requiredType="brand"`.
    - Backend `GET /api/bookings/<id>` returns 403 for creators and for brands that do not own the booking.
  - Yes-track draft submission in `frontend/src/pages/CollaborationDetails.jsx` supports the QA-required Google Drive flow:
    - Creators see the content items in their package.
    - They can paste one shared Google Drive link when posting the same draft across platforms.
    - They can leave the shared link empty and paste separate Google Drive links per item when content differs per platform.
    - Each draft link should be shared as `Anyone with the link` before submission.
  - Creator dashboard mobile stat cards use compact local card styling rather than the global `.card` padding.
  - Creator dashboard has a CTA between stats/profile status and My Packages linking to `/creator/campaigns` with the message `Looking for your next collaboration? Browse open opportunities`.
  - Creator `/billing` is protected for creators and uses the shared billing endpoint.
  - Creator billing invoices include creator subscriptions; featured/visibility purchases are categorized as `boost` invoices by `backend/app/routes/billing.py`.
- Brand analytics naming and grouping:
  - Brand analytics pages must distinguish `Package Collaborations` from `Campaign Collaborations`; do not label all collaborations as campaigns.
  - `backend/app/services/analytics_service.py` now returns `normal_collaborations`, `campaign_collaborations`, `collaboration_types`, and `platform_breakdown` for `/api/collaborations/analytics/summary`.
  - Single collaboration analytics returns `collaboration.type`, `collaboration.type_label`, `platform_breakdown`, and `by_platform`.
  - Campaign performance analytics in `backend/app/services/campaign_analytics_service.py` must group by actual submitted `PostMetrics.post_platform`, not package/cart labels, so multi-platform packages split into separate channel buckets.
  - Campaign analytics exposes `by_creator`, `by_platform`, and `by_creator_platform` for product reporting: overall campaign, best performing creator, platform performance, and creator-per-platform performance.
- Remaining hardening for future slices:
  - Improve team invitation onboarding so new invitees land directly back on the invite after signup/login.
  - Build tailored onboarding steps after Agency/Enterprise signup.
  - Add account type change/upgrade from account settings without losing existing data.
  - Add custom report sender domains with SPF/DKIM/DMARC verification.
  - Build scheduled reports.
  - Build cross-workspace analytics exports.

1. Read this file first.
2. Then read `AI_GUIDE.md` for the larger historical context.
3. Check `git status --short`.
4. Check recent commits with `git log --oneline -10`.
5. Before deployment, verify which files changed.
6. For frontend changes, build locally and deploy `frontend/dist` contents into `/var/www/bantubuzz/frontend`.
7. For small backend changes, upload changed files directly with `scp`.
8. Restart Gunicorn using `pkill gunicorn`, not `pkill -f gunicorn`.
9. Test health endpoints before declaring deployment complete.
