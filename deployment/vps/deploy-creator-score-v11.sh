#!/usr/bin/env bash
set -euo pipefail

REMOTE_ROOT="/var/www/bantubuzz"
cd "$REMOTE_ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/bantubuzz/creator-score-v11-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/services/creator_score_formula.py \
  app/services/creator_score_service.py \
  app/services/collaboration_response_service.py \
  app/models/creator_score.py \
  app/models/creator_profile.py \
  app/routes/creators.py \
  app/routes/reviews.py \
  app/routes/messages.py \
  app/routes/collaborations.py \
  migrations/versions
tar --ignore-failed-read -czf "$BACKUP/frontend-current.tar.gz" -C frontend .

echo "Installing backend and frontend files"
tar -xzf /tmp/bantubuzz-creator-score-v11-backend.tar.gz -C backend
rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json frontend/message-push-sw.js
tar -xzf /tmp/bantubuzz-creator-score-v11-frontend.tar.gz -C frontend
chown -R bantubuzz:www-data frontend backend/app/services backend/app/models backend/app/routes backend/migrations/versions

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile

files = [
    'app/services/creator_score_formula.py',
    'app/services/creator_score_service.py',
    'app/services/collaboration_response_service.py',
    'app/models/creator_score.py',
    'app/models/creator_profile.py',
    'app/routes/creators.py',
    'app/routes/reviews.py',
    'app/routes/messages.py',
    'app/routes/collaborations.py',
]
for path in files:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_*.pyc

echo "Running database migration"
export FLASK_APP=run.py
venv/bin/flask db upgrade

echo "Restarting services"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service
sleep 5
echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service
echo "Celery beat:"
systemctl is-active bantubuzz-celery-beat.service

echo "Recalculating creator scores:"
venv/bin/python recalculate_creator_scores.py

echo "Reloading Apache"
systemctl reload apache2

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

rm -f \
  /tmp/bantubuzz-creator-score-v11-backend.tar.gz \
  /tmp/bantubuzz-creator-score-v11-frontend.tar.gz \
  /tmp/deploy-creator-score-v11.sh

echo BANTUBUZZ_NEW_VPS_CREATOR_SCORE_V11_SUCCESS

