#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
BACKUP_ROOT="/var/backups/bantubuzz/creator-team-access-before-$(date +%Y%m%d_%H%M%S)"

echo "Creating targeted backup at $BACKUP_ROOT"
mkdir -p "$BACKUP_ROOT/backend" "$BACKUP_ROOT/frontend"

cd "$BACKEND_ROOT"
for path in \
  app/__init__.py \
  app/models/__init__.py \
  app/models/creator_team.py \
  app/services/creator_team_service.py \
  app/routes/creator_team.py \
  migrations/versions/202607151000_add_creator_team_access.py
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
tar -C "$BACKEND_ROOT" -xzf /tmp/bantubuzz-creator-team-access-backend.tar.gz

echo "Installing frontend build"
mkdir -p "$FRONTEND_ROOT"
rm -rf "$FRONTEND_ROOT"/*
tar -C "$FRONTEND_ROOT" -xzf /tmp/bantubuzz-creator-team-access-frontend.tar.gz

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

echo "Compiling backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/__init__.py \
  app/models/__init__.py \
  app/models/creator_team.py \
  app/services/creator_team_service.py \
  app/routes/creator_team.py \
  migrations/versions/202607151000_add_creator_team_access.py

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

echo "BANTUBUZZ_CREATOR_TEAM_ACCESS_SUCCESS"
