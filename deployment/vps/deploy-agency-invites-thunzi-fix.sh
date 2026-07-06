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
BACKUP="/var/backups/bantubuzz/agency-invites-thunzi-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/services/workspace_service.py \
  app/services/thunzi_service.py

echo "Installing backend files"
tar -xzf /tmp/bantubuzz-agency-invites-thunzi-backend.tar.gz -C backend
chown bantubuzz:www-data \
  backend/app/services/workspace_service.py \
  backend/app/services/thunzi_service.py

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile
for path in [
    'app/services/workspace_service.py',
    'app/services/thunzi_service.py',
]:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_services_*.pyc

echo "Restarting backend, Celery worker, and Apache"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service
systemctl reload apache2
sleep 5

echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo

echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

rm -f \
  /tmp/bantubuzz-agency-invites-thunzi-backend.tar.gz \
  /tmp/deploy-agency-invites-thunzi-fix.sh

echo BANTUBUZZ_NEW_VPS_AGENCY_INVITES_THUNZI_FIX_SUCCESS
