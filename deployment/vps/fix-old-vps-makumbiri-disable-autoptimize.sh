#!/usr/bin/env bash
set -euo pipefail

DOMAIN="makumbirigamepark.com"
WEBROOT="/var/www/makumbirigamepark.com"
BACKUP="/var/backups/bantubuzz/makumbiri-disable-autoptimize-before-$(date +%Y%m%d_%H%M%S)"
HTML="/tmp/makumbiri-disable-autoptimize.html"

cd "$WEBROOT"

echo "Creating backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/autoptimize-cache.tar.gz" \
  wp-content/cache/autoptimize 2>/dev/null || true

echo "Backing up active plugins and Autoptimize options"
php <<'PHP' > "$BACKUP/wordpress-autoptimize-before.json"
<?php
require 'wp-load.php';
$out = [
    'active_plugins' => get_option('active_plugins', null),
];
global $wpdb;
$rows = $wpdb->get_results(
    "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'autoptimize%'",
    ARRAY_A
);
foreach ($rows as $row) {
    $out[$row['option_name']] = maybe_unserialize($row['option_value']);
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
PHP

echo "Deactivating Autoptimize plugin for Makumbiri only"
php <<'PHP'
<?php
require 'wp-load.php';

$plugins = get_option('active_plugins', []);
if (!is_array($plugins)) {
    echo "active_plugins option is not an array; aborting" . PHP_EOL;
    exit(1);
}

$targets = [
    'autoptimize/autoptimize.php',
];

$before = $plugins;
$plugins = array_values(array_filter($plugins, function ($plugin) use ($targets) {
    return !in_array($plugin, $targets, true);
}));

if ($plugins !== $before) {
    update_option('active_plugins', $plugins, true);
    echo "Autoptimize deactivated" . PHP_EOL;
} else {
    echo "Autoptimize was not active in active_plugins" . PHP_EOL;
}

update_option('autoptimize_css', 'off', false);
update_option('autoptimize_js', 'off', false);
update_option('autoptimize_html', 'off', false);
update_option('autoptimize_imgopt', 'off', false);
update_option('autoptimize_extra_note', 'Disabled by BantuBuzz because public Slider Revolution/fonts broke while Elementor editor remained correct.', false);
PHP

echo "Purging Makumbiri Autoptimize generated files"
rm -rf wp-content/cache/autoptimize
mkdir -p wp-content/cache/autoptimize
chown -R www-data:www-data wp-content/cache 2>/dev/null || true

echo "Clearing PHP opcache when available"
php -r 'if (function_exists("opcache_reset")) { opcache_reset(); echo "opcache reset\n"; } else { echo "opcache unavailable\n"; }' || true

echo "Reloading Apache"
apache2ctl configtest
systemctl reload apache2
sleep 2

echo "Warming public homepage"
for i in 1 2 3; do
  curl -k -sS -A "Mozilla/5.0 MakumbiriAutoptimizeDisable/$i" "https://$DOMAIN/?bb_no_autoptimize=$(date +%s)-$i" -o "$HTML"
  sleep 2
done

echo "Public page stylesheets after disabling Autoptimize"
grep -Eoi '<link[^>]+stylesheet[^>]*>' "$HTML" | sed -n '1,100p' || true

echo "Checking for remaining Autoptimize assets"
if grep -qi '/wp-content/cache/autoptimize/' "$HTML"; then
  echo "Public page still references Autoptimize assets:"
  grep -Eoi '(https:)?//[^"'"'"' )]+wp-content/cache/autoptimize/[^"'"'"' )]+|/wp-content/cache/autoptimize/[^"'"'"' )]+' "$HTML" | sed -n '1,80p'
  exit 1
else
  echo "No /wp-content/cache/autoptimize assets in public HTML"
fi

echo "Checking Slider Revolution assets/markup"
if grep -qiE 'revslider|rev_slider|rs-module|rbtools|tp-revslider|sr7' "$HTML"; then
  echo "Slider Revolution markers are present in public HTML"
  grep -Eoi '(https:)?//[^"'"'"' )]+(revslider|rbtools|rs6|tp-revslider|sr7)[^"'"'"' )]+|/[^"'"'"' )]+(revslider|rbtools|rs6|tp-revslider|sr7)[^"'"'"' )]+' "$HTML" | sed -n '1,80p' || true
else
  echo "WARNING: Slider Revolution markers were not found in public HTML"
fi

echo "Checking Google font references"
grep -Eoi '(https:)?//[^"'"'"' )]+fonts\.(googleapis|gstatic)[^"'"'"' )]+' "$HTML" | sed -n '1,40p' || true

echo "Checking representative stylesheet header"
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

echo "MAKUMBIRI_DISABLE_AUTOPTIMIZE_SUCCESS"
