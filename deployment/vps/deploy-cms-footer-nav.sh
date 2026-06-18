#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
ENV_FILE="/etc/bantubuzz/cms.env"
ARCHIVE="/tmp/bantubuzz-cms-footer-nav.tar.gz"
BACKUP_ROOT="/var/backups/bantubuzz"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"

if [ "$(id -u)" -ne 0 ]; then
  echo "This deployment must run as root."
  exit 1
fi

if [ ! -s "$ARCHIVE" ] || [ ! -s "$ENV_FILE" ] || [ ! -f "$CMS_ROOT/package.json" ]; then
  echo "CMS installation, environment, or footer archive is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/cms-footer-nav-before-${timestamp}"

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

read -r -d '' TARGET_FILES <<'EOF' || true
apps/web/src/app/globals.css
apps/web/src/components/editorial-shell.tsx
EOF

echo "=== Backing up CMS footer/navigation files ==="
install -d -o root -g www-data -m 0750 "$backup_dir"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  if [ -e "$CMS_ROOT/$relative_path" ]; then
    install -d "$backup_dir/$(dirname "$relative_path")"
    cp -a "$CMS_ROOT/$relative_path" "$backup_dir/$relative_path"
  fi
done <<< "$TARGET_FILES"

echo "=== Installing CMS footer/navigation files ==="
tar -xzf "$ARCHIVE" -C "$CMS_ROOT"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  chown bantubuzz:www-data "$CMS_ROOT/$relative_path"
done <<< "$TARGET_FILES"

echo "=== Loading production environment ==="
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "=== Typechecking and rebuilding CMS ==="
cd "$CMS_ROOT"
run_as_app npm run typecheck
run_as_app npm run build

echo "=== Restarting CMS web service ==="
systemctl restart bantubuzz-cms.service

for attempt in $(seq 1 45); do
  if systemctl is-active --quiet bantubuzz-cms.service \
    && curl -fsS http://127.0.0.1:3010/admin >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 45 ]; then
    systemctl status bantubuzz-cms.service --no-pager -l || true
    journalctl -u bantubuzz-cms.service --no-pager -n 150 || true
    exit 1
  fi
  sleep 2
done

echo "=== Verifying public blog footer ==="
blog_html="$(mktemp)"
curl -fsS "https://bantubuzz.com/blog" -o "$blog_html"
grep -q "BantuBuzz Intelligence" "$blog_html"
grep -q "For Creators" "$blog_html"
grep -q "For Brands" "$blog_html"
grep -q "https://bantubuzz.com/register/creator" "$blog_html"
grep -q "https://bantubuzz.com/register/brand" "$blog_html"
grep -q "/research/reports" "$blog_html"
grep -q "/glossary" "$blog_html"

rm -f "$blog_html" "$ARCHIVE"
echo "Backup: $backup_dir"
echo "No CMS database, dependencies, Apache, SSL, media, users, or content were changed."
echo "BANTUBUZZ_CMS_FOOTER_NAV_SUCCESS"
