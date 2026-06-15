#!/usr/bin/env bash

set -Eeuo pipefail

ENV_FILE="/etc/bantubuzz/cms.env"
TTS_DIR="/opt/bantubuzz/tts"
PIPER_BIN="${PIPER_BIN:-/usr/local/bin/piper}"
PIPER_MODEL="${PIPER_MODEL:-${TTS_DIR}/en_US-lessac-medium.onnx}"
PIPER_MODEL_URL="${PIPER_MODEL_URL:-}"
PIPER_CONFIG_URL="${PIPER_CONFIG_URL:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must run as root."
  exit 1
fi

if [ ! -s "$ENV_FILE" ]; then
  echo "CMS environment file not found: $ENV_FILE"
  exit 1
fi

echo "=== Installing audio dependencies ==="
apt-get update
apt-get install -y ffmpeg espeak-ng curl ca-certificates

install -d -o root -g www-data -m 0755 "$TTS_DIR"

if [ -n "$PIPER_MODEL_URL" ]; then
  echo "Downloading Piper model..."
  curl -fsSL "$PIPER_MODEL_URL" -o "$PIPER_MODEL"
  chmod 0644 "$PIPER_MODEL"
fi

if [ -n "$PIPER_CONFIG_URL" ]; then
  echo "Downloading Piper model config..."
  curl -fsSL "$PIPER_CONFIG_URL" -o "${PIPER_MODEL}.json"
  chmod 0644 "${PIPER_MODEL}.json"
fi

echo "=== Updating CMS audio environment ==="
upsert_env() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

if [ -x "$PIPER_BIN" ] && [ -s "$PIPER_MODEL" ]; then
  upsert_env TTS_PROVIDER piper
  upsert_env PIPER_BIN "$PIPER_BIN"
  upsert_env PIPER_MODEL "$PIPER_MODEL"
else
  echo "Piper binary/model not ready; configuring espeak fallback."
  upsert_env TTS_PROVIDER espeak
fi

upsert_env FFMPEG_BIN /usr/bin/ffmpeg
upsert_env FFPROBE_BIN /usr/bin/ffprobe
upsert_env ESPEAK_BIN /usr/bin/espeak-ng
upsert_env ESPEAK_VOICE en-us

chown root:www-data "$ENV_FILE"
chmod 0640 "$ENV_FILE"

echo "=== Verifying audio command dependencies ==="
/usr/bin/ffmpeg -version | head -1
/usr/bin/ffprobe -version | head -1
/usr/bin/espeak-ng --version | head -1
if [ "$(grep -E '^TTS_PROVIDER=' "$ENV_FILE" | cut -d= -f2)" = "piper" ]; then
  "$PIPER_BIN" --help >/dev/null
  test -s "$PIPER_MODEL"
fi

echo "=== Restarting CMS services ==="
systemctl daemon-reload
systemctl restart bantubuzz-cms.service
systemctl enable --now bantubuzz-cms-worker.service

for attempt in $(seq 1 30); do
  if systemctl is-active --quiet bantubuzz-cms.service && systemctl is-active --quiet bantubuzz-cms-worker.service; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    systemctl status bantubuzz-cms.service bantubuzz-cms-worker.service --no-pager -l || true
    journalctl -u bantubuzz-cms-worker.service --no-pager -n 120 || true
    exit 1
  fi
  sleep 2
done

curl -fsS http://127.0.0.1:3010/admin >/dev/null
systemctl is-active bantubuzz-cms-worker.service

echo "BANTUBUZZ_CMS_AUDIO_SETUP_SUCCESS"
