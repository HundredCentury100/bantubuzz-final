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
for raw_line in env_path.read_text(errors='ignore').splitlines():
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
BACKUP="/var/backups/bantubuzz/smtp-thunzi-before-$TS"

echo "Creating targeted backup at $BACKUP"
mkdir -p "$BACKUP"
tar --ignore-failed-read -czf "$BACKUP/backend-targeted.tar.gz" -C backend \
  app/config.py \
  app/services/email_service.py \
  app/services/thunzi_service.py \
  app/routes/auth.py \
  app/routes/platforms.py \
  app/tasks/platform_sync.py \
  app/tasks/analytics_tasks.py

echo "Installing targeted backend files"
tar -xzf /tmp/bantubuzz-smtp-thunzi-fixes-backend.tar.gz -C backend
chown -R bantubuzz:www-data \
  backend/app/config.py \
  backend/app/services/email_service.py \
  backend/app/services/thunzi_service.py \
  backend/app/routes/auth.py \
  backend/app/routes/platforms.py \
  backend/app/tasks/platform_sync.py \
  backend/app/tasks/analytics_tasks.py

echo "Compiling targeted backend files"
cd backend
venv/bin/python - <<'PY'
import py_compile

for path in [
    'app/config.py',
    'app/services/email_service.py',
    'app/services/thunzi_service.py',
    'app/routes/auth.py',
    'app/routes/platforms.py',
    'app/tasks/platform_sync.py',
    'app/tasks/analytics_tasks.py',
]:
    py_compile.compile(path, cfile=f"/tmp/{path.replace('/', '_')}.pyc", doraise=True)
PY
rm -f /tmp/app_*.pyc

echo "Restarting backend and Celery services"
systemctl restart bantubuzz-backend.service bantubuzz-celery-worker.service bantubuzz-celery-beat.service
sleep 5
echo "Backend:"
systemctl is-active bantubuzz-backend.service
echo "Celery worker:"
systemctl is-active bantubuzz-celery-worker.service
echo "Celery beat:"
systemctl is-active bantubuzz-celery-beat.service

echo "Local health:"
curl -fsS http://127.0.0.1:8002/api/health
echo
echo "Public health:"
curl -fsS https://bantubuzz.com/api/health
echo

echo "SMTP configuration and login check:"
venv/bin/python - <<'PY'
import os
import smtplib
import ssl
from email.utils import formataddr, parseaddr

host = os.getenv('MAIL_SERVER') or os.getenv('SMTP_HOST') or 'smtp.gmail.com'
port = int(os.getenv('MAIL_PORT') or os.getenv('SMTP_PORT') or '587')
use_ssl = (os.getenv('MAIL_USE_SSL') or os.getenv('SMTP_USE_SSL') or 'False').lower() == 'true'
use_tls = (os.getenv('MAIL_USE_TLS') or os.getenv('SMTP_USE_TLS') or 'True').lower() == 'true'
username = os.getenv('MAIL_USERNAME') or os.getenv('SMTP_USER')
password = os.getenv('MAIL_PASSWORD') or os.getenv('SMTP_PASSWORD')
sender = os.getenv('MAIL_DEFAULT_SENDER') or os.getenv('SMTP_FROM') or username
parsed_name, parsed_email = parseaddr(str(sender))
sender_email = parsed_email or str(sender)
sender_display = formataddr((parsed_name or 'BantuBuzz', sender_email))

print(f"MAIL_HOST={host}")
print(f"MAIL_PORT={port}")
print(f"MAIL_USE_SSL={use_ssl}")
print(f"MAIL_USE_TLS={use_tls}")
print(f"MAIL_USERNAME_SET={bool(username)}")
print(f"MAIL_PASSWORD_SET={bool(password)}")
print(f"MAIL_DEFAULT_SENDER={sender}")
print(f"MAIL_NORMALIZED_SENDER={sender_display}")

if not host or not username or not password:
    raise SystemExit("SMTP_LOGIN_FAIL: missing host, username, or password")

if use_ssl:
    server = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context())
else:
    server = smtplib.SMTP(host, port, timeout=20)
try:
    server.ehlo()
    if use_tls and not use_ssl:
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
    server.login(username, password)
    print("SMTP_LOGIN_OK")
finally:
    try:
        server.quit()
    except Exception:
        pass
PY

echo "Masked recent OTP/SMTP/Thunzi log lines:"
python3 - <<'PY'
import glob
import re
from pathlib import Path

patterns = re.compile(r'Thunzi|SMTP|mail|Mail|OTP|verification code|Failed to create ThunziAI|company creation', re.I)
secret_patterns = [
    re.compile(r'(password|api[_-]?key|secret|token)(=|:)[^,\s]+', re.I),
    re.compile(r'(x-api-key["\']?\s*[:=]\s*["\']?)[^,"\'}\s]+', re.I),
]
paths = []
paths.extend(glob.glob('/var/www/bantubuzz/backend/logs/*.log'))
paths.extend(glob.glob('/var/www/bantubuzz/backend/*gunicorn*.log'))
for path in paths[:12]:
    try:
        text = Path(path).read_text(errors='ignore')[-20000:]
    except Exception:
        continue
    hits = [line for line in text.splitlines() if patterns.search(line)]
    if not hits:
        continue
    print(f"--- {path}")
    for line in hits[-30:]:
        for pattern in secret_patterns:
            line = pattern.sub(r'\1***', line)
        print(line[:700])
PY

rm -f /tmp/bantubuzz-smtp-thunzi-fixes-backend.tar.gz /tmp/deploy-smtp-thunzi-fixes.sh /tmp/deploy-smtp-thunzi-fixes.lf.sh

echo BANTUBUZZ_SMTP_THUNZI_FIXES_SUCCESS
