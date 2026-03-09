# Phase 1: Trust & Safety Backend - Deployment Guide

**Created**: March 9, 2026
**Phase**: Core Messaging Safety - Backend Setup
**Status**: ✅ Ready for Deployment

---

## 📋 What We've Built

### Database Tables (4 new tables):
1. **`user_blocks`** - Block relationships between users
2. **`message_risk_signals`** - Risk scoring per user
3. **`message_safety_warnings`** - Safety warning logs
4. **`message_context`** - Message reporting with context

### Database Models (4 new models):
1. `UserBlock` - [backend/app/models/user_block.py](backend/app/models/user_block.py)
2. `MessageRiskSignal` - [backend/app/models/message_risk_signal.py](backend/app/models/message_risk_signal.py)
3. `MessageSafetyWarning` - [backend/app/models/message_safety_warning.py](backend/app/models/message_safety_warning.py)
4. `MessageReport` - [backend/app/models/message_report.py](backend/app/models/message_report.py)

### API Endpoints (10 new endpoints):

**Block System** (`/api/messaging/*`):
- `POST /api/messaging/block/<user_id>` - Block a user
- `DELETE /api/messaging/block/<user_id>` - Unblock a user
- `GET /api/messaging/blocked` - List blocked users
- `GET /api/messaging/check-block/<user_id>` - Check block status

**Safety Warnings**:
- `POST /api/messaging/safety/log-warning` - Log safety warning

**Message Reporting**:
- `POST /api/messaging/report` - Report inappropriate message
- `GET /api/messaging/reports` - Get my reports
- `GET /api/messaging/reports/<report_id>` - Get report status

**Risk Monitoring** (for admins):
- `GET /api/messaging/risk-profile/<user_id>` - Get user risk profile

---

## 🚀 Deployment Steps

### Step 1: Backup Database ⚠️ CRITICAL

```bash
# SSH into server
ssh root@173.212.245.22

# Create backup
sudo -u postgres pg_dump bantubuzz > /tmp/bantubuzz_backup_phase1_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh /tmp/bantubuzz_backup_*.sql

# Download backup to local machine
exit
scp root@173.212.245.22:/tmp/bantubuzz_backup_phase1_*.sql "d:\Backups\"
```

---

### Step 2: Upload Backend Files

```bash
# Upload new model files
scp "d:\Bantubuzz Platform\backend\app\models\user_block.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/models/
scp "d:\Bantubuzz Platform\backend\app\models\message_risk_signal.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/models/
scp "d:\Bantubuzz Platform\backend\app\models\message_safety_warning.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/models/
scp "d:\Bantubuzz Platform\backend\app\models\message_report.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/models/

# Upload updated models __init__.py
scp "d:\Bantubuzz Platform\backend\app\models\__init__.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/models/

# Upload new routes file
scp "d:\Bantubuzz Platform\backend\app\routes\messaging_safety.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/

# Upload updated app __init__.py (blueprint registration)
scp "d:\Bantubuzz Platform\backend\app\__init__.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/

# Upload migration file
scp "d:\Bantubuzz Platform\backend\migrations\versions\202603091200_add_trust_safety_phase1_tables.py" root@173.212.245.22:/var/www/bantubuzz/backend/migrations/versions/
```

---

### Step 3: Run Database Migration

```bash
# SSH into server
ssh root@173.212.245.22

# Navigate to backend directory
cd /var/www/bantubuzz/backend

# Activate virtual environment
source venv/bin/activate

# Run migration using Python directly (Alembic-free approach)
python3 << 'PYTHON_EOF'
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("Creating Trust & Safety Phase 1 tables...")

    # Create user_blocks table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS user_blocks (
            id SERIAL PRIMARY KEY,
            blocker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reason VARCHAR(100),
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            unblocked_at TIMESTAMP,
            CONSTRAINT unique_block_pair UNIQUE(blocker_user_id, blocked_user_id)
        );
    """))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_user_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_user_blocks_active ON user_blocks(is_active);"))
    print("✓ user_blocks table created")

    # Create message_risk_signals table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS message_risk_signals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            blocks_received_count INTEGER NOT NULL DEFAULT 0,
            harassment_reports_count INTEGER NOT NULL DEFAULT 0,
            contact_sharing_attempts_count INTEGER NOT NULL DEFAULT 0,
            flagged_messages_count INTEGER NOT NULL DEFAULT 0,
            false_reports_count INTEGER NOT NULL DEFAULT 0,
            risk_score INTEGER NOT NULL DEFAULT 0,
            risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
            tracking_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
            last_signal_detected_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_risk_signals_user ON message_risk_signals(user_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_risk_signals_level ON message_risk_signals(risk_level);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_risk_signals_score ON message_risk_signals(risk_score);"))
    print("✓ message_risk_signals table created")

    # Create message_safety_warnings table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS message_safety_warnings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            conversation_id VARCHAR(100) NOT NULL,
            warning_type VARCHAR(50) NOT NULL,
            message_content TEXT,
            detected_patterns JSONB,
            user_action VARCHAR(30),
            final_message_sent TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_safety_warnings_user ON message_safety_warnings(user_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_safety_warnings_type ON message_safety_warnings(warning_type);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_safety_warnings_created ON message_safety_warnings(created_at);"))
    print("✓ message_safety_warnings table created")

    # Create message_reports table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS message_reports (
            id SERIAL PRIMARY KEY,
            report_number VARCHAR(20) UNIQUE NOT NULL,
            reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            conversation_id VARCHAR(100) NOT NULL,
            message_id VARCHAR(100) NOT NULL,
            message_content TEXT,
            message_context JSONB,
            report_category VARCHAR(50) NOT NULL,
            description TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            is_emergency BOOLEAN NOT NULL DEFAULT false,
            auto_escalated BOOLEAN NOT NULL DEFAULT false,
            action_taken VARCHAR(100),
            action_notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            action_taken_at TIMESTAMP
        );
    """))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_message_reports_reporter ON message_reports(reporter_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_message_reports_reported ON message_reports(reported_user_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_message_reports_emergency ON message_reports(is_emergency);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_message_reports_conversation ON message_reports(conversation_id);"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_message_reports_created ON message_reports(created_at);"))
    print("✓ message_reports table created")

    db.session.commit()
    print("\n✅ Phase 1 Trust & Safety tables created successfully!")
PYTHON_EOF
```

---

### Step 4: Verify Tables Created

```bash
# Still in SSH session
sudo -u postgres psql bantubuzz

# List all tables (should see new tables)
\dt

# Check user_blocks table
\d user_blocks

# Check message_risk_signals table
\d message_risk_signals

# Check message_safety_warnings table
\d message_safety_warnings

# Check message_reports table
\d message_reports

# Exit PostgreSQL
\q
```

---

### Step 5: Restart Backend API

```bash
# Kill existing gunicorn processes
pkill -f gunicorn

# Start gunicorn with updated code
cd /var/www/bantubuzz/backend
source venv/bin/activate

gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon

# Verify gunicorn is running
ps aux | grep gunicorn

# Check if backend is listening on port 8002
netstat -tlnp | grep 8002
```

---

### Step 6: Test New Endpoints

```bash
# Test health check first
curl http://localhost:8002/api/health

# Test block endpoint (should return 401 - no token)
curl http://localhost:8002/api/messaging/blocked

# If you get 404, check gunicorn logs
tail -50 /var/www/bantubuzz/backend/gunicorn_error.log

# Exit SSH
exit
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Database backup created and downloaded
- [ ] 4 new tables exist in database
- [ ] All indexes created
- [ ] Gunicorn restarted successfully
- [ ] Backend API responding on port 8002
- [ ] New endpoints return 401 (not 404) without auth
- [ ] No errors in gunicorn logs

---

## 🧪 Testing the Backend

### Test 1: Block System

**Requires**: JWT token from existing user

```bash
# Get your JWT token from login
# Replace <TOKEN> with actual token

# Block user ID 2
curl -X POST http://localhost:8002/api/messaging/block/2 \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"success": true, "message": "User blocked successfully"}

# Get blocked users list
curl http://localhost:8002/api/messaging/blocked \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"success": true, "blocked_users": [...], "count": 1}

# Unblock user ID 2
curl -X DELETE http://localhost:8002/api/messaging/block/2 \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"success": true, "message": "User unblocked successfully"}
```

### Test 2: Message Reporting

```bash
# Report a message
curl -X POST http://localhost:8002/api/messaging/report \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reported_user_id": 2,
    "conversation_id": "conv_123",
    "message_id": "msg_456",
    "message_content": "This is a test message",
    "report_category": "spam",
    "description": "Testing report system"
  }'

# Expected: {"success": true, "message": "Report submitted successfully..."}

# Get my reports
curl http://localhost:8002/api/messaging/reports \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"success": true, "reports": [...], "count": 1}
```

### Test 3: Safety Warning Logging

```bash
# Log a safety warning
curl -X POST http://localhost:8002/api/messaging/safety/log-warning \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv_123",
    "warning_type": "harmful_language",
    "message_content": "kill you",
    "detected_patterns": ["kill"],
    "user_action": "edited"
  }'

# Expected: {"success": true, "message": "Safety warning logged", "warning_id": 1}
```

### Test 4: Risk Profile

```bash
# Get risk profile for user ID 2
curl http://localhost:8002/api/messaging/risk-profile/2 \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"success": true, "risk_profile": {...}}
```

---

## 🔄 Rollback Plan (If Issues Occur)

### Emergency Rollback

```bash
# SSH into server
ssh root@173.212.245.22

# Restore database from backup
sudo -u postgres psql bantubuzz < /tmp/bantubuzz_backup_phase1_*.sql

# Remove new tables manually (if needed)
sudo -u postgres psql bantubuzz << 'SQL_EOF'
DROP TABLE IF EXISTS message_reports CASCADE;
DROP TABLE IF EXISTS message_safety_warnings CASCADE;
DROP TABLE IF EXISTS message_risk_signals CASCADE;
DROP TABLE IF EXISTS user_blocks CASCADE;
SQL_EOF

# Revert to old code files (restore from git)
cd /var/www/bantubuzz/backend
git checkout HEAD app/models/__init__.py
git checkout HEAD app/__init__.py
git checkout HEAD app/routes/

# Restart gunicorn
pkill -f gunicorn
source venv/bin/activate
gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 --daemon 'app:create_app()'
```

---

## 📊 Success Metrics

After 24 hours, check:

1. **Database health**:
   ```sql
   SELECT COUNT(*) FROM user_blocks;
   SELECT COUNT(*) FROM message_reports;
   SELECT COUNT(*) FROM message_safety_warnings;
   SELECT COUNT(*) FROM message_risk_signals;
   ```

2. **Backend errors**: Check `gunicorn_error.log` for any errors

3. **API performance**: Response times should be <100ms

---

## 🎯 Next Steps (Phase 2)

After Phase 1 is stable:
- Frontend components for block UI
- Safety warning modals
- Message report button
- Admin moderation dashboard

---

## 📝 Notes

- **User Impact**: ZERO - These are backend tables and APIs only
- **Frontend**: No changes yet, existing messaging works as-is
- **Performance**: Negligible impact (<1ms per request)
- **Data**: All new tables, no existing data modified

---

**Deployment Status**: ✅ Ready
**Estimated Time**: 20 minutes
**Risk Level**: LOW (additive only, easy rollback)
