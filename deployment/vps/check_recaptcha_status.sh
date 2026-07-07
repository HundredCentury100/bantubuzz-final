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

read_env_value() {
  local key="$1"
  local line value
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  value="${line#*=}"
  value="${value//$'\r'/}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

RECAPTCHA_ENTERPRISE_SITE_KEY="$(read_env_value RECAPTCHA_ENTERPRISE_SITE_KEY)"
RECAPTCHA_ENTERPRISE_PROJECT_ID="$(read_env_value RECAPTCHA_ENTERPRISE_PROJECT_ID)"
RECAPTCHA_ENTERPRISE_API_KEY="$(read_env_value RECAPTCHA_ENTERPRISE_API_KEY)"
RECAPTCHA_ENTERPRISE_ENABLED="$(read_env_value RECAPTCHA_ENTERPRISE_ENABLED)"

if [ -z "$RECAPTCHA_ENTERPRISE_ENABLED" ]; then
  RECAPTCHA_ENTERPRISE_ENABLED="False"
fi

echo "RECAPTCHA_ENTERPRISE_ENABLED=${RECAPTCHA_ENTERPRISE_ENABLED}"

case "${RECAPTCHA_ENTERPRISE_ENABLED,,}" in
  true|1|yes)
    ;;
  *)
    echo "recaptcha_env_status=disabled"
    echo "Checking signup pages without reCAPTCHA script requirement"
    curl -L -fsS -o /dev/null -w "creator_signup_http=%{http_code}\n" "$SITE_URL/register/creator"
    curl -L -fsS -o /dev/null -w "brand_signup_http=%{http_code}\n" "$SITE_URL/register/brand"
    echo "BANTUBUZZ_RECAPTCHA_STATUS_OK_DISABLED"
    exit 0
    ;;
esac

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
if printf "%s" "$html" | grep -Fq "recaptcha/enterprise.js?render=${RECAPTCHA_ENTERPRISE_SITE_KEY}"; then
  echo "frontend_recaptcha_script=present"
else
  echo "frontend_recaptcha_script=missing"
  echo "expected=recaptcha/enterprise.js?render=<configured-site-key>"
  echo "hint=Deploy the current frontend build with DEPLOY-NEW-VPS-PAYMENT-WORDING.bat or DEPLOY-NEW-VPS-RECAPTCHA-SIGNUP.bat, then rerun this check."
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
