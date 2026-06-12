# BantuBuzz combined VPS layout

The target VPS runs both products behind Apache:

- `bantubuzz.com`: Vite platform, Flask `/api`, Socket.IO, and CMS-rendered public editorial paths.
- `app.bantubuzz.com`: Payload admin and CMS APIs.
- Flask: `127.0.0.1:8002`
- Messaging: `127.0.0.1:3002`
- Next/Payload CMS: `127.0.0.1:3010`

## New VPS audit

Run `deployment\ANALYZE-NEW-VPS.bat` before provisioning. It connects to
`root@13.140.159.150`, performs a read-only readiness audit, and saves a
timestamped report under `deployment\vps\reports\`. The audit does not display
environment-file contents or make server changes.

## Provisioning

Run `deployment\PROVISION-NEW-VPS.bat` after reviewing the audit. It prepares
`13.140.159.150` for both products but deliberately does not contact the old
production server, migrate data, change DNS, request final certificates, or
start incomplete application services.

Provisioning creates:

- Node.js 22, Python tooling, Apache, Certbot, PostgreSQL, Redis, Meilisearch, UFW, and Fail2ban.
- A 4 GB swap file.
- Separate `bantubuzz_platform` and `bantubuzz_cms` databases and roles.
- `/var/www/bantubuzz` and `/var/www/bantubuzz-cms`.
- Root-protected generated credentials at `/root/bantubuzz-provisioning-secrets.txt`.
- Environment skeletons under `/etc/bantubuzz/`.
- Disabled systemd units for Flask, messaging, Celery worker/beat, CMS web, and CMS content worker.

After provisioning, rerun `deployment\ANALYZE-NEW-VPS.bat`. Production data
migration and DNS cutover are separate later phases.

For a shorter decisive check, run
`deployment\VERIFY-NEW-VPS-READINESS.bat`. A successful report ends with
`BANTUBUZZ_MIGRATION_READINESS_PASS`.

If only the Meilisearch checks fail, run
`deployment\FIX-MEILISEARCH-NEW-VPS.bat`, then rerun the readiness check.

## First CMS deployment

Run `deployment\DEPLOY-HEADLESS-CMS-NEW-VPS.bat` after the infrastructure
readiness check passes. It deploys only the headless CMS, generates and applies
the PostgreSQL baseline migration, seeds baseline authority content, starts the
CMS web service, and configures TLS for `app.bantubuzz.com`.

The generated PostgreSQL migration is downloaded back into
`D:\Bantubuzz-headless-CMS\apps\web\src\migrations-postgres` for review and
source control. The CMS content worker remains disabled until S3, TTS, SMTP,
and IndexNow credentials are configured.

## Required secrets

Generate one random `CONTENT_BRIDGE_SECRET` and set the same value in:

- `/var/www/bantubuzz/backend/.env`
- `/etc/bantubuzz/cms.env`

Never place the real secret in source control.

## CMS environment

```dotenv
APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://bantubuzz.com
PAYLOAD_PUBLIC_SERVER_URL=https://app.bantubuzz.com
BANTUBUZZ_PLATFORM_WEBHOOK_URL=http://127.0.0.1:8002/api/internal/cms/content-changed
CONTENT_BRIDGE_SECRET=replace-with-a-random-64-byte-secret
```

The main platform backend also needs:

```dotenv
CMS_INTERNAL_URL=http://127.0.0.1:3010
CONTENT_BRIDGE_SECRET=replace-with-the-same-random-64-byte-secret
CONTENT_BRIDGE_MAX_SKEW_SECONDS=300
```

## Release order

1. Provision PostgreSQL databases, Redis, Node, Python, Apache, and TLS.
2. Restore the main platform database and uploaded files.
3. Deploy and migrate the Flask backend, then start Gunicorn and messaging.
4. Deploy the CMS, generate and run its PostgreSQL baseline migration, then start `bantubuzz-cms.service`.
5. Install `bantubuzz-platform.conf`, enable `proxy`, `proxy_http`, `proxy_wstunnel`, `rewrite`, and `ssl`, then reload Apache.
6. Verify `/api/health`, `/api/internal/cms/content-health`, `/blog`, `/content-api/posts`, and `https://app.bantubuzz.com/admin`.
7. Lower DNS TTL before cutover, update the `A` records, monitor both application logs, then retire the old VPS after validation.

## Full platform snapshot migration

Run `deployment\MIGRATE-PLATFORM-TO-NEW-VPS.bat` to copy the current production
platform from `173.212.245.22` to `13.140.159.150`.

The orchestrator:

- labels every password prompt as OLD VPS or NEW VPS;
- captures the complete PostgreSQL platform database, backend uploads, and
  production provider configuration from the old VPS;
- deploys the current local backend, frontend build, and messaging source;
- preserves the separate Payload CMS database and running CMS service;
- restores the platform database under the new server-local database role;
- runs current Alembic migrations and SQLAlchemy mapper validation;
- starts and verifies Flask, messaging, Celery worker, and Celery beat;
- exposes a temporary HTTP staging entrypoint at `http://13.140.159.150`;
- does not change DNS or stop the old production platform.

This is a live snapshot, not the final cutover. Once it completes, the two
platform databases will diverge as users continue using the old VPS. Perform a
short maintenance-window final sync before changing the `bantubuzz.com` DNS
records.
