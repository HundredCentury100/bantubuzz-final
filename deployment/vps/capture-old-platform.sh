#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

PLATFORM_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="${PLATFORM_ROOT}/backend"
STAGE_ROOT="/var/backups/bantubuzz/platform-migration-stage"
ARCHIVE="/tmp/bantubuzz-platform-production-data.tar.gz"
MANIFEST="${STAGE_ROOT}/manifest.txt"

section() {
  printf '\n=== %s ===\n' "$1"
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must run as root."
    exit 1
  fi
}

find_platform_env() {
  for candidate in \
    "${BACKEND_ROOT}/.env" \
    "/etc/bantubuzz/platform.env" \
    "${BACKEND_ROOT}/.env.production"; do
    if [ -s "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

read_database_url() {
  env_file="$1"
  python3 - "$env_file" <<'PY'
import sys

path = sys.argv[1]
with open(path, encoding="utf-8-sig") as handle:
    for raw_line in handle:
        line = raw_line.strip()
        if line.startswith("export "):
            line = line[7:].lstrip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "DATABASE_URL":
            print(value.strip().strip("'\""))
            raise SystemExit(0)
raise SystemExit("DATABASE_URL was not found in the production environment")
PY
}

database_name_from_url() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import unquote, urlparse

parsed = urlparse(sys.argv[1])
name = unquote(parsed.path.lstrip("/"))
if not name:
    raise SystemExit("DATABASE_URL does not contain a database name")
print(name)
PY
}

require_root

section "Validating old production VPS"
test -d "$BACKEND_ROOT"
command -v pg_dump >/dev/null
command -v tar >/dev/null

platform_env="$(find_platform_env)" || {
  echo "Could not locate the production platform environment file."
  exit 1
}
database_url="$(read_database_url "$platform_env")"
database_name="$(database_name_from_url "$database_url")"

if ! runuser -u postgres -- psql -d "$database_name" -Atqc "SELECT 1" | grep -q '^1$'; then
  echo "Cannot access PostgreSQL database: $database_name"
  exit 1
fi

rm -rf "$STAGE_ROOT"
install -d -m 0700 "$STAGE_ROOT"

section "Capturing PostgreSQL database"
runuser -u postgres -- pg_dump \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-acl \
  --file="${STAGE_ROOT}/platform-database.dump" \
  "$database_name"

section "Capturing production configuration"
install -m 0600 "$platform_env" "${STAGE_ROOT}/platform.env"

for candidate in \
  "${PLATFORM_ROOT}/messaging-service/.env" \
  "/etc/bantubuzz/messaging.env" \
  "${PLATFORM_ROOT}/messaging-service/.env.production"; do
  if [ -s "$candidate" ]; then
    install -m 0600 "$candidate" "${STAGE_ROOT}/messaging.env"
    break
  fi
done

if [ -x "${BACKEND_ROOT}/venv/bin/pip" ]; then
  "${BACKEND_ROOT}/venv/bin/pip" freeze > "${STAGE_ROOT}/old-python-packages.txt" || true
fi

if [ -f "${BACKEND_ROOT}/migrations/alembic.ini" ]; then
  (
    cd "$BACKEND_ROOT"
    if [ -x venv/bin/flask ]; then
      DATABASE_URL="$database_url" FLASK_APP=run.py \
        venv/bin/flask db current > "${STAGE_ROOT}/old-alembic-revision.txt" 2>&1 || true
    fi
  )
fi

section "Capturing uploaded files"
if [ -d "${BACKEND_ROOT}/uploads" ]; then
  tar -czf "${STAGE_ROOT}/platform-uploads.tar.gz" \
    -C "$BACKEND_ROOT" uploads
else
  tar -czf "${STAGE_ROOT}/platform-uploads.tar.gz" \
    --files-from /dev/null
fi

section "Writing migration manifest"
{
  echo "captured_at=$(date --iso-8601=seconds 2>/dev/null || date)"
  echo "source_host=$(hostname -f 2>/dev/null || hostname)"
  echo "source_root=$PLATFORM_ROOT"
  echo "database_name=$database_name"
  echo "database_size=$(runuser -u postgres -- psql -d "$database_name" -Atqc "SELECT pg_size_pretty(pg_database_size(current_database()))")"
  echo "upload_archive_size=$(du -h "${STAGE_ROOT}/platform-uploads.tar.gz" | awk '{print $1}')"
  echo "user_count=$(runuser -u postgres -- psql -d "$database_name" -Atqc "SELECT count(*) FROM users" 2>/dev/null || echo unknown)"
  echo "alembic_version=$(runuser -u postgres -- psql -d "$database_name" -Atqc "SELECT version_num FROM alembic_version" 2>/dev/null || echo unknown)"
} > "$MANIFEST"

(
  cd "$STAGE_ROOT"
  sha256sum \
    platform-database.dump \
    platform-uploads.tar.gz \
    platform.env > SHA256SUMS
  if [ -f messaging.env ]; then
    sha256sum messaging.env >> SHA256SUMS
  fi
)

section "Creating protected migration archive"
rm -f "$ARCHIVE"
tar -czf "$ARCHIVE" -C "$STAGE_ROOT" .
chmod 0600 "$ARCHIVE"

echo
cat "$MANIFEST"
echo
echo "Archive: $ARCHIVE"
echo "Archive size: $(du -h "$ARCHIVE" | awk '{print $1}')"
echo "BANTUBUZZ_OLD_PLATFORM_CAPTURE_SUCCESS"
