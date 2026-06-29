#!/usr/bin/env bash
set -euo pipefail

DOMAIN="makumbirigamepark.com"
WEBROOT="/var/www/makumbirigamepark.com"
BACKUP="/var/backups/bantubuzz/makumbiri-disable-broken-optimization-before-$(date +%Y%m%d_%H%M%S)"
HTML="/tmp/makumbiri-disable-broken-optimization.html"

cd "$WEBROOT"

echo "Creating backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/generated-cache.tar.gz" \
  wp-content/litespeed \
  wp-content/cache \
  wp-content/uploads/elementor/css 2>/dev/null || true

echo "Backing up current LiteSpeed option payloads"
php <<'PHP' > "$BACKUP/litespeed-options-before.json"
<?php
require 'wp-load.php';
$keys = ['litespeed.conf', 'litespeed-cache-conf', 'litespeed_cache_conf'];
$out = [];
foreach ($keys as $key) {
    $out[$key] = get_option($key, null);
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
PHP

echo "Disabling Makumbiri CSS/JS optimization options"
php <<'PHP'
<?php
require 'wp-load.php';

$optionKeys = ['litespeed.conf', 'litespeed-cache-conf', 'litespeed_cache_conf'];
$knownDisableKeys = [
    'optm-css_min',
    'optm-css_comb',
    'optm-css_comb_ext_inl',
    'optm-css_async',
    'optm-ccss_per_url',
    'optm-ccss_async',
    'optm-ucss',
    'optm-ucss_inline',
    'optm-css_exc',
    'optm-js_min',
    'optm-js_comb',
    'optm-js_comb_ext_inl',
    'optm-js_defer',
    'optm-js_defer_exc',
    'optm-guest',
    'optm-guest_only',
];
$pattern = '/(^optm-.*(css|js|ucss|ccss)|css_(min|comb|async)|js_(min|comb|defer)|critical|guest)/i';

foreach ($optionKeys as $optionKey) {
    $conf = get_option($optionKey, null);
    if (!is_array($conf)) {
        echo "Skipping $optionKey because it is " . gettype($conf) . PHP_EOL;
        continue;
    }

    $changed = false;
    foreach ($knownDisableKeys as $key) {
        if (array_key_exists($key, $conf)) {
            $conf[$key] = 0;
            $changed = true;
        }
    }

    foreach ($conf as $key => $value) {
        if (is_string($key) && preg_match($pattern, $key)) {
            if (is_bool($value)) {
                $conf[$key] = false;
            } elseif (is_numeric($value)) {
                $conf[$key] = 0;
            } elseif (is_string($value) && in_array(strtolower($value), ['1', 'on', 'true', 'yes'], true)) {
                $conf[$key] = '0';
            }
            $changed = true;
        }
    }

    if ($changed) {
        update_option($optionKey, $conf, false);
        echo "Updated $optionKey" . PHP_EOL;
    } else {
        echo "No optimization keys changed in $optionKey" . PHP_EOL;
    }
}

if (function_exists('do_action')) {
    do_action('litespeed_purge_all');
    do_action('litespeed_purge_url', home_url('/'));
}
PHP

echo "Purging generated LiteSpeed/public cache files"
rm -rf wp-content/litespeed/css wp-content/litespeed/js
mkdir -p wp-content/litespeed/css wp-content/litespeed/js
rm -rf wp-content/cache/litespeed wp-content/cache/ls-cache wp-content/cache/page_enhanced 2>/dev/null || true
chown -R www-data:www-data wp-content/litespeed wp-content/cache 2>/dev/null || true

echo "Warming public homepage"
for i in 1 2 3; do
  curl -k -sS -A "Mozilla/5.0 MakumbiriOptimizationFix/$i" "https://$DOMAIN/?bb_disable_optm=$(date +%s)-$i" -o "$HTML"
  sleep 2
done

echo "Stylesheets in fresh public HTML"
grep -Eoi '<link[^>]+stylesheet[^>]*>' "$HTML" | sed -n '1,60p' || true

echo "Checking whether optimized LiteSpeed bundle is still present"
if grep -qi '/wp-content/litespeed/css/' "$HTML"; then
  echo "WARNING: Public HTML still references LiteSpeed optimized CSS."
  grep -Eoi '(https:)?//[^"'"'"' )]+wp-content/litespeed/css/[^"'"'"' )]+|/wp-content/litespeed/css/[^"'"'"' )]+' "$HTML" | sed -n '1,20p'
else
  echo "Public HTML no longer references LiteSpeed optimized CSS."
fi

echo "Checking representative stylesheet status"
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
if [ -z "$STYLE_URL" ]; then
  echo "Could not find a stylesheet in fresh public HTML"
  exit 1
fi
echo "Representative stylesheet: $STYLE_URL"
curl -k -sS -I "$STYLE_URL"

echo "Apache status:"
systemctl is-active apache2

echo "MAKUMBIRI_DISABLE_BROKEN_OPTIMIZATION_SUCCESS"
