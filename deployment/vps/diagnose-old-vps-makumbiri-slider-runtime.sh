#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="makumbirigamepark.com"
URL="https://${DOMAIN}/?bb_slider_diag=$(date +%s)"
WP_PATH="/var/www/makumbirigamepark.com"
TMP_DIR="/tmp/makumbiri-slider-runtime-diagnostic"
HTML_FILE="${TMP_DIR}/homepage.html"
ERROR_LOG="/var/log/apache2/makumbirigamepark-error.log"
ACCESS_LOG="/var/log/apache2/makumbirigamepark-access.log"

mkdir -p "$TMP_DIR"

section() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

header_for() {
  local asset_url="$1"
  echo "--- ${asset_url}"
  curl -k -L -sS -I --max-time 20 "$asset_url" | sed -n '1,20p' || true
}

section "Fetching public Makumbiri homepage"
echo "URL: ${URL}"
curl -k -L -sS --max-time 30 -H "Cache-Control: no-cache" -o "$HTML_FILE" "$URL"
wc -c "$HTML_FILE" || true

section "Page-level response headers"
curl -k -L -sS -I --max-time 20 -H "Cache-Control: no-cache" "$URL" | sed -n '1,40p' || true

section "Optimization plugins still present in public HTML"
if grep -qE '/wp-content/(cache/autoptimize|litespeed)/' "$HTML_FILE"; then
  grep -oE 'https?://[^"]+/wp-content/(cache/autoptimize|litespeed)/[^"]+' "$HTML_FILE" | head -30 || true
else
  echo "No Autoptimize or LiteSpeed generated assets found in public HTML."
fi

section "Slider Revolution markup markers"
for pattern in "sr7-module" "sr7-content" "rs-module" "rev_slider" "SR7" "tptools" "revapi"; do
  count="$(grep -oi "$pattern" "$HTML_FILE" | wc -l | tr -d ' ')"
  echo "${pattern}: ${count}"
done
echo
grep -nE 'sr7-module|rs-module|rev_slider|SR7|tptools|revapi' "$HTML_FILE" | head -80 || true

section "Script order around jQuery and Slider Revolution"
python3 - "$HTML_FILE" <<'PY'
import re, sys
html = open(sys.argv[1], "r", encoding="utf-8", errors="replace").read()
scripts = re.findall(r"<script\b[^>]*\bsrc=['\"]([^'\"]+)['\"][^>]*>", html, flags=re.I)
for idx, src in enumerate(scripts, 1):
    lower = src.lower()
    if any(key in lower for key in ["jquery", "revslider", "sr7", "tptools", "elementor", "hoteler"]):
        print(f"{idx:03d} {src}")
PY

section "Representative asset headers"
python3 - "$HTML_FILE" > "${TMP_DIR}/assets.txt" <<'PY'
import re, sys
html = open(sys.argv[1], "r", encoding="utf-8", errors="replace").read()
urls = []
for pattern in [
    r"<link\b[^>]*\bhref=['\"]([^'\"]+)['\"][^>]*>",
    r"<script\b[^>]*\bsrc=['\"]([^'\"]+)['\"][^>]*>",
]:
    urls.extend(re.findall(pattern, html, flags=re.I))

def absolute(url):
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        return "https://makumbirigamepark.com" + url
    return url

interesting = []
for url in urls:
    lower = url.lower()
    if any(key in lower for key in [
        "revslider", "sr7", "tptools", "elementor/css/post-8266",
        "hoteler/assets/css/style-main", "hoteler-google-fonts",
        "fonts.googleapis.com", "jquery.min.js"
    ]):
        abs_url = absolute(url)
        if abs_url not in interesting:
            interesting.append(abs_url)

for url in interesting:
    print(url)
PY

if [ -s "${TMP_DIR}/assets.txt" ]; then
  while IFS= read -r asset; do
    header_for "$asset"
  done < "${TMP_DIR}/assets.txt"
else
  echo "No representative assets found."
fi

section "Slider Revolution plugin files on disk"
ls -lah "${WP_PATH}/wp-content/plugins/revslider/public/js" || true
ls -lah "${WP_PATH}/wp-content/plugins/revslider/public/js/libs" || true
ls -lah "${WP_PATH}/wp-content/plugins/revslider/public/css" || true

section "Active plugins"
if command -v wp >/dev/null 2>&1; then
  cd "$WP_PATH"
  wp plugin list --allow-root --status=active --field=name || true
else
  echo "wp-cli not found."
fi

section "Recent Makumbiri Apache/PHP errors"
if [ -f "$ERROR_LOG" ]; then
  tail -160 "$ERROR_LOG" || true
else
  echo "No dedicated error log found at ${ERROR_LOG}."
  tail -160 /var/log/apache2/error.log || true
fi

section "Recent Makumbiri access log status samples"
if [ -f "$ACCESS_LOG" ]; then
  tail -80 "$ACCESS_LOG" | awk '{print $9, $7}' | sort | uniq -c | sort -nr | head -40 || true
else
  echo "No dedicated access log found at ${ACCESS_LOG}."
fi

section "Apache status"
systemctl is-active apache2 || true

echo
echo "MAKUMBIRI_SLIDER_RUNTIME_DIAGNOSTIC_COMPLETE"
