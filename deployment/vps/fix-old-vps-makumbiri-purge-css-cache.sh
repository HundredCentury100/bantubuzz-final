#!/usr/bin/env bash
set -euo pipefail

DOMAIN="makumbirigamepark.com"
WEBROOT="/var/www/makumbirigamepark.com"
BACKUP="/var/backups/bantubuzz/makumbiri-public-css-cache-before-$(date +%Y%m%d_%H%M%S)"
HTML="/tmp/makumbiri-public-css-cache-check.html"

cd "$WEBROOT"

echo "Creating generated-cache backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/generated-cache.tar.gz" \
  wp-content/litespeed \
  wp-content/cache \
  wp-content/uploads/elementor/css 2>/dev/null || true

echo "Before purge: optimized assets in current public HTML"
curl -k -sS "https://$DOMAIN/?bb_cache_check_before=$(date +%s)" -o "$HTML"
python3 - "$HTML" "$DOMAIN" <<'PY'
import re
import sys

html = open(sys.argv[1], encoding='utf-8', errors='replace').read()
for match in re.findall(r'(?:https:)?//[^"\' )]+wp-content/litespeed/(?:css|js)/[^"\' )]+|/wp-content/litespeed/(?:css|js)/[^"\' )]+', html, flags=re.I):
    print(match)
PY

echo "Purging LiteSpeed public optimization files for Makumbiri"
rm -rf wp-content/litespeed/css wp-content/litespeed/js
mkdir -p wp-content/litespeed/css wp-content/litespeed/js
chown -R www-data:www-data wp-content/litespeed 2>/dev/null || true

echo "Clearing Makumbiri WordPress cache directories when present"
rm -rf wp-content/cache/litespeed wp-content/cache/ls-cache wp-content/cache/page_enhanced 2>/dev/null || true

if command -v wp >/dev/null 2>&1; then
  echo "Running best-effort WP cache purges with timeout"
  timeout 30 wp cache flush --allow-root || true
  timeout 30 wp litespeed-purge all --allow-root || true
  timeout 30 wp transient delete --all --allow-root || true
else
  echo "wp-cli not installed; filesystem cache purge completed"
fi

echo "Requesting public homepage to trigger fresh CSS generation"
for i in 1 2 3; do
  curl -k -sS -A "Mozilla/5.0 BantuBuzzCacheWarmup/$i" "https://$DOMAIN/?bb_cache_warmup=$(date +%s)-$i" -o "$HTML"
  sleep 2
done

echo "Finding fresh optimized assets"
read -r CSS_URL JS_URL < <(
  python3 - "$HTML" "$DOMAIN" <<'PY'
import re
import sys

html_path, domain = sys.argv[1], sys.argv[2]
html = open(html_path, encoding='utf-8', errors='replace').read()

def first(pattern):
    match = re.search(pattern, html, flags=re.I)
    if not match:
        return ''
    url = match.group(0)
    if url.startswith('//'):
        return 'https:' + url
    if url.startswith('/'):
        return f'https://{domain}{url}'
    return url

css = first(r'(?:https:)?//[^"\' )]+wp-content/litespeed/css/[^"\' )]+\.css[^"\' )]*|/wp-content/litespeed/css/[^"\' )]+\.css[^"\' )]*')
js = first(r'(?:https:)?//[^"\' )]+wp-content/litespeed/js/[^"\' )]+\.js[^"\' )]*|/wp-content/litespeed/js/[^"\' )]+\.js[^"\' )]*')
print(css, js)
PY
)

if [ -z "$CSS_URL" ]; then
  echo "Fresh public HTML did not reference a LiteSpeed CSS bundle."
  echo "This can be okay if optimization regenerated into normal theme stylesheets; showing first stylesheets:"
  grep -Eoi '<link[^>]+stylesheet[^>]*>' "$HTML" | head -20 || true
  exit 1
fi

echo "Fresh CSS URL: $CSS_URL"
CSS_HEADERS="$(curl -k -sS -I "$CSS_URL")"
echo "$CSS_HEADERS"
echo "$CSS_HEADERS" | grep -qiE '^content-type:[[:space:]]*text/css' || {
  echo "Fresh CSS is not served as text/css"
  exit 1
}

CSS_SIZE="$(curl -k -sS "$CSS_URL" | wc -c)"
echo "Fresh CSS byte size: $CSS_SIZE"
if [ "$CSS_SIZE" -lt 10000 ]; then
  echo "Fresh CSS bundle is unexpectedly small"
  exit 1
fi

if [ -n "$JS_URL" ]; then
  echo "Fresh JS URL: $JS_URL"
  JS_HEADERS="$(curl -k -sS -I "$JS_URL")"
  echo "$JS_HEADERS"
fi

echo "Apache status:"
systemctl is-active apache2

echo "MAKUMBIRI_PUBLIC_CSS_CACHE_PURGE_SUCCESS"
