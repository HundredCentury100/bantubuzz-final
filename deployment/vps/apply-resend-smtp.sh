#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/bantubuzz/platform.env"
API_KEY_FILE="/tmp/bantubuzz-resend-api-key.txt"
BACKUP_ROOT="/var/backups/bantubuzz"
STAMP="$(date +%Y%m%d_%H%M%S)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing platform environment file: $ENV_FILE" >&2
  exit 1
fi

if [ ! -s "$API_KEY_FILE" ]; then
  echo "Missing uploaded Resend API key file: $API_KEY_FILE" >&2
  exit 1
fi

echo "Backing up current platform environment"
mkdir -p "$BACKUP_ROOT"
cp "$ENV_FILE" "$BACKUP_ROOT/platform.env.before-resend-smtp-$STAMP"
chmod 600 "$BACKUP_ROOT/platform.env.before-resend-smtp-$STAMP" || true

echo "Updating SMTP settings for Resend"
python3 - <<'PY'
from pathlib import Path
import shlex

env_path = Path("/etc/bantubuzz/platform.env")
key_path = Path("/tmp/bantubuzz-resend-api-key.txt")

api_key = key_path.read_text(encoding="utf-8").strip().strip('"').strip("'")
if not api_key:
    raise SystemExit("Resend API key file was empty")

updates = {
    "MAIL_SERVER": "smtp.resend.com",
    "MAIL_PORT": "587",
    "MAIL_USE_TLS": "True",
    "MAIL_USE_SSL": "False",
    "MAIL_USERNAME": "resend",
    "MAIL_PASSWORD": api_key,
    "MAIL_DEFAULT_SENDER": "no-reply@bantubuzz.com",
    "SMTP_HOST": "smtp.resend.com",
    "SMTP_PORT": "587",
    "SMTP_USE_TLS": "True",
    "SMTP_USE_SSL": "False",
    "SMTP_USER": "resend",
    "SMTP_PASSWORD": api_key,
    "SMTP_FROM": "no-reply@bantubuzz.com",
    "SMTP_FROM_NAME": "BantuBuzz",
}

lines = env_path.read_text(encoding="utf-8").splitlines()
seen = set()
new_lines = []
def env_line(key, value):
    escaped = str(value).replace('"', '\\"')
    return f'{key}="{escaped}"'

for line in lines:
    stripped = line.strip()
    if stripped == api_key or (stripped and "=" not in stripped and not stripped.startswith("#") and (
        stripped.startswith(("re_", "AQ.")) or len(stripped) >= 32
    )):
        continue
    if not stripped or stripped.startswith("#") or "=" not in line:
        new_lines.append(line)
        continue
    key = line.split("=", 1)[0].strip()
    if key in updates:
        new_lines.append(env_line(key, updates[key]))
        seen.add(key)
    else:
        new_lines.append(line)

for key, value in updates.items():
    if key not in seen:
        new_lines.append(env_line(key, value))

env_path.write_text("\n".join(new_lines).rstrip() + "\n", encoding="utf-8")
PY

chmod 600 "$ENV_FILE"
rm -f "$API_KEY_FILE"

echo "Restarting backend and Celery services"
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  systemctl restart bantubuzz-backend.service
else
  pkill -f 'gunicorn.*app:create_app' || true
  sleep 2
  cd /var/www/bantubuzz/backend
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    if printf '%s' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$' && [ "$line" != "$key" ]; then
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      export "$key=$value"
    fi
  done < "$ENV_FILE"
  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

systemctl restart bantubuzz-celery-worker.service 2>/dev/null || true
systemctl restart bantubuzz-celery-beat.service 2>/dev/null || true

echo "Checking service health"
sleep 4
systemctl is-active bantubuzz-backend.service 2>/dev/null || true
systemctl is-active bantubuzz-celery-worker.service 2>/dev/null || true
systemctl is-active bantubuzz-celery-beat.service 2>/dev/null || true
curl -fsS http://127.0.0.1:8002/api/health
echo
curl -fsS https://bantubuzz.com/api/health
echo

echo "Verifying Resend SMTP login"
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ""|\#*) continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  if printf '%s' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$' && [ "$line" != "$key" ]; then
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    export "$key=$value"
  fi
done < "$ENV_FILE"

cd /var/www/bantubuzz/backend
venv/bin/python - <<'PY'
import os
import smtplib
import ssl
from email.utils import formataddr, parseaddr

host = os.getenv("MAIL_SERVER") or os.getenv("SMTP_HOST")
port = int(os.getenv("MAIL_PORT") or os.getenv("SMTP_PORT") or "587")
use_ssl = (os.getenv("MAIL_USE_SSL") or os.getenv("SMTP_USE_SSL") or "False").lower() == "true"
use_tls = (os.getenv("MAIL_USE_TLS") or os.getenv("SMTP_USE_TLS") or "True").lower() == "true"
username = os.getenv("MAIL_USERNAME") or os.getenv("SMTP_USER")
password = os.getenv("MAIL_PASSWORD") or os.getenv("SMTP_PASSWORD")
sender = os.getenv("MAIL_DEFAULT_SENDER") or os.getenv("SMTP_FROM") or username
parsed_name, parsed_email = parseaddr(str(sender))
sender_display = formataddr((parsed_name or "BantuBuzz", parsed_email or str(sender)))

print(f"MAIL_HOST={host}")
print(f"MAIL_PORT={port}")
print(f"MAIL_USE_SSL={use_ssl}")
print(f"MAIL_USE_TLS={use_tls}")
print(f"MAIL_USERNAME={username}")
print(f"MAIL_PASSWORD_SET={bool(password)}")
print(f"MAIL_DEFAULT_SENDER={sender_display}")

if not host or not username or not password:
    raise SystemExit("SMTP_LOGIN_FAIL: missing host, username, or password")

if use_ssl:
    server = smtplib.SMTP_SSL(host, port, timeout=25, context=ssl.create_default_context())
else:
    server = smtplib.SMTP(host, port, timeout=25)

try:
    server.ehlo()
    if use_tls and not use_ssl:
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
    server.login(username, password)
    print("RESEND_SMTP_LOGIN_OK")
finally:
    try:
        server.quit()
    except Exception:
        pass
PY

echo "BANTUBUZZ_RESEND_SMTP_SUCCESS"
