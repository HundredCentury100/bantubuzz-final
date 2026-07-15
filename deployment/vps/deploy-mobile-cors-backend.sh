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
BACKUP="/var/backups/bantubuzz/mobile-cors-backend-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read --exclude='__pycache__' --exclude='*.pyc' \
  -czf "$BACKUP/backend-config.tar.gz" -C backend app/config.py app/__init__.py

echo "Installing backend CORS files"
tar -xzf /tmp/bantubuzz-mobile-cors-backend.tar.gz -C backend
chown bantubuzz:www-data backend/app/config.py backend/app/__init__.py

echo "Compiling backend CORS files"
cd backend
venv/bin/python -m py_compile app/config.py app/__init__.py

echo "Restarting backend and Apache"
systemctl restart bantubuzz-backend.service
systemctl reload apache2

echo "Waiting for backend to become active"
for attempt in $(seq 1 30); do
  status="$(systemctl is-active bantubuzz-backend.service || true)"
  echo "Backend status attempt ${attempt}: ${status}"
  if [ "$status" = "active" ]; then
    break
  fi
  sleep 2
done

echo "Backend:"
systemctl is-active bantubuzz-backend.service

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo

echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

rm -f \
  /tmp/bantubuzz-mobile-cors-backend.tar.gz \
  /tmp/deploy-mobile-cors-backend.sh

echo BANTUBUZZ_NEW_VPS_MOBILE_CORS_BACKEND_SUCCESS
