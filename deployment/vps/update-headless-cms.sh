#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"
UPLOAD_ARCHIVE="/tmp/bantubuzz-headless-cms-update.tar.gz"
ENV_FILE="/etc/bantubuzz/cms.env"
BACKUP_ROOT="/var/backups/bantubuzz"

if [ "$(id -u)" -ne 0 ]; then
  echo "This update must run as root."
  exit 1
fi

if [ ! -s "$UPLOAD_ARCHIVE" ]; then
  echo "CMS update archive is missing: $UPLOAD_ARCHIVE"
  exit 1
fi

if [ ! -f "$CMS_ROOT/package.json" ] || [ ! -s "$ENV_FILE" ]; then
  echo "The existing CMS installation or production environment is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
release_dir="/var/www/bantubuzz-cms-update-${timestamp}"
backup_dir="${BACKUP_ROOT}/cms-source-before-${timestamp}"

cleanup() {
  rm -rf "$release_dir"
  rm -f "$UPLOAD_ARCHIVE"
}
trap cleanup EXIT

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

echo "=== Preparing CMS source update ==="
install -d -o bantubuzz -g www-data -m 2775 "$release_dir" "$backup_dir"
tar -xzf "$UPLOAD_ARCHIVE" -C "$release_dir"

if [ ! -f "$release_dir/package.json" ] || [ ! -f "$release_dir/apps/web/payload.config.ts" ]; then
  echo "Uploaded archive does not contain the expected CMS project."
  exit 1
fi

echo "=== Backing up current CMS source ==="
rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude media \
  --exclude storage \
  "$CMS_ROOT/" "$backup_dir/"

echo "=== Installing updated CMS source ==="
rsync -a --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude media \
  --exclude storage \
  "$release_dir/" "$CMS_ROOT/"
install -d -o bantubuzz -g www-data -m 2775 \
  "$CMS_ROOT/apps/web/media" \
  "$CMS_ROOT/apps/web/storage"
chown -R bantubuzz:www-data "$CMS_ROOT"

echo "=== Loading existing production environment ==="
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ "${PAYLOAD_DB:-}" != "postgres" ] || [ -z "${DATABASE_URL:-}" ] || [ -z "${PAYLOAD_SECRET:-}" ]; then
  echo "The existing CMS production environment is incomplete."
  exit 1
fi

echo "=== Installing locked dependencies ==="
cd "$CMS_ROOT"
run_as_app npm ci --include=dev --no-audit --no-fund

echo "=== Building updated CMS ==="
run_as_app npm run build

echo "=== Restarting CMS service ==="
systemctl restart bantubuzz-cms.service

for attempt in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3010/admin >/dev/null 2>&1; then
    echo "CMS service is responding."
    break
  fi

  if [ "$attempt" -eq 45 ]; then
    systemctl status bantubuzz-cms.service --no-pager -l || true
    journalctl -u bantubuzz-cms.service --no-pager -n 150 || true
    exit 1
  fi
  sleep 2
done

echo "=== Verifying public CMS and platform bridge ==="
curl -fsS https://app.bantubuzz.com/admin >/dev/null
curl -fsS "https://bantubuzz.com/content-api/posts?limit=1" >/dev/null
bridge_response="$(curl -fsS https://bantubuzz.com/api/internal/cms/content-health)"
printf '%s\n' "$bridge_response"
printf '%s' "$bridge_response" | grep -q '"status":"healthy"'

echo "Source backup: $backup_dir"
echo "Production database, admin users, media, environment, Apache, and SSL were preserved."
echo "BANTUBUZZ_CMS_UPDATE_SUCCESS"
