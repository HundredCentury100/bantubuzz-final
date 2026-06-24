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
BACKUP="/var/backups/bantubuzz/direct-messaging-safety-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read --exclude='__pycache__' --exclude='*.pyc' -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/routes/messages.py
tar --ignore-failed-read -czf "$BACKUP/messaging-service-targeted.tar.gz" -C messaging-service \
  server.js
tar --ignore-failed-read -czf "$BACKUP/frontend-current.tar.gz" -C "$FRONTEND_ROOT" .

echo "Installing backend and messaging files"
tar -xzf /tmp/bantubuzz-direct-messaging-backend.tar.gz -C backend
tar -xzf /tmp/bantubuzz-direct-messaging-node.tar.gz -C messaging-service
chown -R bantubuzz:www-data \
  backend/app/routes/messages.py \
  messaging-service/server.js

echo "Installing frontend files"
rm -rf "$FRONTEND_ROOT/assets" "$FRONTEND_ROOT/index.html" "$FRONTEND_ROOT/favicon.ico" "$FRONTEND_ROOT/manifest.json" "$FRONTEND_ROOT/message-push-sw.js"
tar -xzf /tmp/bantubuzz-direct-messaging-frontend.tar.gz -C "$FRONTEND_ROOT"
chown -R bantubuzz:www-data "$FRONTEND_ROOT"

echo "Compiling and checking changed services"
cd "$REMOTE_ROOT/backend"
venv/bin/python -m py_compile app/routes/messages.py
cd "$REMOTE_ROOT/messaging-service"
node --check server.js

echo "Restarting backend, messaging, and Apache"
systemctl restart bantubuzz-backend.service
systemctl restart bantubuzz-messaging.service
systemctl reload apache2
sleep 5

echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Messaging:"
systemctl is-active bantubuzz-messaging.service

echo "Local API health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public API health:"
curl -fsS https://bantubuzz.com/api/health
echo
echo "Messaging health:"
curl -fsS http://127.0.0.1:3002/health
echo

rm -f \
  /tmp/bantubuzz-direct-messaging-backend.tar.gz \
  /tmp/bantubuzz-direct-messaging-node.tar.gz \
  /tmp/bantubuzz-direct-messaging-frontend.tar.gz \
  /tmp/deploy-direct-messaging-safety.sh

echo BANTUBUZZ_NEW_VPS_DIRECT_MESSAGING_SAFETY_SUCCESS
