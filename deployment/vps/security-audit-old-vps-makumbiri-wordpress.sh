#!/usr/bin/env bash
set -u

DOMAIN="makumbirigamepark.com"
WWW_DOMAIN="www.makumbirigamepark.com"
WEBROOT="/var/www/makumbirigamepark.com"
HTML="/tmp/makumbiri-security-home.html"
USER_AGENT="Mozilla/5.0 (compatible; BantuBuzzSecurityAudit/1.0)"

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

print_file_sample() {
  local file="$1"
  echo
  echo "--- suspicious file sample: $file ---"
  sed -n '1,80p' "$file" 2>/dev/null | sed -E 's/(DB_PASSWORD.*).*/\1 ***REDACTED***/' || true
}

section "Audit metadata"
run date -u
run hostnamectl
run whoami
run uptime
run df -h

section "Network, DNS, and response reputation clues"
run getent hosts "$DOMAIN"
run getent hosts "$WWW_DOMAIN"
run curl -k -sS -L -A "$USER_AGENT" -D /tmp/makumbiri-security-headers.txt -o "$HTML" --max-time 30 "https://$DOMAIN/"
run cat /tmp/makumbiri-security-headers.txt
run wc -c "$HTML"
run curl -k -sS -I -A "$USER_AGENT" --max-time 20 "https://$DOMAIN/"
run curl -sS -I -A "$USER_AGENT" --max-time 20 "http://$DOMAIN/"
run curl -k -sS -I -A "$USER_AGENT" --max-time 20 "https://$WWW_DOMAIN/"
run curl -sS -I -A "$USER_AGENT" --max-time 20 "http://$WWW_DOMAIN/"

section "Public HTML danger scan"
echo "--- title/meta/scripts/iframes/forms ---"
grep -Eio '<title[^>]*>.*</title>|<meta[^>]+>|<script[^>]*src=["'"'"'][^"'"'"']+|<iframe[^>]+|<form[^>]+|window\.location|document\.location|eval\(|atob\(|unescape\(' "$HTML" | sed -n '1,220p' || true
echo
echo "--- external domains in HTML ---"
grep -Eio 'https?://[^"'"'"' )<>]+' "$HTML" | sed -E 's#https?://([^/]+)/?.*#\1#' | sort -u | sed -n '1,220p' || true
echo
echo "--- suspicious public HTML strings ---"
grep -Ein 'casino|viagra|pharmacy|loan|porn|adult|betting|crypto|wallet|malware|redirect|base64|eval\(|atob\(|fromCharCode|document\.write|iframe|\.ru/|\.cn/|\.top/|\.xyz/|telegram|whatsapp' "$HTML" | sed -n '1,220p' || true

section "Apache vhost and document root"
run apache2ctl -S
run grep -RInE "makumbiri|gamepark|DocumentRoot|ServerName|ServerAlias" /etc/apache2/sites-enabled /etc/apache2/sites-available
run ls -la "$WEBROOT"
run find /var/www -maxdepth 5 -name wp-config.php -print

section "WordPress core and configuration"
if [ -f "$WEBROOT/wp-config.php" ]; then
  cd "$WEBROOT"
  run grep -nE "DB_NAME|DB_USER|DB_HOST|table_prefix|WP_HOME|WP_SITEURL|DISALLOW_FILE_EDIT|AUTH_KEY|SECURE_AUTH_KEY" wp-config.php
  if command -v wp >/dev/null 2>&1; then
    run wp core version --allow-root
    run wp core verify-checksums --allow-root
    run wp option get home --allow-root
    run wp option get siteurl --allow-root
    run wp option get blog_public --allow-root
    run wp user list --fields=ID,user_login,user_email,roles,user_registered --allow-root
    run wp plugin list --allow-root
    run wp theme list --allow-root
    run wp option get active_plugins --format=json --allow-root
  else
    echo "wp-cli not installed; skipping WP-CLI checks"
  fi
else
  echo "Expected webroot missing wp-config.php: $WEBROOT/wp-config.php"
fi

section "Recently modified WordPress files"
run find "$WEBROOT" -type f -mtime -14 -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort | tail -260
run find "$WEBROOT/wp-content" -type f -mtime -30 -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort | tail -260

section "Executable PHP where it usually should not be"
run find "$WEBROOT/wp-content/uploads" -type f \( -iname '*.php' -o -iname '*.phtml' -o -iname '*.phar' -o -iname '*.shtml' \) -printf '%TY-%Tm-%Td %TH:%TM %s %p\n'
run find "$WEBROOT/wp-content/cache" -type f \( -iname '*.php' -o -iname '*.phtml' -o -iname '*.phar' \) -printf '%TY-%Tm-%Td %TH:%TM %s %p\n'

section "Common malware/backdoor string scan"
SUSPICIOUS_LIST="/tmp/makumbiri-suspicious-files.txt"
grep -RIlE --exclude-dir=node_modules --exclude-dir=.git --exclude='*.log' --exclude='*.sql' \
  'eval[[:space:]]*\(|base64_decode[[:space:]]*\(|gzinflate[[:space:]]*\(|str_rot13[[:space:]]*\(|shell_exec[[:space:]]*\(|passthru[[:space:]]*\(|system[[:space:]]*\(|assert[[:space:]]*\(|preg_replace[[:space:]]*\(.*/e|FilesMan|WSO|c99|r57|b374k|wp_vcd|malware|pharma|viagra|casino|hacked|document\.write[[:space:]]*\(|atob[[:space:]]*\(' \
  "$WEBROOT" 2>/dev/null | sort > "$SUSPICIOUS_LIST" || true
run wc -l "$SUSPICIOUS_LIST"
sed -n '1,180p' "$SUSPICIOUS_LIST"
while IFS= read -r file; do
  [ -f "$file" ] || continue
  print_file_sample "$file"
done < <(sed -n '1,20p' "$SUSPICIOUS_LIST")

section "Suspicious filenames and hidden files"
run find "$WEBROOT" -type f \( \
  -iname '*.suspected' -o -iname '*.bak' -o -iname '*.old' -o -iname '*.save' -o -iname '*.orig' -o \
  -iname 'wp-*.php.*' -o -iname '.*.php' -o -iname '*shell*' -o -iname '*backdoor*' -o -iname '*wso*' -o -iname '*c99*' -o -iname '*r57*' \
  \) -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort | tail -220
run find "$WEBROOT" -name '.htaccess' -printf '%TY-%Tm-%Td %TH:%TM %s %p\n'

section "htaccess and redirect rules"
while IFS= read -r htaccess; do
  [ -f "$htaccess" ] || continue
  echo
  echo "--- $htaccess ---"
  sed -n '1,220p' "$htaccess" || true
done < <(find "$WEBROOT" -name '.htaccess' -print 2>/dev/null)

section "Permissions and ownership anomalies"
run find "$WEBROOT" -type f -perm -o+w -printf '%m %u:%g %p\n' | sed -n '1,220p'
run find "$WEBROOT" -type d -perm -o+w -printf '%m %u:%g %p\n' | sed -n '1,220p'
run find "$WEBROOT" -not -user www-data -not -user root -printf '%u:%g %m %p\n' | sed -n '1,220p'

section "Apache/PHP logs with suspicious traffic"
run tail -220 /var/log/apache2/error.log
for log in /var/log/apache2/access.log /var/log/apache2/*makumbiri* /var/log/apache2/*gamepark*; do
  [ -f "$log" ] || continue
  echo
  echo "--- suspicious requests in $log ---"
  grep -Ei 'wp-admin|wp-login|xmlrpc|eval|base64|shell|upload|\.php\?|/vendor/|/cgi-bin/|\.env|wp-config|passwd|select.+from|union.+select|script|iframe|bot|curl|python|nikto|wpscan' "$log" | tail -180 || true
done

section "System-level persistence and unexpected services"
run crontab -l
run ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly
run systemctl --type=service --state=running --no-pager
run ss -ltnp
run ps aux --sort=-%cpu | head -40
run ps aux --sort=-%mem | head -40

section "Package and security updates snapshot"
run apt list --upgradable
run php -v
run apache2 -v
run mysql --version

section "Recommended immediate next steps"
cat <<'EOF'
This was a read-only audit. If suspicious files are found:
1. Do not delete blindly; first archive the site and database.
2. Put the site behind maintenance or Cloudflare WAF if actively serving malware.
3. Update WordPress core, themes, and plugins after taking backups.
4. Rotate WordPress admin passwords, database password, FTP/SFTP passwords, and salts.
5. Remove unused admin users/plugins/themes.
6. Compare WordPress core with checksums and restore clean plugin/theme copies.
7. Request review in Google Search Console / Safe Browsing after cleaning.
EOF

echo
echo "MAKUMBIRI_SECURITY_AUDIT_COMPLETE"
