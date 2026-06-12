#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

APP_USER="bantubuzz"
APP_GROUP="www-data"
PLATFORM_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="${PLATFORM_ROOT}/backend"
FRONTEND_ROOT="${PLATFORM_ROOT}/frontend"
MESSAGING_ROOT="${PLATFORM_ROOT}/messaging-service"
MIGRATION_ARCHIVE="/tmp/bantubuzz-platform-production-data.tar.gz"
BACKEND_ARCHIVE="/tmp/bantubuzz-platform-backend.tar.gz"
FRONTEND_ARCHIVE="/tmp/bantubuzz-platform-frontend.tar.gz"
MESSAGING_ARCHIVE="/tmp/bantubuzz-platform-messaging.tar.gz"
RESTORE_ROOT="/var/backups/bantubuzz/platform-migration-restore"
BACKUP_ROOT="/var/backups/bantubuzz/platform-before-migration-$(date +%Y%m%d-%H%M%S)"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
MESSAGING_ENV="/etc/bantubuzz/messaging.env"
SECRETS_FILE="/root/bantubuzz-provisioning-secrets.txt"

section() {
  printf '\n=== %s ===\n' "$1"
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must run as root."
    exit 1
  fi
}

read_env_value() {
  file="$1"
  key="$2"
  python3 - "$file" "$key" <<'PY'
import sys

path, wanted = sys.argv[1:3]
with open(path, encoding="utf-8-sig") as handle:
    for raw_line in handle:
        line = raw_line.strip()
        if line.startswith("export "):
            line = line[7:].lstrip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == wanted:
            print(value.strip().strip("'\""))
            raise SystemExit(0)
raise SystemExit(1)
PY
}

sanitize_environment() {
  source_file="$1"
  target_file="$2"
  python3 - "$source_file" "$target_file" <<'PY'
import re
import sys

source, target = sys.argv[1:3]
valid_key = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
with open(source, encoding="utf-8-sig") as src, open(target, "w", encoding="utf-8") as dst:
    for raw_line in src:
        line = raw_line.rstrip("\r\n")
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("export "):
            stripped = stripped[7:].lstrip()
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        if valid_key.fullmatch(key):
            dst.write(f"{key}={value.strip()}\n")
PY
}

set_env_value() {
  file="$1"
  key="$2"
  value="$3"
  python3 - "$file" "$key" "$value" <<'PY'
import os
import sys
import tempfile

path, key, value = sys.argv[1:4]
lines = []
if os.path.exists(path):
    with open(path, encoding="utf-8") as handle:
        lines = handle.read().splitlines()
lines = [line for line in lines if not line.startswith(f"{key}=")]
lines.append(f"{key}={value}")
directory = os.path.dirname(path) or "."
fd, temp_path = tempfile.mkstemp(dir=directory, text=True)
try:
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    os.replace(temp_path, path)
finally:
    if os.path.exists(temp_path):
        os.unlink(temp_path)
PY
}

wait_for_url() {
  url="$1"
  label="$2"
  for attempt in $(seq 1 45); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$label is healthy."
      return 0
    fi
    sleep 2
  done
  echo "$label failed its health check: $url"
  return 1
}

wait_for_host_url() {
  url="$1"
  host="$2"
  label="$3"
  for attempt in $(seq 1 45); do
    if curl -fsS -H "Host: $host" "$url" >/dev/null 2>&1; then
      echo "$label is healthy."
      return 0
    fi
    sleep 2
  done
  echo "$label failed its health check: $url (Host: $host)"
  return 1
}

run_with_environment() {
  env_file="$1"
  shift
  python3 - "$env_file" "$@" <<'PY'
import os
import subprocess
import sys

path = sys.argv[1]
command = sys.argv[2:]
environment = os.environ.copy()
with open(path, encoding="utf-8-sig") as handle:
    for raw_line in handle:
        line = raw_line.strip()
        if line.startswith("export "):
            line = line[7:].lstrip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        environment[key.strip()] = value.strip().strip("'\"")
subprocess.run(command, env=environment, check=True)
PY
}

require_root

section "Validating new VPS and migration artifacts"
for path in \
  "$MIGRATION_ARCHIVE" \
  "$BACKEND_ARCHIVE" \
  "$FRONTEND_ARCHIVE" \
  "$MESSAGING_ARCHIVE" \
  "$PLATFORM_ENV" \
  "$MESSAGING_ENV" \
  "$SECRETS_FILE"; do
  test -s "$path" || {
    echo "Required file is missing or empty: $path"
    exit 1
  }
done

command -v pg_restore >/dev/null
command -v rsync >/dev/null
id "$APP_USER" >/dev/null
systemctl is-active --quiet postgresql
systemctl is-active --quiet redis-server
systemctl is-active --quiet bantubuzz-cms.service
curl -fsS http://127.0.0.1:3010/admin >/dev/null

original_cms_database="$(read_env_value /etc/bantubuzz/cms.env DATABASE_URL)"
original_platform_database="$(read_env_value "$PLATFORM_ENV" DATABASE_URL)"
original_bridge_secret="$(read_env_value "$PLATFORM_ENV" CONTENT_BRIDGE_SECRET)"
original_flask_secret="$(read_env_value "$PLATFORM_ENV" SECRET_KEY || true)"
original_jwt_secret="$(read_env_value "$PLATFORM_ENV" JWT_SECRET_KEY || true)"

rm -rf "$RESTORE_ROOT"
install -d -m 0700 "$RESTORE_ROOT" "$BACKUP_ROOT"
tar -xzf "$MIGRATION_ARCHIVE" -C "$RESTORE_ROOT"
(
  cd "$RESTORE_ROOT"
  sha256sum -c SHA256SUMS
)

section "Backing up current new-VPS platform state"
cp -a "$PLATFORM_ENV" "$MESSAGING_ENV" "$BACKUP_ROOT/"
if runuser -u postgres -- psql -d bantubuzz_platform -Atqc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public')" |
  grep -q '^t$'; then
  runuser -u postgres -- pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="${BACKUP_ROOT}/platform-database.dump" \
    bantubuzz_platform
fi

systemctl stop \
  bantubuzz-backend.service \
  bantubuzz-messaging.service \
  bantubuzz-celery-worker.service \
  bantubuzz-celery-beat.service 2>/dev/null || true

section "Installing current platform source"
install -d -o "$APP_USER" -g "$APP_GROUP" -m 2775 \
  "$BACKEND_ROOT" "$FRONTEND_ROOT" "$MESSAGING_ROOT"

backend_stage="${RESTORE_ROOT}/backend-source"
frontend_stage="${RESTORE_ROOT}/frontend-source"
messaging_stage="${RESTORE_ROOT}/messaging-source"
install -d "$backend_stage" "$frontend_stage" "$messaging_stage"
tar -xzf "$BACKEND_ARCHIVE" -C "$backend_stage"
tar -xzf "$FRONTEND_ARCHIVE" -C "$frontend_stage"
tar -xzf "$MESSAGING_ARCHIVE" -C "$messaging_stage"

rsync -a --delete \
  --exclude venv \
  --exclude .env \
  --exclude uploads \
  "$backend_stage/" "$BACKEND_ROOT/"
rsync -a --delete "$frontend_stage/" "$FRONTEND_ROOT/"
rsync -a --delete \
  --exclude node_modules \
  --exclude .env \
  "$messaging_stage/" "$MESSAGING_ROOT/"

section "Restoring production uploads"
rm -rf "${BACKEND_ROOT}/uploads"
tar -xzf "${RESTORE_ROOT}/platform-uploads.tar.gz" -C "$BACKEND_ROOT"
install -d -o "$APP_USER" -g "$APP_GROUP" -m 2775 "${BACKEND_ROOT}/uploads"

section "Restoring production PostgreSQL data"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'bantubuzz_platform' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS bantubuzz_platform;
CREATE DATABASE bantubuzz_platform OWNER bantubuzz_platform ENCODING 'UTF8';
SQL

runuser -u postgres -- pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --role=bantubuzz_platform \
  --dbname=bantubuzz_platform \
  "${RESTORE_ROOT}/platform-database.dump"

section "Merging production configuration with new-VPS infrastructure"
sanitize_environment "${RESTORE_ROOT}/platform.env" "${PLATFORM_ENV}.new"
mv "${PLATFORM_ENV}.new" "$PLATFORM_ENV"

set_env_value "$PLATFORM_ENV" FLASK_ENV production
set_env_value "$PLATFORM_ENV" FLASK_APP run.py
set_env_value "$PLATFORM_ENV" DATABASE_URL "$original_platform_database"
set_env_value "$PLATFORM_ENV" REDIS_URL redis://127.0.0.1:6379/0
set_env_value "$PLATFORM_ENV" CELERY_BROKER_URL redis://127.0.0.1:6379/0
set_env_value "$PLATFORM_ENV" CELERY_RESULT_BACKEND redis://127.0.0.1:6379/0
set_env_value "$PLATFORM_ENV" FRONTEND_URL https://bantubuzz.com
set_env_value "$PLATFORM_ENV" MESSAGING_SERVICE_URL http://127.0.0.1:3002
set_env_value "$PLATFORM_ENV" CMS_INTERNAL_URL http://127.0.0.1:3010
set_env_value "$PLATFORM_ENV" CONTENT_BRIDGE_SECRET "$original_bridge_secret"
set_env_value "$PLATFORM_ENV" CONTENT_BRIDGE_MAX_SKEW_SECONDS 300

if ! grep -q '^SECRET_KEY=' "$PLATFORM_ENV" && [ -n "$original_flask_secret" ]; then
  set_env_value "$PLATFORM_ENV" SECRET_KEY "$original_flask_secret"
fi
if ! grep -q '^JWT_SECRET_KEY=' "$PLATFORM_ENV" && [ -n "$original_jwt_secret" ]; then
  set_env_value "$PLATFORM_ENV" JWT_SECRET_KEY "$original_jwt_secret"
fi

if [ -s "${RESTORE_ROOT}/messaging.env" ]; then
  sanitize_environment "${RESTORE_ROOT}/messaging.env" "${MESSAGING_ENV}.new"
  mv "${MESSAGING_ENV}.new" "$MESSAGING_ENV"
fi
set_env_value "$MESSAGING_ENV" NODE_ENV production
set_env_value "$MESSAGING_ENV" PORT 3002
set_env_value "$MESSAGING_ENV" DATABASE_URL "$original_platform_database"
set_env_value "$MESSAGING_ENV" CORS_ORIGIN https://bantubuzz.com
jwt_secret="$(read_env_value "$PLATFORM_ENV" JWT_SECRET_KEY)"
set_env_value "$MESSAGING_ENV" JWT_SECRET "$jwt_secret"

chown root:"$APP_GROUP" "$PLATFORM_ENV" "$MESSAGING_ENV"
chmod 0640 "$PLATFORM_ENV" "$MESSAGING_ENV"

section "Installing backend and messaging dependencies"
rm -rf "${BACKEND_ROOT}/venv"
python3 -m venv "${BACKEND_ROOT}/venv"
"${BACKEND_ROOT}/venv/bin/pip" install --upgrade pip wheel setuptools
"${BACKEND_ROOT}/venv/bin/pip" install -r "${BACKEND_ROOT}/requirements.txt"
"${BACKEND_ROOT}/venv/bin/pip" install -r "${BACKEND_ROOT}/requirements-postgres.txt"

(
  cd "$MESSAGING_ROOT"
  npm ci --omit=dev --no-audit --no-fund
  node --check server.js
)

chown -R "$APP_USER":"$APP_GROUP" "$PLATFORM_ROOT"

section "Applying current database migrations"
(
  cd "$BACKEND_ROOT"
  run_with_environment "$PLATFORM_ENV" venv/bin/flask db upgrade
  run_with_environment "$PLATFORM_ENV" venv/bin/python -c \
    "from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('SQLAlchemy mapper configuration OK')"
)

section "Installing service definitions"
install -m 0644 /tmp/bantubuzz-backend.service /etc/systemd/system/bantubuzz-backend.service
install -m 0644 /tmp/bantubuzz-messaging.service /etc/systemd/system/bantubuzz-messaging.service
install -m 0644 /tmp/bantubuzz-celery-worker.service /etc/systemd/system/bantubuzz-celery-worker.service
install -m 0644 /tmp/bantubuzz-celery-beat.service /etc/systemd/system/bantubuzz-celery-beat.service
install -m 0644 /tmp/bantubuzz-platform-staging.conf \
  /etc/apache2/sites-available/bantubuzz-platform-staging.conf
a2enmod proxy proxy_http proxy_wstunnel rewrite headers
a2ensite bantubuzz-platform-staging.conf
apache2ctl configtest
systemctl daemon-reload
systemctl reload apache2

section "Starting platform services"
systemctl enable --now \
  bantubuzz-backend.service \
  bantubuzz-messaging.service \
  bantubuzz-celery-worker.service \
  bantubuzz-celery-beat.service

wait_for_url http://127.0.0.1:8002/api/health "Flask API"
wait_for_url http://127.0.0.1:3002/health "Messaging service"
wait_for_url http://127.0.0.1:3010/admin "Payload CMS"
wait_for_host_url http://127.0.0.1/api/health 13.140.159.150 "IP staging API"

section "Final migration verification"
test "$(read_env_value /etc/bantubuzz/cms.env DATABASE_URL)" = "$original_cms_database"
systemctl is-active --quiet \
  bantubuzz-backend.service \
  bantubuzz-messaging.service \
  bantubuzz-celery-worker.service \
  bantubuzz-celery-beat.service \
  bantubuzz-cms.service

user_count="$(runuser -u postgres -- psql -d bantubuzz_platform -Atqc "SELECT count(*) FROM users")"
alembic_version="$(runuser -u postgres -- psql -d bantubuzz_platform -Atqc "SELECT version_num FROM alembic_version")"

echo "Restored platform users: $user_count"
echo "Current Alembic revision: $alembic_version"
echo "Rollback backup: $BACKUP_ROOT"
echo "CMS database and service were preserved."
echo "DNS was not changed."
echo "Staging URL: http://13.140.159.150"
echo "BANTUBUZZ_NEW_PLATFORM_RESTORE_SUCCESS"
