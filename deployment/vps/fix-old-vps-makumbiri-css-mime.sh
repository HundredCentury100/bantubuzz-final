#!/usr/bin/env bash
set -euo pipefail

DOMAIN="makumbirigamepark.com"
CONF_AVAILABLE="/etc/apache2/conf-available/makumbiri-asset-mime.conf"
CONF_ENABLED="/etc/apache2/conf-enabled/makumbiri-asset-mime.conf"
BACKUP="/var/backups/bantubuzz/makumbiri-css-mime-before-$(date +%Y%m%d_%H%M%S)"

echo "Creating Apache config backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/apache-sites-and-conf.tar.gz" \
  /etc/apache2/sites-available \
  /etc/apache2/sites-enabled \
  /etc/apache2/conf-available \
  /etc/apache2/conf-enabled

echo "Writing explicit asset MIME config"
cat > "$CONF_AVAILABLE" <<'EOF'
# BantuBuzz/Makumbiri compatibility fix.
# The public site uses optimized LiteSpeed CSS/JS assets under wp-content.
# Apache must serve these with browser-accepted MIME types because the site
# also sends X-Content-Type-Options: nosniff.
<IfModule mod_mime.c>
    AddType text/css .css
    AddType application/javascript .js .mjs
    AddType image/svg+xml .svg .svgz
</IfModule>
<LocationMatch "^/wp-content/litespeed/css/.*\.css$">
    ForceType text/css
</LocationMatch>
<LocationMatch "^/wp-content/litespeed/js/.*\.js$">
    ForceType application/javascript
</LocationMatch>
EOF

echo "Ensuring Apache MIME module and config are enabled"
a2enmod mime >/dev/null
a2enconf makumbiri-asset-mime >/dev/null

echo "Testing Apache configuration"
apache2ctl configtest

echo "Reloading Apache"
systemctl reload apache2
sleep 2

echo "Finding current optimized assets"
HTML="/tmp/makumbiri-css-mime-check.html"
curl -k -sS "https://$DOMAIN/" -o "$HTML"
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
  echo "Could not find optimized CSS URL in public HTML"
  exit 1
fi

echo "CSS URL: $CSS_URL"
CSS_HEADERS="$(curl -k -sS -I "$CSS_URL")"
echo "$CSS_HEADERS"
echo "$CSS_HEADERS" | grep -qiE '^content-type:[[:space:]]*text/css' || {
  echo "CSS is still not served as text/css"
  exit 1
}

if [ -n "$JS_URL" ]; then
  echo "JS URL: $JS_URL"
  JS_HEADERS="$(curl -k -sS -I "$JS_URL")"
  echo "$JS_HEADERS"
  echo "$JS_HEADERS" | grep -qiE '^content-type:[[:space:]]*(application/javascript|text/javascript)' || {
    echo "JS is still not served as JavaScript"
    exit 1
  }
fi

echo "Apache status:"
systemctl is-active apache2

echo "MAKUMBIRI_CSS_MIME_FIX_SUCCESS"
