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
BACKUP="/var/backups/bantubuzz/creator-browse-featured-hotfix-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/routes/creators.py \
  migrations/versions

echo "Installing backend files"
tar -xzf /tmp/bantubuzz-creator-browse-featured-hotfix.tar.gz -C backend
chown -R bantubuzz:www-data backend/app/routes backend/migrations/versions

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile

files = [
    'app/routes/creators.py',
    'migrations/versions/202606181000_add_inactive_reminder_sent_at.py',
    'migrations/versions/202606181200_add_creator_leaderboard_preferences.py',
    'migrations/versions/202606181300_ensure_creator_featured_fields.py',
]
for path in files:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_*.pyc /tmp/migrations_*.pyc

echo "Running database migration"
export FLASK_APP=run.py
venv/bin/flask db upgrade 202606181300

echo "Restarting services"
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

echo "Browse creators API smoke check:"
curl -fsS "https://bantubuzz.com/api/creators?page=1&per_page=1"
echo

rm -f \
  /tmp/bantubuzz-creator-browse-featured-hotfix.tar.gz \
  /tmp/deploy-creator-browse-featured-hotfix.sh

echo BANTUBUZZ_NEW_VPS_CREATOR_BROWSE_FEATURED_HOTFIX_SUCCESS
