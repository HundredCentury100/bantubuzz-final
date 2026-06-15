#!/usr/bin/env bash

set -Eeuo pipefail

CMS_ROOT="/var/www/bantubuzz-cms"
ENV_FILE="/etc/bantubuzz/cms.env"
ARCHIVE="/tmp/bantubuzz-cms-audio-feature.tar.gz"
BACKUP_ROOT="/var/backups/bantubuzz"
APP_HOME="/home/bantubuzz"
NPM_CACHE="/var/cache/bantubuzz/npm"

if [ "$(id -u)" -ne 0 ]; then
  echo "This deployment must run as root."
  exit 1
fi

if [ ! -s "$ARCHIVE" ] || [ ! -s "$ENV_FILE" ] || [ ! -f "$CMS_ROOT/package.json" ]; then
  echo "CMS installation, environment, or audio feature archive is missing."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/cms-audio-before-${timestamp}"

run_as_app() {
  runuser -u bantubuzz --preserve-environment -- \
    env HOME="$APP_HOME" NPM_CONFIG_CACHE="$NPM_CACHE" "$@"
}

upsert_env() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

echo "=== Installing open-source audio runtime ==="
apt-get update
apt-get install -y ffmpeg espeak-ng

echo "=== Backing up files changed by the audio feature ==="
install -d -o root -g www-data -m 0750 "$backup_dir"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  if [ -e "$CMS_ROOT/$relative_path" ]; then
    install -d "$backup_dir/$(dirname "$relative_path")"
    cp -a "$CMS_ROOT/$relative_path" "$backup_dir/$relative_path"
  fi
done <<'EOF'
.env.example
apps/web/payload.config.ts
apps/web/src/app/(payload)/admin/importMap.js
apps/web/src/components/admin/GenerateAudioButton.tsx
apps/web/src/lib/admin-auth.ts
docs/implementation-status.md
packages/core/src/content.ts
packages/core/src/env.ts
packages/integrations/src/tts.ts
workers/content/src/index.ts
EOF

echo "=== Installing only CMS audio feature files ==="
tar -xzf "$ARCHIVE" -C "$CMS_ROOT"
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  chown bantubuzz:www-data "$CMS_ROOT/$relative_path"
done <<'EOF'
.env.example
apps/web/payload.config.ts
apps/web/src/app/(payload)/admin/importMap.js
apps/web/src/components/admin/GenerateAudioButton.tsx
apps/web/src/lib/admin-auth.ts
docs/implementation-status.md
packages/core/src/content.ts
packages/core/src/env.ts
packages/integrations/src/tts.ts
workers/content/src/index.ts
EOF

echo "=== Configuring open-source TTS fallback ==="
upsert_env TTS_PROVIDER espeak
upsert_env FFMPEG_BIN /usr/bin/ffmpeg
upsert_env FFPROBE_BIN /usr/bin/ffprobe
upsert_env ESPEAK_BIN /usr/bin/espeak-ng
upsert_env ESPEAK_VOICE en-us
chown root:www-data "$ENV_FILE"
chmod 0640 "$ENV_FILE"

echo "=== Verifying changed CMS source ==="
cd "$CMS_ROOT"
run_as_app npm run typecheck

echo "=== Rebuilding CMS admin and public application ==="
run_as_app npm run build

echo "=== Restarting CMS and audio worker ==="
systemctl restart bantubuzz-cms.service
systemctl enable --now bantubuzz-cms-worker.service

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

echo "=== Verifying public CMS routes ==="
curl -fsS https://app.bantubuzz.com/admin >/dev/null
curl -fsS "https://bantubuzz.com/content-api/posts?limit=1" >/dev/null
/usr/bin/ffmpeg -version | head -1
/usr/bin/espeak-ng --version | head -1

rm -f "$ARCHIVE"
echo "Backup: $backup_dir"
echo "No database migration, seed, Apache, SSL, or unrelated CMS source was changed."
echo "BANTUBUZZ_CMS_AUDIO_DEPLOY_SUCCESS"
