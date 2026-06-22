#!/usr/bin/env bash
set -euo pipefail

REMOTE_ROOT="/var/www/bantubuzz"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
FRONTEND_ROOT="$REMOTE_ROOT/frontend"

cd "$REMOTE_ROOT"

if [ ! -s "$PLATFORM_ENV" ]; then
  echo "Missing platform environment: $PLATFORM_ENV"
  exit 1
fi

eval "$(
  python3 - "$PLATFORM_ENV" <<'PY'
import re
import shlex
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    key = key.strip()
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key):
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    print(f"export {key}={shlex.quote(value)}")
PY
)"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/bantubuzz/admin-payments-collaborations-fix-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/models/collaboration.py \
  app/routes/admin/payments.py \
  app/routes/admin/collaborations.py \
  app/routes/billing.py \
  migrations/versions
tar --ignore-failed-read -czf "$BACKUP/frontend-current.tar.gz" -C "$FRONTEND_ROOT" .

echo "Installing backend files"
tar -xzf /tmp/bantubuzz-admin-payments-collaborations-fix-backend.tar.gz -C backend
chown -R bantubuzz:www-data backend/app/models backend/app/routes backend/migrations/versions

echo "Installing frontend files"
rm -rf "$FRONTEND_ROOT/assets" "$FRONTEND_ROOT/index.html" "$FRONTEND_ROOT/favicon.ico" "$FRONTEND_ROOT/manifest.json" "$FRONTEND_ROOT/message-push-sw.js"
tar -xzf /tmp/bantubuzz-admin-payments-collaborations-fix-frontend.tar.gz -C "$FRONTEND_ROOT"
chown -R bantubuzz:www-data "$FRONTEND_ROOT"

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile

files = [
    'app/models/collaboration.py',
    'app/routes/admin/payments.py',
    'app/routes/admin/collaborations.py',
    'app/routes/billing.py',
    'migrations/versions/202606221100_ensure_campaign_payment_tables.py',
]
for path in files:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_*.pyc /tmp/migrations_*.pyc

echo "Running database migrations"
export FLASK_APP=run.py
venv/bin/flask db upgrade heads

echo "Restarting backend, Celery, and Apache"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service
systemctl reload apache2
sleep 5
echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service
echo "Celery beat:"
systemctl is-active bantubuzz-celery-beat.service

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

echo "Campaign payment table check:"
venv/bin/python - <<'PY'
from app import create_app, db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    print({
        'campaign_payments': inspector.has_table('campaign_payments'),
        'campaign_payment_items': inspector.has_table('campaign_payment_items'),
    })
PY

rm -f \
  /tmp/bantubuzz-admin-payments-collaborations-fix-backend.tar.gz \
  /tmp/bantubuzz-admin-payments-collaborations-fix-frontend.tar.gz \
  /tmp/deploy-admin-payments-collaborations-fix.sh

echo BANTUBUZZ_NEW_VPS_ADMIN_PAYMENTS_COLLABORATIONS_FIX_SUCCESS
