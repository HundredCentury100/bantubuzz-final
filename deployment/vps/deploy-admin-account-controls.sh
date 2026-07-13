#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
BACKUP_ROOT="/var/backups/bantubuzz/admin-account-controls-before-$(date +%Y%m%d_%H%M%S)"

echo "Creating targeted backup at $BACKUP_ROOT"
mkdir -p "$BACKUP_ROOT/backend" "$BACKUP_ROOT/frontend"

cd "$BACKEND_ROOT"
for path in \
  app/models/__init__.py \
  app/models/account_fee_override.py \
  app/services/account_fee_override_service.py \
  app/utils/subscription_helper.py \
  app/services/payment_service.py \
  app/routes/admin/users.py \
  app/services/subscription_enforcement_service.py \
  app/models/subscription_plan.py \
  migrations/versions/202607131500_add_admin_account_controls.py
do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP_ROOT/backend/$(dirname "$path")"
    cp -a "$path" "$BACKUP_ROOT/backend/$path"
  fi
done

if [ -d "$FRONTEND_ROOT" ]; then
  tar -C "$FRONTEND_ROOT" -czf "$BACKUP_ROOT/frontend-before.tar.gz" .
fi

echo "Installing backend files"
tar -C "$BACKEND_ROOT" -xzf /tmp/bantubuzz-admin-account-controls-backend.tar.gz

echo "Installing frontend build"
mkdir -p "$FRONTEND_ROOT"
rm -rf "$FRONTEND_ROOT"/*
tar -C "$FRONTEND_ROOT" -xzf /tmp/bantubuzz-admin-account-controls-frontend.tar.gz

echo "Loading production environment"
if [ -f /etc/bantubuzz/platform.env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    if printf '%s' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$' && [ "$line" != "$key" ]; then
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      export "$key=$value"
    fi
  done < /etc/bantubuzz/platform.env
fi

echo "Compiling targeted backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/models/account_fee_override.py \
  app/services/account_fee_override_service.py \
  app/utils/subscription_helper.py \
  app/services/payment_service.py \
  app/routes/admin/users.py \
  migrations/versions/202607131500_add_admin_account_controls.py

echo "Running database migration"
venv/bin/flask db upgrade heads

echo "Restarting backend and web services"
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  systemctl restart bantubuzz-backend
else
  pkill -f 'gunicorn.*app:create_app' || true
  sleep 2
  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

if systemctl list-unit-files | grep -q '^bantubuzz-celery\.service'; then
  systemctl restart bantubuzz-celery || true
fi
if systemctl list-unit-files | grep -q '^bantubuzz-celery-beat\.service'; then
  systemctl restart bantubuzz-celery-beat || true
fi

systemctl restart apache2
sleep 3

echo "Local health:"
curl -sS http://localhost:8002/api/health
echo
echo "Public health:"
curl -sS https://bantubuzz.com/api/health
echo

echo "BANTUBUZZ_ADMIN_ACCOUNT_CONTROLS_SUCCESS"
