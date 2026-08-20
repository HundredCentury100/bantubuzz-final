#!/usr/bin/env bash
set -euo pipefail

FRONTEND_ARCHIVE="/tmp/bantubuzz-creator-billing-subscriptions-frontend.tar.gz"
BACKEND_ARCHIVE="/tmp/bantubuzz-creator-billing-subscriptions-backend.tar.gz"
APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
BACKUP_ROOT="/var/backups/bantubuzz"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/creator-billing-subscriptions-before-$STAMP"

wait_for_service() {
  local service="$1"
  local label="$2"
  local tries="${3:-30}"
  local delay="${4:-2}"
  local status=""

  for _ in $(seq 1 "$tries"); do
    status="$(systemctl is-active "$service" 2>/dev/null || true)"
    if [ "$status" = "active" ]; then
      echo "$label: active"
      return 0
    fi
    if [ "$status" = "failed" ]; then
      echo "$label: failed"
      systemctl status "$service" --no-pager -l | sed -n '1,90p' || true
      return 1
    fi
    sleep "$delay"
  done

  echo "$label: ${status:-unknown}"
  systemctl status "$service" --no-pager -l | sed -n '1,90p' || true
  return 1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries="${3:-30}"
  local delay="${4:-2}"

  for _ in $(seq 1 "$tries"); do
    if curl -fsS --max-time 10 "$url" >/tmp/bantubuzz-creator-billing-wait.out 2>/tmp/bantubuzz-creator-billing-wait.err; then
      echo "$label: healthy"
      cat /tmp/bantubuzz-creator-billing-wait.out
      echo
      return 0
    fi
    sleep "$delay"
  done

  echo "$label: unhealthy"
  cat /tmp/bantubuzz-creator-billing-wait.err || true
  echo
  return 1
}

echo "Creating targeted backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
tar --ignore-failed-read -czf "$BACKUP_DIR/backend-files.tar.gz" -C "$BACKEND_ROOT" \
  app/routes/auth.py \
  app/routes/billing.py \
  2>/dev/null || true
if [ -d "$FRONTEND_ROOT" ]; then
  tar -czf "$BACKUP_DIR/frontend.tar.gz" -C "$APP_ROOT" frontend 2>/dev/null || true
fi

echo "Installing backend files"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_ROOT"

echo "Compiling targeted backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/routes/auth.py \
  app/routes/billing.py

echo "Installing frontend build at Apache document root"
rm -rf "$FRONTEND_ROOT"
mkdir -p "$FRONTEND_ROOT"
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_ROOT"
chown -R www-data:www-data "$FRONTEND_ROOT" "$BACKEND_ROOT/app/routes" || true

echo "Restarting backend and workers"
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' || true
  systemctl restart bantubuzz-backend.service
else
  if [ ! -s "$PLATFORM_ENV" ]; then
    echo "Missing production environment file: $PLATFORM_ENV"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$PLATFORM_ENV"
  set +a
  pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' || true
  sleep 2
  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

if systemctl list-unit-files | grep -q '^bantubuzz-celery-worker\.service'; then
  systemctl restart bantubuzz-celery-worker.service
fi
if systemctl list-unit-files | grep -q '^bantubuzz-celery-beat\.service'; then
  systemctl restart bantubuzz-celery-beat.service
fi

sleep 3
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  wait_for_service bantubuzz-backend.service "Backend"
else
  if pgrep -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' >/dev/null; then
    echo "Backend: active via gunicorn daemon"
  else
    echo "Backend: gunicorn daemon not running"
    tail -n 120 "$BACKEND_ROOT/gunicorn_error.log" || true
    exit 1
  fi
fi
if systemctl list-unit-files | grep -q '^bantubuzz-celery-worker\.service'; then
  wait_for_service bantubuzz-celery-worker.service "Celery worker"
fi
if systemctl list-unit-files | grep -q '^bantubuzz-celery-beat\.service'; then
  wait_for_service bantubuzz-celery-beat.service "Celery beat"
fi

wait_for_url http://127.0.0.1:8002/api/health "Local API health"
wait_for_url 'http://127.0.0.1:8002/api/creators?per_page=1' "Local creators endpoint"
wait_for_url https://bantubuzz.com/api/health "Public API health"
wait_for_url 'https://bantubuzz.com/api/creators?per_page=1' "Public creators endpoint"

rm -f "$FRONTEND_ARCHIVE" "$BACKEND_ARCHIVE"
echo "BANTUBUZZ_CREATOR_BILLING_SUBSCRIPTIONS_ACCOUNT_FIXES_SUCCESS"
