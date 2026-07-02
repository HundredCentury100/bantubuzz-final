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
BACKUP="/var/backups/bantubuzz/brand-subscription-wallet-payment-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/routes/subscriptions.py \
  app/routes/brand_wallet.py \
  app/routes/billing.py
tar --ignore-failed-read -czf "$BACKUP/frontend-current.tar.gz" -C "$FRONTEND_ROOT" .

echo "Installing backend files"
tar -xzf /tmp/bantubuzz-brand-subscription-wallet-payment-backend.tar.gz -C backend
chown -R bantubuzz:www-data backend/app/routes

echo "Installing frontend files"
rm -rf "$FRONTEND_ROOT/assets" "$FRONTEND_ROOT/index.html" "$FRONTEND_ROOT/favicon.ico" "$FRONTEND_ROOT/manifest.json" "$FRONTEND_ROOT/message-push-sw.js"
tar -xzf /tmp/bantubuzz-brand-subscription-wallet-payment-frontend.tar.gz -C "$FRONTEND_ROOT"
chown -R bantubuzz:www-data "$FRONTEND_ROOT"

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile

files = [
    'app/routes/subscriptions.py',
    'app/routes/brand_wallet.py',
    'app/routes/billing.py',
]
for path in files:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_*.pyc

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

rm -f \
  /tmp/bantubuzz-brand-subscription-wallet-payment-backend.tar.gz \
  /tmp/bantubuzz-brand-subscription-wallet-payment-frontend.tar.gz \
  /tmp/deploy-brand-subscription-wallet-payment.sh

echo BANTUBUZZ_NEW_VPS_BRAND_SUBSCRIPTION_WALLET_PAYMENT_SUCCESS
