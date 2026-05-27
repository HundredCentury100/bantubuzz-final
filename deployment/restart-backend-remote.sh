#!/usr/bin/env bash
set -u

REMOTE_BACKEND="${REMOTE_BACKEND:-/var/www/bantubuzz/backend}"
PORT="${PORT:-8002}"

cd "$REMOTE_BACKEND" || exit 1
source venv/bin/activate

echo "Backend directory: $REMOTE_BACKEND"
echo "Stopping Gunicorn on port $PORT..."

echo "Existing Gunicorn processes:"
pgrep -af "gunicorn.*0.0.0.0:$PORT" || true

PIDS="$(pgrep -f "gunicorn.*0.0.0.0:$PORT" || true)"
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs -r kill
  sleep 3
fi

PIDS="$(pgrep -f "gunicorn.*0.0.0.0:$PORT" || true)"
if [ -n "$PIDS" ]; then
  echo "Force stopping remaining Gunicorn PIDs:"
  echo "$PIDS"
  echo "$PIDS" | xargs -r kill -9
  sleep 1
fi

if command -v fuser >/dev/null 2>&1; then
  if fuser "${PORT}/tcp" >/dev/null 2>&1; then
    echo "Killing remaining process listening on port $PORT..."
    fuser -k "${PORT}/tcp" || true
    sleep 1
  fi
fi

echo "Port state before start:"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp | grep ":$PORT " || true
else
  netstat -tlnp | grep ":$PORT " || true
fi

echo "Starting Gunicorn..."
venv/bin/gunicorn -w 4 -b "0.0.0.0:$PORT" --timeout 120 \
  --error-logfile gunicorn_error.log \
  --access-logfile gunicorn_access.log \
  'app:create_app()' --daemon

echo "Restarting Apache..."
systemctl restart apache2

echo "Waiting for backend health..."
HEALTH_OK=0
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:$PORT/api/health"; then
    HEALTH_OK=1
    break
  fi
  sleep 2
done

echo
echo "Gunicorn processes after start:"
pgrep -af "gunicorn.*0.0.0.0:$PORT" || true

echo "Port state after start:"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp | grep ":$PORT " || true
else
  netstat -tlnp | grep ":$PORT " || true
fi

if [ "$HEALTH_OK" != "1" ]; then
  echo "Backend health failed."
  echo "Recent Gunicorn errors:"
  tail -120 gunicorn_error.log || true
  echo "Recent Gunicorn access log:"
  tail -40 gunicorn_access.log || true
  exit 1
fi

echo "Apache status:"
systemctl is-active apache2

echo "Public health:"
curl -L -f -s -i https://bantubuzz.com/api/health
