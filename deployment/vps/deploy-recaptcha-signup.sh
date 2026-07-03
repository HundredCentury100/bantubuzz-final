#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/bantubuzz"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"
BACKUP_DIR="/var/backups/bantubuzz"
BACKEND_ARCHIVE="/tmp/bantubuzz-recaptcha-backend.tar.gz"
FRONTEND_ARCHIVE="/tmp/bantubuzz-recaptcha-frontend.tar.gz"
STAMP="$(date +%Y%m%d_%H%M%S)"

echo "Creating targeted backup at ${BACKUP_DIR}/recaptcha-signup-before-${STAMP}"
mkdir -p "${BACKUP_DIR}/recaptcha-signup-before-${STAMP}"
cp -a "${BACKEND_DIR}/app/config.py" "${BACKUP_DIR}/recaptcha-signup-before-${STAMP}/config.py"
cp -a "${BACKEND_DIR}/app/routes/auth.py" "${BACKUP_DIR}/recaptcha-signup-before-${STAMP}/auth.py"
if [ -f "${BACKEND_DIR}/app/utils/recaptcha_enterprise.py" ]; then
  cp -a "${BACKEND_DIR}/app/utils/recaptcha_enterprise.py" "${BACKUP_DIR}/recaptcha-signup-before-${STAMP}/recaptcha_enterprise.py"
fi
if [ -d "${FRONTEND_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/frontend-before-recaptcha-signup-${STAMP}.tar.gz" -C "${APP_DIR}" frontend
fi

echo "Installing backend files"
tar -xzf "${BACKEND_ARCHIVE}" -C "${BACKEND_DIR}"
chown -R bantubuzz:www-data "${BACKEND_DIR}/app/config.py" "${BACKEND_DIR}/app/routes/auth.py" "${BACKEND_DIR}/app/utils/recaptcha_enterprise.py"

echo "Compiling backend files"
cd "${BACKEND_DIR}"
venv/bin/python -m py_compile app/config.py app/routes/auth.py app/utils/recaptcha_enterprise.py

echo "Installing frontend dist"
rm -rf "${FRONTEND_DIR}"
mkdir -p "${FRONTEND_DIR}"
tar -xzf "${FRONTEND_ARCHIVE}" -C "${FRONTEND_DIR}"
chown -R www-data:www-data "${FRONTEND_DIR}"

echo "Checking reCAPTCHA Enterprise production configuration"
if [ -f /etc/bantubuzz/platform.env ]; then
  if grep -q '^RECAPTCHA_ENTERPRISE_API_KEY=' /etc/bantubuzz/platform.env; then
    echo "RECAPTCHA_ENTERPRISE_API_KEY is present in /etc/bantubuzz/platform.env"
  else
    echo "WARNING: RECAPTCHA_ENTERPRISE_API_KEY is not set in /etc/bantubuzz/platform.env"
    echo "Signup will still work, but backend enforcement will be disabled until the key is added and services are restarted."
  fi
else
  echo "WARNING: /etc/bantubuzz/platform.env was not found."
fi

echo "Restarting backend services and reloading Apache"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service
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
curl -L -fsS -o /dev/null -w "creator_signup_http=%{http_code}\n" https://bantubuzz.com/register/creator
curl -L -fsS -o /dev/null -w "brand_signup_http=%{http_code}\n" https://bantubuzz.com/register/brand
systemctl is-active bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service

rm -f "${BACKEND_ARCHIVE}" "${FRONTEND_ARCHIVE}"
echo "BANTUBUZZ_RECAPTCHA_SIGNUP_DEPLOY_SUCCESS"
