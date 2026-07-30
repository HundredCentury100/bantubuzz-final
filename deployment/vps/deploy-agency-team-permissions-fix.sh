#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/bantubuzz"
FRONTEND_DIR="${APP_DIR}/frontend"
BACKUP_DIR="/var/backups/bantubuzz"
FRONTEND_ARCHIVE="/tmp/bantubuzz-agency-team-permissions-frontend.tar.gz"
STAMP="$(date +%Y%m%d_%H%M%S)"

echo "Creating frontend backup at ${BACKUP_DIR}/frontend-before-agency-team-permissions-${STAMP}.tar.gz"
mkdir -p "${BACKUP_DIR}"
if [ -d "${FRONTEND_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/frontend-before-agency-team-permissions-${STAMP}.tar.gz" -C "${APP_DIR}" frontend
fi

echo "Installing frontend dist"
rm -rf "${FRONTEND_DIR}"
mkdir -p "${FRONTEND_DIR}"
tar -xzf "${FRONTEND_ARCHIVE}" -C "${FRONTEND_DIR}"
chown -R www-data:www-data "${FRONTEND_DIR}"

echo "Reloading Apache"
systemctl reload apache2

echo "Health checks"
curl -fsS http://127.0.0.1:8002/api/health
echo
curl -L -fsS -o /dev/null -w "agency_dashboard_http=%{http_code}\n" https://bantubuzz.com/brand/agency

rm -f "${FRONTEND_ARCHIVE}"
echo "BANTUBUZZ_AGENCY_TEAM_PERMISSIONS_FIX_SUCCESS"
