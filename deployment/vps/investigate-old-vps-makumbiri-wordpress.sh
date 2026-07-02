#!/usr/bin/env bash
set -u

DOMAIN="makumbirigamepark.com"
WWW_DOMAIN="www.makumbirigamepark.com"

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

section "Host"
run hostnamectl
run date
run uptime
run whoami

section "Network and DNS from old VPS"
run getent hosts "$DOMAIN"
run getent hosts "$WWW_DOMAIN"
run ss -ltnp
run curl -sS -I --max-time 15 "http://$DOMAIN/"
run curl -k -sS -I --max-time 15 "https://$DOMAIN/"
run curl -sS -I --max-time 15 "http://$WWW_DOMAIN/"
run curl -k -sS -I --max-time 15 "https://$WWW_DOMAIN/"

section "Apache status and config"
run systemctl --no-pager --full status apache2
run systemctl is-enabled apache2
run apache2ctl configtest
run apache2ctl -S
run ls -la /etc/apache2/sites-enabled
run ls -la /etc/apache2/sites-available

section "Apache vhost files mentioning Makumbiri"
grep -RInE "makumbiri|gamepark|DocumentRoot|ServerName|ServerAlias|wordpress" /etc/apache2/sites-available /etc/apache2/sites-enabled 2>&1 || true

section "Document roots and likely WordPress installs"
run ls -la /var/www
find /var/www -maxdepth 4 \( -name wp-config.php -o -name wp-load.php -o -name wordpress \) -print 2>/dev/null || true
find /var/www -maxdepth 3 -type d \( -iname "*makumbiri*" -o -iname "*gamepark*" -o -iname "*wordpress*" \) -print 2>/dev/null || true

section "WordPress config snippets"
while IFS= read -r wpconfig; do
  [ -f "$wpconfig" ] || continue
  echo
  echo "--- $wpconfig ---"
  grep -nE "DB_NAME|DB_USER|DB_HOST|table_prefix|WP_HOME|WP_SITEURL|AUTH_KEY|SECURE_AUTH_KEY" "$wpconfig" 2>/dev/null | sed -E "s/(DB_PASSWORD.*').*('.*)/\1***\2/" || true
done < <(find /var/www -maxdepth 5 -name wp-config.php -print 2>/dev/null)

section "PHP and database service status"
run php -v
run systemctl --no-pager --full status mysql
run systemctl --no-pager --full status mariadb
run systemctl --no-pager --full status postgresql

section "Local vhost responses with Host header"
run curl -sS -I --max-time 15 -H "Host: $DOMAIN" http://127.0.0.1/
run curl -k -sS -I --max-time 15 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/"
run curl -sS --max-time 15 -H "Host: $DOMAIN" http://127.0.0.1/ | head -80

section "SSL certificates"
run certbot certificates
run ls -la /etc/letsencrypt/live
run openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" -showcerts </dev/null

section "Recent Apache logs"
run tail -120 /var/log/apache2/error.log
run tail -80 /var/log/apache2/access.log
for log in /var/log/apache2/*makumbiri* /var/log/apache2/*gamepark*; do
  [ -f "$log" ] || continue
  run tail -80 "$log"
done

section "Disk and memory"
run df -h
run free -h
run journalctl -u apache2 --no-pager -n 100

echo
echo "MAKUMBIRI_OLD_VPS_INVESTIGATION_COMPLETE"
