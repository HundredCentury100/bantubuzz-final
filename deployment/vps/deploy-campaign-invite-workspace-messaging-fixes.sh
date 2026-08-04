#!/usr/bin/env bash
set -euo pipefail

FRONTEND_ARCHIVE="/tmp/bantubuzz-campaign-message-frontend.tar.gz"
BACKEND_ARCHIVE="/tmp/bantubuzz-campaign-message-backend.tar.gz"
NODE_ARCHIVE="/tmp/bantubuzz-campaign-message-node.tar.gz"
APP_ROOT="/var/www/bantubuzz"
BACKEND_ROOT="$APP_ROOT/backend"
FRONTEND_ROOT="$APP_ROOT/frontend"
MESSAGING_ROOT="$APP_ROOT/messaging-service"
BACKUP_ROOT="/var/backups/bantubuzz"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/campaign-message-before-$STAMP"

wait_for_service() {
  local service="$1"
  local label="$2"
  local tries="${3:-30}"
  local delay="${4:-2}"
  local status=""

  for _ in $(seq 1 "$tries"); do
    status="$(systemctl is-active "$service" 2>/dev/null || true)"
    if [ "$status" = "active" ]; then
      echo "$label: active"
      return 0
    fi
    if [ "$status" = "failed" ]; then
      echo "$label: failed"
      systemctl status "$service" --no-pager -l | sed -n '1,90p' || true
      return 1
    fi
    sleep "$delay"
  done

  echo "$label: ${status:-unknown}"
  systemctl status "$service" --no-pager -l | sed -n '1,90p' || true
  return 1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries="${3:-30}"
  local delay="${4:-2}"

  for _ in $(seq 1 "$tries"); do
    if curl -fsS --max-time 10 "$url" >/tmp/bantubuzz-campaign-message-wait.out 2>/tmp/bantubuzz-campaign-message-wait.err; then
      echo "$label: healthy"
      cat /tmp/bantubuzz-campaign-message-wait.out
      echo
      return 0
    fi
    sleep "$delay"
  done

  echo "$label: unhealthy"
  cat /tmp/bantubuzz-campaign-message-wait.err || true
  echo
  return 1
}

echo "Creating targeted backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
tar --ignore-failed-read -czf "$BACKUP_DIR/backend-files.tar.gz" -C "$BACKEND_ROOT" \
  app/utils/brand_identity.py \
  app/models/booking.py \
  app/models/brief.py \
  app/models/campaign.py \
  app/models/campaign_chat.py \
  app/models/campaign_invitation.py \
  app/models/collaboration.py \
  app/models/message.py \
  app/models/review.py \
  app/routes/admin/collaborations.py \
  app/routes/bookings.py \
  app/routes/campaign_cart.py \
  app/routes/campaign_chats.py \
  app/routes/campaign_invitations.py \
  app/routes/custom_packages.py \
  app/routes/milestones.py \
  app/routes/messages.py \
  app/routes/portfolio.py \
  app/routes/reviews.py \
  app/services/campaign_cart_payment_service.py \
  app/services/payment_service.py \
  app/services/product_notifications.py \
  app/services/wallet_service.py \
  app/utils/campaign_helpers.py \
  migrations/versions/202607291000_add_workspace_id_to_messages.py \
  2>/dev/null || true
if [ -d "$MESSAGING_ROOT" ]; then
  tar --ignore-failed-read -czf "$BACKUP_DIR/messaging-service.tar.gz" -C "$MESSAGING_ROOT" server.js package.json package-lock.json 2>/dev/null || true
fi
if [ -d "$FRONTEND_ROOT" ]; then
  tar -czf "$BACKUP_DIR/frontend.tar.gz" -C "$APP_ROOT" frontend 2>/dev/null || true
fi

echo "Installing backend files"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_ROOT"

echo "Installing messaging service files"
mkdir -p "$MESSAGING_ROOT"
tar -xzf "$NODE_ARCHIVE" -C "$MESSAGING_ROOT"

echo "Compiling backend files"
cd "$BACKEND_ROOT"
venv/bin/python -m py_compile \
  app/utils/brand_identity.py \
  app/models/booking.py \
  app/models/brief.py \
  app/models/campaign.py \
  app/models/campaign_chat.py \
  app/models/campaign_invitation.py \
  app/models/collaboration.py \
  app/models/message.py \
  app/models/review.py \
  app/routes/admin/collaborations.py \
  app/routes/bookings.py \
  app/routes/campaign_cart.py \
  app/routes/campaign_chats.py \
  app/routes/campaign_invitations.py \
  app/routes/custom_packages.py \
  app/routes/milestones.py \
  app/routes/messages.py \
  app/routes/portfolio.py \
  app/routes/reviews.py \
  app/services/campaign_cart_payment_service.py \
  app/services/payment_service.py \
  app/services/product_notifications.py \
  app/services/wallet_service.py \
  app/utils/campaign_helpers.py \
  migrations/versions/202607291000_add_workspace_id_to_messages.py

echo "Checking messaging service"
cd "$MESSAGING_ROOT"
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi
node --check server.js

echo "Ensuring messaging service listens on the Apache-proxied port"
mkdir -p /etc/bantubuzz
python3 - <<'PY'
from pathlib import Path

path = Path("/etc/bantubuzz/messaging.env")
text = path.read_text() if path.exists() else ""
lines = text.splitlines()
updated = False
for index, line in enumerate(lines):
    if line.startswith("PORT="):
        lines[index] = "PORT=3002"
        updated = True
        break
if not updated:
    lines.append("PORT=3002")
path.write_text("\n".join(lines).rstrip() + "\n")
PY

echo "Running database migration without data loss"
cd "$BACKEND_ROOT"
if [ -s /etc/bantubuzz/platform.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /etc/bantubuzz/platform.env
  set +a
fi
venv/bin/flask db upgrade heads

echo "Repairing existing no-review campaign collaborations"
venv/bin/python - <<'PY'
from app import create_app, db
from app.models import CampaignPayment, Collaboration
from app.models.campaign_payment import CampaignPaymentItem
from app.models.package_deliverable import PackageDeliverable
from app.routes.bookings import create_no_track_deliverables


def coerce_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"false", "0", "no", "n", "off"}:
            return False
        if normalized in {"true", "1", "yes", "y", "on"}:
            return True
    return bool(value)


app = create_app()
with app.app_context():
    stats = {"repaired": 0, "placeholders": 0}
    seen_collaboration_ids = set()

    def parse_ids(values):
        ids = set()
        if not values:
            return ids
        if isinstance(values, (str, int)):
            values = [values]
        for value in values:
            try:
                ids.add(int(value))
            except (TypeError, ValueError):
                continue
        return ids

    def repair_no_review_collaboration(collaboration_id):
        if not collaboration_id or collaboration_id in seen_collaboration_ids:
            return
        seen_collaboration_ids.add(collaboration_id)

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return

        if collaboration.requires_content_review:
            collaboration.requires_content_review = False
            stats["repaired"] += 1

        before = PackageDeliverable.query.filter_by(collaboration_id=collaboration.id).count()
        create_no_track_deliverables(collaboration)
        db.session.flush()
        after = PackageDeliverable.query.filter_by(collaboration_id=collaboration.id).count()
        stats["placeholders"] += max(0, after - before)
        collaboration.progress_percentage = collaboration.calculate_progress()

    payments = CampaignPayment.query.filter(
        CampaignPayment.status == "completed",
        CampaignPayment.payment_metadata.isnot(None),
    ).all()

    for payment in payments:
        metadata = payment.payment_metadata or {}
        if metadata.get("source") != "campaign_cart":
            continue
        if coerce_bool(metadata.get("requires_content_review"), True):
            continue

        collaboration_ids = parse_ids(metadata.get("collaboration_ids"))
        items = CampaignPaymentItem.query.filter_by(campaign_payment_id=payment.id).all()
        for item in items:
            collaboration_ids.update(parse_ids(item.collaboration_id))

        for collaboration_id in collaboration_ids:
            repair_no_review_collaboration(collaboration_id)

    # Legacy repair for the known no-review campaign collaboration created before
    # payment metadata and item rows were consistently linked.
    for collaboration_id in {122}:
        repair_no_review_collaboration(collaboration_id)

    db.session.commit()
    print(f"no_review_collaborations_repaired={stats['repaired']}")
    print(f"no_review_url_placeholders_created={stats['placeholders']}")
PY

echo "Repairing campaign chat participants for existing campaign collaborations"
venv/bin/python - <<'PY'
from app import create_app, db
from app.models import Campaign, CampaignChat, CampaignChatParticipant, Collaboration, CreatorProfile
from app.models.campaign_cart import CampaignCartItem
from sqlalchemy import distinct, func


def ensure_chat(campaign, collaboration, brand_user_id, creator_user_id):
    if not campaign or not collaboration or not brand_user_id or not creator_user_id:
        return False

    existing_chat_id = (
        db.session.query(CampaignChatParticipant.chat_id)
        .join(CampaignChat, CampaignChatParticipant.chat_id == CampaignChat.id)
        .filter(
            CampaignChat.campaign_id == campaign.id,
            CampaignChat.chat_type == "one_to_one",
            CampaignChat.is_active == True,
            CampaignChatParticipant.user_id.in_([brand_user_id, creator_user_id]),
            CampaignChatParticipant.left_at.is_(None),
        )
        .group_by(CampaignChatParticipant.chat_id)
        .having(func.count(distinct(CampaignChatParticipant.user_id)) == 2)
        .first()
    )

    if existing_chat_id:
        participant = CampaignChatParticipant.query.filter_by(
            chat_id=existing_chat_id[0],
            user_id=creator_user_id,
        ).first()
        if participant and not participant.collaboration_id:
            participant.collaboration_id = collaboration.id
            return True
        return False

    title = collaboration.creator.display_name or collaboration.creator.username or "Creator Chat"
    chat = CampaignChat(
        campaign_id=campaign.id,
        chat_type="one_to_one",
        title=title,
        is_active=True,
        chat_metadata={
            "brand_user_id": brand_user_id,
            "creator_user_id": creator_user_id,
            "collaboration_id": collaboration.id,
            "created_from": "deployment_repair",
        },
    )
    db.session.add(chat)
    db.session.flush()
    db.session.add(CampaignChatParticipant(chat_id=chat.id, user_id=brand_user_id, role="brand"))
    db.session.add(CampaignChatParticipant(
        chat_id=chat.id,
        user_id=creator_user_id,
        role="creator",
        collaboration_id=collaboration.id,
    ))
    return True


app = create_app()
with app.app_context():
    repaired = 0
    linked = 0
    items = (
        db.session.query(CampaignCartItem)
        .filter(CampaignCartItem.collaboration_id.isnot(None))
        .all()
    )
    for item in items:
        collaboration = Collaboration.query.get(item.collaboration_id)
        campaign = Campaign.query.get(item.campaign_id)
        brand_user_id = item.brand.user_id if item.brand else None
        creator_user_id = item.creator.user_id if item.creator else None
        if ensure_chat(campaign, collaboration, brand_user_id, creator_user_id):
            repaired += 1

    db.session.commit()
    print(f"campaign_cart_chats_repaired={repaired}")
    print(f"campaign_invitation_chats_repaired={linked}")
PY

echo "Installing frontend build at Apache document root"
rm -rf "$FRONTEND_ROOT"
mkdir -p "$FRONTEND_ROOT"
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_ROOT"
chown -R www-data:www-data "$FRONTEND_ROOT" "$BACKEND_ROOT/app" "$MESSAGING_ROOT" || true

echo "Restarting backend, messaging, and Apache"
cd "$BACKEND_ROOT"
if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' || true
  systemctl restart bantubuzz-backend.service
else
  pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn|gunicorn.*app:create_app' || true
  sleep 2
  venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon
fi

if systemctl list-unit-files | grep -q '^bantubuzz-messaging\.service'; then
  pkill -f '/var/www/bantubuzz/messaging-service/server.js|messaging-service/server.js|node server.js' || true
  systemctl daemon-reload
  systemctl restart bantubuzz-messaging.service
else
  pkill -f '/var/www/bantubuzz/messaging-service/server.js|messaging-service/server.js|node server.js' || true
  cd "$MESSAGING_ROOT"
  nohup node server.js >/var/log/bantubuzz-messaging.log 2>&1 &
fi

echo "Ensuring Apache Socket.IO proxy is aligned with messaging service"
a2enmod proxy proxy_http proxy_wstunnel rewrite headers >/dev/null
python3 - <<'PY'
from pathlib import Path

rewrite_block = """    # Socket.IO websocket upgrades must use ws://; polling remains on the normal ProxyPass.
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/socket\\.io/?(.*) ws://127.0.0.1:3002/socket.io/$1 [P,L]

"""

socket_proxy = """    ProxyPass /socket.io http://127.0.0.1:3002/socket.io
    ProxyPassReverse /socket.io http://127.0.0.1:3002/socket.io
    ProxyPass /messaging/api http://127.0.0.1:3002/api
    ProxyPassReverse /messaging/api http://127.0.0.1:3002/api
"""

for path in [
    Path("/etc/apache2/sites-available/bantubuzz-platform.conf"),
    Path("/etc/apache2/sites-enabled/bantubuzz-platform.conf"),
]:
    if not path.exists():
        continue

    text = path.read_text()
    if "ws://127.0.0.1:3002/socket.io" not in text:
        marker = "    ProxyTimeout 120\n\n"
        if marker in text:
            text = text.replace(marker, marker + rewrite_block, 1)
        else:
            text = text.replace("    ProxyPreserveHost On\n", "    ProxyPreserveHost On\n" + rewrite_block, 1)

    lines = []
    skipping_socket_block = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("ProxyPass /socket.io") or stripped.startswith("ProxyPassReverse /socket.io"):
            continue
        if stripped.startswith("ProxyPass /messaging/api") or stripped.startswith("ProxyPassReverse /messaging/api"):
            continue
        lines.append(line)
    text = "\n".join(lines) + "\n"

    api_marker = "    ProxyPassReverse /api http://127.0.0.1:8002/api\n"
    if socket_proxy not in text:
        text = text.replace(api_marker, api_marker + socket_proxy, 1)
    path.write_text(text)
PY
apache2ctl configtest
systemctl restart apache2
sleep 3

if systemctl list-unit-files | grep -q '^bantubuzz-backend\.service'; then
  wait_for_service bantubuzz-backend.service "Backend"
fi
if systemctl list-unit-files | grep -q '^bantubuzz-messaging\.service'; then
  wait_for_service bantubuzz-messaging.service "Messaging"
fi

wait_for_url http://127.0.0.1:8002/api/health "Local API health"
wait_for_url https://bantubuzz.com/api/health "Public API health"

MESSAGING_PORT="${PORT:-3001}"
if systemctl list-unit-files | grep -q '^bantubuzz-messaging\.service'; then
  service_port="$(systemctl show bantubuzz-messaging.service -p Environment --value 2>/dev/null | tr ' ' '\n' | awk -F= '$1=="PORT"{print $2; exit}' || true)"
  if [ -n "$service_port" ]; then
    MESSAGING_PORT="$service_port"
  fi
fi
wait_for_url http://127.0.0.1:3002/health "Messaging health"

echo "Socket.IO public polling smoke test:"
curl -fsSL --max-time 20 'https://bantubuzz.com/socket.io/?EIO=4&transport=polling' | head -c 160
echo

echo "Campaign invite endpoint files installed and messages workspace migration applied."
rm -f "$FRONTEND_ARCHIVE" "$BACKEND_ARCHIVE" "$NODE_ARCHIVE"
echo "BANTUBUZZ_CAMPAIGN_INVITE_WORKSPACE_MESSAGING_FIXES_SUCCESS"
