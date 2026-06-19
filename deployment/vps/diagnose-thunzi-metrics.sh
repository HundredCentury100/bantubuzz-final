#!/usr/bin/env bash
set -euo pipefail

REMOTE_ROOT="/var/www/bantubuzz"
PLATFORM_ENV="/etc/bantubuzz/platform.env"
cd "$REMOTE_ROOT/backend"

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

venv/bin/python - <<'PY'
import json
from app import create_app
from app.models import ConnectedPlatform, ThunziAccount, User
from app.services.thunzi_service import ThunziAIService

app = create_app()
with app.app_context():
    rows = (
        ConnectedPlatform.query
        .join(User, ConnectedPlatform.user_id == User.id)
        .filter(ConnectedPlatform.thunzi_platform_id.isnot(None))
        .filter(ConnectedPlatform.is_connected == True)
        .order_by(ConnectedPlatform.posts.desc().nullslast(), ConnectedPlatform.followers.desc().nullslast())
        .limit(12)
        .all()
    )

    print(f"sample_connected_platforms={len(rows)}")
    service = ThunziAIService()
    seen_companies = set()
    for local in rows:
        account = ThunziAccount.query.filter_by(user_id=local.user_id).first()
        if not account or not account.thunzi_email or not account.thunzi_company_id:
            continue
        if account.thunzi_company_id in seen_companies:
            continue
        seen_companies.add(account.thunzi_company_id)
        print("=" * 80)
        print(f"user_id={local.user_id} email={account.thunzi_email} company_id={account.thunzi_company_id}")
        login_ok = service.login(email=account.thunzi_email, password=account.thunzi_email)
        print(f"thunzi_login={login_ok}")
        if not login_ok:
            print(f"last_error={json.dumps(service.last_error, default=str)}")
            continue
        raw_platforms = service.get_platforms(account.thunzi_company_id)
        print(f"raw_platform_count={len(raw_platforms)}")
        for raw in raw_platforms:
            local_match = ConnectedPlatform.query.filter_by(
                user_id=local.user_id,
                thunzi_platform_id=raw.get('id')
            ).first()
            payload = {
                'raw': {
                    'id': raw.get('id'),
                    'platform': raw.get('platform'),
                    'accountName': raw.get('accountName'),
                    'followers': raw.get('followers'),
                    'posts': raw.get('posts'),
                    'averageEngagementRate': raw.get('averageEngagementRate'),
                    'averageSentimentScore': raw.get('averageSentimentScore'),
                    'averageViews': raw.get('averageViews'),
                    'averageReach': raw.get('averageReach'),
                    'syncStatus': raw.get('syncStatus'),
                },
                'local': {
                    'id': local_match.id if local_match else None,
                    'platform': local_match.platform if local_match else None,
                    'followers': local_match.followers if local_match else None,
                    'posts': local_match.posts if local_match else None,
                    'average_engagement_rate': float(local_match.average_engagement_rate) if local_match and local_match.average_engagement_rate is not None else None,
                    'average_sentiment_score': float(local_match.average_sentiment_score) if local_match and local_match.average_sentiment_score is not None else None,
                    'sync_status': local_match.sync_status if local_match else None,
                }
            }
            print(json.dumps(payload, ensure_ascii=False, default=str))

print("BANTUBUZZ_NEW_VPS_THUNZI_METRICS_DIAGNOSTIC_SUCCESS")
PY

rm -f /tmp/diagnose-thunzi-metrics.sh
