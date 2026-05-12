# Celery Background Tasks Setup Guide

## Overview

We've implemented Celery for asynchronous background tasks in the BantuBuzz platform. This enables:

1. **Automatic platform syncing** - Platforms are synced in the background every 6 hours
2. **Asynchronous email notifications** - Emails are sent without blocking HTTP requests
3. **Analytics caching** - Creator analytics are updated periodically
4. **Instant response** - Platform connections return immediately, syncing happens in background

## Files Created

### 1. `backend/app/celery_app.py`
Celery configuration and app factory. Defines:
- Redis broker/backend connection
- Periodic task schedule (beat schedule)
- Task includes (platform_sync, email_tasks, analytics_tasks)
- Flask app context integration

### 2. `backend/app/tasks/__init__.py`
Tasks package initialization file.

### 3. `backend/app/tasks/platform_sync.py`
Platform synchronization tasks:
- `sync_platform(platform_id)` - Sync a single platform
- `sync_creator_platforms(creator_id)` - Sync all platforms for a creator
- `sync_all_platforms()` - Periodic task running every 6 hours
- `cleanup_old_sync_results()` - Daily cleanup at 3 AM

### 4. `backend/app/tasks/email_tasks.py`
Email sending tasks:
- `send_email()` - Generic email sending
- `send_collaboration_notification()` - Collaboration status notifications
- `send_booking_notification()` - Booking status notifications

### 5. `backend/app/tasks/analytics_tasks.py`
Analytics update tasks:
- `update_creator_analytics(creator_id)` - Update cache for one creator
- `update_all_creator_analytics()` - Periodic task running every 4 hours

### 6. `backend/celery_worker.py`
Celery worker entry point script.

## Changes to Existing Files

### `backend/app/__init__.py`
- Added global `celery` variable
- Initialize Celery in `create_app()` using `make_celery(app)`

### `backend/app/routes/platforms.py`
- Changed platform connection to trigger background sync:
  ```python
  from app.tasks.platform_sync import sync_platform as sync_platform_task
  sync_platform_task.delay(connected_platform.id)
  ```

### `backend/.env`
- Added Celery configuration:
  ```
  CELERY_BROKER_URL=redis://localhost:6379/0
  CELERY_RESULT_BACKEND=redis://localhost:6379/0
  ```

## Server Setup Instructions

### Step 1: Install Redis

```bash
# Update package list
apt-get update

# Install Redis
apt-get install redis-server -y

# Start Redis
systemctl start redis-server

# Enable Redis to start on boot
systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

### Step 2: Deploy Backend Files

```bash
# Extract uploaded files
cd /var/www/bantubuzz/backend
tar -xzf /tmp/backend_celery_tasks.tar.gz

# Install/update dependencies
source venv/bin/activate
pip install celery redis

# Verify installation
python -c "import celery; print(celery.__version__)"
python -c "import redis; print(redis.__version__)"
```

### Step 3: Create Systemd Services

Create `/etc/systemd/system/celery-worker.service`:

```ini
[Unit]
Description=Celery Worker for BantuBuzz
After=network.target redis-server.service

[Service]
Type=forking
User=root
Group=root
WorkingDirectory=/var/www/bantubuzz/backend
Environment="PATH=/var/www/bantubuzz/backend/venv/bin"
ExecStart=/var/www/bantubuzz/backend/venv/bin/celery -A celery_worker.celery worker \
  --loglevel=info \
  --logfile=/var/www/bantubuzz/backend/celery_worker.log \
  --pidfile=/var/run/celery/worker.pid \
  --detach

ExecStop=/bin/kill -TERM $MAINPID
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/celery-beat.service`:

```ini
[Unit]
Description=Celery Beat Scheduler for BantuBuzz
After=network.target redis-server.service

[Service]
Type=forking
User=root
Group=root
WorkingDirectory=/var/www/bantubuzz/backend
Environment="PATH=/var/www/bantubuzz/backend/venv/bin"
ExecStart=/var/www/bantubuzz/backend/venv/bin/celery -A celery_worker.celery beat \
  --loglevel=info \
  --logfile=/var/www/bantubuzz/backend/celery_beat.log \
  --pidfile=/var/run/celery/beat.pid \
  --detach

ExecStop=/bin/kill -TERM $MAINPID
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

### Step 4: Create PID Directory

```bash
mkdir -p /var/run/celery
chown root:root /var/run/celery
```

### Step 5: Start Services

```bash
# Reload systemd
systemctl daemon-reload

# Start Celery worker
systemctl start celery-worker

# Start Celery beat (periodic tasks)
systemctl start celery-beat

# Enable services to start on boot
systemctl enable celery-worker
systemctl enable celery-beat

# Check status
systemctl status celery-worker
systemctl status celery-beat
```

### Step 6: Restart Gunicorn

```bash
pkill -f gunicorn
cd /var/www/bantubuzz/backend
source venv/bin/activate
gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 \
  --error-logfile gunicorn_error.log \
  --access-logfile gunicorn_access.log \
  'app:create_app()' --daemon
```

## Monitoring

### View Celery Worker Logs
```bash
tail -f /var/www/bantubuzz/backend/celery_worker.log
```

### View Celery Beat Logs
```bash
tail -f /var/www/bantubuzz/backend/celery_beat.log
```

### Check Redis Connection
```bash
redis-cli ping
redis-cli info
```

### Monitor Active Tasks
```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
celery -A celery_worker.celery inspect active
celery -A celery_worker.celery inspect registered
```

## Testing

### Test Platform Sync Task
```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
python -c "from app.tasks.platform_sync import sync_platform; sync_platform.delay(1)"
```

### Test Email Task
```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
python -c "from app.tasks.email_tasks import send_email; send_email.delay('test@example.com', 'Test Subject', 'Test body')"
```

## Periodic Task Schedule

| Task | Frequency | Description |
|------|-----------|-------------|
| `sync_all_platforms` | Every 6 hours | Syncs all connected platforms that haven't been updated in 6+ hours |
| `update_all_creator_analytics` | Every 4 hours | Updates analytics cache for all creators |
| `cleanup_old_results` | Daily at 3 AM | Cleans up old Celery task results |

## Troubleshooting

### Celery Worker Not Starting
```bash
# Check logs
journalctl -u celery-worker.service -n 50

# Check if Redis is running
systemctl status redis-server

# Manually start worker for debugging
cd /var/www/bantubuzz/backend
source venv/bin/activate
celery -A celery_worker.celery worker --loglevel=debug
```

### Tasks Not Executing
```bash
# Check if worker is registered
celery -A celery_worker.celery inspect registered

# Check active tasks
celery -A celery_worker.celery inspect active

# Purge all tasks (WARNING: This deletes all pending tasks)
celery -A celery_worker.celery purge
```

### Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
journalctl -u redis-server.service -n 50

# Restart Redis
systemctl restart redis-server
```

## Benefits

1. **Better User Experience**: Platform connections return immediately instead of waiting for sync
2. **Automatic Updates**: Platforms stay fresh with periodic background syncing
3. **Scalability**: Email sending doesn't block HTTP requests
4. **Reliability**: Failed tasks can be retried automatically
5. **Analytics Cache**: Creator analytics are pre-computed and kept up-to-date

## Next Steps

Once deployed:

1. Connect a new Instagram account with 100+ followers
2. Wait a few minutes for background sync to complete
3. Check audience data is automatically updated
4. Verify platform analytics show updated metrics

The platform will now automatically sync every 6 hours without manual intervention!
