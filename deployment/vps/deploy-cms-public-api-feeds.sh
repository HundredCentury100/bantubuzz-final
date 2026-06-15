#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
ENV_FILE="/etc/bantubuzz/cms.env"
ARCHIVE="/tmp/bantubuzz-cms-public-api-feeds.tar.gz"
BACKUP_ROOT="/var/backups/bantubuzz"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"

if [ "$(id -u)" -ne 0 ]; then
  echo "This deployment must run as root."
  exit 1
fi

if [ ! -s "$ARCHIVE" ] || [ ! -s "$ENV_FILE" ] || [ ! -f "$CMS_ROOT/package.json" ]; then
  echo "CMS installation, environment, or public API archive is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/cms-public-api-before-${timestamp}"

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

read -r -d '' TARGET_FILES <<'EOF' || true
apps/web/src/app/(frontend)/api/authors/route.ts
apps/web/src/app/(frontend)/api/authors/[slug]/route.ts
apps/web/src/app/(frontend)/api/categories/route.ts
apps/web/src/app/(frontend)/api/categories/[slug]/route.ts
apps/web/src/app/(frontend)/api/feed.json/route.ts
apps/web/src/app/(frontend)/api/openapi.json/route.ts
apps/web/src/app/(frontend)/api/tags/route.ts
apps/web/src/app/(frontend)/api/tags/[slug]/route.ts
apps/web/src/app/(frontend)/developers/page.tsx
apps/web/src/app/(frontend)/feed.json/route.ts
apps/web/src/app/(frontend)/rss.xml/route.ts
apps/web/src/app/(frontend)/rss/[...segments]/route.ts
apps/web/src/lib/content-repository.ts
apps/web/src/lib/public-feeds.ts
docs/implementation-status.md
packages/seo/src/feeds.ts
EOF

echo "=== Backing up files changed by the public API release ==="
install -d -o root -g www-data -m 0750 "$backup_dir"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  if [ -e "$CMS_ROOT/$relative_path" ]; then
    install -d "$backup_dir/$(dirname "$relative_path")"
    cp -a "$CMS_ROOT/$relative_path" "$backup_dir/$relative_path"
  fi
done <<< "$TARGET_FILES"

echo "=== Installing only public API, feed, and documentation files ==="
tar -xzf "$ARCHIVE" -C "$CMS_ROOT"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  chown bantubuzz:www-data "$CMS_ROOT/$relative_path"
done <<< "$TARGET_FILES"

echo "=== Loading existing production environment ==="
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "=== Verifying changed CMS source ==="
cd "$CMS_ROOT"
run_as_app npm run typecheck

echo "=== Rebuilding CMS public application ==="
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

echo "=== Verifying public APIs, feeds, caching, and docs ==="
posts_headers="$(mktemp)"
curl -fsS -D "$posts_headers" "https://bantubuzz.com/content-api/posts?limit=1" -o /tmp/bantubuzz-posts.json
grep -qi '^cache-control: public' "$posts_headers"
grep -qi '^access-control-allow-origin: \*' "$posts_headers"
curl -fsS https://bantubuzz.com/content-api/authors >/dev/null
curl -fsS https://bantubuzz.com/content-api/categories >/dev/null
curl -fsS https://bantubuzz.com/content-api/tags >/dev/null
curl -fsS https://bantubuzz.com/feed.json | grep -q '"https://jsonfeed.org/version/1.1"'
curl -fsS https://bantubuzz.com/rss.xml | grep -q '<rss version="2.0"'
curl -fsS https://bantubuzz.com/rss/creators.xml | grep -q '<rss version="2.0"'
curl -fsS https://bantubuzz.com/content-api/openapi.json | grep -q '"/content-api/authors"'
curl -fsS https://bantubuzz.com/developers | grep -q 'BantuBuzz Content API'

rm -f "$posts_headers" /tmp/bantubuzz-posts.json "$ARCHIVE"
echo "Backup: $backup_dir"
echo "No database migration, dependency install, Apache, SSL, users, media, or content was changed."
echo "BANTUBUZZ_CMS_PUBLIC_API_DEPLOY_SUCCESS"
