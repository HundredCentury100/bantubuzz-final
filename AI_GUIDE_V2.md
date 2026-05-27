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

