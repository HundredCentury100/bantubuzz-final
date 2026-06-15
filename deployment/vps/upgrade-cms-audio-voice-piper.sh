#!/usr/bin/env bash

set -Eeuo pipefail

CMS_DIR="/var/www/bantubuzz-cms"
ENV_FILE="/etc/bantubuzz/cms.env"
ARCHIVE="/tmp/bantubuzz-cms-piper-voice.tar.gz"
BACKUP_ROOT="/var/backups/bantubuzz"
TTS_DIR="/opt/bantubuzz/tts"
VOICE_NAME="${VOICE_NAME:-en_US-lessac-medium}"
PIPER_BIN="${PIPER_BIN:-/usr/local/bin/piper}"
PIPER_RELEASE_URL="${PIPER_RELEASE_URL:-https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz}"
PIPER_MODEL="${PIPER_MODEL:-${TTS_DIR}/${VOICE_NAME}.onnx}"
PIPER_MODEL_URL="${PIPER_MODEL_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx}"
PIPER_CONFIG_URL="${PIPER_CONFIG_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json}"
REGENERATE_SLUG="${REGENERATE_SLUG:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must run as root."
  exit 1
fi

if [ ! -d "$CMS_DIR" ] || [ ! -s "$ENV_FILE" ] || [ ! -s "$ARCHIVE" ]; then
  echo "CMS installation, environment, or voice upgrade archive is missing."
  exit 1
fi

run_as_app() {
  runuser -u bantubuzz -- bash -lc "set -a; source '$ENV_FILE'; set +a; cd '$CMS_DIR'; HOME=/home/bantubuzz NPM_CONFIG_CACHE=/var/cache/bantubuzz/npm $*"
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

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/cms-piper-voice-before-${timestamp}"
install -d -m 0755 "$backup_dir"

echo "=== Backing up targeted CMS audio files ==="
for file in workers/content/package.json workers/content/src/regenerate-audio.ts; do
  if [ -e "${CMS_DIR}/${file}" ]; then
    install -d -m 0755 "${backup_dir}/$(dirname "$file")"
    cp -a "${CMS_DIR}/${file}" "${backup_dir}/${file}"
  fi
done

echo "=== Installing targeted CMS audio voice files ==="
tar -xzf "$ARCHIVE" -C "$CMS_DIR"
chown -R bantubuzz:www-data "$CMS_DIR/workers/content/package.json" "$CMS_DIR/workers/content/src/regenerate-audio.ts"

echo "=== Installing Piper and audio dependencies ==="
apt-get update
apt-get install -y ffmpeg espeak-ng curl ca-certificates tar
install -d -o root -g www-data -m 0755 "$TTS_DIR"

if [ ! -x "$PIPER_BIN" ]; then
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  echo "Downloading Piper runtime..."
  curl -fsSL "$PIPER_RELEASE_URL" -o "${tmpdir}/piper.tar.gz"
  tar -xzf "${tmpdir}/piper.tar.gz" -C "$tmpdir"
  piper_candidate="$(find "$tmpdir" -type f -name piper -perm /111 | head -1)"
  if [ -z "$piper_candidate" ]; then
    echo "Unable to find Piper executable inside downloaded release."
    exit 1
  fi
  install -m 0755 "$piper_candidate" "$PIPER_BIN"
fi

echo "=== Installing female Piper voice model: ${VOICE_NAME} ==="
curl -fL "$PIPER_MODEL_URL" -o "$PIPER_MODEL"
curl -fL "$PIPER_CONFIG_URL" -o "${PIPER_MODEL}.json"
chmod 0644 "$PIPER_MODEL" "${PIPER_MODEL}.json"

echo "=== Updating CMS TTS environment ==="
upsert_env TTS_PROVIDER piper
upsert_env PIPER_BIN "$PIPER_BIN"
upsert_env PIPER_MODEL "$PIPER_MODEL"
upsert_env FFMPEG_BIN /usr/bin/ffmpeg
upsert_env FFPROBE_BIN /usr/bin/ffprobe
upsert_env ESPEAK_BIN /usr/bin/espeak-ng
upsert_env ESPEAK_VOICE en-us
chown root:www-data "$ENV_FILE"
chmod 0640 "$ENV_FILE"

echo "=== Verifying commands and worker typecheck ==="
"$PIPER_BIN" --help >/dev/null
/usr/bin/ffmpeg -version | head -1
/usr/bin/ffprobe -version | head -1
run_as_app "npm --workspace workers/content run typecheck"

echo "=== Smoke-testing Piper MP3 generation ==="
run_as_app "npm --workspace workers/content run smoke:audio"

echo "=== Restarting CMS worker ==="
systemctl daemon-reload
systemctl restart bantubuzz-cms-worker.service

for attempt in $(seq 1 30); do
  if systemctl is-active --quiet bantubuzz-cms-worker.service; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    systemctl status bantubuzz-cms-worker.service --no-pager -l || true
    journalctl -u bantubuzz-cms-worker.service --no-pager -n 120 || true
    exit 1
  fi
  sleep 2
done

if [ -n "$REGENERATE_SLUG" ]; then
  echo "=== Regenerating article audio with Piper: ${REGENERATE_SLUG} ==="
  run_as_app "npm --workspace workers/content run regenerate:audio -- '$REGENERATE_SLUG'"
fi

echo "=== Final audio diagnostics ==="
run_as_app "npm --workspace workers/content run diagnose:audio"
systemctl is-active bantubuzz-cms-worker.service

echo "Backup: $backup_dir"
echo "BANTUBUZZ_CMS_AUDIO_PIPER_VOICE_SUCCESS"
