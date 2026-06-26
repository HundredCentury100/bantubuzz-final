#!/usr/bin/env bash
set -u

DOMAIN="makumbirigamepark.com"
WEBROOT="/var/www/makumbirigamepark.com"
HTML="/tmp/makumbiri-css-home.html"
ASSETS="/tmp/makumbiri-css-assets.txt"

section() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

run() {
  echo
  echo "--- $* ---"
  "$@" 2>&1 || true
}

section "Public page response"
run curl -k -sS -D /tmp/makumbiri-css-headers.txt -o "$HTML" "https://$DOMAIN/"
run cat /tmp/makumbiri-css-headers.txt
run wc -c "$HTML"

section "Stylesheet and asset URLs in public HTML"
grep -Eoi '<link[^>]+>' "$HTML" | grep -Ei 'stylesheet|css|wp-content|elementor|themes|plugins' || true
grep -Eoi 'https?://[^"'"'"' )]+' "$HTML" | grep -Ei 'css|wp-content|elementor|themes|plugins|uploads' | sort -u > "$ASSETS" || true
grep -Eoi '/[^"'"'"' )]+(css|wp-content|elementor|themes|plugins|uploads)[^"'"'"' )]*' "$HTML" | sort -u >> "$ASSETS" || true
sort -u "$ASSETS" | sed -n '1,160p'

section "Asset HTTP statuses"
while IFS= read -r asset; do
  [ -n "$asset" ] || continue
  case "$asset" in
    http://*|https://*) url="$asset" ;;
    //*) url="https:$asset" ;;
    /*) url="https://$DOMAIN$asset" ;;
    *) url="https://$DOMAIN/$asset" ;;
  esac
  code="$(curl -k -sS -L -o /tmp/makumbiri-asset-body -w '%{http_code}' --max-time 20 "$url" 2>/tmp/makumbiri-asset-error || true)"
  ctype="$(file -b --mime-type /tmp/makumbiri-asset-body 2>/dev/null || true)"
  size="$(wc -c < /tmp/makumbiri-asset-body 2>/dev/null || echo 0)"
  err="$(cat /tmp/makumbiri-asset-error 2>/dev/null || true)"
  printf '%s %s %s %s\n' "$code" "$ctype" "$size" "$url"
  if [ -n "$err" ]; then
    echo "  curl_error: $err"
  fi
done < <(sort -u "$ASSETS" | sed -n '1,120p')

section "Mixed content and old URL checks"
run grep -Eio 'http://[^"'"'"' )]+' "$HTML"
run grep -Eio 'https?://(www\.)?(makumbirigamepark\.com|173\.212\.245\.22|localhost|[^/"'"'"' )]+pythonanywhere\.com)[^"'"'"' )]*' "$HTML"

section "WordPress URL options"
if [ -f "$WEBROOT/wp-config.php" ]; then
  cd "$WEBROOT"
  if command -v wp >/dev/null 2>&1; then
    run wp option get home --allow-root
    run wp option get siteurl --allow-root
    run wp option get stylesheet --allow-root
    run wp option get template --allow-root
    run wp plugin list --allow-root
    run wp theme list --allow-root
  else
    echo "wp-cli not installed"
    run grep -nE "WP_HOME|WP_SITEURL|DB_NAME|DB_USER|DB_HOST|table_prefix" wp-config.php
  fi
else
  echo "Missing expected wp-config.php at $WEBROOT/wp-config.php"
fi

section "Cache and generated CSS directories"
run find "$WEBROOT/wp-content" -maxdepth 4 -type d \( -iname '*cache*' -o -iname '*elementor*' -o -iname '*uploads*' \) -print
run find "$WEBROOT/wp-content/uploads" -maxdepth 4 -type f \( -iname '*.css' -o -iname '*.min.css' \) -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort | tail -80

section "Apache/PHP handling"
run apache2ctl -S
run systemctl --no-pager --full status apache2
run php -v
run ls -la "$WEBROOT"
run tail -80 /var/log/apache2/makumbirigamepark-error.log

echo
echo "MAKUMBIRI_CSS_DIAGNOSTIC_COMPLETE"
