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
BACKUP="/var/backups/bantubuzz/bulk-brief-sending-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read --exclude='__pycache__' --exclude='*.pyc' -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/models/__init__.py \
  app/models/bulk_brief.py \
  app/services/bulk_brief_service.py \
  app/tasks/bulk_brief_tasks.py \
  app/routes/briefs.py \
  app/celery_app.py \
  migrations/versions/202606251000_add_bulk_brief_sending.py
tar --ignore-failed-read -czf "$BACKUP/frontend-current.tar.gz" -C "$FRONTEND_ROOT" .

echo "Installing backend files"
tar -xzf /tmp/bantubuzz-bulk-brief-sending-backend.tar.gz -C backend
chown -R bantubuzz:www-data \
  backend/app/models/__init__.py \
  backend/app/models/bulk_brief.py \
  backend/app/services/bulk_brief_service.py \
  backend/app/tasks/bulk_brief_tasks.py \
  backend/app/routes/briefs.py \
  backend/app/celery_app.py \
  backend/migrations/versions/202606251000_add_bulk_brief_sending.py

echo "Installing frontend files"
rm -rf "$FRONTEND_ROOT/assets" "$FRONTEND_ROOT/index.html" "$FRONTEND_ROOT/favicon.ico" "$FRONTEND_ROOT/manifest.json" "$FRONTEND_ROOT/message-push-sw.js"
tar -xzf /tmp/bantubuzz-bulk-brief-sending-frontend.tar.gz -C "$FRONTEND_ROOT"
chown -R bantubuzz:www-data "$FRONTEND_ROOT"

echo "Compiling targeted backend files"
cd "$REMOTE_ROOT/backend"
venv/bin/python -m py_compile \
  app/models/bulk_brief.py \
  app/services/bulk_brief_service.py \
  app/tasks/bulk_brief_tasks.py \
  app/routes/briefs.py \
  app/celery_app.py

echo "Running database migration"
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

echo "Local API health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public API health:"
curl -fsS https://bantubuzz.com/api/health
echo

rm -f \
  /tmp/bantubuzz-bulk-brief-sending-backend.tar.gz \
  /tmp/bantubuzz-bulk-brief-sending-frontend.tar.gz \
  /tmp/deploy-bulk-brief-sending.sh

echo BANTUBUZZ_NEW_VPS_BULK_BRIEF_SENDING_SUCCESS
