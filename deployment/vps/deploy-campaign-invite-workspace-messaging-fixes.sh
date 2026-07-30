#!/usr/bin/env bash
set -euo pipefail

FRONTEND_ARCHIVE="/tmp/bantubuzz-campaign-message-frontend.tar.gz"
BACKEND_ARCHIVE="/tmp/bantubuzz-campaign-message-backend.tar.gz"
NODE_ARCHIVE="/tmp/bantubuzz-campaign-message-node.tar.gz"
APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
MESSAGING_ROOT="$APP_ROOT/messaging-service"
BACKUP_ROOT="/var/backups/bantubuzz"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/campaign-message-before-$STAMP"

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
    if curl -fsS --max-time 10 "$url" >/tmp/bantubuzz-campaign-message-wait.out 2>/tmp/bantubuzz-campaign-message-wait.err; then
      echo "$label: healthy"
      cat /tmp/bantubuzz-campaign-message-wait.out
      echo
      return 0
    fi
    sleep "$delay"
  done

  echo "$label: unhealthy"
  cat /tmp/bantubuzz-campaign-message-wait.err || true
  echo
  return 1
}

echo "Creating targeted backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
tar --ignore-failed-read -czf "$BACKUP_DIR/backend-files.tar.gz" -C "$BACKEND_ROOT" \
  app/models/campaign_invitation.py \
  app/models/collaboration.py \
  app/models/message.py \
  app/routes/admin/collaborations.py \
  app/routes/campaign_cart.py \
  app/routes/campaign_invitations.py \
  app/routes/messages.py \
  app/services/payment_service.py \
  migrations/versions/202607291000_add_workspace_id_to_messages.py \
  2>/dev/null || true
if [ -d "$MESSAGING_ROOT" ]; then
  tar --ignore-failed-read -czf "$BACKUP_DIR/messaging-service.tar.gz" -C "$MESSAGING_ROOT" server.js package.json package-lock.json 2>/dev/null || true
fi
if [ -d "$FRONTEND_ROOT" ]; then
  tar -czf "$BACKUP_DIR/frontend.tar.gz" -C "$APP_ROOT" frontend 2>/dev/null || true
fi

echo "Installing backend files"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_ROOT"

echo "Installing messaging service files"
mkdir -p "$MESSAGING_ROOT"
tar -xzf "$NODE_ARCHIVE" -C "$MESSAGING_ROOT"

echo "Compiling backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/models/campaign_invitation.py \
  app/models/collaboration.py \
  app/models/message.py \
  app/routes/admin/collaborations.py \
  app/routes/campaign_cart.py \
  app/routes/campaign_invitations.py \
  app/routes/messages.py \
  app/services/payment_service.py \
  migrations/versions/202607291000_add_workspace_id_to_messages.py

echo "Checking messaging service"
cd "$MESSAGING_ROOT"
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi
node --check server.js

echo "Running database migration without data loss"
cd "$BACKEND_ROOT"
if [ -s /etc/bantubuzz/platform.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /etc/bantubuzz/platform.env
  set +a
fi
venv/bin/flask db upgrade heads

echo "Installing frontend build at Apache document root"
rm -rf "$FRONTEND_ROOT"
mkdir -p "$FRONTEND_ROOT"
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_ROOT"
chown -R www-data:www-data "$FRONTEND_ROOT" "$BACKEND_ROOT/app" "$MESSAGING_ROOT" || true

echo "Restarting backend, messaging, and Apache"
cd "$BACKEND_ROOT"
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' || true
  systemctl restart bantubuzz-backend.service
else
  pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' || true
  sleep 2
  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

if systemctl list-unit-files | grep -q '^bantubuzz-messaging\.service'; then
  pkill -f '/var/www/bantubuzz/messaging-service/server.js|messaging-service/server.js|node server.js' || true
  systemctl restart bantubuzz-messaging.service
else
  pkill -f '/var/www/bantubuzz/messaging-service/server.js|messaging-service/server.js|node server.js' || true
  cd "$MESSAGING_ROOT"
  nohup node server.js >/var/log/bantubuzz-messaging.log 2>&1 &
fi

systemctl reload apache2
sleep 3

if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  wait_for_service bantubuzz-backend.service "Backend"
fi
if systemctl list-unit-files | grep -q '^bantubuzz-messaging\.service'; then
  wait_for_service bantubuzz-messaging.service "Messaging"
fi

wait_for_url http://127.0.0.1:8002/api/health "Local API health"
wait_for_url https://bantubuzz.com/api/health "Public API health"

MESSAGING_PORT="${PORT:-3001}"
if systemctl list-unit-files | grep -q '^bantubuzz-messaging\.service'; then
  service_port="$(systemctl show bantubuzz-messaging.service -p Environment --value 2>/dev/null | tr ' ' '\n' | awk -F= '$1=="PORT"{print $2; exit}' || true)"
  if [ -n "$service_port" ]; then
    MESSAGING_PORT="$service_port"
  fi
fi
if ! wait_for_url "http://127.0.0.1:${MESSAGING_PORT}/health" "Messaging health"; then
  if [ "$MESSAGING_PORT" != "3002" ]; then
    wait_for_url http://127.0.0.1:3002/health "Messaging health on legacy port"
  else
    wait_for_url http://127.0.0.1:3001/health "Messaging health on default port"
  fi
fi

echo "Socket.IO public polling smoke test:"
curl -L -sS --max-time 20 'https://bantubuzz.com/socket.io/?EIO=4&transport=polling' | head -c 160
echo

echo "Campaign invite endpoint files installed and messages workspace migration applied."
rm -f "$FRONTEND_ARCHIVE" "$BACKEND_ARCHIVE" "$NODE_ARCHIVE"
echo "BANTUBUZZ_CAMPAIGN_INVITE_WORKSPACE_MESSAGING_FIXES_SUCCESS"
