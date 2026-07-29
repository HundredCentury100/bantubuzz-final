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
if [ -d "$FRONTEND_DIR" ]; then
  tar -czf "${BACKUP_ROOT}/campaign-creator-invite-before-${STAMP}/frontend.tar.gz" -C "$FRONTEND_DIR" . 2>/dev/null || true
fi
tar -czf "${BACKUP_ROOT}/campaign-creator-invite-before-${STAMP}/backend-files.tar.gz" \
  -C "$BACKEND_DIR" \
  app/models/creator_profile.py \
  app/models/brand_profile.py \
  app/routes/campaign_cart.py \
  app/routes/campaign_invitations.py \
  app/routes/creators.py \
  app/services/campaign_cart_payment_service.py \
  app/services/email_service.py \
  app/services/campaign_analytics_service.py \
  2>/dev/null || true

echo "Installing frontend build"
mkdir -p "$FRONTEND_DIR"
find "$FRONTEND_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_DIR"
rm -rf "$FRONTEND_DIR/dist"
chown -R www-data:www-data "$FRONTEND_DIR" || true

echo "Installing backend routes"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_DIR"
chown -R www-data:www-data \
  "$BACKEND_DIR/app/models/creator_profile.py" \
  "$BACKEND_DIR/app/models/brand_profile.py" \
  "$BACKEND_DIR/app/routes/campaign_cart.py" \
  "$BACKEND_DIR/app/routes/campaign_invitations.py" \
  "$BACKEND_DIR/app/routes/creators.py" \
  "$BACKEND_DIR/app/services/campaign_cart_payment_service.py" \
  "$BACKEND_DIR/app/services/email_service.py" \
  "$BACKEND_DIR/app/services/campaign_analytics_service.py" \
  || true

echo "Compiling backend routes"
cd "$BACKEND_DIR"
venv/bin/python -m py_compile app/models/creator_profile.py app/models/brand_profile.py app/routes/campaign_cart.py app/routes/campaign_invitations.py app/routes/creators.py app/services/campaign_cart_payment_service.py app/services/email_service.py app/services/campaign_analytics_service.py

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
curl -fsS 'http://127.0.0.1:8002/api/creators?per_page=1&include_without_packages=true' >/dev/null
curl -fsS https://bantubuzz.com/api/health
curl -fsS 'https://bantubuzz.com/api/creators?per_page=1&include_without_packages=true' >/dev/null

echo "Verifying frontend bundle was installed at the Apache document root"
if [ ! -f "$FRONTEND_DIR/index.html" ]; then
  echo "Missing installed frontend index.html at $FRONTEND_DIR" >&2
  exit 1
fi
installed_asset="$(grep -oE 'assets/index-[^"]+\.js' "$FRONTEND_DIR/index.html" | head -n 1 || true)"
if [ -z "$installed_asset" ] || [ ! -f "$FRONTEND_DIR/$installed_asset" ]; then
  echo "Installed index references a missing asset: ${installed_asset:-none}" >&2
  exit 1
fi

rm -f "$FRONTEND_ARCHIVE" "$BACKEND_ARCHIVE"

echo "BANTUBUZZ_CAMPAIGN_CREATOR_INVITE_FIX_SUCCESS"
