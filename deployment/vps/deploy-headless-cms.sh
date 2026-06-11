#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
UPLOAD_ARCHIVE="/tmp/bantubuzz-headless-cms.tar.gz"
MIGRATION_ARCHIVE="/tmp/bantubuzz-cms-postgres-migrations.tar.gz"
ENV_FILE="/etc/bantubuzz/cms.env"
SERVICE_FILE="/etc/systemd/system/bantubuzz-cms.service"
APACHE_SITE="/etc/apache2/sites-available/app-bantubuzz.conf"
BACKUP_ROOT="/var/backups/bantubuzz"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "This deployment must run as root."
  exit 1
fi

if [ ! -s "$UPLOAD_ARCHIVE" ]; then
  echo "CMS upload archive is missing: $UPLOAD_ARCHIVE"
  exit 1
fi

if [ ! -s "$ENV_FILE" ]; then
  echo "CMS environment file is missing: $ENV_FILE"
  exit 1
fi

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "CERTBOT_EMAIL is required."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
release_dir="/var/www/bantubuzz-cms-release-${timestamp}"
backup_dir="${BACKUP_ROOT}/cms-before-${timestamp}"

cleanup_release() {
  rm -rf "$release_dir"
}
trap cleanup_release EXIT

echo "=== Preparing CMS release ==="
install -d -o bantubuzz -g www-data -m 2775 "$release_dir" "$backup_dir"
tar -xzf "$UPLOAD_ARCHIVE" -C "$release_dir"

if [ ! -f "$release_dir/package.json" ] || [ ! -f "$release_dir/apps/web/payload.config.ts" ]; then
  echo "Uploaded archive does not contain the expected CMS project."
  exit 1
fi

if [ -f "$CMS_ROOT/package.json" ]; then
  echo "Backing up current CMS source to $backup_dir"
  rsync -a \
    --exclude node_modules \
    --exclude .next \
    --exclude media \
    --exclude storage \
    "$CMS_ROOT/" "$backup_dir/"
fi

echo "=== Installing CMS source ==="
rsync -a --delete \
  --exclude media \
  --exclude storage \
  "$release_dir/" "$CMS_ROOT/"
install -d -o bantubuzz -g www-data -m 2775 \
  "$CMS_ROOT/apps/web/media" \
  "$CMS_ROOT/apps/web/storage"
chown -R bantubuzz:www-data "$CMS_ROOT"

echo "=== Loading CMS production environment ==="
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ "${PAYLOAD_DB:-}" != "postgres" ]; then
  echo "PAYLOAD_DB must be postgres for production."
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ] || [ -z "${PAYLOAD_SECRET:-}" ]; then
  echo "DATABASE_URL and PAYLOAD_SECRET must be configured."
  exit 1
fi

echo "=== Installing locked Node dependencies ==="
cd "$CMS_ROOT"
runuser -u bantubuzz --preserve-environment -- npm ci --no-audit --no-fund

echo "=== Preparing PostgreSQL migration history ==="
migration_dir="$CMS_ROOT/apps/web/src/migrations-postgres"
install -d -o bantubuzz -g www-data -m 2775 "$migration_dir"

existing_migration="$(
  find "$migration_dir" -maxdepth 1 -type f -name '*.ts' ! -name 'index.ts' -print -quit
)"

if [ -z "$existing_migration" ]; then
  existing_tables="$(
    psql "$DATABASE_URL" -Atqc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
  )"
  if [ "${existing_tables:-0}" -gt 0 ]; then
    echo "CMS database is not empty but no PostgreSQL migration exists. Refusing to guess."
    exit 1
  fi

  echo "Generating reviewed first-release PostgreSQL baseline..."
  rm -f "$migration_dir/.gitkeep"
  cd "$CMS_ROOT/apps/web"
  runuser -u bantubuzz --preserve-environment -- npm exec -- payload migrate:create postgres_baseline --force-accept-warning
  cd "$CMS_ROOT"
fi

if grep -R "@payloadcms/db-sqlite" "$migration_dir" >/dev/null 2>&1; then
  echo "SQLite migration code was found in the PostgreSQL migration directory."
  exit 1
fi

if ! grep -R "@payloadcms/db-postgres" "$migration_dir" >/dev/null 2>&1; then
  echo "No PostgreSQL Payload migration was generated."
  exit 1
fi

echo "=== Applying CMS PostgreSQL migrations ==="
cd "$CMS_ROOT/apps/web"
runuser -u bantubuzz --preserve-environment -- npm exec -- payload migrate

echo "=== Seeding baseline authority content ==="
cd "$CMS_ROOT"
runuser -u bantubuzz --preserve-environment -- npm run seed

echo "=== Building CMS production application ==="
runuser -u bantubuzz --preserve-environment -- npm run build

echo "=== Installing CMS web service ==="
cat > "$SERVICE_FILE" <<'EOF'
[Unit]
Description=BantuBuzz Headless CMS
After=network.target postgresql.service redis-server.service meilisearch.service
Wants=postgresql.service redis-server.service meilisearch.service

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

systemctl daemon-reload
systemctl enable --now bantubuzz-cms.service

echo "=== Waiting for CMS service ==="
for attempt in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3010/admin >/dev/null 2>&1; then
    echo "CMS service is responding."
    break
  fi
  if [ "$attempt" -eq 45 ]; then
    systemctl status bantubuzz-cms.service --no-pager -l || true
    journalctl -u bantubuzz-cms.service --no-pager -n 150 || true
    exit 1
  fi
  sleep 2
done

echo "=== Configuring app.bantubuzz.com ==="
cat > "$APACHE_SITE" <<'EOF'
<VirtualHost *:80>
    ServerName app.bantubuzz.com

    ProxyPreserveHost On
    ProxyTimeout 120
    ProxyPass / http://127.0.0.1:3010/
    ProxyPassReverse / http://127.0.0.1:3010/

    ErrorLog ${APACHE_LOG_DIR}/bantubuzz-cms-error.log
    CustomLog ${APACHE_LOG_DIR}/bantubuzz-cms-access.log combined
</VirtualHost>
EOF

a2ensite app-bantubuzz.conf
apache2ctl configtest
systemctl reload apache2

echo "=== Requesting TLS certificate ==="
certbot --apache \
  --non-interactive \
  --agree-tos \
  --redirect \
  --email "$CERTBOT_EMAIL" \
  -d app.bantubuzz.com

apache2ctl configtest
systemctl reload apache2

echo "=== Verifying public CMS endpoint ==="
curl -fsSI https://app.bantubuzz.com/admin | head -20

echo "=== Packaging generated PostgreSQL migration for source control ==="
tar -czf "$MIGRATION_ARCHIVE" -C "$migration_dir" .
chown root:root "$MIGRATION_ARCHIVE"
chmod 0644 "$MIGRATION_ARCHIVE"

echo "CMS worker remains disabled until S3, TTS, SMTP, and IndexNow credentials are configured."
echo "Generated migration archive: $MIGRATION_ARCHIVE"
echo "BANTUBUZZ_CMS_DEPLOY_SUCCESS"
