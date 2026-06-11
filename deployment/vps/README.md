# BantuBuzz combined VPS layout

The target VPS runs both products behind Apache:

- `bantubuzz.com`: Vite platform, Flask `/api`, Socket.IO, and CMS-rendered public editorial paths.
- `app.bantubuzz.com`: Payload admin and CMS APIs.
- Flask: `127.0.0.1:8002`
- Messaging: `127.0.0.1:3002`
- Next/Payload CMS: `127.0.0.1:3010`

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
