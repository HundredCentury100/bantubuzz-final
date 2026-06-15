#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
ENV_FILE="/etc/bantubuzz/cms.env"
ARCHIVE="/tmp/bantubuzz-cms-audio-worker-fix.tar.gz"
BACKUP_ROOT="/var/backups/bantubuzz"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"

if [ "$(id -u)" -ne 0 ]; then
  echo "This repair must run as root."
  exit 1
fi

if [ ! -s "$ARCHIVE" ] || [ ! -s "$ENV_FILE" ] || [ ! -f "$CMS_ROOT/package.json" ]; then
  echo "CMS installation, environment, or audio repair archive is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/cms-audio-worker-before-${timestamp}"

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

read -r -d '' TARGET_FILES <<'EOF' || true
apps/web/src/app/(frontend)/api/admin/audio-jobs/[jobId]/route.ts
apps/web/src/app/(frontend)/api/posts/[slug]/audio-file/route.ts
apps/web/src/components/admin/GenerateAudioButton.tsx
packages/integrations/src/s3.ts
workers/content/package.json
workers/content/src/audio-queue-diagnostics.ts
workers/content/src/audio-smoke.ts
workers/content/src/index.ts
EOF

echo "=== Loading existing production environment ==="
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "=== Current worker state and recent logs ==="
systemctl status bantubuzz-cms-worker.service --no-pager -l || true
journalctl -u bantubuzz-cms-worker.service --no-pager -n 120 || true

echo "=== Backing up audio worker files ==="
install -d -o root -g www-data -m 0750 "$backup_dir"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  if [ -e "$CMS_ROOT/$relative_path" ]; then
    install -d "$backup_dir/$(dirname "$relative_path")"
    cp -a "$CMS_ROOT/$relative_path" "$backup_dir/$relative_path"
  fi
done <<< "$TARGET_FILES"

echo "=== Installing only the audio worker repair files ==="
tar -xzf "$ARCHIVE" -C "$CMS_ROOT"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  chown bantubuzz:www-data "$CMS_ROOT/$relative_path"
done <<< "$TARGET_FILES"

cd "$CMS_ROOT"

echo "=== Diagnosing existing audio jobs ==="
run_as_app npm --workspace workers/content run diagnose:audio || true

echo "=== Verifying TTS, MP3 conversion, and object storage ==="
run_as_app npm --workspace workers/content run smoke:audio

echo "=== Typechecking and rebuilding CMS ==="
run_as_app npm run typecheck
run_as_app npm run build

echo "=== Restarting CMS and content worker ==="
systemctl daemon-reload
systemctl restart bantubuzz-cms.service
systemctl restart bantubuzz-cms-worker.service

for attempt in $(seq 1 45); do
  if systemctl is-active --quiet bantubuzz-cms.service \
    && systemctl is-active --quiet bantubuzz-cms-worker.service \
    && curl -fsS http://127.0.0.1:3010/admin >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 45 ]; then
    systemctl status bantubuzz-cms.service bantubuzz-cms-worker.service --no-pager -l || true
    journalctl -u bantubuzz-cms.service -u bantubuzz-cms-worker.service --no-pager -n 150 || true
    exit 1
  fi
  sleep 2
done

echo "=== Confirming worker Redis readiness ==="
for attempt in $(seq 1 20); do
  if journalctl -u bantubuzz-cms-worker.service --since "-2 minutes" --no-pager \
    | grep -q "BantuBuzz content worker ready"; then
    break
  fi
  if [ "$attempt" -eq 20 ]; then
    journalctl -u bantubuzz-cms-worker.service --no-pager -n 150 || true
    echo "The worker service is active but did not confirm Redis readiness."
    exit 1
  fi
  sleep 1
done

echo "=== Final queue diagnostics ==="
run_as_app npm --workspace workers/content run diagnose:audio
curl -fsS https://app.bantubuzz.com/admin >/dev/null

rm -f "$ARCHIVE"
echo "Backup: $backup_dir"
echo "No migrations, dependencies, PostgreSQL, Apache, SSL, users, media records, or article content were changed."
echo "BANTUBUZZ_CMS_AUDIO_WORKER_FIX_SUCCESS"
