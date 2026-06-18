#!/usr/bin/env bash
set -euo pipefail

REMOTE_ROOT="/var/www/bantubuzz"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
ARCHIVE="/tmp/bantubuzz-weekly-inactive-email.tar.gz"

cd "$REMOTE_ROOT"

if [ ! -s "$PLATFORM_ENV" ]; then
  echo "Missing platform environment: $PLATFORM_ENV"
  exit 1
fi

if [ ! -s "$ARCHIVE" ]; then
  echo "Missing deployment archive: $ARCHIVE"
  exit 1
fi

eval "$(
  python3 - "$PLATFORM_ENV" <<'PY'
import re
import shlex
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    key = key.strip()
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key):
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    print(f"export {key}={shlex.quote(value)}")
PY
)"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/bantubuzz/weekly-inactive-email-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/celery_app.py \
  app/tasks/email_tasks.py \
  app/models/user.py \
  migrations/versions

echo "Installing weekly inactive email files"
tar -xzf "$ARCHIVE" -C backend
chown bantubuzz:www-data \
  backend/app/celery_app.py \
  backend/app/tasks/email_tasks.py \
  backend/app/models/user.py \
  backend/migrations/versions/202606181000_add_inactive_reminder_sent_at.py

echo "Compiling targeted backend files"
cd backend
venv/bin/python -m py_compile \
  app/celery_app.py \
  app/tasks/email_tasks.py \
  app/models/user.py \
  migrations/versions/202606181000_add_inactive_reminder_sent_at.py

echo "Running targeted database migration"
export FLASK_APP=run.py
venv/bin/flask db upgrade 202606181000

echo "Clearing Celery Beat persisted schedule cache"
systemctl stop bantubuzz-celery-beat.service || true
rm -f \
  celerybeat-schedule \
  celerybeat-schedule.* \
  /var/www/bantubuzz/backend/celerybeat-schedule \
  /var/www/bantubuzz/backend/celerybeat-schedule.*

echo "Restarting services"
systemctl restart bantubuzz-celery-worker.service bantubuzz-backend.service
systemctl start bantubuzz-celery-beat.service
sleep 5

echo "Celery beat:"
systemctl is-active bantubuzz-celery-beat.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service
echo "Backend:"
systemctl is-active bantubuzz-backend.service

echo "Verifying Monday-only schedule is loaded in source"
grep -q "day_of_week='monday'" app/celery_app.py
grep -q "Inactive reminders only run on Mondays" app/tasks/email_tasks.py
grep -q "inactive_reminder_sent_at" app/models/user.py

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

rm -f "$ARCHIVE" /tmp/deploy-weekly-inactive-email.sh
echo BANTUBUZZ_NEW_VPS_WEEKLY_INACTIVE_EMAIL_SUCCESS
