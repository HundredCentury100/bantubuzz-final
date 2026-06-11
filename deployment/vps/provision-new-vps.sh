#!/usr/bin/env bash

set -Eeuo pipefail

SERVER_IP="13.140.159.150"
APP_USER="bantubuzz"
APP_GROUP="www-data"
MEILISEARCH_VERSION="1.46.1"
MEILISEARCH_SHA256="dcc828b9305039ec97f8506b50796369a980f6b5cb8cd5bb7ed51b27774568e3"
SECRETS_FILE="/root/bantubuzz-provisioning-secrets.txt"
LOG_FILE="/var/log/bantubuzz-provisioning.log"

exec > >(tee -a "$LOG_FILE") 2>&1

section() {
  printf '\n\n============================================================\n'
  printf '%s\n' "$1"
  printf '============================================================\n'
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must run as root."
    exit 1
  fi
}

random_hex() {
  length="${1:-32}"
  bytes=$((length / 2))
  openssl rand -hex "$bytes"
}

read_secret() {
  key="$1"
  grep -E "^${key}=" "$SECRETS_FILE" 2>/dev/null | head -1 | cut -d= -f2-
}

write_secret_if_missing() {
  key="$1"
  value="$2"
  if ! grep -qE "^${key}=" "$SECRETS_FILE" 2>/dev/null; then
    printf '%s=%s\n' "$key" "$value" >> "$SECRETS_FILE"
  fi
}

install_node_22() {
  current_major=0
  if command -v node >/dev/null 2>&1; then
    current_major="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
  fi

  if [ "$current_major" -ge 22 ]; then
    echo "Node.js $(node --version) already satisfies the CMS requirement."
    return
  fi

  echo "Installing Node.js 22 from the NodeSource APT repository..."
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  chmod a+r /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
}

configure_swap() {
  if swapon --show=NAME --noheadings | grep -q .; then
    echo "Swap is already configured."
    return
  fi

  echo "Creating a 4 GB swap file..."
  if ! fallocate -l 4G /swapfile; then
    dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
  fi
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
}

install_meilisearch() {
  if command -v meilisearch >/dev/null 2>&1 &&
    meilisearch --version 2>/dev/null | grep -q "meilisearch ${MEILISEARCH_VERSION}"; then
    echo "Meilisearch ${MEILISEARCH_VERSION} is already installed."
  else
    echo "Installing Meilisearch ${MEILISEARCH_VERSION}..."
    curl -fL \
      "https://github.com/meilisearch/meilisearch/releases/download/v${MEILISEARCH_VERSION}/meilisearch-linux-amd64" \
      -o /tmp/meilisearch
    printf '%s  %s\n' "$MEILISEARCH_SHA256" /tmp/meilisearch | sha256sum -c -
    install -m 0755 /tmp/meilisearch /usr/local/bin/meilisearch
  fi

  if ! id meilisearch >/dev/null 2>&1; then
    useradd --system --home-dir /var/lib/meilisearch --shell /usr/sbin/nologin meilisearch
  fi
  usermod -a -G "$APP_GROUP" meilisearch
  install -d -o meilisearch -g meilisearch -m 0750 /var/lib/meilisearch
  install -d -o meilisearch -g meilisearch -m 0750 \
    /var/lib/meilisearch/data.ms \
    /var/lib/meilisearch/dumps \
    /var/lib/meilisearch/snapshots

  meili_key="$(read_secret MEILISEARCH_MASTER_KEY)"
  cat > /etc/bantubuzz/meilisearch.env <<EOF
MEILI_ENV=production
MEILI_HTTP_ADDR=127.0.0.1:7700
MEILI_DB_PATH=/var/lib/meilisearch/data.ms
MEILI_DUMP_DIR=/var/lib/meilisearch/dumps
MEILI_SNAPSHOT_DIR=/var/lib/meilisearch/snapshots
MEILI_MASTER_KEY=${meili_key}
MEILI_NO_ANALYTICS=true
EOF
  chown root:meilisearch /etc/bantubuzz/meilisearch.env
  chmod 0640 /etc/bantubuzz/meilisearch.env

  cat > /etc/systemd/system/meilisearch.service <<'EOF'
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
EnvironmentFile=/etc/bantubuzz/meilisearch.env
WorkingDirectory=/var/lib/meilisearch
ExecStart=/usr/local/bin/meilisearch
Restart=on-failure
RestartSec=5
TimeoutStartSec=60
LimitNOFILE=65535
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now meilisearch

  for attempt in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:7700/health >/dev/null 2>&1; then
      echo "Meilisearch is healthy."
      return
    fi
    sleep 2
  done

  systemctl status meilisearch --no-pager -l 2>&1 || true
  journalctl -u meilisearch --no-pager -n 120 2>&1 || true
  echo "Meilisearch did not become healthy."
  exit 1
}

configure_postgresql() {
  platform_password="$(read_secret PLATFORM_DB_PASSWORD)"
  cms_password="$(read_secret CMS_DB_PASSWORD)"

  systemctl enable --now postgresql

  runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bantubuzz_platform') THEN
    CREATE ROLE bantubuzz_platform LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bantubuzz_cms') THEN
    CREATE ROLE bantubuzz_cms LOGIN;
  END IF;
END
\$\$;
ALTER ROLE bantubuzz_platform WITH PASSWORD '${platform_password}';
ALTER ROLE bantubuzz_cms WITH PASSWORD '${cms_password}';
SQL

  if ! runuser -u postgres -- psql -Atqc \
    "SELECT 1 FROM pg_database WHERE datname = 'bantubuzz_platform'" | grep -q 1; then
    runuser -u postgres -- createdb --owner=bantubuzz_platform --encoding=UTF8 bantubuzz_platform
  fi

  if ! runuser -u postgres -- psql -Atqc \
    "SELECT 1 FROM pg_database WHERE datname = 'bantubuzz_cms'" | grep -q 1; then
    runuser -u postgres -- createdb --owner=bantubuzz_cms --encoding=UTF8 bantubuzz_cms
  fi

  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c \
    "ALTER SYSTEM SET password_encryption = 'scram-sha-256';"
  systemctl restart postgresql
}

configure_redis() {
  redis_config="/etc/redis/redis.conf"
  if [ -f "$redis_config" ]; then
    sed -ri 's/^[#[:space:]]*bind .*/bind 127.0.0.1 ::1/' "$redis_config"
    sed -ri 's/^[#[:space:]]*protected-mode .*/protected-mode yes/' "$redis_config"
  fi
  systemctl enable --now redis-server
  systemctl restart redis-server
}

write_environment_skeletons() {
  platform_password="$(read_secret PLATFORM_DB_PASSWORD)"
  cms_password="$(read_secret CMS_DB_PASSWORD)"
  flask_secret="$(read_secret FLASK_SECRET_KEY)"
  jwt_secret="$(read_secret JWT_SECRET_KEY)"
  bridge_secret="$(read_secret CONTENT_BRIDGE_SECRET)"
  payload_secret="$(read_secret PAYLOAD_SECRET)"
  preview_secret="$(read_secret PREVIEW_SECRET)"
  auth_access_secret="$(read_secret CMS_AUTH_ACCESS_SECRET)"
  auth_refresh_secret="$(read_secret CMS_AUTH_REFRESH_SECRET)"
  analytics_salt="$(read_secret CMS_ANALYTICS_HASH_SALT)"
  meili_key="$(read_secret MEILISEARCH_MASTER_KEY)"

  if [ ! -f /etc/bantubuzz/platform.env ]; then
    cat > /etc/bantubuzz/platform.env <<EOF
FLASK_ENV=production
FLASK_APP=run.py
DATABASE_URL=postgresql://bantubuzz_platform:${platform_password}@127.0.0.1:5432/bantubuzz_platform
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
SECRET_KEY=${flask_secret}
JWT_SECRET_KEY=${jwt_secret}
FRONTEND_URL=https://bantubuzz.com
CMS_INTERNAL_URL=http://127.0.0.1:3010
CONTENT_BRIDGE_SECRET=${bridge_secret}
CONTENT_BRIDGE_MAX_SKEW_SECONDS=300

# Copy the remaining production mail, payment, ThunziAI, OAuth, S3,
# VAPID, and other provider settings from the current server before cutover.
EOF
  fi

  if [ ! -f /etc/bantubuzz/messaging.env ]; then
    cat > /etc/bantubuzz/messaging.env <<EOF
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://bantubuzz_platform:${platform_password}@127.0.0.1:5432/bantubuzz_platform
JWT_SECRET=${jwt_secret}
CORS_ORIGIN=https://bantubuzz.com
EOF
  fi

  if [ ! -f /etc/bantubuzz/cms.env ]; then
    cat > /etc/bantubuzz/cms.env <<EOF
APP_ENV=production
NODE_ENV=production
PORT=3010
NEXT_PUBLIC_SITE_URL=https://bantubuzz.com
NEXT_PUBLIC_BRAND_NAME=BantuBuzz
PAYLOAD_DB=postgres
DATABASE_URL=postgresql://bantubuzz_cms:${cms_password}@127.0.0.1:5432/bantubuzz_cms
PAYLOAD_SECRET=${payload_secret}
PAYLOAD_PUBLIC_SERVER_URL=https://app.bantubuzz.com
PREVIEW_SECRET=${preview_secret}
AUTH_ACCESS_TOKEN_SECRET=${auth_access_secret}
AUTH_REFRESH_TOKEN_SECRET=${auth_refresh_secret}
AUTH_ACCESS_TOKEN_MINUTES=15
AUTH_REFRESH_TOKEN_DAYS=30
BCRYPT_COST=12
REDIS_URL=redis://127.0.0.1:6379/1
MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_API_KEY=${meili_key}
BANTUBUZZ_PLATFORM_WEBHOOK_URL=http://127.0.0.1:8002/api/internal/cms/content-changed
CONTENT_BRIDGE_SECRET=${bridge_secret}
ANALYTICS_HASH_SALT=${analytics_salt}
ADMIN_ALLOWED_ORIGINS=https://app.bantubuzz.com

# Configure SMTP, S3, Meilisearch, TTS, analytics, and IndexNow before
# enabling the CMS services.
EOF
  fi

  chown root:"$APP_GROUP" /etc/bantubuzz/*.env
  chmod 0640 /etc/bantubuzz/*.env
}

write_systemd_units() {
  cat > /etc/systemd/system/bantubuzz-backend.service <<'EOF'
[Unit]
Description=BantuBuzz Flask API
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=bantubuzz
Group=www-data
WorkingDirectory=/var/www/bantubuzz/backend
EnvironmentFile=/etc/bantubuzz/platform.env
ExecStart=/var/www/bantubuzz/backend/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:8002 --timeout 120 --error-logfile - --access-logfile - "app:create_app()"
Restart=always
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/bantubuzz-messaging.service <<'EOF'
[Unit]
Description=BantuBuzz Messaging Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=bantubuzz
Group=www-data
WorkingDirectory=/var/www/bantubuzz/messaging-service
EnvironmentFile=/etc/bantubuzz/messaging.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/bantubuzz-celery-worker.service <<'EOF'
[Unit]
Description=BantuBuzz Celery Worker
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=bantubuzz
Group=www-data
WorkingDirectory=/var/www/bantubuzz/backend
EnvironmentFile=/etc/bantubuzz/platform.env
ExecStart=/var/www/bantubuzz/backend/venv/bin/celery -A celery_worker.celery worker --loglevel=info --concurrency=3
Restart=always
RestartSec=5
TimeoutStopSec=60
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/bantubuzz-celery-beat.service <<'EOF'
[Unit]
Description=BantuBuzz Celery Beat Scheduler
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=bantubuzz
Group=www-data
WorkingDirectory=/var/www/bantubuzz/backend
EnvironmentFile=/etc/bantubuzz/platform.env
ExecStart=/var/www/bantubuzz/backend/venv/bin/celery -A celery_worker.celery beat --loglevel=info --schedule=/var/lib/bantubuzz/celerybeat-schedule
Restart=always
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/bantubuzz-cms.service <<'EOF'
[Unit]
Description=BantuBuzz Headless CMS
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=bantubuzz
Group=www-data
WorkingDirectory=/var/www/bantubuzz-cms
EnvironmentFile=/etc/bantubuzz/cms.env
ExecStart=/usr/bin/npm exec --workspace=@bantubuzz/web -- next start --hostname 127.0.0.1 --port 3010
Restart=always
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/bantubuzz-cms-worker.service <<'EOF'
[Unit]
Description=BantuBuzz CMS Content Worker
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=bantubuzz
Group=www-data
WorkingDirectory=/var/www/bantubuzz-cms
EnvironmentFile=/etc/bantubuzz/cms.env
ExecStart=/usr/bin/npm run worker:content
Restart=always
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl disable \
    bantubuzz-backend.service \
    bantubuzz-messaging.service \
    bantubuzz-celery-worker.service \
    bantubuzz-celery-beat.service \
    bantubuzz-cms.service \
    bantubuzz-cms-worker.service 2>/dev/null || true
}

configure_apache() {
  a2enmod rewrite proxy proxy_http proxy_wstunnel ssl headers http2 expires
  systemctl enable --now apache2
}

configure_firewall() {
  ufw allow OpenSSH
  ufw allow "Apache Full"
  ufw --force enable
}

configure_fail2ban() {
  cat > /etc/fail2ban/jail.d/bantubuzz-sshd.conf <<'EOF'
[sshd]
enabled = true
port = ssh
maxretry = 5
findtime = 10m
bantime = 15m
EOF
  systemctl enable --now fail2ban
}

verify() {
  section "PROVISIONING VERIFICATION"
  printf '%-24s %s\n' "Ubuntu" "$(. /etc/os-release && echo "$PRETTY_NAME")"
  printf '%-24s %s\n' "Node.js" "$(node --version)"
  printf '%-24s %s\n' "npm" "$(npm --version)"
  printf '%-24s %s\n' "Python" "$(python3 --version 2>&1)"
  printf '%-24s %s\n' "PostgreSQL" "$(psql --version)"
  printf '%-24s %s\n' "Redis" "$(redis-server --version | head -1)"
  printf '%-24s %s\n' "Meilisearch" "$(meilisearch --version)"
  printf '%-24s %s\n' "Apache" "$(apache2 -v | head -1)"
  printf '%-24s %s\n' "Certbot" "$(certbot --version 2>&1)"
  printf '%-24s %s\n' "Swap" "$(swapon --show=SIZE --noheadings | xargs)"
  printf '%-24s %s\n' "PostgreSQL status" "$(systemctl is-active postgresql)"
  printf '%-24s %s\n' "Redis status" "$(systemctl is-active redis-server)"
  printf '%-24s %s\n' "Meilisearch status" "$(systemctl is-active meilisearch)"
  printf '%-24s %s\n' "Apache status" "$(systemctl is-active apache2)"
  printf '%-24s %s\n' "Fail2ban status" "$(systemctl is-active fail2ban)"
  printf '%-24s %s\n' "Firewall" "$(ufw status | head -1)"
  printf '\nDatabases:\n'
  runuser -u postgres -- psql -Atqc \
    "SELECT datname FROM pg_database WHERE datname IN ('bantubuzz_platform', 'bantubuzz_cms') ORDER BY datname;"
  printf '\nApplication service units are installed but intentionally disabled:\n'
  systemctl list-unit-files 'bantubuzz-*.service' --no-pager
  printf '\nListening ports:\n'
  ss -lntup
}

main() {
  require_root

  section "BANTUBUZZ NEW VPS PROVISIONING"
  echo "Target: $SERVER_IP"
  echo "This prepares infrastructure only. It does not migrate production data or change DNS."

  export DEBIAN_FRONTEND=noninteractive

  section "INSTALLING OPERATING SYSTEM PACKAGES"
  apt-get update
  apt-get install -y \
    apache2 certbot python3-certbot-apache \
    postgresql postgresql-contrib redis-server \
    python3 python3-pip python3-venv python3-dev \
    build-essential libpq-dev libjpeg-dev zlib1g-dev libffi-dev \
    git curl ca-certificates gnupg openssl rsync unzip jq acl \
    fail2ban ufw

  install_node_22
  configure_swap

  section "CREATING APPLICATION USER AND DIRECTORIES"
  if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir /home/bantubuzz --shell /usr/sbin/nologin "$APP_USER"
  fi
  usermod -a -G "$APP_GROUP" "$APP_USER"

  install -d -o "$APP_USER" -g "$APP_GROUP" -m 2775 \
    /var/www/bantubuzz \
    /var/www/bantubuzz/backend \
    /var/www/bantubuzz/backend/uploads \
    /var/www/bantubuzz/frontend \
    /var/www/bantubuzz/messaging-service \
    /var/www/bantubuzz/logs \
    /var/www/bantubuzz-cms \
    /var/lib/bantubuzz \
    /var/backups/bantubuzz
  install -d -o root -g "$APP_GROUP" -m 0750 /etc/bantubuzz

  section "GENERATING SERVER-LOCAL SECRETS"
  touch "$SECRETS_FILE"
  chmod 0600 "$SECRETS_FILE"
  write_secret_if_missing PLATFORM_DB_PASSWORD "$(random_hex 40)"
  write_secret_if_missing CMS_DB_PASSWORD "$(random_hex 40)"
  write_secret_if_missing FLASK_SECRET_KEY "$(random_hex 64)"
  write_secret_if_missing JWT_SECRET_KEY "$(random_hex 64)"
  write_secret_if_missing CONTENT_BRIDGE_SECRET "$(random_hex 64)"
  write_secret_if_missing PAYLOAD_SECRET "$(random_hex 64)"
  write_secret_if_missing PREVIEW_SECRET "$(random_hex 64)"
  write_secret_if_missing CMS_AUTH_ACCESS_SECRET "$(random_hex 64)"
  write_secret_if_missing CMS_AUTH_REFRESH_SECRET "$(random_hex 64)"
  write_secret_if_missing CMS_ANALYTICS_HASH_SALT "$(random_hex 64)"
  write_secret_if_missing MEILISEARCH_MASTER_KEY "$(random_hex 64)"
  echo "Secrets saved with root-only permissions at $SECRETS_FILE"

  section "CONFIGURING POSTGRESQL AND REDIS"
  configure_postgresql
  configure_redis
  install_meilisearch

  section "WRITING ENVIRONMENT SKELETONS"
  write_environment_skeletons

  section "INSTALLING APPLICATION SERVICE UNITS"
  write_systemd_units

  section "CONFIGURING APACHE, FIREWALL, AND FAIL2BAN"
  configure_apache
  configure_firewall
  configure_fail2ban

  verify

  section "PROVISIONING COMPLETE"
  echo "The old BantuBuzz server was not contacted or modified."
  echo "No production database, uploads, code, or DNS records were migrated."
  echo "Next phase: deploy code and restore a staging copy of production data."
  echo "Provisioning log: $LOG_FILE"
  if [ -f /var/run/reboot-required ]; then
    echo "Ubuntu reports that a reboot is required before deployment."
  fi
  echo "BANTUBUZZ_PROVISIONING_SUCCESS"
}

main "$@"
