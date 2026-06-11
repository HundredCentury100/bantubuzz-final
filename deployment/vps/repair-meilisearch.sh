#!/usr/bin/env bash

set -Eeuo pipefail

SECRETS_FILE="/root/bantubuzz-provisioning-secrets.txt"
ENV_FILE="/etc/bantubuzz/meilisearch.env"
SERVICE_FILE="/etc/systemd/system/meilisearch.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "This repair must run as root."
  exit 1
fi

echo "=== Existing Meilisearch diagnostics ==="
meilisearch --version 2>&1 || true
systemctl status meilisearch --no-pager -l 2>&1 || true
journalctl -u meilisearch --no-pager -n 80 2>&1 || true

master_key="$(
  grep -E '^MEILISEARCH_MASTER_KEY=' "$SECRETS_FILE" 2>/dev/null |
    head -1 |
    cut -d= -f2-
)"

if [ -z "$master_key" ]; then
  master_key="$(openssl rand -hex 32)"
  printf 'MEILISEARCH_MASTER_KEY=%s\n' "$master_key" >> "$SECRETS_FILE"
  chmod 0600 "$SECRETS_FILE"
fi

if ! id meilisearch >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/meilisearch --shell /usr/sbin/nologin meilisearch
fi
usermod -a -G www-data meilisearch

install -d -o meilisearch -g meilisearch -m 0750 \
  /var/lib/meilisearch \
  /var/lib/meilisearch/data.ms \
  /var/lib/meilisearch/dumps \
  /var/lib/meilisearch/snapshots
chown -R meilisearch:meilisearch /var/lib/meilisearch

install -d -o root -g www-data -m 0750 /etc/bantubuzz
cat > "$ENV_FILE" <<EOF
MEILI_ENV=production
MEILI_HTTP_ADDR=127.0.0.1:7700
MEILI_DB_PATH=/var/lib/meilisearch/data.ms
MEILI_DUMP_DIR=/var/lib/meilisearch/dumps
MEILI_SNAPSHOT_DIR=/var/lib/meilisearch/snapshots
MEILI_MASTER_KEY=${master_key}
MEILI_NO_ANALYTICS=true
EOF
chown root:meilisearch "$ENV_FILE"
chmod 0640 "$ENV_FILE"

cat > "$SERVICE_FILE" <<'EOF'
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
EnvironmentFile=/etc/bantubuzz/meilisearch.env
WorkingDirectory=/var/lib/meilisearch
ExecStart=/usr/local/bin/meilisearch
Restart=on-failure
RestartSec=5
TimeoutStartSec=60
LimitNOFILE=65535
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl reset-failed meilisearch 2>/dev/null || true
systemctl enable meilisearch
systemctl restart meilisearch

echo
echo "=== Waiting for Meilisearch health ==="
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:7700/health >/tmp/meilisearch-health.json 2>/dev/null; then
    cat /tmp/meilisearch-health.json
    echo
    systemctl is-active meilisearch
    ss -lntp | grep ':7700' || true
    echo "BANTUBUZZ_MEILISEARCH_REPAIR_SUCCESS"
    exit 0
  fi
  printf 'Attempt %s/30\n' "$attempt"
  sleep 2
done

echo
echo "=== Meilisearch failed to become healthy ==="
systemctl status meilisearch --no-pager -l 2>&1 || true
journalctl -u meilisearch --no-pager -n 120 2>&1 || true
exit 1
