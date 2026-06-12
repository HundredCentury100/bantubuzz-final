#!/usr/bin/env bash

set -Eeuo pipefail

APP_GROUP="www-data"
BACKEND_ROOT="/var/www/bantubuzz/backend"
PLATFORM_ENV="/etc/bantubuzz/platform.env"

section() {
  printf '\n=== %s ===\n' "$1"
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

section "Validating restored platform state"
test "$(id -u)" -eq 0
test -x "${BACKEND_ROOT}/venv/bin/flask"
test -s "$PLATFORM_ENV"
test -s "${BACKEND_ROOT}/migrations/versions/05a90a92435c_production_schema_bridge.py"
runuser -u postgres -- psql -d bantubuzz_platform -Atqc \
  "SELECT count(*) FROM users" >/dev/null
systemctl is-active --quiet postgresql
systemctl is-active --quiet redis-server
systemctl is-active --quiet bantubuzz-cms.service

section "Applying pending Alembic migrations"
(
  cd "$BACKEND_ROOT"
  run_with_environment "$PLATFORM_ENV" \
    venv/bin/flask db upgrade 202606101700
  run_with_environment "$PLATFORM_ENV" venv/bin/python -c \
    "from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('SQLAlchemy mapper configuration OK')"
)

section "Installing platform services and staging Apache site"
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

curl -fsS -H "Host: 13.140.159.150" \
  http://127.0.0.1/api/health >/dev/null

section "Final verification"
systemctl is-active --quiet \
  bantubuzz-backend.service \
  bantubuzz-messaging.service \
  bantubuzz-celery-worker.service \
  bantubuzz-celery-beat.service \
  bantubuzz-cms.service

echo "Restored platform users: $(runuser -u postgres -- psql -d bantubuzz_platform -Atqc "SELECT count(*) FROM users")"
echo "Current Alembic revision: $(runuser -u postgres -- psql -d bantubuzz_platform -Atqc "SELECT version_num FROM alembic_version")"
echo "Staging URL: http://13.140.159.150"
echo "DNS was not changed."
echo "BANTUBUZZ_PLATFORM_CONTINUE_SUCCESS"
