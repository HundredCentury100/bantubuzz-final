#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/bantubuzz"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"
BACKUP_DIR="/var/backups/bantubuzz"
BACKEND_ARCHIVE="/tmp/bantubuzz-featured-search-backend.tar.gz"
FRONTEND_ARCHIVE="/tmp/bantubuzz-featured-search-frontend.tar.gz"
STAMP="$(date +%Y%m%d_%H%M%S)"

echo "Creating targeted backup at ${BACKUP_DIR}/featured-search-before-${STAMP}"
mkdir -p "${BACKUP_DIR}/featured-search-before-${STAMP}"
cp -a "${BACKEND_DIR}/app/routes/admin/featured.py" "${BACKUP_DIR}/featured-search-before-${STAMP}/admin_featured.py"
cp -a "${BACKEND_DIR}/app/routes/creators.py" "${BACKUP_DIR}/featured-search-before-${STAMP}/creators.py"
if [ -d "${FRONTEND_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/frontend-before-featured-search-${STAMP}.tar.gz" -C "${APP_DIR}" frontend
fi

echo "Installing backend files"
tar -xzf "${BACKEND_ARCHIVE}" -C "${BACKEND_DIR}"
chown -R bantubuzz:www-data "${BACKEND_DIR}/app/routes/admin/featured.py" "${BACKEND_DIR}/app/routes/creators.py"

echo "Compiling backend files"
cd "${BACKEND_DIR}"
venv/bin/python -m py_compile app/routes/admin/featured.py app/routes/creators.py

echo "Installing frontend dist"
rm -rf "${FRONTEND_DIR}"
mkdir -p "${FRONTEND_DIR}"
tar -xzf "${FRONTEND_ARCHIVE}" -C "${FRONTEND_DIR}"
chown -R www-data:www-data "${FRONTEND_DIR}"

echo "Restarting backend and reloading Apache"
systemctl restart bantubuzz-backend.service
systemctl reload apache2

echo "Health checks"
for i in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:8002/api/health >/dev/null; then
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:8002/api/health
echo
curl -L -fsS -o /dev/null -w "admin_featured_http=%{http_code}\n" https://bantubuzz.com/admin/featured
curl -L -fsS -o /dev/null -w "browse_creators_http=%{http_code}\n" https://bantubuzz.com/browse/creators
systemctl is-active bantubuzz-backend.service

rm -f "${BACKEND_ARCHIVE}" "${FRONTEND_ARCHIVE}"
echo "BANTUBUZZ_FEATURED_CREATORS_SEARCH_FIX_SUCCESS"
