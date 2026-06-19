#!/usr/bin/env bash
set -euo pipefail

REMOTE_ROOT="/var/www/bantubuzz"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
cd "$REMOTE_ROOT"

if [ ! -s "$PLATFORM_ENV" ]; then
  echo "Missing platform environment: $PLATFORM_ENV"
  exit 1
fi

eval "$(
  python3 - "$PLATFORM_ENV" <<'PY'
import re
import shlex
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    key = key.strip()
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key):
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    print(f"export {key}={shlex.quote(value)}")
PY
)"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/bantubuzz/thunzi-metric-normalization-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/utils/thunzi_metrics.py \
  app/models/connected_platform.py \
  app/services/creator_analytics_service.py \
  app/services/post_metrics_service.py

echo "Installing backend files"
tar -xzf /tmp/bantubuzz-thunzi-metric-normalization.tar.gz -C backend
chown -R bantubuzz:www-data backend/app/utils backend/app/models backend/app/services

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile

files = [
    'app/utils/thunzi_metrics.py',
    'app/models/connected_platform.py',
    'app/services/creator_analytics_service.py',
    'app/services/post_metrics_service.py',
]
for path in files:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_*.pyc

echo "Normalizing existing obvious fractional metric values"
export FLASK_APP=run.py
venv/bin/python - <<'PY'
from app import create_app, db
from app.models import ConnectedPlatform, PostMetrics
from app.utils.thunzi_metrics import normalize_engagement_rate_percent, normalize_sentiment_0_100

app = create_app()
with app.app_context():
    platform_updates = 0
    post_updates = 0

    for platform in ConnectedPlatform.query.all():
        changed = False
        if platform.average_engagement_rate is not None:
            normalized = normalize_engagement_rate_percent(platform.average_engagement_rate)
            if normalized is not None and float(normalized) != float(platform.average_engagement_rate):
                platform.average_engagement_rate = normalized
                changed = True
        if platform.average_sentiment_score is not None:
            normalized = normalize_sentiment_0_100(platform.average_sentiment_score)
            if normalized is not None and float(normalized) != float(platform.average_sentiment_score):
                platform.average_sentiment_score = normalized
                changed = True
        if changed:
            platform_updates += 1

    for metric in PostMetrics.query.filter(PostMetrics.engagement_rate.isnot(None)).all():
        normalized = normalize_engagement_rate_percent(metric.engagement_rate)
        if normalized is not None and float(normalized) != float(metric.engagement_rate):
            metric.engagement_rate = normalized
            post_updates += 1

    db.session.commit()
    print(f"platform_rows_normalized={platform_updates}")
    print(f"post_metric_rows_normalized={post_updates}")
PY

echo "Restarting services"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service
sleep 5
echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service
echo "Celery beat:"
systemctl is-active bantubuzz-celery-beat.service

echo "Recalculating creator scores"
venv/bin/python recalculate_creator_scores.py

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

rm -f \
  /tmp/bantubuzz-thunzi-metric-normalization.tar.gz \
  /tmp/deploy-thunzi-metric-normalization.sh

echo BANTUBUZZ_NEW_VPS_THUNZI_METRIC_NORMALIZATION_SUCCESS
