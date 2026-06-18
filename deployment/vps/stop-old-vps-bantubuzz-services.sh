#!/usr/bin/env bash
set -euo pipefail

echo "=== OLD VPS before stop ==="
hostname
date
echo

echo "Systemd services before:"
systemctl list-units --type=service --all | grep -Ei 'bantubuzz|celery|gunicorn|apache2|messaging' || true
echo

echo "BantuBuzz runtime processes before:"
ps aux | grep -Ei '[b]antubuzz|[c]elery|[g]unicorn|[m]essaging-service|[n]ode.*messaging|[a]pache2' || true
echo

for svc in \
  bantubuzz-celery-beat.service \
  bantubuzz-celery-worker.service \
  celery-beat.service \
  celery-worker.service \
  bantubuzz-backend.service \
  bantubuzz-messaging.service \
  apache2.service
do
  if systemctl list-unit-files "$svc" >/dev/null 2>&1 || systemctl list-units --all "$svc" >/dev/null 2>&1; then
    echo "Stopping/disabling $svc"
    systemctl disable --now "$svc" || true
  fi
done

echo
echo "Stopping leftover BantuBuzz runtime processes without matching this SSH command"
python3 - <<'PY'
import os
import signal
import time
from pathlib import Path

own_pid = os.getpid()
parent_pid = os.getppid()
matches = []

for proc_dir in Path('/proc').iterdir():
    if not proc_dir.name.isdigit():
        continue
    pid = int(proc_dir.name)
    if pid in {own_pid, parent_pid}:
        continue

    try:
        raw_cmdline = (proc_dir / 'cmdline').read_bytes()
    except OSError:
        continue

    if not raw_cmdline:
        continue

    cmdline = raw_cmdline.replace(b'\x00', b' ').decode('utf-8', 'ignore')
    is_bantubuzz_runtime = (
        '/var/www/bantubuzz/' in cmdline
        and any(token in cmdline for token in ('celery', 'gunicorn', 'messaging-service', 'server.js'))
    )

    if is_bantubuzz_runtime:
        matches.append((pid, cmdline))

for pid, cmdline in matches:
    print(f"TERM {pid}: {cmdline}")
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass

time.sleep(3)

for pid, cmdline in matches:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        continue

    print(f"KILL {pid}: {cmdline}")
    try:
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
PY

sleep 2
echo
echo "=== OLD VPS after stop ==="
echo "Systemd services after:"
systemctl list-units --type=service --all | grep -Ei 'bantubuzz|celery|gunicorn|apache2|messaging' || true
echo

echo "BantuBuzz runtime processes after:"
remaining="$(ps aux | grep -Ei '[b]antubuzz|[c]elery|[g]unicorn|[m]essaging-service|[n]ode.*messaging|[a]pache2' || true)"
echo "$remaining"
if echo "$remaining" | grep -Eq '/var/www/bantubuzz/.+(celery|gunicorn|messaging-service|server\.js)|celery -A celery_worker|apache2 -k start'; then
  echo "Some old BantuBuzz runtime processes are still running."
  exit 1
fi

echo
echo "PostgreSQL and Redis intentionally left alone:"
systemctl is-active postgresql 2>/dev/null || true
systemctl is-active redis-server 2>/dev/null || true

echo BANTUBUZZ_OLD_VPS_SERVICES_STOPPED
