#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
FRONTEND_ARCHIVE="/tmp/bantubuzz-agency-client-management-frontend.tar.gz"
BACKEND_ARCHIVE="/tmp/bantubuzz-agency-client-management-backend.tar.gz"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/var/backups/bantubuzz/agency-client-management-before-$STAMP"

wait_for_url() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 10 "$url"; then
      echo
      echo "$label: healthy"
      return 0
    fi
    sleep 2
  done
  echo "$label: unhealthy"
  return 1
}

echo "Creating targeted backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
tar --ignore-failed-read -czf "$BACKUP_DIR/backend-files.tar.gz" -C "$BACKEND_ROOT" \
  app/models/__init__.py app/models/client_workspace.py \
  app/routes/workspaces.py app/routes/campaigns.py app/routes/brands.py app/routes/subscriptions.py \
  app/services/workspace_service.py app/services/white_label_report_service.py app/utils/brand_identity.py \
  migrations/versions/202608261000_add_client_brand_link_to_workspaces.py \
  migrations/versions/202608281200_add_workspace_connection_requests.py 2>/dev/null || true
tar --ignore-failed-read -czf "$BACKUP_DIR/frontend.tar.gz" -C "$APP_ROOT" frontend 2>/dev/null || true

echo "Installing backend files"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_ROOT"

echo "Compiling backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/models/__init__.py app/models/client_workspace.py \
  app/routes/workspaces.py app/routes/campaigns.py app/routes/brands.py app/routes/subscriptions.py \
  app/services/workspace_service.py app/services/white_label_report_service.py app/utils/brand_identity.py \
  migrations/versions/202608261000_add_client_brand_link_to_workspaces.py \
  migrations/versions/202608281200_add_workspace_connection_requests.py

echo "Loading production environment and applying database migrations"
set -a
. /etc/bantubuzz/platform.env
set +a
venv/bin/flask db upgrade heads

echo "Installing frontend into Apache document root"
mkdir -p "$FRONTEND_ROOT"
find "$FRONTEND_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_ROOT"

echo "Restarting platform services"
systemctl restart bantubuzz-backend
systemctl restart bantubuzz-celery-worker 2>/dev/null || true
systemctl restart bantubuzz-celery-beat 2>/dev/null || true
systemctl reload apache2

if [ "$(systemctl is-active bantubuzz-backend)" != "active" ]; then
  systemctl status bantubuzz-backend --no-pager -l | sed -n '1,120p'
  exit 1
fi
echo "Backend: active"
wait_for_url "http://127.0.0.1:8002/api/health" "Local API"
wait_for_url "https://bantubuzz.com/api/health" "Public API"
echo "BANTUBUZZ_AGENCY_CLIENT_MANAGEMENT_SUCCESS"
