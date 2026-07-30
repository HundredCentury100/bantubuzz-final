#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bantubuzz"
FRONTEND_DIR="$APP_ROOT/frontend"
ARCHIVE="/tmp/bantubuzz-payment-wording-frontend.tar.gz"
BACKUP_DIR="/var/backups/bantubuzz/payment-wording-before-$(date +%Y%m%d_%H%M%S)"

echo "Creating frontend backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
if [ -d "$FRONTEND_DIR" ]; then
  tar -czf "$BACKUP_DIR/frontend.tar.gz" -C "$FRONTEND_DIR" . || true
fi

echo "Installing frontend build"
mkdir -p "$FRONTEND_DIR"
find "$FRONTEND_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$ARCHIVE" -C "$FRONTEND_DIR"
chown -R www-data:www-data "$FRONTEND_DIR" || true

echo "Reloading Apache"
systemctl reload apache2

echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo
echo "BANTUBUZZ_PAYMENT_WORDING_DEPLOY_SUCCESS"
