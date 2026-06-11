#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"
BACKUP_ROOT="/var/backups/bantubuzz"

if [ "$(id -u)" -ne 0 ]; then
  echo "This repair must run as root."
  exit 1
fi

for upload in \
  /tmp/bantubuzz-cms-importMap.js \
  /tmp/bantubuzz-cms-web-package.json \
  /tmp/bantubuzz-cms-next.config.mjs; do
  if [ ! -s "$upload" ]; then
    echo "Repair upload is missing: $upload"
    exit 1
  fi
done

if [ ! -f "$CMS_ROOT/package.json" ] || [ ! -s /etc/bantubuzz/cms.env ]; then
  echo "The deployed CMS or its environment file is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$BACKUP_ROOT/cms-payload-importmap-${timestamp}"
install -d -o bantubuzz -g www-data -m 2775 "$backup_dir"

cp -a "$CMS_ROOT/apps/web/src/app/(payload)/admin/importMap.js" "$backup_dir/importMap.js"
cp -a "$CMS_ROOT/apps/web/package.json" "$backup_dir/web-package.json"
cp -a "$CMS_ROOT/apps/web/next.config.mjs" "$backup_dir/next.config.mjs"

install -o bantubuzz -g www-data -m 0644 \
  /tmp/bantubuzz-cms-importMap.js \
  "$CMS_ROOT/apps/web/src/app/(payload)/admin/importMap.js"
install -o bantubuzz -g www-data -m 0644 \
  /tmp/bantubuzz-cms-web-package.json \
  "$CMS_ROOT/apps/web/package.json"
install -o bantubuzz -g www-data -m 0644 \
  /tmp/bantubuzz-cms-next.config.mjs \
  "$CMS_ROOT/apps/web/next.config.mjs"

set -a
# shellcheck disable=SC1091
source /etc/bantubuzz/cms.env
set +a

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

cd "$CMS_ROOT"

echo "=== Verifying Payload import map ==="
if ! grep -q '@payloadcms/storage-s3/client#S3ClientUploadHandler' \
  "$CMS_ROOT/apps/web/src/app/(payload)/admin/importMap.js"; then
  echo "The corrected S3 Payload client import is missing."
  exit 1
fi

echo "=== Type-checking CMS ==="
run_as_app npm run typecheck

echo "=== Rebuilding CMS ==="
run_as_app npm run build

echo "=== Restarting CMS ==="
systemctl restart bantubuzz-cms.service

for attempt in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3010/admin/create-first-user >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 45 ]; then
    systemctl status bantubuzz-cms.service --no-pager -l || true
    journalctl -u bantubuzz-cms.service --no-pager -n 150 || true
    exit 1
  fi
  sleep 2
done

echo "=== Verifying public CMS endpoint ==="
curl -fsSI https://app.bantubuzz.com/admin/create-first-user | head -20
echo "BANTUBUZZ_CMS_PAYLOAD_IMPORTMAP_FIX_SUCCESS"
