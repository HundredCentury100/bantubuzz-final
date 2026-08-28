#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
BACKEND_ARCHIVE="/tmp/bantubuzz-agency-client-session-route-backend.tar.gz"
FRONTEND_ARCHIVE="/tmp/bantubuzz-agency-client-session-route-frontend.tar.gz"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/var/backups/bantubuzz/agency-client-session-route-before-$STAMP"
ROUTE_PATH="/api/workspaces/1/enter-brand-session"

check_route() {
  local url="$1"
  local label="$2"
  local status
  status="$(curl -sS -o /tmp/bantubuzz-client-session-route.json -w '%{http_code}' -X POST --max-time 15 "$url" || true)"
  printf '%s route status: %s\n' "$label" "$status"
  cat /tmp/bantubuzz-client-session-route.json || true
  echo
  # The route is protected, so no token must produce 401. A 404 means the
  # running application did not load the route we just deployed.
  [ "$status" = "401" ]
}

echo "Creating targeted backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
tar --ignore-failed-read -czf "$BACKUP_DIR/backend-files.tar.gz" -C "$BACKEND_ROOT" \
  app/routes/workspaces.py app/services/workspace_service.py app/routes/brands.py app/routes/subscriptions.py \
  2>/dev/null || true
tar --ignore-failed-read -czf "$BACKUP_DIR/frontend.tar.gz" -C "$FRONTEND_ROOT" . 2>/dev/null || true

echo "Installing client-session backend routes"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_ROOT"

echo "Verifying deployed source includes the client session route"
grep -Fq "enter-brand-session" "$BACKEND_ROOT/app/routes/workspaces.py"

echo "Compiling deployed backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/routes/workspaces.py \
  app/services/workspace_service.py \
  app/routes/brands.py \
  app/routes/subscriptions.py

echo "Installing live frontend assets"
mkdir -p "$FRONTEND_ROOT"
find "$FRONTEND_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_ROOT"

echo "Replacing all Gunicorn backend processes"
systemctl stop bantubuzz-backend || true
pkill -f 'gunicorn.*127.0.0.1:8002' || true
echo "Listeners before clearing port 8002:"
ss -ltnp '( sport = :8002 )' || true
# A manually started or orphaned Gunicorn can retain port 8002 after the
# systemd unit is stopped.  The live requests would then reach that old app.
if command -v fuser >/dev/null 2>&1; then
  fuser -k -TERM 8002/tcp || true
  sleep 2
  fuser -k -KILL 8002/tcp || true
else
  lsof -tiTCP:8002 -sTCP:LISTEN 2>/dev/null | xargs -r kill -KILL || true
fi
echo "Listeners after clearing port 8002:"
ss -ltnp '( sport = :8002 )' || true
rm -rf "$BACKEND_ROOT/app/__pycache__" "$BACKEND_ROOT/app/routes/__pycache__"
systemctl start bantubuzz-backend
systemctl reload apache2

if [ "$(systemctl is-active bantubuzz-backend)" != "active" ]; then
  systemctl status bantubuzz-backend --no-pager -l | sed -n '1,140p'
  exit 1
fi

echo "Backend: active"
echo "Managed listener on port 8002:"
ss -ltnp '( sport = :8002 )' || true
echo "Inspecting the route map loaded by the application factory"
venv/bin/python - <<'PY'
from app import create_app

route = '/api/workspaces/<int:workspace_id>/enter-brand-session'
app = create_app()
registered = any(rule.rule == route and 'POST' in rule.methods for rule in app.url_map.iter_rules())
print(f'application_factory_route_registered={registered}')
if not registered:
    raise SystemExit('The application factory did not register enter-brand-session')
PY

echo "Validating local route registration"
if ! check_route "http://127.0.0.1:8002$ROUTE_PATH" "Local"; then
  echo "ERROR: The running local backend does not expose the delegated client session route."
  systemctl cat bantubuzz-backend --no-pager || true
  exit 1
fi

echo "Validating public route registration"
if ! check_route "https://bantubuzz.com$ROUTE_PATH" "Public"; then
  echo "ERROR: Apache is not serving the delegated client session route."
  exit 1
fi

echo "BANTUBUZZ_AGENCY_CLIENT_SESSION_ROUTE_REPAIR_SUCCESS"
