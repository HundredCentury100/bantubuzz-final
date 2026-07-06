#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/bantubuzz/platform.env"
SITE_URL="https://bantubuzz.com"

echo "Checking backend health"
curl -fsS "$SITE_URL/api/health"
echo

echo "Checking reCAPTCHA environment"
if [ ! -f "$ENV_FILE" ]; then
  echo "missing_env_file=$ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

missing=0
for name in RECAPTCHA_ENTERPRISE_SITE_KEY RECAPTCHA_ENTERPRISE_PROJECT_ID RECAPTCHA_ENTERPRISE_API_KEY; do
  if [ -z "${!name:-}" ]; then
    echo "$name=missing"
    missing=1
  else
    echo "$name=configured"
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "recaptcha_env_status=failed"
  exit 1
fi

echo "Checking frontend script tag"
html="$(curl -fsS "$SITE_URL/register/creator" || curl -fsS "$SITE_URL")"
if printf "%s" "$html" | grep -q "recaptcha/enterprise.js?render=${RECAPTCHA_ENTERPRISE_SITE_KEY}"; then
  echo "frontend_recaptcha_script=present"
else
  echo "frontend_recaptcha_script=missing"
  exit 1
fi

echo "Checking Google Enterprise assessment API with intentionally invalid token"
tmp_response="$(mktemp)"
http_code="$(
  curl -sS -o "$tmp_response" -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_ENTERPRISE_PROJECT_ID}/assessments?key=${RECAPTCHA_ENTERPRISE_API_KEY}" \
    --data "{\"event\":{\"token\":\"invalid-health-check-token\",\"expectedAction\":\"REGISTER_CREATOR\",\"siteKey\":\"${RECAPTCHA_ENTERPRISE_SITE_KEY}\"}}"
)"

if [ "$http_code" != "200" ]; then
  echo "google_assessment_http=$http_code"
  sed -E 's/("key"[[:space:]]*:[[:space:]]*")[^"]+/\1REDACTED/g' "$tmp_response" || true
  rm -f "$tmp_response"
  exit 1
fi

if grep -q '"invalidReason"' "$tmp_response"; then
  echo "google_assessment_api=reachable_and_key_accepted"
else
  echo "google_assessment_api=reachable"
fi
rm -f "$tmp_response"

echo "BANTUBUZZ_RECAPTCHA_STATUS_OK"
