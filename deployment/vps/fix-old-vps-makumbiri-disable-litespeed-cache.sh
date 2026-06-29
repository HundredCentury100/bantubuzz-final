#!/usr/bin/env bash
set -euo pipefail

DOMAIN="makumbirigamepark.com"
WEBROOT="/var/www/makumbirigamepark.com"
BACKUP="/var/backups/bantubuzz/makumbiri-disable-litespeed-cache-before-$(date +%Y%m%d_%H%M%S)"
HTML="/tmp/makumbiri-disable-litespeed-cache.html"

cd "$WEBROOT"

echo "Creating backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/generated-cache.tar.gz" \
  wp-content/litespeed \
  wp-content/cache \
  wp-content/uploads/elementor/css 2>/dev/null || true

echo "Backing up active plugin and LiteSpeed options"
php <<'PHP' > "$BACKUP/wordpress-options-before.json"
<?php
require 'wp-load.php';
$keys = [
    'active_plugins',
    'litespeed.conf',
    'litespeed-cache-conf',
    'litespeed_cache_conf',
];
$out = [];
foreach ($keys as $key) {
    $out[$key] = get_option($key, null);
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
PHP

echo "Deactivating LiteSpeed Cache plugin for Makumbiri only"
php <<'PHP'
<?php
require 'wp-load.php';

$plugins = get_option('active_plugins', []);
if (!is_array($plugins)) {
    echo "active_plugins option is not an array; aborting" . PHP_EOL;
    exit(1);
}

$targets = [
    'litespeed-cache/litespeed-cache.php',
];

$before = $plugins;
$plugins = array_values(array_filter($plugins, function ($plugin) use ($targets) {
    return !in_array($plugin, $targets, true);
}));

if ($plugins !== $before) {
    update_option('active_plugins', $plugins, true);
    echo "LiteSpeed Cache deactivated" . PHP_EOL;
} else {
    echo "LiteSpeed Cache was not active in active_plugins" . PHP_EOL;
}

foreach (['litespeed.conf', 'litespeed-cache-conf', 'litespeed_cache_conf'] as $key) {
    $conf = get_option($key, null);
    if (is_array($conf)) {
        $conf['_bantubuzz_disabled_note'] = 'Public optimizer disabled because Makumbiri public Slider Revolution/fonts broke while editor remained correct.';
        update_option($key, $conf, false);
    }
}
PHP

echo "Purging Makumbiri generated public optimization files"
rm -rf wp-content/litespeed
rm -rf wp-content/cache/litespeed wp-content/cache/ls-cache wp-content/cache/page_enhanced 2>/dev/null || true
mkdir -p wp-content/litespeed
chown -R www-data:www-data wp-content/litespeed wp-content/cache 2>/dev/null || true

echo "Clearing PHP opcache when available"
php -r 'if (function_exists("opcache_reset")) { opcache_reset(); echo "opcache reset\n"; } else { echo "opcache unavailable\n"; }' || true

echo "Reloading Apache"
apache2ctl configtest
systemctl reload apache2
sleep 2

echo "Warming public homepage"
for i in 1 2 3; do
  curl -k -sS -A "Mozilla/5.0 MakumbiriLiteSpeedDisable/$i" "https://$DOMAIN/?bb_no_litespeed=$(date +%s)-$i" -o "$HTML"
  sleep 2
done

echo "Public page stylesheets after disabling LiteSpeed"
grep -Eoi '<link[^>]+stylesheet[^>]*>' "$HTML" | sed -n '1,80p' || true

echo "Checking for remaining LiteSpeed combined bundles"
if grep -qi '/wp-content/litespeed/' "$HTML"; then
  echo "Public page still references /wp-content/litespeed assets:"
  grep -Eoi '(https:)?//[^"'"'"' )]+wp-content/litespeed/[^"'"'"' )]+|/wp-content/litespeed/[^"'"'"' )]+' "$HTML" | sed -n '1,40p'
  exit 1
else
  echo "No /wp-content/litespeed combined assets in public HTML"
fi

echo "Checking Slider Revolution assets/markup"
if grep -qiE 'revslider|rev_slider|rs-module|rbtools|tp-revslider' "$HTML"; then
  echo "Slider Revolution markers are present in public HTML"
  grep -Eoi '(https:)?//[^"'"'"' )]+(revslider|rbtools|rs6|tp-revslider)[^"'"'"' )]+|/[^"'"'"' )]+(revslider|rbtools|rs6|tp-revslider)[^"'"'"' )]+' "$HTML" | sed -n '1,60p' || true
else
  echo "WARNING: Slider Revolution markers were not found in public HTML"
fi

echo "Checking font references"
grep -Eoi '(https:)?//[^"'"'"' )]+(fonts\.googleapis|fonts\.gstatic)[^"'"'"' )]+|font-family:[^;}]+|@font-face' "$HTML" | sed -n '1,40p' || true

echo "Representative stylesheet header"
STYLE_URL="$(python3 - "$HTML" "$DOMAIN" <<'PY'
import re
import sys
html = open(sys.argv[1], encoding='utf-8', errors='replace').read()
domain = sys.argv[2]
match = re.search(r'<link[^>]+stylesheet[^>]+href=["\']([^"\']+)["\']', html, flags=re.I)
if match:
    url = match.group(1)
    if url.startswith('//'):
        url = 'https:' + url
    elif url.startswith('/'):
        url = f'https://{domain}{url}'
    print(url)
PY
)"
if [ -n "$STYLE_URL" ]; then
  echo "$STYLE_URL"
  curl -k -sS -I "$STYLE_URL"
fi

echo "Apache status:"
systemctl is-active apache2

echo "MAKUMBIRI_DISABLE_LITESPEED_CACHE_SUCCESS"
