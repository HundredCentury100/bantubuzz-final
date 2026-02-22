# BantuBuzz Platform Architecture & Fixes

## Current Architecture

### Services
1. **Flask Backend** (Python)
   - Port: 8002
   - Location: `/var/www/bantubuzz/backend`
   - Purpose: Main API (auth, campaigns, bookings, payments, etc.)
   - Apache Proxy: `https://bantubuzz.com/api` → `http://127.0.0.1:8002/api` ✅

2. **Node.js Messaging Service**
   - Port: 3002
   - Location: `/var/www/bantubuzz/messaging-service`
   - Purpose: WebSocket (Socket.IO) + Messaging REST API
   - Apache Proxy: **MISSING** ❌
   - Process: Running (PID 272999)

3. **Frontend** (React + Vite)
   - Served by Apache from: `/var/www/bantubuzz/frontend/dist`
   - URL: `https://bantubuzz.com`

### Current Problems

#### 1. WebSocket Connection Errors
**Error:** `WebSocket connection to 'wss://bantubuzz.com:3002/socket.io/?EIO=4&transport=websocket' failed`

**Root Cause:**
- Frontend trying to connect directly to port 3002 with wss://
- Port 3002 has no SSL certificate (only port 443 does)
- Apache is not proxying WebSocket connections

**Solution:**
- Add Apache proxy: `/socket.io/` → `http://127.0.0.1:3002/socket.io/`
- Update frontend to connect to `https://bantubuzz.com` (no port)
- Apache will handle SSL termination and proxy to port 3002

#### 2. Messaging API Errors
**Error:** `GET https://bantubuzz.com:3002/api/conversations net::ERR_SSL_PROTOCOL_ERROR`

**Root Cause:**
- Frontend trying to call messaging API directly on port 3002 with https://
- Port 3002 has no SSL certificate
- Apache is not proxying messaging API requests

**Solution:**
- Add Apache proxy: `/messaging/` → `http://127.0.0.1:3002/`
- Update frontend to call `https://bantubuzz.com/messaging/api/conversations`
- Apachehandle SSL and proxy to Node.js service

#### 3. CORS Configuration
**Current Node.js .env:**
```
CORS_ORIGIN=http://173.212.245.22:8080
```

**Problem:** Doesn't allow requests from `https://bantubuzz.com`

**Solution:** Update to:
```
CORS_ORIGIN=https://bantubuzz.com
```

## Implementation Plan

### Step 1: Update Apache Configuration

Add to `/etc/apache2/sites-available/bantubuzz.com-le-ssl.conf`:

```apache
# Enable required modules (run once):
# a2enmod proxy_http proxy_wstunnel rewrite

<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName bantubuzz.com
    ServerAlias www.bantubuzz.com

    DocumentRoot /var/www/bantubuzz/frontend/dist

    # Serve React frontend
    <Directory /var/www/bantubuzz/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>

    # Serve uploaded files
    Alias /uploads /var/www/bantubuzz/backend/uploads
    <Directory /var/www/bantubuzz/backend/uploads>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # Proxy Flask API requests to backend (port 8002)
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:8002/api
    ProxyPassReverse /api http://127.0.0.1:8002/api

    # **NEW:** Proxy WebSocket connections to Node.js messaging service (port 3002)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /socket.io/(.*) ws://127.0.0.1:3002/socket.io/$1 [P,L]

    ProxyPass /socket.io/ http://127.0.0.1:3002/socket.io/
    ProxyPassReverse /socket.io/ http://127.0.0.1:3002/socket.io/

    # **NEW:** Proxy messaging API requests to Node.js service (port 3002)
    ProxyPass /messaging/ http://127.0.0.1:3002/
    ProxyPassReverse /messaging/ http://127.0.0.1:3002/

    ErrorLog /var/log/apache2/bantubuzz-error.log
    CustomLog /var/log/apache2/bantubuzz-access.log combined

    Include /etc/letsencrypt/options-ssl-apache.conf
    SSLCertificateFile /etc/letsencrypt/live/bantubuzz.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/bantubuzz.com/privkey.pem
</VirtualHost>
</IfModule>
```

### Step 2: Update Node.js Service Configuration

Update `/var/www/bantubuzz/messaging-service/.env`:

```
PORT=3002
JWT_SECRET=bantubuzz-jwt-secret-key-2024-secure
CORS_ORIGIN=https://bantubuzz.com
DATABASE_URL=postgresql://bantubuzz_user:BantuBuzz2024!@localhost:5432/bantubuzz
```

### Step 3: Update Node.js server.js (if needed)

Check if server.js needs to handle the `/messaging/` prefix or if it's transparent.

### Step 4: Update Frontend Configuration

#### File: `frontend/src/contexts/MessagingContext.jsx`

Change line 5:
```javascript
// OLD:
const MESSAGING_SOCKET_URL = import.meta.env.VITE_MESSAGING_SOCKET_URL || 'http://localhost:3001';

// NEW:
const MESSAGING_SOCKET_URL = import.meta.env.VITE_MESSAGING_SOCKET_URL || (
  import.meta.env.DEV ? 'http://localhost:3002' : 'https://bantubuzz.com'
);
```

#### File: `frontend/src/services/api.js` or create `messagingAPI.js`

Update messaging API base URL:
```javascript
// OLD: Direct to port 3002
const MESSAGING_API_URL = 'https://bantubuzz.com:3002';

// NEW: Through Apache proxy
const MESSAGING_API_URL = '/messaging/api';
```

### Step 5: Restart Services

```bash
# Enable required Apache modules
sudo a2enmod proxy_http proxy_wstunnel rewrite

# Restart Apache
sudo systemctl restart apache2

# Restart Node.js messaging service
sudo pkill -f "node.*messaging-service"
cd /var/www/bantubuzz/messaging-service && node server.js &
```

### Step 6: Payment Flow Fixes

These are separate from the messaging fixes but also need to be done.

## Testing Checklist

After implementing all fixes:

- [ ] WebSocket connects successfully (no errors in console)
- [ ] Can send and receive messages in real-time
- [ ] Typing indicators work
- [ ] Online status shows correctly
- [ ] Unread message count loads
- [ ] Accept campaign application → Payment → Verify → Status updates
- [ ] Add package → Payment → Verify → Package added
- [ ] Request paid revision → Payment → Verify → Revision requested

## Commands to Execute

```bash
# 1. Backup current Apache config
ssh root@173.212.245.22 "cp /etc/apache2/sites-available/bantubuzz.com-le-ssl.conf /etc/apache2/sites-available/bantubuzz.com-le-ssl.conf.backup"

# 2. Update Apache config (will create script)

# 3. Enable Apache modules
ssh root@173.212.245.22 "a2enmod proxy_http proxy_wstunnel rewrite"

# 4. Test Apache config
ssh root@173.212.245.22 "apache2ctl configtest"

# 5. Restart Apache
ssh root@173.212.245.22 "systemctl restart apache2"

# 6. Update Node.js .env
ssh root@173.212.245.22 "sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://bantubuzz.com|' /var/www/bantubuzz/messaging-service/.env"

# 7. Restart Node.js service
ssh root@173.212.245.22 "pkill -f 'node.*messaging-service' && cd /var/www/bantubuzz/messaging-service && nohup node server.js > /tmp/messaging.log 2>&1 &"

# 8. Frontend changes (local)
# - Update MessagingContext.jsx
# - Update API base URLs
# - Rebuild: npm run build
# - Deploy: scp dist

# 9. Test WebSocket connection
# - Open browser console
# - Should see "✅ Connected to messaging service"
# - No WebSocket errors
```
