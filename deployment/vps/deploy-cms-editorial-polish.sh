#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
ENV_FILE="/etc/bantubuzz/cms.env"
ARCHIVE="/tmp/bantubuzz-cms-editorial-polish.tar.gz"
BACKUP_ROOT="/var/backups/bantubuzz"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"

if [ "$(id -u)" -ne 0 ]; then
  echo "This deployment must run as root."
  exit 1
fi

if [ ! -s "$ARCHIVE" ] || [ ! -s "$ENV_FILE" ] || [ ! -f "$CMS_ROOT/package.json" ]; then
  echo "CMS installation, environment, or editorial archive is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/cms-editorial-polish-before-${timestamp}"

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

read -r -d '' TARGET_FILES <<'EOF' || true
apps/web/src/app/(frontend)/authors/[slug]/page.tsx
apps/web/src/app/(frontend)/blog/[slug]/page.tsx
apps/web/src/app/(frontend)/preview/posts/[slug]/page.tsx
apps/web/src/app/globals.css
apps/web/src/components/editorial-shell.tsx
apps/web/src/components/social-icons.tsx
EOF

echo "=== Backing up public editorial files ==="
install -d -o root -g www-data -m 0750 "$backup_dir"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  if [ -e "$CMS_ROOT/$relative_path" ]; then
    install -d "$backup_dir/$(dirname "$relative_path")"
    cp -a "$CMS_ROOT/$relative_path" "$backup_dir/$relative_path"
  fi
done <<< "$TARGET_FILES"

echo "=== Installing only editorial polish files ==="
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

echo "=== Verifying public editorial UI ==="
article_html="$(mktemp)"
curl -fsS "https://bantubuzz.com/blog/how-to-turn-your-influence-into-income" -o "$article_html"
grep -q "Listen to article" "$article_html"
grep -q "Join as Creator" "$article_html"
grep -q "Join as Brand" "$article_html"
grep -q "https://bantubuzz.com/register/creator" "$article_html"
grep -q "https://bantubuzz.com/register/brand" "$article_html"

rm -f "$article_html" "$ARCHIVE"
echo "Backup: $backup_dir"
echo "No database migration, dependency install, Apache, SSL, users, media, or content was changed."
echo "BANTUBUZZ_CMS_EDITORIAL_POLISH_SUCCESS"
