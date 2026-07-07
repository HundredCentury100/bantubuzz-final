#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/bantubuzz/platform.env"
SECRET_FILE="/tmp/bantubuzz-recaptcha.env"
BACKUP_DIR="/var/backups/bantubuzz"
STAMP="$(date +%Y%m%d_%H%M%S)"

echo "Validating reCAPTCHA environment payload"
if [ ! -s "$SECRET_FILE" ]; then
  echo "Missing $SECRET_FILE"
  exit 1
fi

if ! grep -q '^RECAPTCHA_ENTERPRISE_API_KEY=' "$SECRET_FILE"; then
  echo "Missing RECAPTCHA_ENTERPRISE_API_KEY in payload"
  rm -f "$SECRET_FILE"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP_DIR/platform.env.before-recaptcha-$STAMP"
else
  touch "$ENV_FILE"
fi

echo "Updating /etc/bantubuzz/platform.env"
tmp_env="$(mktemp)"
grep -v -E '^(RECAPTCHA_ENTERPRISE_SITE_KEY|RECAPTCHA_ENTERPRISE_PROJECT_ID|RECAPTCHA_ENTERPRISE_API_KEY|RECAPTCHA_ENTERPRISE_MIN_SCORE|RECAPTCHA_ENTERPRISE_FAIL_OPEN|RECAPTCHA_ENTERPRISE_ALLOWED_HOSTNAMES)=' "$ENV_FILE" > "$tmp_env" || true
{
  echo ""
  echo "# reCAPTCHA Enterprise signup protection"
  cat "$SECRET_FILE"
} >> "$tmp_env"
install -m 600 -o root -g root "$tmp_env" "$ENV_FILE"
rm -f "$tmp_env" "$SECRET_FILE"

echo "Restarting BantuBuzz services"
systemctl restart bantubuzz-backend.service
systemctl restart bantubuzz-celery-worker.service || true
systemctl restart bantubuzz-celery-beat.service || true
sleep 3

echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service || true
echo "Celery beat:"
systemctl is-active bantubuzz-celery-beat.service || true

echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

echo "BANTUBUZZ_RECAPTCHA_ENV_UPDATE_SUCCESS"
