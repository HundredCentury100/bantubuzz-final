#!/usr/bin/env bash

set -Eeuo pipefail

DOMAIN="bantubuzz.com"
WWW_DOMAIN="www.bantubuzz.com"
CMS_DOMAIN="app.bantubuzz.com"
SERVER_IP="13.140.159.150"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-hundred@bantubuzz.com}"
ACME_ROOT="/var/www/letsencrypt"
FINAL_CONF="/etc/apache2/sites-available/bantubuzz-platform.conf"
HTTP_CONF="/etc/apache2/sites-available/bantubuzz-platform-http.conf"

section() {
  printf '\n=== %s ===\n' "$1"
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must run as root."
    exit 1
  fi
}

resolve_ipv4() {
  name="$1"
  if command -v dig >/dev/null 2>&1; then
    dig +short A "$name" | tail -1
  else
    getent ahostsv4 "$name" | awk '{print $1; exit}'
  fi
}

wait_for_dns() {
  name="$1"
  for attempt in $(seq 1 30); do
    current="$(resolve_ipv4 "$name" || true)"
    if [ "$current" = "$SERVER_IP" ]; then
      echo "$name resolves to $SERVER_IP"
      return 0
    fi
    echo "$name currently resolves to '${current:-none}', waiting for $SERVER_IP..."
    sleep 10
  done
  echo "DNS for $name did not resolve to $SERVER_IP."
  return 1
}

wait_for_url() {
  url="$1"
  label="$2"
  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$label is healthy."
      return 0
    fi
    sleep 3
  done
  echo "$label failed health check: $url"
  return 1
}

require_root

section "Validating DNS cutover"
wait_for_dns "$DOMAIN"
wait_for_dns "$WWW_DOMAIN"

section "Validating services before SSL"
systemctl is-active --quiet postgresql
systemctl is-active --quiet redis-server
systemctl is-active --quiet bantubuzz-backend.service
systemctl is-active --quiet bantubuzz-messaging.service
systemctl is-active --quiet bantubuzz-cms.service
curl -fsS http://127.0.0.1:8002/api/health >/dev/null
curl -fsS http://127.0.0.1:3010/admin >/dev/null

section "Preparing HTTP ACME challenge vhost"
install -d -o www-data -g www-data -m 0755 "$ACME_ROOT/.well-known/acme-challenge"

cat > "$HTTP_CONF" <<EOF
<VirtualHost *:80>
    ServerName ${DOMAIN}
    ServerAlias ${WWW_DOMAIN}

    Alias /.well-known/acme-challenge/ ${ACME_ROOT}/.well-known/acme-challenge/
    <Directory ${ACME_ROOT}/.well-known/acme-challenge/>
        Options None
        AllowOverride None
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyTimeout 120
    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass /api http://127.0.0.1:8002/api
    ProxyPassReverse /api http://127.0.0.1:8002/api
    ProxyPass /socket.io http://127.0.0.1:3002/socket.io
    ProxyPassReverse /socket.io http://127.0.0.1:3002/socket.io
    ProxyPass /messaging/api http://127.0.0.1:3002/api
    ProxyPassReverse /messaging/api http://127.0.0.1:3002/api

    Alias /uploads /var/www/bantubuzz/backend/uploads
    <Directory /var/www/bantubuzz/backend/uploads>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    DocumentRoot /var/www/bantubuzz/frontend
    <Directory /var/www/bantubuzz/frontend>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>
</VirtualHost>
EOF

a2enmod rewrite proxy proxy_http proxy_wstunnel ssl headers http2
a2ensite bantubuzz-platform-http.conf
apache2ctl configtest
systemctl reload apache2

section "Requesting Let's Encrypt certificate"
certbot certonly \
  --webroot \
  --webroot-path "$ACME_ROOT" \
  --non-interactive \
  --agree-tos \
  --email "$CERTBOT_EMAIL" \
  --keep-until-expiring \
  -d "$DOMAIN" \
  -d "$WWW_DOMAIN"

section "Installing final Apache platform config"
test -s /tmp/bantubuzz-platform.conf
install -m 0644 /tmp/bantubuzz-platform.conf "$FINAL_CONF"
a2ensite bantubuzz-platform.conf
a2dissite bantubuzz-platform-http.conf
apache2ctl configtest
systemctl reload apache2

section "Verifying public HTTPS platform"
wait_for_url "https://${DOMAIN}/api/health" "BantuBuzz HTTPS API"
wait_for_url "https://${DOMAIN}/leaderboard" "BantuBuzz frontend"
wait_for_url "https://${CMS_DOMAIN}/admin" "Payload CMS admin"

section "Certificate status"
certbot certificates --cert-name "$DOMAIN" || certbot certificates

echo "BANTUBUZZ_DOMAIN_SSL_SUCCESS"
