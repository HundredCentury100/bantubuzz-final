#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
BACKUP_ROOT="/var/backups/bantubuzz"
STAMP="$(date +%Y%m%d_%H%M%S)"
FRONTEND_ARCHIVE="/tmp/bantubuzz-campaign-invite-frontend.tar.gz"
BACKEND_ARCHIVE="/tmp/bantubuzz-campaign-invite-backend.tar.gz"

echo "Creating targeted backup at ${BACKUP_ROOT}/campaign-creator-invite-before-${STAMP}"
mkdir -p "${BACKUP_ROOT}/campaign-creator-invite-before-${STAMP}"
cp -a "$FRONTEND_DIR/dist" "${BACKUP_ROOT}/campaign-creator-invite-before-${STAMP}/frontend-dist" 2>/dev/null || true
tar -czf "${BACKUP_ROOT}/campaign-creator-invite-before-${STAMP}/backend-files.tar.gz" \
  -C "$BACKEND_DIR" \
  app/routes/campaign_cart.py \
  2>/dev/null || true

echo "Installing frontend build"
rm -rf "$FRONTEND_DIR/dist"
mkdir -p "$FRONTEND_DIR"
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_DIR"

echo "Installing backend route"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_DIR"

echo "Compiling backend route"
cd "$BACKEND_DIR"
venv/bin/python -m py_compile app/routes/campaign_cart.py

echo "Restarting backend and Apache"
pkill -f 'gunicorn.*app:create_app' || true
sleep 2

if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  systemctl restart bantubuzz-backend.service
else
  if [ ! -s "$PLATFORM_ENV" ]; then
    echo "Missing production environment file: $PLATFORM_ENV" >&2
    exit 1
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    if printf '%s' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$' && [ "$line" != "$key" ]; then
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      export "$key=$value"
    fi
  done < "$PLATFORM_ENV"

  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

systemctl reload apache2
sleep 3

echo "Verifying health and creator search"
curl -fsS http://127.0.0.1:8002/api/health
curl -fsS 'http://127.0.0.1:8002/api/creators?per_page=1' >/dev/null
curl -fsS https://bantubuzz.com/api/health
curl -fsS 'https://bantubuzz.com/api/creators?per_page=1' >/dev/null

rm -f "$FRONTEND_ARCHIVE" "$BACKEND_ARCHIVE"

echo "BANTUBUZZ_CAMPAIGN_CREATOR_INVITE_FIX_SUCCESS"
