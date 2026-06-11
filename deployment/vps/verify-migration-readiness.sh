#!/usr/bin/env bash

set +e

check() {
  label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf '[PASS] %s\n' "$label"
  else
    printf '[FAIL] %s\n' "$label"
    failures=$((failures + 1))
  fi
}

failures=0

echo "BantuBuzz migration readiness check 2026-06-11.1"
date --iso-8601=seconds 2>/dev/null || date
echo

check "PostgreSQL is active" systemctl is-active --quiet postgresql
check "Redis is active" systemctl is-active --quiet redis-server
check "Apache is active" systemctl is-active --quiet apache2
check "Fail2ban is active" systemctl is-active --quiet fail2ban
check "Meilisearch is active" systemctl is-active --quiet meilisearch
check "Meilisearch health endpoint responds" curl -fsS http://127.0.0.1:7700/health
check "Platform database exists" sh -c "runuser -u postgres -- psql -Atqc \"SELECT 1 FROM pg_database WHERE datname='bantubuzz_platform'\" | grep -q '^1$'"
check "CMS database exists" sh -c "runuser -u postgres -- psql -Atqc \"SELECT 1 FROM pg_database WHERE datname='bantubuzz_cms'\" | grep -q '^1$'"
check "Platform environment exists" test -f /etc/bantubuzz/platform.env
check "Messaging environment exists" test -f /etc/bantubuzz/messaging.env
check "CMS environment exists" test -f /etc/bantubuzz/cms.env
check "Provisioning secrets exist" test -f /root/bantubuzz-provisioning-secrets.txt
check "Flask service unit exists" test -f /etc/systemd/system/bantubuzz-backend.service
check "Messaging service unit exists" test -f /etc/systemd/system/bantubuzz-messaging.service
check "Celery worker unit exists" test -f /etc/systemd/system/bantubuzz-celery-worker.service
check "Celery beat unit exists" test -f /etc/systemd/system/bantubuzz-celery-beat.service
check "CMS web unit exists" test -f /etc/systemd/system/bantubuzz-cms.service
check "CMS worker unit exists" test -f /etc/systemd/system/bantubuzz-cms-worker.service
check "Firewall is active" sh -c "ufw status | grep -q '^Status: active'"
check "4 GB swap is active" sh -c "swapon --show=SIZE --bytes --noheadings | awk '{sum += \$1} END {exit !(sum >= 4000000000)}'"

echo
echo "Expected before code deployment:"
echo "- Ports 3002, 3010, and 8002 are unused."
echo "- Application services are disabled and inactive."
echo "- bantubuzz.com still resolves to the old production VPS."
echo "- app.bantubuzz.com resolves to 13.140.159.150."
echo

if [ "$failures" -eq 0 ]; then
  echo "BANTUBUZZ_MIGRATION_READINESS_PASS"
  exit 0
fi

echo "BANTUBUZZ_MIGRATION_READINESS_FAIL count=$failures"
exit 1
