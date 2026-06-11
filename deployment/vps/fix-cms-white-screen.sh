#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"
UPLOAD_LAYOUT="/tmp/bantubuzz-cms-layout.tsx"
TARGET_LAYOUT="$CMS_ROOT/apps/web/src/app/(payload)/layout.tsx"
PAINT_GUARD="$CMS_ROOT/apps/web/src/app/(payload)/AdminPaintGuard.tsx"
BACKUP_ROOT="/var/backups/bantubuzz"

if [ "$(id -u)" -ne 0 ]; then
  echo "This repair must run as root."
  exit 1
fi

if [ ! -s "$UPLOAD_LAYOUT" ]; then
  echo "Updated CMS layout is missing: $UPLOAD_LAYOUT"
  exit 1
fi

if [ ! -f "$CMS_ROOT/package.json" ] || [ ! -s /etc/bantubuzz/cms.env ]; then
  echo "The deployed CMS or its environment file is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$BACKUP_ROOT/cms-white-screen-${timestamp}"
install -d -o bantubuzz -g www-data -m 2775 "$backup_dir"
cp -a "$TARGET_LAYOUT" "$backup_dir/layout.tsx"
if [ -f "$PAINT_GUARD" ]; then
  cp -a "$PAINT_GUARD" "$backup_dir/AdminPaintGuard.tsx"
fi

install -o bantubuzz -g www-data -m 0644 "$UPLOAD_LAYOUT" "$TARGET_LAYOUT"
rm -f "$PAINT_GUARD"

set -a
# shellcheck disable=SC1091
source /etc/bantubuzz/cms.env
set +a

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

echo "=== Type-checking CMS repair ==="
cd "$CMS_ROOT"
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

echo "=== Verifying public CMS assets ==="
curl -fsSI https://app.bantubuzz.com/admin/create-first-user | head -20
echo "BANTUBUZZ_CMS_WHITE_SCREEN_FIX_SUCCESS"
