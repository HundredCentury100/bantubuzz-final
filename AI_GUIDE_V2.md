# BantuBuzz AI Guide V2

This file is a living handoff guide for future AI/Codex sessions working on the BantuBuzz Platform. Start here before making changes, deploying, or debugging production.

## Headless CMS Integration

- CMS source and Payload admin run at `https://app.bantubuzz.com`.
- Public editorial URLs are served on `https://bantubuzz.com` through Apache reverse proxying to Next.js on port `3010`.
- Flask remains authoritative for `/api/*`; CMS browser APIs use `/content-api/*`.
- CMS reports use `/research/*` because `/reports/:token` belongs to platform campaign reports.
- Flask and CMS communicate with a shared `CONTENT_BRIDGE_SECRET` using timestamped HMAC-SHA256 signatures. Never commit the real secret.
- Flask health endpoint: `/api/internal/cms/content-health`.
- CMS signed health endpoint: `/api/integration/v1/health`.
- CMS publication webhook target: `/api/internal/cms/content-changed`.
- Verify live CMS/platform communication after CMS deploy with
  `deployment\VERIFY-CMS-BRIDGE-NEW-VPS.bat`. It checks the main platform's
  signed CMS health bridge, `/content-api/posts`, `/blog`, and Payload admin.
- Use `deployment\DEPLOY-CMS-METADATA-BRIDGE-UPDATE.bat` for normal CMS code
  updates after the first installation. It preserves the production database,
  CMS users, media, `/etc/bantubuzz/cms.env`, Apache, and SSL. Do not use the
  first-release `DEPLOY-HEADLESS-CMS-NEW-VPS.bat` for routine updates because
  that script includes baseline migration, seed, and TLS setup steps.
- CMS public page metadata now uses `apps/web/src/lib/site-metadata.ts` in the
  headless CMS repo. Keep canonical URLs on `https://bantubuzz.com`; admin
  remains on `https://app.bantubuzz.com`.
- CMS article audio is generated through the content worker. The editor action
  is registered in Payload's Posts edit controls as `Generate Audio`. The TTS
  implementation is open-source: `TTS_PROVIDER=piper` by default, with
  `TTS_PROVIDER=espeak` as a lightweight fallback. Deploy this feature without
  replacing the full CMS using `deployment\DEPLOY-CMS-AUDIO-FEATURE.bat`. It
  uploads only the ten audio-related files, installs ffmpeg/espeak-ng, rebuilds
  the CMS, and starts the content worker without migrations, seeding, Apache,
  SSL, database, user, or media changes.
- Payload admin metadata must use BantuBuzz descriptions, social metadata,
  and the BantuBuzz favicon assets from `apps/web/public`; do not expose
  Payload's default description, `Payload App` site name, generated OG image,
  or Payload favicons.
- CMS public editorial pages share `EditorialShell` and follow the marketplace
  visual system: self-hosted Poppins loaded with `next/font/google`,
  `#ccdb53` primary,
  `#838a36` dark olive, `#ebf4e5` light background, charcoal footer, restrained
  borders, and card radii of 8px or less.
- Public CMS metadata must explicitly emit the BantuBuzz lightning-mark PNG as
  the standard favicon, shortcut icon, and Apple touch icon. Do not rely on a
  browser fallback or Payload's favicon.
- Combined VPS templates and the migration order are in `deployment/vps/`.
- New combined VPS: `13.140.159.150`, Ubuntu 24.04 LTS.
- Provision infrastructure with `deployment\PROVISION-NEW-VPS.bat`.
- Provisioning must not contact the old production VPS or change DNS. Database,
  uploads, environment/provider secrets, TLS, and DNS cutover are handled in
  separate migration phases.
- June 11, 2026 provisioning verification confirmed Node.js 22, PostgreSQL 16,
  Redis 7, Apache, Certbot, UFW, Fail2ban, 4 GB swap, both application
  databases, application directories, and disabled systemd units. The old VPS
  and `bantubuzz.com` DNS remain unchanged.
- CMS repository: `D:\Bantubuzz-headless-CMS`, branch `main`.
- `app.bantubuzz.com` already resolves to the new VPS; `bantubuzz.com` still
  resolves to the old production VPS until the later platform migration.
- First CMS release command: `deployment\DEPLOY-HEADLESS-CMS-NEW-VPS.bat`.
  It uploads only the CMS, generates and applies the PostgreSQL baseline,
  seeds authority data, builds Next.js, starts the service, configures TLS,
  verifies `/admin`, and downloads the generated migration for source control.
- Payload SQLite migrations stay in `apps/web/src/migrations`; PostgreSQL
  migrations stay in `apps/web/src/migrations-postgres`. Never mix the two.
- The CMS web service binds to `127.0.0.1:3010`. The content worker remains
  disabled until real S3, TTS, SMTP, and IndexNow credentials are configured.
- Payload automatically verifies and logs in the first administrator created
  through its first-user flow. The CMS forces that first user to `super_admin`.
- CMS deployment commands run as `bantubuzz` with `HOME=/home/bantubuzz` and
  `NPM_CONFIG_CACHE=/var/cache/bantubuzz/npm`. Do not preserve root's npm cache
  path when using `runuser`, or npm fails with `/root/.npm` EACCES errors.
- CMS production installation must use `npm ci --include=dev` because Payload
  migration generation requires `drizzle-kit`, and Next.js build tooling also
  runs before the production service starts.
- The default CMS sender identity is `BantuBuzz <hundred@bantubuzz.com>`.
  Outbound email still requires real SMTP host and credentials in `cms.env`.
- The first PostgreSQL migration is generated on the VPS and may exist there
  before it has been downloaded locally. CMS redeploys must preserve remote-only
  files in `apps/web/src/migrations-postgres`, or an otherwise valid rerun sees
  a non-empty database with no migration history and correctly refuses to run.
- CMS seed commands disable the platform content webhook until the Flask app is
  running on the combined VPS. Connection refusals to `127.0.0.1:8002` during
  this migration phase are expected and must not block CMS setup.
- The first production CMS admin page initially returned HTTP 200 and loaded
  all static assets but remained blank because the first-user React boundary
  never resolved. Keep Payload's root layout standard; do not insert a custom
  pre-hydration paint component inside `RootLayout`. Repair script:
  `deployment\FIX-CMS-WHITE-SCREEN.bat`.
- Full platform snapshot migration from `173.212.245.22` to the combined VPS
  uses `deployment\MIGRATE-PLATFORM-TO-NEW-VPS.bat`. It migrates the production
  PostgreSQL platform database, backend uploads, and provider configuration,
  while deploying current local code and preserving the separate Payload CMS
  database/service. It deliberately does not change DNS or stop the old
  platform. Treat it as a rehearsal/live snapshot and run a final maintenance
  window sync before DNS cutover, otherwise the two databases will diverge.
- The old VPS PostgreSQL cluster requires password authentication for local
  connections. Migration capture must use the authenticated `DATABASE_URL`
  from the production backend environment for `psql` and `pg_dump`; do not
  assume that `runuser -u postgres` receives peer-authenticated access.
- New-VPS restoration runs `pg_restore` as the `postgres` OS user for local
  peer authentication. The extracted custom-format dump must be owned/readable
  by `postgres`, and its staging directory must be traversable. After a restore
  failure, use `deployment\RESUME-PLATFORM-MIGRATION-NEW-VPS.bat`; it reuses
  the archives already uploaded to the new VPS and does not recapture the old
  production server.
- Production Alembic revision `05a90a92435c` was used as the parent of
  `202603121500` but its migration file was never committed. Source control now
  contains `05a90a92435c_production_schema_bridge.py`, a no-op bridge from
  `202603041500`, because the restored production schema already contains that
  revision's effects. If restoration has completed and Alembic stops on this
  missing revision, run
  `deployment\CONTINUE-PLATFORM-MIGRATION-AFTER-RESTORE.bat`; it applies
  migrations and starts services without repeating restore or dependency setup.
- The historical `202603091200_trust_safety_phase1` migration remains an
  orphaned Alembic base with `down_revision = None`. Production restoration
  must target the current main application revision explicitly
  (`flask db upgrade 202606101700`) rather than ambiguous `head`. The restored
  production database already contains the Trust & Safety schema.
- Flask's application factory must derive its default configuration from
  `FLASK_ENV`. A hardcoded `create_app(config_name='development')` causes both
  production mode and provider configuration drift on the new VPS.
- Platform production runs on the combined VPS `13.140.159.150`; routine
  backend-only fixes should target `/var/www/bantubuzz/backend` and use
  `/etc/bantubuzz/platform.env` as the source of provider configuration. Parse
  that env file safely with Python/shlex in deployment scripts instead of
  directly sourcing it, because raw values can contain shell-special
  characters.
- OTP email is sent by `backend/app/services/email_service.py` through
  Flask-Mail. Production may contain either `MAIL_*` or older `SMTP_*`
  variables; `backend/app/config.py` maps both. OTP registration and resend
  now send synchronously so SMTP errors are visible and logged instead of being
  swallowed by a background thread. Use
  `deployment\DEPLOY-SMTP-THUNZI-FIXES-NEW-VPS.bat` to deploy OTP/SMTP fixes
  and run a no-send SMTP login check on the new VPS.
- Creator/brand account connection first creates or reuses a per-user ThunziAI
  account in `backend/app/routes/platforms.py`, then creates a Thunzi company,
  then connects the selected platform. A frontend error saying "Failed to
  create ThunziAI account" means `ThunziAIService.create_company()` failed
  before the platform connection step. Check `thunzi_service.last_error` in
  masked logs; the deploy script above prints recent Thunzi lines.
- ThunziAI docs have drifted around API key, login body, and creator-register
  endpoint naming. `backend/app/services/thunzi_service.py` therefore sends
  `x-api-key` on requests, retries documented API key candidates on 401/403,
  uses `username` for `/api/login` with `email` fallback, and falls back from
  `/api/creator/register` to `/api/creators/register` if needed.
- First-time Thunzi account setup must not assume API-key registration creates
  a normal logged-in cookie session. The correct flow is: register/login the
  Thunzi user, create `/api/company` using `x-api-key`, then attach the
  returned company id to the returned Thunzi user id with `PUT /api/user/:id`.
  Store both `thunzi_user_id` and `thunzi_company_id` locally before adding
  platforms. Existing accounts can still use login, which is why they may work
  while new account setup fails.
  Gunicorn's `app:create_app()` and `celery_worker.py` to run DevelopmentConfig
  even when `/etc/bantubuzz/platform.env` says production. The factory now uses
  `create_app(config_name=None)` and reads `FLASK_ENV`. New-VPS hotfix:
  `deployment\FIX-NEW-VPS-PRODUCTION-MODE.bat`.
- During new-VPS staging, the frontend must not be built with absolute
  `https://bantubuzz.com/api` URLs because DNS still points to the old VPS.
  Production/staging frontend env now uses same-origin paths:
  `VITE_API_URL=/api`, `VITE_MESSAGING_URL=/messaging/api`, and Socket.IO falls
  back to `window.location.origin`. Deploy the IP-staging frontend fix with
  `deployment\DEPLOY-NEW-VPS-FRONTEND-STAGING-FIX.bat`.
- After DNS points `bantubuzz.com` and `www.bantubuzz.com` at `13.140.159.150`,
  configure the final Apache domain and Let's Encrypt certificate with
  `deployment\CONFIGURE-NEW-VPS-DOMAIN-SSL.bat`. The script uses a temporary
  HTTP ACME vhost, installs `deployment\vps\bantubuzz-platform.conf`, verifies
  `https://bantubuzz.com/api/health`, verifies the frontend, and confirms
  `https://app.bantubuzz.com/admin` remains healthy.
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
- June 5, 2026 local working tree includes subscription lifecycle diagnostic/hotfix work:
  - `backend/app/models/subscription_plan.py`
  - `deployment/DEPLOY-SUBSCRIPTION-LIFECYCLE.bat`
  - `deployment/DIAGNOSE-SUBSCRIPTION-LIFECYCLE.bat`
  - `deployment/FIX-SUBSCRIPTION-LIFECYCLE-MAPPER.bat`

## Deployment Lessons Learned

## Referral System - June 10, 2026

- Public referral links use `/r/<code>` and record a privacy-safe visitor hash before showing creator and brand signup choices.
- Referral attribution is stored in frontend local storage and passed through creator, brand, agency, enterprise, and Google creator registration.
- Referral database migration: `202606101500_add_referral_system.py`.
- Qualification runs daily through Celery task `app.tasks.referral_tasks.qualify_due_referrals`.
- A referred account qualifies after 30 days only when it remains active, verified, and has logged in after activation.
- Free creator milestone rewards stack:
  - 1 qualified creator: 12% commission for six months.
  - 5 qualified creators: 30-day `referral_verified` promotional badge. This is deliberately separate from document identity verification.
  - 10 qualified creators: permanent 10% commission.
  - Qualified brand referral: seven days added to the creator's Spotlight Boost.
- Referral account credits use `account_credit_transactions`, not wallets. They are non-withdrawable and automatically reduce subscription cash amounts.
- Credit grants are capped at $50 per calendar month. A $150 Agency reward is released as three monthly $50 portions and creates an agency co-marketing fulfillment task.
- Referral UI is available to both account types at `/referrals` and includes WhatsApp, X/Twitter, Facebook, email, copy, QR, and localized copy.
- Deploy with:

```powershell
.\deployment\DEPLOY-REFERRALS.bat
```

## Direct Messaging - June 24, 2026

- Direct messages use two services:
  - Flask API under `/api/messages/*` for persistence, attachments, push subscriptions, and fallback sends.
  - Node/Socket.IO service under `/messaging` for realtime delivery, online status, typing indicators, read receipts, and conversation reads.
- Message history is stored indefinitely in the PostgreSQL `messages` table.
- Rich message support is already in the schema through migration `202606051000_add_rich_messaging_and_push.py`: text, image/file attachments, and content links use `message_type`, `attachment_*`, and `link_*` fields.
- Browser/mobile push notifications use `push_subscriptions`, `frontend/public/message-push-sw.js`, and `backend/app/services/push_service.py`. Production requires valid `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `pywebpush`.
- Trust and Safety uses `user_blocks`, `message_reports`, `message_risk_signals`, and `message_safety_warnings` through `backend/app/routes/messaging_safety.py`.
- Active blocks must be enforced on every send path. Both the Flask fallback endpoint `POST /api/messages/` and the Node Socket.IO `send_message` handler check `user_blocks` before inserting a message. The frontend composer also disables input/actions when `check-block` returns `can_message: false`.
- Frontend messaging screen: `frontend/src/pages/Messages.jsx`.
- Frontend socket state: `frontend/src/contexts/MessagingContext.jsx`.
- Messaging API wrapper: `frontend/src/services/messagingAPI.js`.
- Node service: `messaging-service/server.js`.
- New VPS messaging service is systemd unit `bantubuzz-messaging.service` on port `3002`. Restart it after `messaging-service/server.js` changes.
- Deploy the June 24 direct-message safety hardening with `deployment\DEPLOY-NEW-VPS-DIRECT-MESSAGING-SAFETY.bat`; it deploys only `backend/app/routes/messages.py`, `messaging-service/server.js`, the frontend build, and restarts backend/messaging/Apache.
- Direct message feature status after this pass: realtime chat, persistent history, text/images/files/links, read receipts, typing indicators, block/report UI/API, and push subscription support are implemented. When debugging, verify both the Node service and Flask fallback because users can send through either path depending on socket availability.

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

For SQLAlchemy model or migration changes, also verify mapper configuration before declaring the backend healthy:

```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
python -c "from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')"
```

`/api/health` can return 200 even when real routes fail later during lazy SQLAlchemy mapper configuration.

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

### `deployment/DIAGNOSE-SUBSCRIPTION-LIFECYCLE.bat`

Purpose:

- Read-only production diagnostics for subscription lifecycle deploy issues.
- Captures migration state, mapper/import checks, Gunicorn processes, port `8002`, local/public health, Apache status, Celery service candidates, PM2 status, and recent Gunicorn/Apache/Celery logs.
- Writes local output to `deployment/subscription-lifecycle-diagnostics.txt` for paste-back debugging.
- Does not deploy, migrate, restart, or edit anything.

Run:

```powershell
.\deployment\DIAGNOSE-SUBSCRIPTION-LIFECYCLE.bat
```

### `deployment/FIX-SUBSCRIPTION-LIFECYCLE-MAPPER.bat`

Purpose:

- Hotfixes the June 5 subscription lifecycle SQLAlchemy mapper ambiguity.
- Backs up production `backend/app/models/subscription_plan.py`.
- Uploads the fixed local model.
- Runs `py_compile` and `configure_mappers()` before restart.
- Restarts Gunicorn, Apache, and the actual production Celery service names when present: `celery-worker` and `celery-beat`.

Run:

```powershell
.\deployment\FIX-SUBSCRIPTION-LIFECYCLE-MAPPER.bat
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
   - Engagement rates must be normalized to percent with `backend/app/utils/thunzi_metrics.py` because ThunziAI can return either `0.052` or `5.2` for 5.2%.
   - Sentiment platform analytics are returned to the creator analytics frontend as `0..1` because that UI multiplies by 100; connected-platform storage normalizes sentiment to `0..100` for Creator Score inputs.
   - Thunzi async sync can time out locally while Thunzi later has completed `success` metrics. `app/tasks/platform_sync.py` now refreshes the local `ConnectedPlatform` row from `GET /api/platforms?companyId=...` even after an async timeout when Thunzi has a matching platform payload. The metric-normalization deploy also runs a one-time refresh for stale local rows before recalculating creator scores.

2. Stored post metrics via `PostMetricsService`.
   - Deliverable URLs are parsed and validated.
   - Sync searches Thunzi posts by company ID because creator-specific post endpoints have returned empty results in practice.
   - Matches by `originalId`, extracting the portion after the first underscore when needed.
   - Fetches insights by original post ID.
   - Stores results in `post_metrics`.
   - `PostMetrics.engagement_rate` is percent. Normalize Thunzi post `engagementRate` before storage.
   - `PostMetrics.sentiment_score` is `-100..100`. Prefer Thunzi `sentimentScore` on the post or top-level insights `sentiment`; string sentiment labels are only a fallback.
   - `PostSentimentComment.sentiment_score` is also `-100..100`; normalize comment-level Thunzi `sentimentScore` before saving so campaign reports and advanced sentiment analytics do not mix raw `0..1`, `0..100`, and signed scales.

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
- June 19, 2026 product concern: sentiment and engagement looked swapped or decimal-shifted. Code inspection found the fields were not literally swapped (`averageEngagementRate` and `averageSentimentScore` map separately), but scale drift was real. Deploy `deployment/DEPLOY-NEW-VPS-THUNZI-METRIC-NORMALIZATION.bat` to normalize scale handling and obvious stored fractional values, then run `deployment/DIAGNOSE-NEW-VPS-THUNZI-METRICS.bat` for read-only raw Thunzi-vs-local comparisons.

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
- Rich messaging and message notifications:
  - Message rows now support rich metadata: `read_at`, attachment type/name/mime/size, and content-link metadata.
  - Migration: `backend/migrations/versions/202606051000_add_rich_messaging_and_push.py`.
  - Message attachments upload through `POST /api/messages/attachments` and are stored under `/uploads/messages`.
  - The React chat UI can send text, images, files, and pasted URL content links.
  - Socket.IO message payloads must preserve the same metadata as Flask REST fallback messages.
  - Read receipts use `messages.is_read` plus `messages.read_at`; the messaging service emits `messages_read` to the original sender.
  - Web Push subscriptions are stored in `push_subscriptions`; push is optional unless `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `pywebpush` are configured.
  - Service worker file: `frontend/public/message-push-sw.js`.
  - Deploy script: `deployment/DEPLOY-RICH-MESSAGING.bat`; it restarts Gunicorn, Apache, and the PM2 messaging service.
- Paid subscription lifecycle:
  - Shared `subscriptions` table is the paid tier engine for both brand and creator tier plans.
  - `creator_subscriptions` remains for creator add-ons such as verification and featured boosts.
  - Migration: `backend/migrations/versions/202606051200_add_subscription_lifecycle_fields.py`.
  - Lifecycle helpers live in `backend/app/services/subscription_lifecycle_service.py`.
  - Wallet, SmilePay, Paynow polling, and bank-transfer admin verification should all call `apply_paid_subscription(...)` so pending upgrades and normal activations behave consistently.
  - Yearly price should be 10 months; if a paid plan has no yearly price set, API/billing logic falls back to `monthly * 10`.
  - Downgrades are scheduled for `current_period_end`; upgrades are prorated and apply after payment.
  - Celery Beat tasks in `backend/app/tasks/subscription_tasks.py` send 7-day renewal reminders and process wallet auto-renewals, retries, cancellations, and scheduled downgrades.
  - SmilePay does not currently expose a reusable mandate/token in this codebase, so off-session auto-renewal is only automatic for wallet-paid subscriptions. SmilePay/bank-transfer users get reminder/retry state and must complete a new payment unless tokenized recurring billing is added.
  - Deploy script: `deployment/DEPLOY-SUBSCRIPTION-LIFECYCLE.bat`.
  - June 5 production issue:
    - Adding `subscriptions.pending_plan_id` created a second foreign-key path from `subscriptions` to `subscription_plans`.
    - SQLAlchemy could no longer infer `SubscriptionPlan.subscriptions` and failed lazily on real API requests with:
      `Could not determine join condition between parent/child tables on relationship SubscriptionPlan.subscriptions`.
    - Fix in `backend/app/models/subscription_plan.py`: relationship must specify `foreign_keys='Subscription.plan_id'`.
    - Health endpoint still returned 200 because it does not force mapper configuration. Deployment scripts that touch models should run `configure_mappers()` after migration/compile checks.
    - Production Celery services discovered by diagnostics are `celery-worker.service` and `celery-beat.service`; the older `celery`/`celerybeat` names may not exist.
- Campaign escrow and payouts:
  - Deploy script: `deployment/DEPLOY-CAMPAIGN-ESCROW-PAYOUTS.bat`.
  - Migration: `backend/migrations/versions/202606051430_add_escrow_release_audit_fields.py`.
  - Payment audit fields now include `release_due_at`, `released_at`, and `refunded_at`.
  - Shared escrow release/refund helpers live in `backend/app/services/payment_service.py`:
    - `release_collaboration_escrow(...)`
    - `refund_collaboration_escrow_to_brand(...)`
    - `get_creator_commission_percentage(...)`
  - Manual brand completion now releases escrow through `release_collaboration_escrow(...)` so creator payouts use the creator plan commission percentage, not the brand checkout service fee.
  - Final/live post submission starts a 7-day auto-release timer. The timer is stored on `collaborations.auto_complete_eligible_at` and mirrored to `payments.release_due_at` when a payment exists.
  - `check_auto_complete_eligible` now completes eligible submitted collaborations and releases escrow, unless a dispute is open or under review.
  - Opening a dispute clears the auto-release timer and pauses escrow release.
  - Admin dispute resolution now performs money movement:
    - `release_funds` pays the creator.
    - `partial_release` pays the requested creator percentage and refunds the remainder to the brand wallet.
    - `refund` refunds held escrow to the brand wallet.
  - Creator wallet pending-clearance cleanup is scheduled hourly through Celery Beat via `clear_ready_wallet_transactions`.
- Spotlight Boost purchases:
  - Deploy script: `deployment/DEPLOY-SPOTLIGHT-BOOSTS.bat`.
  - Migration: `backend/migrations/versions/202606051530_add_spotlight_boosts.py`.
  - Boost products are fixed-duration wallet purchases: 3 days for $3, 7 days for $6, and 30 days for $18.
  - `backend/app/models/spotlight_boost.py` stores profile and campaign boosts with `target_type` values `creator_profile` and `campaign`.
  - Purchase API: `POST /api/spotlight-boosts/purchase`; history/options API: `GET /api/spotlight-boosts/my` and `GET /api/spotlight-boosts/options`.
  - Active boosts are surfaced through `Campaign.to_dict()` and `CreatorProfile.to_dict()` as `active_spotlight_boost`.
  - Creator discovery, creator profiles, brand campaign lists, and creator campaign browsing show a Boosted badge while the boost is active.
  - Creator campaign browsing prioritizes active boosted campaigns before normal deadline/date ordering.
  - Billing invoices include Spotlight Boost receipts through `backend/app/routes/billing.py` with source type `boost`.
- Live campaign analytics and sentiment:
  - Deploy script: `deployment/DEPLOY-LIVE-CAMPAIGN-ANALYTICS.bat`.
  - Migration: `backend/migrations/versions/202606091000_add_live_campaign_analytics.py`.
  - `PostMetrics` now stores `clicks` and `conversions`.
  - `PostMetricsSnapshot` stores cumulative four-hour snapshots so campaign trend charts can render true 7-day, 30-day, and 90-day views.
  - `PostSentimentComment` caches ThunziAI comment text, sentiment, score, detected language, engagement, and recurring themes.
  - Supported sentiment languages are English, Shona, Ndebele, Zulu, and Afrikaans. Prefer ThunziAI language labels when present; the sync service uses local keyword hints as fallback.
  - `GET /api/campaigns/<campaign_id>/performance?days=7|30|90` is restricted to Pro+ brand plans.
  - Pro receives positive/neutral/negative sentiment percentages.
  - Premium, Agency, and Enterprise receive sentiment drivers, language breakdown, top 20 comments, and PDF export.
  - Premium PDF endpoint: `GET /api/campaigns/<campaign_id>/performance/sentiment-report`.
  - Four-hour platform and submitted-post sync schedules remain in `backend/app/celery_app.py`.
- Exportable campaign reports:
  - Deploy script: `deployment/DEPLOY-CAMPAIGN-REPORTS.bat`.
  - Migration: `backend/migrations/versions/202606101000_add_campaign_report_exports.py`.
  - Shared report data is built by `backend/app/services/campaign_report_service.py`; PDF, CSV, scheduled email, and public links must use this payload so metrics remain consistent.
  - Pro+ campaign reports:
    - PDF: `GET /api/campaign-reports/campaigns/<campaign_id>/export.pdf`
    - CSV: `GET /api/campaign-reports/campaigns/<campaign_id>/export.csv`
    - Saved weekly/monthly schedules are managed under `/api/campaign-reports/campaigns/<campaign_id>/schedules`.
  - Premium, Agency, and Enterprise additionally receive:
    - custom `start_date` and `end_date` report ranges;
    - white-label PDF branding using the brand report logo, colors, and signature;
    - revocable, expiring view-only links at `/reports/<token>`.
  - Public report API: `GET /api/campaign-reports/public/<token>`. It requires no login, rejects expired/revoked links, and also rejects links after the owner loses Premium+ report access.
  - The locked small `Powered by BantuBuzz` footer remains on white-label PDFs and public reports.
  - Celery task `app.tasks.report_tasks.send_due_campaign_reports` runs hourly at minute 40 through `celery-beat`.
  - Premium brand accounts can use the same report branding fields as Agency/Enterprise accounts; report-logo authorization must check the paid plan entitlement rather than `brand_profiles.account_type`.
- Internal creator scoring and rankings:
  - New VPS v1.1 deploy script: `deployment/DEPLOY-NEW-VPS-CREATOR-SCORE-LEADERBOARD-V11.bat`.
  - New VPS v1.2 deploy script: `deployment/DEPLOY-NEW-VPS-CREATOR-SCORE-LEADERBOARD-V12.bat`.
  - Initial migration: `backend/migrations/versions/202606101700_add_creator_scoring.py`.
  - v1.1 migration: `backend/migrations/versions/202606161000_update_creator_score_v11.py`.
  - v1.2 migration: `backend/migrations/versions/202606181200_add_creator_leaderboard_preferences.py`.
  - v1.2 hotfix migration: `backend/migrations/versions/202606181300_ensure_creator_featured_fields.py`. It is idempotent and repairs production databases missing `creator_profiles.is_featured`, `featured_type`, `featured_order`, or `featured_since`, which breaks admin featured creator actions.
  - The score is stored in `creator_scores`; history is stored in `creator_score_history`.
  - Brands and visitors must never receive raw component scores. Numeric Creator Score is hidden by default and is only serialized publicly when the creator explicitly enables `leaderboard_show_score`.
  - Creators can see their own private score and improvement tips on the creator dashboard through the authenticated `/api/creators/profile` response.
  - Formula v1.1 uses normalized weighted-average scoring: engagement 14, reach/views 10, followers 4, sentiment 7, order completion 8, response rate 8, on-time delivery 9, reviews 20, profile trust 15, activity 5.
  - Metrics with no applicable data are excluded and the available weights are normalized back to 100. This is required for no-review/no-order protection.
  - Reviews use the last 20 verified brand reviews from completed collaborations. Review Score = average rating score 70%, volume score 20%, positive review ratio 10%. Zero reviews are excluded rather than treated as zero.
  - Marketplace reliability uses terminal collaborations for completion, brand-to-creator messages with creator replies within 12 hours for response rate, and completed collaborations with due dates for delivery scoring.
  - Delivery scoring follows product tiers: 12+ hours before deadline = 100, before deadline = 90, exact deadline = 80, late but accepted = 50, missed = 0.
  - Sentiment penalties are product-scaled: negative comments above 10% subtract 2 points per percentage point; critical comments above 5% subtract 4 points per percentage point.
  - Profile Trust is weighted by complete bio of at least 160 characters, profile photo, connected platform, active package, verification, and success story/portfolio with metrics.
  - Product-defined reach thresholds are authoritative: 0.05=10, 0.10=25, 0.30=50, 0.50=70, 1.00+=100. Reach uses submitted-post reach first and video views second.
  - Login events are stored in `user_sessions`; activity uses sessions from the last 30 days plus 30/60-day inactivity penalties.
  - Connected ThunziAI platform averages are persisted on `connected_platforms` so engagement and sentiment inputs survive API requests.
  - Scores recalculate after logins, platform sync/connect/disconnect, post-metric sync, profile edits, profile photo changes, package changes, success-story changes, review creation, message send, creator accept/decline, cancellation, and collaboration completion. A changed platform-wide maximum follower count triggers a full recalculation.
  - Celery Beat runs a full score/ranking rebuild nightly at 02:30. Deployment also runs `backend/recalculate_creator_scores.py` once after migration.
  - Public APIs expose rank position only:
    - `GET /api/creators/rankings?type=overall&limit=50`
    - `GET /api/creators/rankings?type=category&context=<category>&limit=50`
    - `GET /api/creators/rankings?type=platform&context=<platform>&limit=100`
    - `GET /api/creators/<creator_id>/rank`
  - Public badges are generated from Creator Score v1.1 inputs: Creator To Watch, Rising Creator, Audience Builder, Engagement Leader, Brand Magnet, Campaign Pro, Trusted Creator, Top Creator, Elite Creator, City Top 10, and Category Leader. `Buzz Creator` was retired; any old `buzz_creator` value should be treated as a legacy alias for `creator_to_watch`.
  - Badge artwork lives in `frontend/public/assets/badges`; deploy badge UI/backend changes with `deployment\DEPLOY-NEW-VPS-CREATOR-BADGES.bat`.
  - Creators manage leaderboard display through `PUT /api/creators/profile/leaderboard-preferences`: `show_score` controls public numeric score visibility, and `selected_badges` lets creators choose up to 3 badges. Default badge fallback is `creator_to_watch`.
  - Leaderboard rebuild sends a one-time in-app/email notification when a creator first appears in the Top 100.
  - Admin-only score diagnostics: `GET /api/admin/creator-scores`.
  - June 16, 2026 new-VPS deployment succeeded via report `deployment/vps/reports/new-vps-creator-score-leaderboard-v11-13.140.159.150-20260616-221649.txt`: migration `202606101700 -> 202606161000` ran, backend/Celery worker/Celery beat were active, 90 creator scores/rankings recalculated, and local/public health returned healthy.
  - Deployment gotchas from this release:
    - Do not `source /etc/bantubuzz/platform.env` directly in shell helpers. It is valid as a systemd `EnvironmentFile`, but can contain values that break Bash parsing. Use a parser that exports shell-escaped `KEY=value` pairs.
    - Do not run plain `flask db upgrade` from this repo while the historical orphan trust-safety migration exists. Target the intended head/revision for focused deploys, e.g. `venv/bin/flask db upgrade 202606181300`.
  - Featured fallback and default creator discovery use the private score/rank internally without serializing it.
- Public creator leaderboard:
  - Deploy script: `deployment/DEPLOY-CREATOR-LEADERBOARD.bat`.
  - Public page: `/leaderboard`; no authentication is required.
  - Public API: `GET /api/creators/leaderboard?limit=50|100&category=<category>&platform=<platform>`.
  - Leaderboard responses contain rank positions and public creator information. Only serialize `creator_score` when `show_score` is true for that creator.
  - Leaderboard rows display the creator's selected/default public badges, and the public profile shows the opted-in score next to rank badges when available.
  - A creator's primary platform is their connected platform with the highest follower count. Disconnected accounts are ignored; ties use normalized platform name and then connection ID.
  - X, X/Twitter, and Twitter/X normalize to `twitter`.
  - Category and platform filters can be combined; positions are recalculated within the filtered result.
  - Platform-filtered rows show the follower count on the creator's primary platform.
  - Public profiles display `Ranked #N Overall` and a Top 50 or Top 100 badge where applicable.
  - Leaderboard-to-profile navigation stores the list scroll position in session storage and returns to the same filter URL and position.
  - Creator Cards are generated client-side as branded PNG files and can be downloaded or shared without exposing the private score.
- Payload CMS admin build:
  - Payload admin plugins must be present in `apps/web/src/app/(payload)/admin/importMap.js`.
  - Run `payload generate:importmap` after adding or changing a Payload plugin or admin component. The CMS web build now runs this automatically before `next build`.
  - A white admin page can occur with no failed static assets when a registered client component is absent from the import map. The June 11, 2026 incident was caused by the missing `@payloadcms/storage-s3/client#S3ClientUploadHandler` entry.
  - Do not add Payload, its database adapters, or `drizzle-kit` to production `serverExternalPackages`; Payload's Next wrapper manages production bundling.
  - Repair script: `deployment/FIX-CMS-PAYLOAD-WHITE-SCREEN.bat`. It uploads only the corrected Payload files, rebuilds and restarts the CMS, then verifies the hydrated first-user form in clean headless Chrome.
- Payload CMS media uploads and audit logs:
  - Deploy QA media fixes with `deployment/FIX-CMS-MEDIA-UPLOADS.bat`; it delegates to the safe full CMS updater and preserves the CMS database, users, media, environment, Apache, and SSL.
  - Payload generates the sanitized upload `filename` before collection `beforeValidate` hooks. Derive local `storageKey`, `bucket`, and `publicUrl` there, but keep those internal fields hidden from editors.
  - PostgreSQL Payload relationship IDs are numeric. Do not stringify `req.user.id` when writing an `audit-logs.user` relationship.
  - Audit logging is a secondary side effect and must log failures without rolling back a successful content or media save.
  - The safe CMS updater verifies `apps/web/media` is writable by the `bantubuzz` service user and runs committed Payload migrations before the production build.
  - Author social profiles are edited through the `sameAs` repeatable field, labelled `Social Links` in Payload. The legacy `socialLinks` JSON field remains hidden for database compatibility and must not be exposed to editors.
  - PostgreSQL enum migrations must stay aligned with Payload select options. The production baseline originally only allowed `draft/published`; editorial statuses such as `review`, `scheduled`, and `archived` require committed Payload migrations before exposing them in admin.
  - Public content mappers should distinguish required and optional relationships. Optional relations such as post reviewer, country, cover image, and OG image must not crash previews or public listing pages.
  - Payload local uploads must render through `/payload-api/media/file/<encoded filename>`, not `/media/<filename>`. Prefer Payload's generated `url` over custom `publicUrl` for local storage.
  - Keep `qualityFindings` JSON hidden in Payload admin and show `qualityFindingsSummary` as the readable editor-facing field.
  - CMS article CTA colors should use BantuBuzz navy `#1F2937` and primary olive-green `#ccdb53`; avoid the older near-black `#171714` and bright lime `#D7FF45` pairing.
- Payload CMS public content APIs and feeds:
  - Targeted deploy script: `deployment/DEPLOY-CMS-PUBLIC-API-FEEDS.bat`.
  - Canonical public namespace is `https://bantubuzz.com/content-api/*`; `/api/*` on the main domain belongs to Flask.
  - Public endpoints include posts, individual posts, authors, individual authors, categories, individual categories, tags, individual tags, related posts, plaintext, audio, search, reports, hubs, entities, and glossary content.
  - Canonical feeds are `https://bantubuzz.com/feed.json`, `/rss.xml`, and segmented RSS under `/rss/<feed>.xml`.
  - Developer documentation is public at `/developers`; OpenAPI 3.1 is at `/content-api/openapi.json`.
  - Public JSON endpoints use CDN cache headers, CORS, and Redis-backed per-client limits. Standard content APIs allow 120 requests per minute; feeds allow 60.
  - Keep public taxonomy and author responses mapped to explicit public fields instead of returning raw Payload documents.
- Payload CMS article audio operations:
  - Repair and diagnostic script: `deployment/FIX-CMS-AUDIO-WORKER.bat`.
  - Clicking Generate Audio enqueues a BullMQ job; publishing the article does not process or trigger that job.
  - The Payload button polls `/api/admin/audio-jobs/<jobId>` and must display queued, generating, uploading, saving, ready, or the actual failed reason.
  - The content worker reports structured progress and logs Redis readiness plus failed jobs.
  - Production repair runs a disposable end-to-end smoke test across espeak/Piper, ffmpeg/ffprobe, and the configured audio storage before restarting services.
  - Audio storage supports S3 when `S3_BUCKET_PUBLIC` is configured and local CMS storage otherwise. Local audio is served through `/content-api/posts/<slug>/audio-file`.
  - Local generated-audio paths must use `packages/core/src/storage.ts`; do not build paths from raw `process.cwd()` because the CMS service and worker run with different workspace current directories.
  - The audio-file endpoint supports byte ranges. Keep this behavior because browsers use range requests to calculate MP3 duration and seek correctly.
  - Production article narration should use Piper with the female `en_US-lessac-medium` model. `espeak-ng` is only an operational fallback and sounds robotic. Use `deployment\UPGRADE-CMS-AUDIO-VOICE-PIPER.bat` to install Piper, configure `TTS_PROVIDER=piper`, smoke-test MP3 generation, and regenerate the current sample article audio.
  - Public CMS editorial polish deploys through `deployment\DEPLOY-CMS-EDITORIAL-POLISH.bat`. Article audio belongs directly below the excerpt and above publication/author metadata and the featured image. Author social URLs render as platform icons. The public header mirrors the main platform navbar: green `Join as Creator` links to `/register/creator`, and navy `Join as Brand` links to `/register/brand`.
  - Article navigation must remain accessible while reading. Desktop uses a sticky right-side table of contents below the sticky header with an independently scrollable long menu. Mobile uses a sticky expandable `On this page` control. Markdown headings use scroll margin so anchor navigation does not hide headings behind the site header.
  - Article SEO QA requirements: render a normalized 150-160 character `meta name="description"` when the configured description is long enough, canonical URLs, Open Graph/Twitter article tags, BlogPosting JSON-LD, Person, Organization, BreadcrumbList, visible FAQ blocks, and visible internal-link blocks. Do not render the transcript as a visible section because the audio already reads the article.
  - A systemd service being `active` is not sufficient proof of a working audio pipeline; verify the smoke test and `BantuBuzz content worker ready` log.
- Public/authenticated navigation and global footer:
  - Public desktop navbar shows Search, How It Works, Pricing, Login, Join as Creator, and Join as Brand.
  - Once authenticated, How It Works and Pricing must not stay in the top navbar; they remain accessible from the profile/account menu.
  - Logged-in app pages should render the shared footer globally, including dashboards. Avoid duplicate footers on public routes that already render their own footer locally.
  - CMS blog/editorial pages live in `D:\Bantubuzz-headless-CMS` and have their own footer implementation. Keep that footer aligned with the main platform columns, including the BantuBuzz Intelligence links.
  - Main-platform navbar/footer deploy: `deployment\DEPLOY-NEW-VPS-PUBLIC-NAV-FOOTER.bat`.
  - CMS blog footer deploy: `deployment\DEPLOY-CMS-FOOTER-NAV.bat`.
- Inactive user "We miss you" emails:
  - Must run only once weekly on Monday at 9 AM, not daily.
  - Celery Beat schedule lives in `backend/app/celery_app.py` under `notify-inactive-users` with `day_of_week='monday'`.
  - The task itself also exits on non-Mondays so stale/daily scheduler cache entries cannot send emails.
  - `users.inactive_reminder_sent_at` stores the weekly guard; the checker reserves users for the current week before queueing emails to avoid duplicate Monday sends.
  - Targeted deploy script: `deployment\DEPLOY-NEW-VPS-WEEKLY-INACTIVE-EMAIL.bat`. It uploads the task/model/migration/schedule files, runs migration `202606181000`, clears Celery Beat's persisted schedule file, and restarts backend/Celery services.
- Admin payment verification and collaborations:
  - Campaign cart payments require real `campaign_payments` and `campaign_payment_items` tables; do not rely on the older raw SQL file alone. The Alembic migration `202606221100_ensure_campaign_payment_tables.py` creates/repairs those tables and the related collaboration payment columns.
  - Some production databases already contain Trust & Safety tables from a manual deploy while Alembic has not recorded `202603091200_trust_safety_phase1`. Keep that migration idempotent; otherwise `flask db upgrade heads` can fail on duplicate `user_blocks`.
  - Admin payment pages should never expose raw SQL/driver errors to the UI. If optional campaign payment tables are unavailable before migration, return a clean admin-facing migration message or skip optional campaign cart rows.
  - Collaboration serialization must tolerate legacy rows with missing dates, missing relations, or decimal values. Keep `Collaboration.to_dict()` returning JSON-safe values.
  - Targeted deploy script: `deployment\DEPLOY-NEW-VPS-ADMIN-PAYMENTS-COLLABORATIONS-FIX.bat`. It uploads only the payment/collaboration/billing backend files, the migration, rebuilt frontend dist, runs `flask db upgrade heads`, then restarts backend/Celery and reloads Apache.
- Brand subscription wallet payments:
  - Brand subscription checkout supports wallet payment through `POST /api/subscriptions/pay-with-wallet`.
  - The subscription payment page should show wallet balance available for subscription as `available_balance + pending_clearance`, while still displaying the available and pending portions separately.
  - Wallet subscription deductions use available funds first, then pending clearance if needed, and activate the subscription immediately through `apply_paid_subscription`.
  - Wallet transactions for subscription payments must include `subscription_reference` in metadata and a readable `SUB-<id>` reference in the description so billing/history can identify the payment.
  - Billing subscription invoices should show `paid` for verified/active paid subscriptions and include `payment_reference`.
  - Targeted deploy script: `deployment\DEPLOY-NEW-VPS-BRAND-SUBSCRIPTION-WALLET-PAYMENT.bat`. It deploys only the subscription/wallet/billing routes plus rebuilt frontend and does not run migrations.
- Payment service audit notes:
  - The current wallet schema uses `available_balance` and `pending_clearance`; do not use legacy `wallet.balance`.
  - Brand/customer spending transactions should use `transaction_type='payment'` with a negative amount and metadata identifying the source payment.
  - Creator earnings should not be credited directly on payment confirmation. Keep funds escrowed and release to creator `pending_clearance` through the escrow release service when the collaboration completes.
  - Campaign cart payments are the primary campaign payment flow. Legacy campaign payment routes must still tolerate `in_progress` collaborations and use `Collaboration.amount/title`, not nonexistent `collab.package` relationships.
  - SmilePay `payment_type='subscription'` activates the main `Subscription` model. Creator add-ons must use `payment_type='creator_subscription'` so `CreatorSubscription` records and badge/feature effects activate correctly.
  - Bank-transfer receiving accounts are centralized in `backend/app/utils/bank_details.py` and `frontend/src/utils/bankDetails.js`. Keep all bank-transfer screens using `BankTransferDetails` and preserve the generated payment/deposit reference beside the account list.
- Bulk brief sending:
  - Premium/Agency bulk outreach lives on top of the existing brief system, not campaigns. Brands open `Brand Briefs`, choose an open brief, then use `/brand/briefs/<id>/bulk-send`.
  - Access is enforced server-side in `backend/app/services/bulk_brief_service.py`; eligible plans are Premium, Agency, and Enterprise. The frontend can show the screen, but the route must return a clean 403 upgrade gate for lower tiers.
  - Bulk sends store a parent `bulk_brief_sends` row and one `bulk_brief_recipients` row per creator. Keep the hard cap at 50 unique creators.
  - Supported personalization tags are `{creator_name}`, `{username}`, `{follower_count}`, `{category}`, `{location}`, and `{top_platform}`. Unknown tags should remain visible rather than being silently removed.
  - Scheduled sends are processed by Celery Beat through `app.tasks.bulk_brief_tasks.send_due_bulk_briefs` every 10 minutes. Response tracking syncs proposals back into recipient rows hourly.
  - Open tracking is based on creator visits to `/briefs/<id>?bulk_recipient=<recipient_id>`. Response tracking is based on proposals submitted for the same brief by the same creator.
  - Targeted deploy script: `deployment\DEPLOY-NEW-VPS-BULK-BRIEF-SENDING.bat`. It uploads changed brief/backend/Celery files, migration `202606251000_add_bulk_brief_sending.py`, rebuilt frontend dist, runs `flask db upgrade heads`, and restarts backend plus Celery worker/beat.
- Remaining hardening for future slices:
  - Improve team invitation onboarding so new invitees land directly back on the invite after signup/login.
  - Build tailored onboarding steps after Agency/Enterprise signup.
  - Add account type change/upgrade from account settings without losing existing data.
  - Add custom report sender domains with SPF/DKIM/DMARC verification.
  - Build cross-workspace analytics exports.

1. Read `AI_GUIDE.md` first for the larger historical context and original project conventions.
2. Then read this file for the current working state and latest deployment lessons.
3. Check `git status --short`.
4. Check recent commits with `git log --oneline -10`.
5. Before deployment, verify which files changed.
6. For frontend changes, build locally and deploy `frontend/dist` contents into `/var/www/bantubuzz/frontend`.
7. For small backend changes, upload changed files directly with `scp`.
8. Restart Gunicorn using `pkill gunicorn`, not `pkill -f gunicorn`.
9. Test health endpoints before declaring deployment complete.
