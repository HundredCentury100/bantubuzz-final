#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
BACKUP_ROOT="/var/backups/bantubuzz/workspace-invite-email-before-$(date +%Y%m%d_%H%M%S)"

echo "Creating targeted backup at $BACKUP_ROOT"
mkdir -p "$BACKUP_ROOT/backend/app/routes"

cd "$BACKEND_ROOT"
if [ -f app/routes/workspaces.py ]; then
  cp -a app/routes/workspaces.py "$BACKUP_ROOT/backend/app/routes/workspaces.py"
fi

echo "Installing workspace invite email fix"
tar -C "$BACKEND_ROOT" -xzf /tmp/bantubuzz-workspace-invite-email-fix-backend.tar.gz

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

echo "Compiling backend route"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile app/routes/workspaces.py

echo "Restarting backend"
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  systemctl restart bantubuzz-backend
else
  pkill -f 'gunicorn.*app:create_app' || true
  sleep 2
  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

systemctl restart apache2
sleep 3

echo "Local health:"
curl -sS http://localhost:8002/api/health
echo
echo "Public health:"
curl -sS https://bantubuzz.com/api/health
echo

echo "BANTUBUZZ_WORKSPACE_INVITE_EMAIL_FIX_SUCCESS"
