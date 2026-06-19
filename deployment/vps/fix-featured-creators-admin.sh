#!/usr/bin/env bash
set -euo pipefail

REMOTE_ROOT="/var/www/bantubuzz"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
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
BACKUP="/var/backups/bantubuzz/featured-creators-admin-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/frontend.tar.gz" -C frontend .

echo "Installing frontend dist"
rm -rf frontend/*
tar -xzf /tmp/bantubuzz-featured-admin-frontend.tar.gz -C frontend
chown -R www-data:www-data frontend

echo "Ensuring creator featured database columns exist"
cd backend
venv/bin/python - <<'PY'
from app import create_app, db
from sqlalchemy import inspect, text

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    existing = {column['name'] for column in inspector.get_columns('creator_profiles')}
    statements = []

    if 'is_featured' not in existing:
        statements.append("ALTER TABLE creator_profiles ADD COLUMN is_featured BOOLEAN DEFAULT false")
    if 'featured_type' not in existing:
        statements.append("ALTER TABLE creator_profiles ADD COLUMN featured_type VARCHAR(20)")
    if 'featured_order' not in existing:
        statements.append("ALTER TABLE creator_profiles ADD COLUMN featured_order INTEGER DEFAULT 0")
    if 'featured_since' not in existing:
        statements.append("ALTER TABLE creator_profiles ADD COLUMN featured_since TIMESTAMP WITHOUT TIME ZONE")

    for statement in statements:
        db.session.execute(text(statement))

    db.session.commit()

    refreshed = inspect(db.engine)
    final_columns = {column['name'] for column in refreshed.get_columns('creator_profiles')}
    required = {'is_featured', 'featured_type', 'featured_order', 'featured_since'}
    missing = sorted(required - final_columns)
    if missing:
        raise RuntimeError(f"Missing featured columns after repair: {missing}")

    print(f"featured_columns_added={len(statements)}")
    print("featured_columns_verified=true")
PY

echo "Restarting backend services"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service
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

rm -f \
  /tmp/bantubuzz-featured-admin-frontend.tar.gz \
  /tmp/fix-featured-creators-admin.sh

echo BANTUBUZZ_NEW_VPS_FEATURED_CREATORS_ADMIN_FIX_SUCCESS
