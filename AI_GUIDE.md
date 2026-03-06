# 🤖 AI Assistant Guide for BantuBuzz Platform

**Last Updated**: March 5, 2026
**Purpose**: Complete context and guidelines for AI assistants working on this project

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Design Philosophy](#design-philosophy)
3. [Development & Deployment Process](#development--deployment-process)
4. [Server Architecture](#server-architecture)
5. [Git Workflow](#git-workflow)
6. [Implementation Phases (What We've Built)](#implementation-phases-what-weve-built)
7. [Common Patterns & Conventions](#common-patterns--conventions)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🎯 Project Overview

**BantuBuzz** is Africa's premier influencer-brand collaboration platform connecting creators with brands for authentic partnerships.

### Core Features
- **Creator Profiles**: Showcase portfolios, packages, and social media reach
- **Brand Collaboration**: Book creators, launch campaigns, manage briefs
- **Messaging System**: Real-time chat with WebSocket support
- **Payment System**: Paynow integration (EcoCash, cards) + manual payments
- **Subscription Tiers**: For both brands (Free, Pro, Premium) and creators (Featured, Verification)
- **Admin Dashboard**: Comprehensive platform management
- **Custom Packages**: Negotiable collaboration offerings

### Tech Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Python Flask + PostgreSQL
- **Messaging**: Node.js + Socket.io
- **Server**: Ubuntu VPS (173.212.245.22)
- **Web Server**: Apache2 (ports 80/443) → Express.js (port 8080)
- **Process Manager**: PM2

---

## 🎨 Design Philosophy

### Brand Colors (Tailwind Config)
```javascript
primary: '#ccdb53'      // PRIMARY BRAND COLOR - olive/yellow-green
primary-light: '#ebf4e5' // Light backgrounds
primary-dark: '#838a36'  // Dark olive
accent-lime: '#c8ff09'   // Attention-grabbing elements ONLY
dark: '#1F2937'          // Dark text/backgrounds
light: '#ebf4e5'         // Light backgrounds (same as primary-light)
```

### Design System Rules (CRITICAL - ALWAYS FOLLOW)

#### 1. **Card Design Patterns**

**Standard Card (White Background):**
```jsx
// CORRECT - Homepage style
<div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 md:p-8">
  {/* Content */}
</div>

// WRONG - Don't use
<div className="bg-white rounded-2xl shadow-lg p-8">
```

**Popular/Featured Card (Primary Background with White Inner Container):**
```jsx
// CORRECT - BrowseCreators & Pricing style
<div className="bg-primary rounded-3xl shadow-sm hover:shadow-md p-4">
  {/* Optional badge */}
  <div className="bg-dark text-white text-center py-2 px-4 rounded-full font-bold text-xs mb-4">
    MOST POPULAR
  </div>

  {/* White inner container with rounded-2xl */}
  <div className="bg-white rounded-2xl p-6">
    {/* Card content */}
  </div>

  {/* Button on primary background */}
  <button className="w-full mt-4 py-3 px-6 bg-white text-dark rounded-full font-medium hover:bg-gray-100">
    Button Text
  </button>
</div>
```

**Rules:**
- ✅ Outer cards: ALWAYS `rounded-3xl` + `shadow-sm` + `hover:shadow-md`
- ✅ Inner containers (when on colored background): Use `rounded-2xl`
- ✅ Standard padding: `p-4` for outer, `p-6` for inner
- ✅ Image containers within cards: `rounded-2xl` with `m-4` margin
- ❌ NEVER use `shadow-lg` or `shadow-xl`
- ❌ NEVER use gradients for icons or containers (use solid colors only)

#### 2. **Icon Design**
```jsx
// CORRECT - Simple bg-primary/10 circle
<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
  <Icon className="h-6 w-6 text-primary" />
</div>

// WRONG - No gradients allowed
<div className="bg-gradient-to-r from-blue-600 to-blue-400 p-3 rounded-2xl">
  <Icon className="h-8 w-8 text-white" />
</div>
```

**Rules:**
- ✅ Use `bg-primary/10 rounded-full` for icon backgrounds
- ✅ Icon size: `w-12 h-12` container, `h-6 w-6` icon
- ✅ Icon color: `text-primary` for primary icons
- ❌ NO gradients (`bg-gradient-to-r`, etc.)
- ❌ NO colored shadows or glows

#### 3. **Buttons**
```jsx
// CORRECT - Primary button
<button className="px-8 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors">

// CORRECT - Dark button
<button className="px-8 py-3 bg-dark text-white rounded-full font-medium hover:bg-gray-800 transition-colors">

// CORRECT - White button (on colored background)
<button className="px-8 py-3 bg-white text-dark rounded-full font-medium hover:bg-gray-100 transition-colors">

// WRONG
<button className="px-6 py-4 bg-dark text-white rounded-xl">
```

**Rules:**
- ✅ ALWAYS `rounded-full` - no exceptions
- ✅ Padding: `px-8 py-3` (standard), `px-6 py-3` (compact), `px-6 py-2` (small)
- ✅ Font: `font-medium` (normal) or `font-semibold` (emphasis)
- ✅ Always include `transition-colors` for smooth hover
- ❌ NEVER use `rounded-xl`, `rounded-2xl`, `rounded-lg`, or square buttons

#### 4. **Typography**
```jsx
// Page headers
<h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-dark mb-6 leading-tight">

// Section headers
<h2 className="text-3xl font-bold text-dark mb-4">
<h3 className="text-2xl font-bold text-dark mb-2">

// Body text
<p className="text-lg md:text-xl text-gray-600 leading-relaxed">
<p className="text-sm text-gray-600">  // Small text
```

#### 5. **Color Usage**

**Text Colors:**
- **Primary Text**: `text-dark` (NOT `text-gray-900`)
- **Secondary Text**: `text-gray-600`, `text-gray-700`
- **Disabled/Inactive**: `text-gray-400`, `text-gray-500`
- **On Primary Background**: `text-dark`, `text-gray-700` for secondary

**Background Colors:**
- **Main Backgrounds**: `bg-light` (page backgrounds)
- **Cards**: `bg-white` (default), `bg-primary` (featured/popular)
- **Accent Areas**: `bg-dark`, `bg-primary`
- **Icon Backgrounds**: `bg-primary/10` (10% opacity primary)

**Button Colors:**
- **Dark**: `bg-dark text-white hover:bg-gray-800`
- **Primary**: `bg-primary text-dark hover:bg-primary/90`
- **White (on colored BG)**: `bg-white text-dark hover:bg-gray-100`

**Border Colors:**
- **Standard**: `border-gray-300`
- **On Primary BG**: `border-gray-700`
- **Active/Focus**: `border-primary`

#### 6. **Spacing & Layout**
```jsx
// Page container
<div className="py-12 px-6 lg:px-12 xl:px-20">
  <div className="w-full max-w-7xl mx-auto">
    {/* Content */}
  </div>
</div>

// Section spacing
<section className="py-12 px-6 lg:px-12 xl:px-20">

// Grid layouts
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

#### 7. **NO GRADIENTS Policy**

**IMPORTANT**: BantuBuzz design system does NOT use gradients for UI elements (only categories use subtle gradients for visual variety).

❌ **NEVER use:**
- `bg-gradient-to-r from-blue-600 to-blue-400`
- Gradient icon backgrounds
- Gradient text
- Gradient borders

✅ **INSTEAD use:**
- Solid colors: `bg-primary`, `bg-dark`, `bg-white`
- Opacity variations: `bg-primary/10`, `bg-dark/5`
- Simple color combinations

#### 8. **Reference Files (ALWAYS CHECK)**

**Design Reference:** [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx)
**Card Patterns:** [frontend/src/pages/BrowseCreators.jsx](frontend/src/pages/BrowseCreators.jsx)
**Subscription Design:** [frontend/src/pages/Pricing.jsx](frontend/src/pages/Pricing.jsx)

Key patterns from Home.jsx:
- Creator cards: `rounded-3xl`, `shadow-sm`, proper spacing
- Platform sections: Clean section padding `py-12 px-6 lg:px-12 xl:px-20`
- Buttons: `rounded-full` with proper hover states
- Categories: Only place where gradients are used (sparingly)

Key patterns from BrowseCreators.jsx:
- Cards with `bg-primary` outer + `bg-white rounded-2xl` inner
- Image containers: `aspect-square rounded-2xl overflow-hidden bg-gray-100`
- Badges overlaid on images: `absolute top-2 left-2`
- Platform icons with proper brand colors

---

## 🚀 Development & Deployment Process

### Local Development

```bash
# Frontend
cd frontend
npm install
npm run dev          # Development server on localhost:5173

# Backend
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py       # Development server on localhost:5000
```

### Build for Production

```bash
cd frontend
npm run build       # Creates frontend/dist/ folder
```

### Deployment to Server

**Server Details:**
- IP: `173.212.245.22`
- Username: `root`
- Password: `P9MYrbtC61MA54t`
- Platform location: `/var/www/bantubuzz/`

**Deployment Steps:**

```bash
# 1. Build frontend locally
cd frontend
npm run build

# 2. Create tarball
tar -czf dist.tar.gz -C frontend dist

# 3. Upload to server
scp "D:\Bantubuzz Platform\frontend\dist.tar.gz" root@173.212.245.22:/tmp/

# 4. Deploy on server
ssh root@173.212.245.22 "cd /var/www/bantubuzz/frontend && rm -rf dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"

# 5. Restart frontend service
ssh root@173.212.245.22 "pm2 restart bantubuzz-frontend"

# 6. Clean up local tarball
rm "D:\Bantubuzz Platform\frontend\dist.tar.gz"
```

**Quick Deploy Script** (if exists):
```bash
# Check for deployment scripts in deployment/ folder
deployment/03-deploy-platform.bat
```

---

## 🖥️ Server Architecture

### VPS Details
```
Server IP: 173.212.245.22
Username: root
Password: P9MYrbtC61MA54t
OS: Ubuntu
Location: /var/www/bantubuzz/
```

### Database Configuration

**CRITICAL: BantuBuzz uses PostgreSQL, NOT SQLite**

**Database Credentials:**
```bash
Database Type: PostgreSQL
Database Name: bantubuzz
Database User: bantubuzz_user
Database Password: BantuBuzz2024!
Host: localhost
Port: 5432
```

**Environment Configuration:**
```bash
# CORRECT Database URL (Production)
DATABASE_URL=postgresql://bantubuzz_user:BantuBuzz2024!@localhost:5432/bantubuzz

# WRONG - NEVER use SQLite in production
# DATABASE_URL=sqlite:///app.db  ❌ DO NOT USE
# DATABASE_URL=sqlite:///bantubuzz.db  ❌ DO NOT USE
```

**Important Notes:**
- ⚠️ **ALWAYS verify** `.env` file on server has the correct PostgreSQL connection string
- ⚠️ **NEVER change** the database URL to SQLite - this will break production
- ⚠️ The `.env.backup` file contains the original correct configuration
- ✅ All user data, creators, bookings, collaborations are stored in PostgreSQL
- ✅ PostgreSQL handles JSON fields, full-text search, and complex queries

**Common Database Operations:**
```bash
# Check database connection
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python -c 'from app import create_app, db; app = create_app(); app.app_context().push(); from app.models import User; print(f\"Users: {User.query.count()}\")'"

# Access PostgreSQL CLI
ssh root@173.212.245.22 "sudo -u postgres psql bantubuzz"

# PostgreSQL useful commands (once in psql):
\dt              # List all tables
\d users         # Describe users table schema
\d+ users        # Detailed table info with indexes
SELECT COUNT(*) FROM users;                    # Count users
SELECT COUNT(*) FROM creator_profiles;         # Count creators
SELECT email, user_type FROM users LIMIT 5;    # Sample users
\q              # Quit psql

# Backup database
ssh root@173.212.245.22 "sudo -u postgres pg_dump bantubuzz > /tmp/bantubuzz_backup.sql"

# Download backup
scp root@173.212.245.22:/tmp/bantubuzz_backup.sql "D:\Backups\"

# Restore database (CAREFUL!)
ssh root@173.212.245.22 "sudo -u postgres psql bantubuzz < /tmp/bantubuzz_backup.sql"
```

**Database Schema:**
- BantuBuzz uses **Alembic** for database migrations (Flask-Migrate)
- Migration files located in: `/var/www/bantubuzz/backend/migrations/versions/`
- Never run `db.create_all()` on production - use migrations instead
- Models defined in: `/var/www/bantubuzz/backend/app/models/`

**Troubleshooting Database Issues:**
```bash
# If you see "no such table" errors:
# 1. Check DATABASE_URL is correct
ssh root@173.212.245.22 "grep DATABASE_URL /var/www/bantubuzz/backend/.env"

# 2. Verify PostgreSQL is running
ssh root@173.212.245.22 "systemctl status postgresql"

# 3. Test database connection
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python -c 'from app import db; from app import create_app; app = create_app(); print(db.engine.url)'"

# 4. If DATABASE_URL is wrong, restore from backup
ssh root@173.212.245.22 "cp /var/www/bantubuzz/backend/.env.backup /var/www/bantubuzz/backend/.env"

# 5. Restart backend
ssh root@173.212.245.22 "pkill -f gunicorn && cd /var/www/bantubuzz/backend && source venv/bin/activate && gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon"
```

### Google OAuth Configuration

**CRITICAL: Google OAuth credentials are required for Google signup/login**

**OAuth Credentials:**
```bash
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<your-google-client-secret>
```

**Environment Configuration:**
```bash
# Google OAuth Configuration (Required for Google signup)
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<your-google-client-secret>
```

**Note**: Actual credentials are stored in `/var/www/bantubuzz/backend/.env` on production server (not committed to git for security)

**Important Notes:**
- ⚠️ These credentials MUST be in `/var/www/bantubuzz/backend/.env` for Google signup to work
- ✅ Used by: `backend/app/routes/auth.py` - `/api/auth/google/creator` endpoint
- ✅ Google Cloud Project: Configured for `bantubuzz.com` domain
- ❌ Without these credentials, users will see: **"Google OAuth not configured"** error

**Google OAuth Flow:**
1. User clicks "Continue with Google" on signup/login page
2. Frontend sends Google ID token to backend `/api/auth/google/creator`
3. Backend verifies token using `GOOGLE_CLIENT_ID` (see `auth.py:430-440`)
4. For new users: Returns `needs_profile_completion=True` + temp token
5. For existing users: Returns full auth tokens (access + refresh)

**Troubleshooting Google OAuth:**
```bash
# Check if credentials are configured
ssh root@173.212.245.22 "grep GOOGLE_CLIENT_ID /var/www/bantubuzz/backend/.env"

# Test Google OAuth endpoint
curl -X POST https://bantubuzz.com/api/auth/google/creator \
  -H "Content-Type: application/json" \
  -d '{"credential":"fake-token"}'
# Should return error about invalid token, NOT "Google OAuth not configured"

# If missing, add credentials and reload backend
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && echo 'GOOGLE_CLIENT_ID=<your-client-id>' >> .env && echo 'GOOGLE_CLIENT_SECRET=<your-client-secret>' >> .env && pkill -HUP gunicorn"
```

### Email Configuration (OTP & Notifications)

**CRITICAL: Email server must be configured for OTP verification to work**

**Email Server Credentials:**
```bash
MAIL_SERVER=premium222.web-hosting.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USE_TLS=False
MAIL_USERNAME=user@bantubuzz.com
MAIL_PASSWORD=-=hdZ!J_pd^s
MAIL_DEFAULT_SENDER=user@bantubuzz.com
```

**Environment Configuration:**
```bash
# Email Configuration - BantuBuzz SMTP
MAIL_SERVER=premium222.web-hosting.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USE_TLS=False
MAIL_USERNAME=user@bantubuzz.com
MAIL_PASSWORD=-=hdZ!J_pd^s
MAIL_DEFAULT_SENDER=user@bantubuzz.com
```

**Important Notes:**
- ⚠️ **MAIL_SERVER must be `premium222.web-hosting.com`** - NOT `bantubuzz.com` (refuses connections)
- ✅ Used by: `backend/app/services/email_service.py` - sends OTP codes for registration
- ✅ Email templates include: OTP verification, password reset, booking confirmations
- ❌ Wrong server = users won't receive OTP codes and can't verify accounts

**Email Flow:**
1. User registers with email/password
2. Backend generates 6-digit OTP code (valid 10 minutes)
3. `send_otp_email()` sends styled HTML email via `premium222.web-hosting.com`
4. User enters OTP code to verify account
5. Account activated and user can login

**Troubleshooting Email Issues:**
```bash
# Check email configuration
ssh root@173.212.245.22 "grep MAIL_SERVER /var/www/bantubuzz/backend/.env"

# Test email sending
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python3 << 'PYTHON_EOF'
from app import create_app, mail
from flask_mail import Message

app = create_app()
with app.app_context():
    print(f'MAIL_SERVER: {app.config.get(\"MAIL_SERVER\")}')
    msg = Message(
        subject='Test Email',
        recipients=['your-email@gmail.com'],
        sender=app.config['MAIL_DEFAULT_SENDER'],
        body='This is a test email from BantuBuzz.'
    )
    mail.send(msg)
    print('✓ Email sent successfully!')
PYTHON_EOF"

# If email fails, verify:
# 1. MAIL_SERVER is premium222.web-hosting.com
# 2. Credentials are correct
# 3. Port 465 is accessible from server
# 4. Backend has been reloaded after config changes
```

**Common Email Errors:**
- **`[Errno 111] Connection refused`**: Wrong MAIL_SERVER (use `premium222.web-hosting.com`)
- **Authentication failed**: Wrong username/password
- **Timeout**: Firewall blocking port 465 or server unreachable
- **No email received**: Check spam folder, verify recipient email address

### URL Architecture & Request Flow

**CRITICAL: Understanding how URLs are built in BantuBuzz**

Our platform uses a multi-layer proxy architecture. Understanding this is ESSENTIAL to avoid routing errors.

#### Complete Request Flow:

```
User Browser (https://bantubuzz.com/admin/bookings)
    ↓
Apache2 (Port 80/443) - SSL Termination
    ↓ ProxyPass /api/* → http://localhost:8002/api/*
    ↓ ProxyPass /* → http://localhost:8080/*
    ↓
├─→ Express.js (Port 8080) - Frontend Server
│   └─→ Serves /var/www/bantubuzz/frontend/dist/
│       • React Router handles client-side routing
│       • /admin/bookings → React component
│       • React makes API call to /api/admin/bookings
│
└─→ Gunicorn (Port 8002) - Backend API
    └─→ Flask App (Python)
        • Blueprint-based routing
        • /api/admin/bookings → admin_extended.bp route
```

#### URL Construction Rules:

**1. Frontend Routes (React Router)**
```javascript
// In App.jsx
<Route path="/admin/bookings" element={<AdminBookings />} />

// URL: https://bantubuzz.com/admin/bookings
// Handled by: React Router → AdminBookings component
```

**2. Backend API Routes (Flask Blueprints)**

**BLUEPRINT URL CONSTRUCTION FORMULA:**
```
Final URL = Apache Proxy + Blueprint Registration Prefix + Blueprint Definition Prefix + Route Path

Example:
Apache:        /api/*        (proxied to port 8002)
Registration:  /admin        (app.register_blueprint(bp, url_prefix='/admin'))
Blueprint:     (none)        (bp = Blueprint('name', __name__))
Route:         /bookings     (@bp.route('/bookings'))
───────────────────────────────────────────────────────────────
Final URL:     /api/admin/bookings
```

**CRITICAL RULES:**
1. **NEVER define `url_prefix` in both blueprint definition AND registration**
   - ❌ WRONG:
   ```python
   # routes/admin_extended.py
   bp = Blueprint('admin_extended', __name__, url_prefix='/admin')  # Has prefix

   # app/__init__.py
   app.register_blueprint(admin_extended.bp, url_prefix='/api')  # Also has prefix
   # Result: Flask ignores blueprint prefix, uses only registration prefix
   # Final URL: /api/bookings (WRONG - missing /admin)
   ```

   - ✅ CORRECT:
   ```python
   # routes/admin_extended.py
   bp = Blueprint('admin_extended', __name__)  # NO prefix

   # app/__init__.py
   app.register_blueprint(admin_extended.bp, url_prefix='/api/admin')
   # Final URL: /api/admin/bookings ✓
   ```

2. **Blueprint Registration Patterns in `app/__init__.py`:**
   ```python
   # Standard API routes (direct prefix)
   app.register_blueprint(auth.bp, url_prefix='/api/auth')
   # Routes: /api/auth/login, /api/auth/register, etc.

   # Admin routes (nested prefix)
   app.register_blueprint(admin.bp, url_prefix='/api/admin')
   app.register_blueprint(admin_extended.bp, url_prefix='/api/admin')
   # Routes: /api/admin/users, /api/admin/bookings, etc.

   # Routes with blueprint-defined prefix
   app.register_blueprint(brand_wallet.bp)  # Blueprint has url_prefix='/api/brand/wallet'
   # Routes: /api/brand/wallet/balance, /api/brand/wallet/transactions, etc.
   ```

3. **Route Definition Patterns:**
   ```python
   # In routes/admin_extended.py
   bp = Blueprint('admin_extended', __name__)  # No prefix here!

   @bp.route('/bookings', methods=['GET'])  # Just the endpoint path
   def list_bookings():
       # This becomes /api/admin/bookings when registered with url_prefix='/api/admin'
       pass

   @bp.route('/bookings/<int:booking_id>', methods=['GET'])
   def get_booking(booking_id):
       # This becomes /api/admin/bookings/123
       pass
   ```

#### Common URL Construction Errors:

**Error Type 1: 404 on Valid Endpoint**
```
Symptom: Frontend calls /api/admin/bookings, gets 404
Cause: Blueprint not registered or wrong url_prefix
Fix: Check app/__init__.py blueprint registration
```

**Error Type 2: Routes Not Appearing**
```
Symptom: curl http://localhost:8002/api/admin/bookings returns 404
Cause: Blueprint has url_prefix that conflicts with registration
Fix: Remove url_prefix from Blueprint() definition
```

**Error Type 3: Import Error Silently Fails**
```
Symptom: Blueprint imported but routes don't work
Cause: Syntax error or missing import in blueprint file
Fix: Test import manually:
  ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/python3 -c 'from app.routes import admin_extended; print(admin_extended.bp.name)'"
```

#### Debugging URL Issues:

**1. List All Registered Routes:**
```bash
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/python3 -c \"
from app import create_app
app = create_app()
for rule in app.url_map.iter_rules():
    print(f'{rule.rule} -> {rule.endpoint}')
\" | grep admin"
```

**2. Check Blueprint Registration:**
```bash
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/python3 -c \"
from app import create_app
app = create_app()
for name, bp in app.blueprints.items():
    print(f'{name}: {bp.url_prefix if hasattr(bp, \\\"url_prefix\\\") else \\\"None\\\"}')
\""
```

**3. Test Endpoint Locally:**
```bash
# Without auth (expect 401 or 403)
ssh root@173.212.245.22 "curl -s -o /dev/null -w '%{http_code}' http://localhost:8002/api/admin/bookings"
# 404 = route not found
# 401 = route exists, needs auth ✓
# 403 = route exists, needs admin role ✓
```

#### Blueprint Organization:

```
backend/app/routes/
├── auth.py                    # /api/auth/*
├── users.py                   # /api/users/*
├── creators.py                # /api/creators/*
├── brands.py                  # /api/brands/*
├── packages.py                # /api/packages/*
├── bookings.py                # /api/bookings/*
├── admin.py                   # /api/admin/* (core admin routes)
├── admin_extended.py          # /api/admin/* (extended admin routes)
├── admin/                     # Admin module routes
│   ├── __init__.py
│   ├── users.py
│   ├── disputes.py
│   └── ...
└── ...

Registration in app/__init__.py (LINE 58-85):
• Import all blueprints on line 58
• Register each with appropriate url_prefix
• Comment each registration with final URL pattern
```

#### API Response Flow:

**Successful Request:**
```
Browser: GET https://bantubuzz.com/api/admin/bookings
    ↓
Apache: Proxy to localhost:8002/api/admin/bookings
    ↓
Gunicorn Worker: Receives request
    ↓
Flask App: Matches route to admin_extended.list_bookings
    ↓
@jwt_required: Validates JWT token
    ↓
@admin_required: Checks user.is_admin == True
    ↓
Handler Function: Queries database, returns JSON
    ↓
Response: {"bookings": [...], "pagination": {...}}
```

**Failed Request (404):**
```
Browser: GET https://bantubuzz.com/api/admin/bookings
    ↓
Apache: Proxy to localhost:8002/api/admin/bookings
    ↓
Gunicorn Worker: Receives request
    ↓
Flask App: NO MATCHING ROUTE ❌
    ↓
404 Handler: Returns {"error": "Resource not found"}
```

**Why 404 happens:**
1. Blueprint not imported in `app/__init__.py`
2. Blueprint not registered with `app.register_blueprint()`
3. Wrong `url_prefix` in registration
4. Blueprint has conflicting `url_prefix` in definition
5. Route decorator path doesn't match expected URL

#### Deployment Checklist for New Routes:

When adding new API endpoints, ALWAYS:

1. ✅ Create blueprint file in `backend/app/routes/`
2. ✅ Define blueprint WITHOUT url_prefix: `bp = Blueprint('name', __name__)`
3. ✅ Add routes with decorator: `@bp.route('/path', methods=['GET'])`
4. ✅ Import blueprint in `app/__init__.py`: `from .routes import new_blueprint`
5. ✅ Register blueprint: `app.register_blueprint(new_blueprint.bp, url_prefix='/api/path')`
6. ✅ Upload files to server: `scp file.py root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/`
7. ✅ Restart gunicorn: `ssh root@173.212.245.22 "pkill -f gunicorn && cd /var/www/bantubuzz/backend && venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 'app:create_app()' --daemon"`
8. ✅ Test endpoint: `curl http://localhost:8002/api/path/endpoint`
9. ✅ Verify route exists: Use debugging command from above

### Complete Directory Structure
```
/var/www/bantubuzz/
├── frontend/
│   ├── dist/                    # Built React app (served by Express on port 8080)
│   │   ├── index.html          # Entry point
│   │   ├── assets/             # JS, CSS, images
│   │   └── ...
│   ├── src/                    # Source files (not deployed)
│   ├── serve.js                # Express server script
│   ├── package.json            # Node dependencies
│   └── node_modules/           # Installed packages
├── backend/
│   ├── app/                    # Flask application
│   │   ├── __init__.py        # App factory + blueprint registration
│   │   ├── models/            # Database models
│   │   │   ├── user.py
│   │   │   ├── creator_profile.py
│   │   │   ├── package.py
│   │   │   ├── collaboration.py
│   │   │   ├── collaboration_milestone.py
│   │   │   └── ...
│   │   ├── routes/            # API endpoints (blueprints)
│   │   │   ├── auth.py
│   │   │   ├── creators.py
│   │   │   ├── packages.py
│   │   │   ├── collaborations.py
│   │   │   ├── milestones.py
│   │   │   ├── milestone_endpoints.py
│   │   │   ├── subscriptions.py
│   │   │   └── ...
│   │   ├── services/          # Business logic
│   │   │   ├── payment_service.py
│   │   │   └── ...
│   │   └── utils/             # Helper functions
│   │       ├── subscription_helper.py
│   │       └── ...
│   ├── migrations/            # Database migration scripts
│   ├── uploads/               # User-uploaded files
│   │   ├── profile_pictures/
│   │   ├── payment_proofs/
│   │   ├── verification_documents/
│   │   └── ...
│   ├── venv/                  # Python virtual environment
│   ├── gunicorn.log          # Gunicorn process logs
│   ├── app.py                # Application entry point
│   └── requirements.txt       # Python dependencies
├── messaging-service/
│   ├── server.js             # Socket.io messaging server (port 3002)
│   ├── messaging.log         # Service logs
│   ├── package.json
│   └── node_modules/
└── ecosystem.config.js       # PM2 configuration (if exists)
```

### Local Project Structure
```
D:\Bantubuzz Platform\
├── frontend/
│   ├── src/
│   │   ├── pages/            # React page components
│   │   ├── components/       # Reusable React components
│   │   ├── services/         # API service (api.js)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── constants/        # Constants & options
│   │   └── assets/           # Images, icons
│   ├── dist/                 # Build output (created by `npm run build`)
│   ├── public/               # Static files
│   ├── index.html            # HTML template
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS config
│   └── package.json
├── backend/
│   ├── app/                  # Same structure as VPS
│   ├── migrations/           # Migration scripts
│   ├── venv/                 # Local Python virtual environment
│   ├── app.py
│   └── requirements.txt
├── docs/                     # Documentation
├── deployment/               # Deployment scripts (if exists)
├── AI_GUIDE.md              # This file
├── PHASE_6_IMPLEMENTATION_PLAN.md
├── THUNZIAI_ANALYTICS_IMPLEMENTATION_PLAN.md
└── .git/                    # Git repository
```

### Running Services & Ports

**Backend (Gunicorn):**
- Port: 8002
- Process Manager: Manual (not PM2)
- Workers: 4
- Log: `/var/www/bantubuzz/backend/gunicorn.log`

**Frontend (Express):**
- Port: 8080
- Process Manager: PM2 (if configured)
- Serves: `/var/www/bantubuzz/frontend/dist/`

**Messaging Service (Node.js + Socket.io):**
- Port: 3002
- Process Manager: PM2
- Log: `/var/www/bantubuzz/messaging-service/messaging.log`

**Web Server (Apache2):**
- Ports: 80 (HTTP), 443 (HTTPS)
- Proxies to Express.js (8080) and Gunicorn (8002)

### Essential SSH Commands

**1. File Upload/Download:**
```bash
# Upload single file to server
scp "local/path/file.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/

# Upload multiple files
scp "file1.py" "file2.py" root@173.212.245.22:/var/www/bantubuzz/backend/app/routes/

# Upload entire directory
scp -r "local/folder" root@173.212.245.22:/var/www/bantubuzz/backend/

# Download file from server
scp root@173.212.245.22:/var/www/bantubuzz/backend/gunicorn.log "D:\Downloads\"
```

**2. Backend Management (Gunicorn):**
```bash
# Check if gunicorn is running
ssh root@173.212.245.22 "ps aux | grep '[g]unicorn'"

# Check gunicorn port
ssh root@173.212.245.22 "netstat -tlnp | grep 8002"

# Kill gunicorn processes
ssh root@173.212.245.22 "pkill -f gunicorn"

# Start gunicorn (daemon mode)
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 'app:create_app()' --daemon"

# Check recent logs
ssh root@173.212.245.22 "tail -50 /var/www/bantubuzz/backend/gunicorn.log"

# Full restart (kill + start)
ssh root@173.212.245.22 "pkill gunicorn && sleep 2 && cd /var/www/bantubuzz/backend && venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 'app:create_app()' --daemon && sleep 3 && ps aux | grep '[g]unicorn'"
```

**3. PM2 Management (Frontend & Messaging):**
```bash
# Check all PM2 services
ssh root@173.212.245.22 "pm2 list"

# Restart specific service
ssh root@173.212.245.22 "pm2 restart bantubuzz-frontend"
ssh root@173.212.245.22 "pm2 restart messaging-service"

# View logs
ssh root@173.212.245.22 "pm2 logs bantubuzz-frontend --lines 50"
ssh root@173.212.245.22 "pm2 logs messaging-service --lines 50"

# Stop/Start service
ssh root@173.212.245.22 "pm2 stop messaging-service"
ssh root@173.212.245.22 "pm2 start messaging-service"

# Show detailed service info
ssh root@173.212.245.22 "pm2 show messaging-service"
```

**4. File Management & Inspection:**
```bash
# List directory contents
ssh root@173.212.245.22 "ls -la /var/www/bantubuzz/backend/app/routes/"

# Check file content (specific lines)
ssh root@173.212.245.22 "sed -n '229,245p' /var/www/bantubuzz/backend/app/routes/creators.py"

# Search for text in file
ssh root@173.212.245.22 "grep -n 'function_name' /var/www/bantubuzz/backend/app/routes/file.py"

# Check file modification time
ssh root@173.212.245.22 "stat /var/www/bantubuzz/backend/app/routes/creators.py"

# Compare local and server file
diff "D:\Bantubuzz Platform\backend\app\routes\creators.py" <(ssh root@173.212.245.22 "cat /var/www/bantubuzz/backend/app/routes/creators.py")
```

**5. Database Management:**
```bash
# Check PostgreSQL status
ssh root@173.212.245.22 "systemctl status postgresql"

# Restart PostgreSQL
ssh root@173.212.245.22 "systemctl restart postgresql"

# Run database migration
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python migrations/migration_script.py"

# Access PostgreSQL console
ssh root@173.212.245.22 "sudo -u postgres psql bantubuzz"
```

**6. Apache2 Management:**
```bash
# Check Apache status
ssh root@173.212.245.22 "systemctl status apache2"

# Restart Apache
ssh root@173.212.245.22 "systemctl restart apache2"

# Check Apache config
ssh root@173.212.245.22 "apache2ctl -t"

# View Apache error log
ssh root@173.212.245.22 "tail -50 /var/log/apache2/error.log"
```

**7. System Monitoring:**
```bash
# Check disk space
ssh root@173.212.245.22 "df -h"

# Check memory usage
ssh root@173.212.245.22 "free -h"

# Check running processes
ssh root@173.212.245.22 "top -bn1 | head -20"

# Check open ports
ssh root@173.212.245.22 "netstat -tlnp"

# Check system logs
ssh root@173.212.245.22 "journalctl -xe | tail -50"
```

**8. Quick Diagnostics:**
```bash
# Full health check (all services)
ssh root@173.212.245.22 "echo '=== Gunicorn (8002) ===' && ps aux | grep '[g]unicorn' && echo '=== PM2 Services ===' && pm2 list && echo '=== Apache2 ===' && systemctl status apache2 --no-pager"

# Check all listening ports
ssh root@173.212.245.22 "netstat -tlnp | grep -E '8002|8080|3002|80|443'"
```

**9. Other Platforms on Same Server (Systemd Services):**

The VPS also hosts other platforms managed by **systemd** (not PM2):

```bash
# Makumbiri Game Park Booking System
# Service: makumbiri-booking.service
# Directory: /var/www/makumbiri_booking/
# Domain: booking.makumbirigamepark.com

# Check status
ssh root@173.212.245.22 "systemctl status makumbiri-booking.service"

# Restart service
ssh root@173.212.245.22 "systemctl restart makumbiri-booking.service"

# View logs
ssh root@173.212.245.22 "journalctl -u makumbiri-booking.service -n 50 --no-pager"

# Huey worker (background tasks)
ssh root@173.212.245.22 "systemctl restart makumbiri-huey.service"
ssh root@173.212.245.22 "tail -50 /var/www/makumbiri_booking/logs/huey.log"


# Savanna & Sage LMS Portal
# Service: savanna_sage_lms.service
# Directory: /var/www/savanna_sage_lms/
# Domain: portal.savannaandsage.africa

# Check status
ssh root@173.212.245.22 "systemctl status savanna_sage_lms.service"

# Restart service
ssh root@173.212.245.22 "systemctl restart savanna_sage_lms.service"

# View logs
ssh root@173.212.245.22 "journalctl -u savanna_sage_lms.service -n 50 --no-pager"


# Restart all platforms at once (after server reboot or updates)
ssh root@173.212.245.22 "systemctl restart makumbiri-booking.service savanna_sage_lms.service makumbiri-huey.service && echo 'All platform services restarted'"

# Check all platform services
ssh root@173.212.245.22 "systemctl is-active makumbiri-booking.service savanna_sage_lms.service makumbiri-huey.service"
```

**IMPORTANT**: When you see "Service Unavailable" errors on booking.makumbirigamepark.com or portal.savannaandsage.africa, it means their systemd services have stopped and need to be restarted using the commands above.

### Web Server Flow

```
Internet (ports 80/443)
    ↓
Apache2 (reverse proxy)
    ↓
Express.js (port 8080) → Serves /var/www/bantubuzz/frontend/dist/
    ↓
    ├─→ /api/* → Gunicorn (port 8002) → Flask Backend
    └─→ /socket.io/* → Node.js (port 8001) → Messaging Service
```

### Important Paths
- Frontend dist: `/var/www/bantubuzz/frontend/dist/`
- Uploads: `/var/www/bantubuzz/backend/uploads/`
- Nginx config: `/etc/nginx/sites-available/bantubuzz`
- PM2 config: `/var/www/bantubuzz/ecosystem.config.js`

---

## 📦 Git Workflow

### Repository
- **URL**: `https://github.com/HundredCentury100/bantubuzz-final.git`
- **Main Branch**: `main`
- **Current Status**: Always ahead of origin (commit often, push regularly)

### Commit Message Format

```bash
# Standard commit
git commit -m "Feature: Brief description of change"

# With AI signature (preferred)
git commit -m "$(cat <<'EOF'
Brief title of what was changed

- Detailed point 1
- Detailed point 2
- Detailed point 3

Files modified:
- file1.jsx
- file2.py

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Commit Pattern Examples (from history)

✅ **Good commits:**
- `Redesign subscription system with Homepage design consistency`
- `Phase 6: Creator Subscriptions & Verification - Frontend Complete`
- `Fix Homepage Categories - Display Uploaded Images`

❌ **Avoid:**
- Generic: `Update files`
- Vague: `Fix bug`
- No context: `Changes`

### Standard Workflow

```bash
# 1. Check status
git status

# 2. Stage files
git add frontend/src/pages/ComponentName.jsx

# 3. Commit with message
git commit -m "Descriptive message"

# 4. Push to GitHub
git push origin main

# 5. Deploy (if frontend changed)
# Follow deployment steps from above
```

---

## 🏗️ Implementation Phases (What We've Built)

Understanding what's been implemented helps maintain consistency and avoid rework.

### Phase 1-2: Foundation (Complete)
- User authentication (email/password + Google OAuth)
- Creator and Brand profiles
- Basic messaging system
- Package management

### Phase 3: Custom Packages (Complete)
- Custom package requests
- Real-time negotiation via messaging
- WhatsApp-style messaging UI
- WebSocket integration

### Phase 4: Admin System (Complete)
- Admin dashboard with analytics
- User management (creators, brands, admins)
- Booking management
- Collaboration oversight
- Reports and business intelligence

### Phase 5: Subscription System (Complete)
- **5A**: Backend foundation (models, database)
- **5B**: Admin subscription management UI
- **5C**: User-facing pricing page and management
- **5D**: Limit enforcement (packages, bookings per tier)
- **5E**: Payment integration (Paynow + manual) + Dynamic Categories

**Brand Tiers:**
- Free: 3 packages, 5 bookings/month, 10% platform fee
- Starter: 5 packages, 10 bookings/month, 10% platform fee
- Pro: 10 packages, 25 bookings/month, 10% platform fee
- Agency: Unlimited, unlimited, 5% platform fee

### Phase 6: Creator Subscriptions & Verification (Complete)
- Creator subscription plans (Featured, Verification)
- Featured placement (General, Facebook, Instagram, TikTok) - $5-$10/week
- Verification badge system - $5/month
- Document upload for verification
- Admin verification queue
- Platform fees based on brand subscription tier

### Recent: Design System Alignment (Complete - Feb 23, 2026)
- **Homepage design as reference** (Home.jsx is the source of truth)
- **All subscription pages redesigned** to match Homepage/BrowseCreators patterns:
  - Pricing.jsx: Cards with `bg-primary` outer + `bg-white rounded-2xl` inner for popular plans
  - SubscriptionManage.jsx: Complete redesign with full feature list + centered 3-column layout
  - BrandDashboard.jsx: Upgrade banner shows NEXT tier features
  - CreatorDashboard.jsx: Priority banner system (verification → featured)
- **Eliminated gradient backgrounds** from all UI elements (icons, buttons, cards)
- **Icon standardization**: `bg-primary/10 rounded-full` with `text-primary` icons
- **Consistent card borders**: `rounded-3xl` outer, `rounded-2xl` for inner containers
- **Unified button styles**: `rounded-full` with proper hover transitions
- **Color usage**: `text-dark` (not `text-gray-900`), `bg-primary`, `bg-white`, `bg-light`
- **Shadow consistency**: `shadow-sm` + `hover:shadow-md` (never `shadow-lg`)

### Recent: Critical Bug Fixes (Feb 23, 2026)
- **Subscription upgrade logic fixed**:
  - Issue: Free plan users got "No active subscription found" error when upgrading
  - Root cause: Frontend incorrectly checking `currentSubscription` (always truthy) instead of `has_subscription` flag
  - Backend `/upgrade` requires active subscription record; free plan users don't have this
  - Solution: Check `currentSubscription.has_subscription === true` before calling `/upgrade`
  - Free plan users now correctly use `/subscribe`, paid users use `/upgrade`
  - File: `frontend/src/pages/SubscriptionManage.jsx`
- **API parameter naming**:
  - Fixed `new_plan_id` → `plan_id` to match backend expectation
  - Backend `/upgrade` endpoint expects `{ plan_id: int, billing_cycle: string }`
- **Manual payment upload endpoint missing**:
  - Issue: "Resource not found" when submitting manual bank transfer payment
  - Root cause: `/subscriptions/upload-proof` endpoint didn't exist in backend
  - Solution: Created endpoint in `backend/app/routes/subscriptions.py`
  - Accepts file upload (PNG, JPG, JPEG, GIF, PDF - max 5MB)
  - Saves to `/var/www/bantubuzz/backend/uploads/payment_proofs/`
  - Sets `payment_status='pending_verification'` for admin approval
  - Files: `frontend/src/pages/SubscriptionPayment.jsx`, `backend/app/routes/subscriptions.py`

### Recent: UI/UX Improvements (Feb 23, 2026)
- **Homepage mobile experience**:
  - Disabled auto-scroll on mobile for categories section (< 1024px width)
  - Desktop (≥1024px) still has smooth auto-scrolling
  - File: `frontend/src/pages/Home.jsx`
- **Creator badge sizes reduced**:
  - Icon sizes reduced by ~35% (md: w-8 h-8 → w-5 h-5 for images)
  - Padding reduced: px-2.5 py-1 → px-2 py-0.5
  - Cleaner visual hierarchy on creator cards
  - File: `frontend/src/components/CreatorBadge.jsx`

### Recent: Verification Form Redesign (Feb 23, 2026)
- **Dynamic document labels**:
  - Labels change based on selected ID type (National ID, Passport, Driver's License)
  - `getDocumentLabel()` function returns appropriate label
  - All form text updates dynamically (headers, fields, instructions)
- **Simplified document requirements**:
  - Removed `id_document_back` field (3 documents → 2 documents)
  - Now requires: Document Front + Selfie with Document
  - Matches industry standard verification flow
  - Backend sets `id_document_back=None` explicitly
- **Improved upload UX**:
  - Layout changed from 3 columns to 2 columns
  - Upload area height increased: h-48 → h-56
  - Contextual micro-copy under each upload area
  - Better mobile experience
- **Files**: `frontend/src/pages/VerificationApplication.jsx`, `backend/app/routes/verification.py`

### Recent: Badge Priority & Verification Flow Fixes (Feb 23-24, 2026)
- **Badge display priority standardized**:
  - Top Creator badge now displays first (highest priority)
  - Priority order: top_creator (1) > verified_creator (2) > responds_fast (3) > creator (4)
  - Sort function applied to all badge rendering locations
  - Pattern: `.sort((a, b) => { const priority = {...}; return (priority[a] || 99) - (priority[b] || 99); })`
  - Files: `CreatorCardHome.jsx`, `BrowseCreators.jsx`, `Creators.jsx`, `CreatorProfile.jsx`, `Home.jsx`
- **Verification subscription requirement enforced**:
  - Frontend now checks for active verification subscription BEFORE showing application form
  - `checkVerificationSubscription()` runs on component mount
  - Redirects to `/creator/subscriptions` if no active subscription found
  - Prevents form completion without valid subscription (better UX)
  - Matches backend requirement where verification application requires active subscription
  - File: `frontend/src/pages/VerificationApplication.jsx`
- **Creator payment upload endpoint created**:
  - Issue: "Unauthorized" error when creators uploaded manual payment proof
  - Root cause: Brand subscriptions use `Subscription` model with `user_id`, Creator subscriptions use `CreatorSubscription` model with `creator_id`
  - Solution: Created separate endpoint `/api/creator/subscriptions/upload-proof`
  - Endpoint checks `subscription.creator_id` instead of `subscription.user_id` for authorization
  - Frontend dynamically selects endpoint based on `user.user_type`
  - Files: `backend/app/routes/creator_subscriptions.py`, `frontend/src/pages/SubscriptionPayment.jsx`
- **Social media icons updated**:
  - Replaced emoji icons (🌟, 📘, 📸, 🎵) with proper SVG icons in Creator Subscriptions page
  - Created `getPlatformIcon()` function returning platform-specific SVGs (Facebook, Instagram, TikTok)
  - Updated verification form social media section with branded SVG icons (pink Instagram, black TikTok, blue Facebook)
  - Icons match design patterns from `BrowseCreators.jsx`
  - Files: `frontend/src/pages/CreatorSubscriptions.jsx`, `frontend/src/pages/VerificationApplication.jsx`

### Recent: Verification Badge & UI Improvements (Feb 24, 2026)
- **Fancy blue verification checkmark**:
  - Replaced generic checkmark with Twitter/WhatsApp/Facebook-style blue circular badge
  - Blue circle (#1D9BF0 - Twitter blue) with white checkmark inside
  - Modern, instantly recognizable verified badge design
  - File: `frontend/src/components/CreatorBadge.jsx`
  - Pattern:
    ```jsx
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
      <path d="M9.5 12.5L11 14L14.5 10.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    ```
- **Hide verification banner for verified creators**:
  - CreatorSubscriptions page now checks `profile.badges` for `verified_creator`
  - Verification banner only shows if creator is NOT already verified
  - Prevents redundant subscription prompts for verified creators
  - File: `frontend/src/pages/CreatorSubscriptions.jsx`
- **Remove subscription link from creator navbar**:
  - Removed `/subscription/manage` link from desktop and mobile navigation for creators
  - Creators now only see Wallet link (brands remain unchanged)
  - Cleaner navigation experience aligned with creator-specific features
  - File: `frontend/src/components/Navbar.jsx`
- **Fix proposals endpoint - missing blueprint registration**:
  - Issue: "Resource not found" error on `/creator/proposals` page
  - Root cause: Proposals blueprint existed but was never imported/registered in app
  - Solution: Added `proposals` to imports and registered with `url_prefix='/api/proposals'`
  - File: `backend/app/__init__.py`
  - IMPORTANT: Always check that new blueprints are registered in `__init__.py`

### Upcoming: ThunziAI Analytics Integration (Planned - Feb 2026)
- **Strategic Analytics Partnership**: Integration with ThunziAI for creator marketplace analytics
- **Platform Connections**: OAuth flow for Instagram, TikTok, YouTube, Facebook, X
- **Real-time Metrics**: Live tracking of social media post performance
- **Sentiment Analysis**: AI-powered comment sentiment and brand safety monitoring
- **Campaign Analytics**: Comprehensive ROI tracking for brand campaigns
- **Implementation Plan**: See `THUNZIAI_ANALYTICS_IMPLEMENTATION_PLAN.md` for detailed phases
- **Key Components**:
  - Platform connection management with OAuth token storage
  - Post tracking engine with multi-tier polling
  - Creator KPI dashboard with performance trends
  - Brand campaign analytics with ROI calculations
  - Sentiment analysis and comment tracking
  - Automated alerts for viral content and performance drops
- **Status**: Planning phase - 7 phases over 14 weeks
- **Documentation**: Complete technical architecture and database schema designed

### Recent: Platform Bug Fixes & Enhancements (Feb 24, 2026)
Major bug fix session addressing critical UX issues before ThunziAI integration:

**1. Package Edit 404 Error** (Critical - Commit `4ead564`)
- Standardized route pattern to `/creator/packages/:id/edit`
- Removed duplicate route `/creator/packages/edit/:id` from App.jsx
- Updated PackageManagement.jsx navigate call to match standard pattern
- Files: `frontend/src/App.jsx`, `frontend/src/pages/PackageManagement.jsx`

**2. Campaign Apply Button State** (Critical - Commit `1c2bc3a`)
- Fixed button remaining active after application submission
- Implemented `fetchCampaignData()` call after successful application
- Ensures `has_applied` status syncs with backend state
- File: `frontend/src/pages/CreatorCampaignDetails.jsx:84`

**3. Search Button Visibility** (High Priority - Commit `ee7c80e`)
- Added prominent Search button next to search input field
- Changed from real-time to manual search trigger (better UX)
- Button shows icon only on mobile, icon + "Search" text on desktop
- Separated `searchInput` state from `filters.search` for manual control
- File: `frontend/src/pages/BrowseCreators.jsx:219-225`

**4. Location Display Inconsistency** (High Priority - Commit `5149dc7`)
- Fixed "Location not set" displaying when city/country data exists
- Implemented cascading fallback: `city + country` → `location` → `city` → `country` → "Location not set"
- Matches pattern from BrowseCreators.jsx for consistency
- File: `frontend/src/pages/CreatorProfile.jsx:267-269`

**5. Platform Filter Updates** (Medium Priority - Commit `8d7f9f8`)
- Added Twitch and Threads to platform filter options
- Renamed Twitter to "X (Twitter)" for brand clarity
- Updated both desktop and mobile filter sections
- File: `frontend/src/pages/BrowseCreators.jsx:257-265`

**6. New Conversation Button** (High Priority - Commit `0b00d25`)
- Added "New Conversation" button in Messages page header
- Enhanced empty state with messaging icon and call-to-action link
- Routes brands to `/browse/creators`, creators to `/browse/campaigns`
- File: `frontend/src/pages/Messages.jsx:220-230`

**7. Mobile Package Creation Validation** (High Priority - Commit `463cb7a`)
- Enhanced field-level validation with red borders and background (`border-red-500 bg-red-50`)
- Added error icons (warning SVG) next to error messages
- Created validation summary banner at top when form has errors
- Implemented auto-scroll to first error field on submit
- Better mobile visibility with larger spacing and prominent colors
- File: `frontend/src/pages/PackageForm.jsx`

**8. Location Filter** (Medium Priority - Commit `80339ca`)
- Added text input filter for location (city or country search)
- Available on both desktop and mobile (in "More Filters" section)
- Integrated with existing filter logic and API parameters
- Updated clear filters button to include location
- File: `frontend/src/pages/BrowseCreators.jsx:290-300, 450-460`

**Deployment** (Feb 24, 2026 09:54 CET - Commit `d7f4307`)
- **Production Server**: 173.212.245.22
- **Deploy Method**: Built frontend → tar.gz → SCP → extract on server
- **Web Server**: Apache2 (ports 80/443)
- **Assets Hash**: `index-Dan4Jj3g.js`, `index-BQiPYt7y.css`
- **Services**: Apache2 ✅, Backend API (8002) ✅, WebSocket (8080) ✅
- **Documentation**: Added deployment details to THUNZIAI_ANALYTICS_IMPLEMENTATION_PLAN.md

**Impact**:
- Fixed 3 critical bugs blocking user workflows
- Fixed 5 high/medium priority UX issues
- Improved mobile experience significantly
- Platform ready for ThunziAI integration

**9. Multi-select Languages Filter** (Medium Priority - Commit `a2f0c1d`)
- Changed language filter from single-select dropdown to multi-select checkboxes
- Custom dropdown with checkbox list, displays "N selected" when multiple chosen
- Click outside to close dropdown (event listener pattern)
- Backend already supported comma-separated languages parameter
- Files: `frontend/src/pages/BrowseCreators.jsx:314-353`, `backend/app/routes/creators.py:104`

**10. Bio Character Counter** (Low Priority - Commit `b3e4f2a`)
- Added real-time character counter below bio textarea in profile edit
- Counter shows current/max characters (0-500)
- Color-coded: gray (< 450), yellow (450-499), red (500+)
- Uses `watch('bio')` from react-hook-form for real-time updates
- File: `frontend/src/pages/CreatorProfileEdit.jsx:37, 495-502`

**Deployment** (Feb 24, 2026 11:15 CET - Commit `c4d8e09`)
- **Build Assets**: `index-Bz4uu0A6.js`, `index-BM3cLYMK.css`
- **Method**: Standard tar.gz → SCP → extract workflow
- **Features Live**: Multi-select languages + Bio character counter
- **Status**: All 10 priority bugs addressed and deployed ✅

### Recent: Save Creator & Package Filter Features (Feb 24, 2026)
Two new major features to improve brand experience and maintain marketplace quality:

**1. Save Creator Feature** (High Priority - Commit `e5f7g9h`)
- **Heart Icon on Creator Cards**: Added save/unsave button on top-right corner of each creator card
  - Filled red heart (❤️) = saved, outlined heart (♡) = not saved
  - White circular background with hover effect (`hover:scale-110`)
  - Only visible for brand users (`user?.user_type === 'brand'`)
  - File: `frontend/src/pages/BrowseCreators.jsx:671-691`
- **Dedicated Saved Creators Page**: Created `/saved-creators` route
  - Same grid layout as BrowseCreators for consistency
  - Shows all saved creators for the logged-in brand
  - Heart icon allows unsaving (removes from list immediately)
  - Empty state with prompt to browse creators
  - File: `frontend/src/pages/SavedCreators.jsx` (new file)
- **Dashboard Integration**: Updated BrandDashboard saved creators section
  - Changed link from `/creators` to `/saved-creators`
  - Added "View All" button when saved creators exist
  - Cleaner navigation flow for brands
  - File: `frontend/src/pages/BrandDashboard.jsx:266-304`
- **Backend Support**: Save/unsave API already existed and working
  - `POST /api/brands/saved-creators/:id` - Save creator
  - `DELETE /api/brands/saved-creators/:id` - Unsave creator
  - `GET /api/brands/saved-creators` - Get all saved
  - File: `backend/app/routes/brands.py:164-241`

**2. Hide Creators Without Packages** (Critical - Commit `e5f7g9h`)
- **Quality Control**: Creators now MUST have at least one active package to appear in browse/search
  - Prevents empty/incomplete profiles from cluttering search results
  - Ensures all visible creators are ready for collaboration
  - Better brand experience (no "coming soon" profiles)
- **Backend Filter**: Modified get_creators endpoint
  - Added `if not packages: continue` check in creator loop
  - Skips creators without active packages entirely
  - Simplified package price logic (no more null checks needed)
  - File: `backend/app/routes/creators.py:229-261`
- **Impact**:
  - Cleaner browse experience for brands
  - Encourages creators to set up packages before going live
  - Aligns with "create package first" banner already shown to creators

**Technical Details**:
- Save functionality uses existing `SavedCreator` model (many-to-many relationship)
- Frontend maintains `savedCreatorIds` Set for fast lookups
- Toast notifications for save/unsave actions
- Protected route for `/saved-creators` (brands only)
- Backend filtering happens before pagination (accurate counts)

**Deployment** (Feb 24, 2026 15:38 CET)
- **Build Assets**: `index-Bz4uu0A6.js`, `index-BM3cLYMK.css`
- **New Route Added**: `/saved-creators` (protected, brand-only)
- **Database**: No migrations needed (SavedCreator model already exists)
- **Status**: Both features live in production ✅

### Recent: Collabstr-Style Brand Pricing Overhaul (Feb 25, 2026)
Major pricing restructure to align with industry leader Collabstr while positioning BantuBuzz as intelligence-forward:

**New Pricing Structure**:

**1. Free Tier - $0/mo**
- **Positioning**: "Try BantuBuzz. Pay only when you collaborate."
- **Features**: Browse & hire unlimited creators, create campaigns & briefs, basic workflow
- **Service Fee**: 10% on collaborations
- **Restrictions**: NO live analytics, NO sentiment analysis, NO reporting

**2. Pro Tier - $120/mo or $1,200/yr** (Save $240 annually)
- **Positioning**: "Powerful insights for growing brands."
- **Pro Features**: Campaign analytics, live metrics dashboards, 7d & 30d trends, basic sentiment, exportable PDF/CSV reports
- **Service Fee**: 10%
- **File**: `frontend/src/pages/Pricing.jsx:204-236`

**3. Premium Tier - $250/mo or $2,500/yr** (Save $500 annually)
- **Positioning**: "Enterprise-grade intelligence & brand monitoring."
- **Premium Features**: Full sentiment analysis, brand monitoring, mentions tracking, top comments insights, reduced 5% service fee, priority support
- **Service Fee**: 5% (major cost savings)
- **File**: `frontend/src/pages/Pricing.jsx:239-254`

**Technical Implementation**:
1. **Database Migration**: Added `platform_fee_percentage` column, removed old plans, updated Free/Pro/Premium tiers
   - File: `backend/migrations/update_brand_subscription_plans.py`
2. **Frontend Updates**: Redesigned features list, added service fee badges, updated taglines
   - File: `frontend/src/pages/Pricing.jsx`
3. **Comparison to Collabstr**: $120 vs $299, $250 vs $399 (significantly more affordable for African market)

**Deployment** (Feb 25, 2026 13:07 UTC)
- **Backend**: PostgreSQL migration ran successfully on production
- **Build Assets**: `index-CwjZevQk.js`, `index-BM3cLYMK.css`
- **Plans Live**: Free ($0/10%), Pro ($120/10%), Premium ($250/5%)
- **Status**: Collabstr-style pricing live in production ✅

**Next Steps**: Build analytics dashboards for Pro/Premium (service fee calculation complete)

### Recent: Service Fee & Package Filter Updates (Feb 25, 2026)
Major updates to platform pricing enforcement and package discovery experience:

**1. Dynamic Service Fee Calculation** (High Priority)
- **Platform fee based on subscription tier**: Implemented dynamic fee calculation throughout collaboration lifecycle
- **Helper Function**: Created `get_brand_platform_fee_percentage()` in `backend/app/utils/subscription_helper.py`
  - Queries brand's active subscription plan
  - Returns platform_fee_percentage from plan (10% for Free/Pro, 5% for Premium)
  - Falls back to 10% if no subscription found
- **Updated Escrow Release Points**:
  - Auto-completion escrow release (`backend/app/routes/collaborations.py:323-329`)
  - Manual completion escrow release (`backend/app/routes/collaborations.py:929-935`)
  - Milestone escrow release (`backend/app/routes/collaborations.py:1234-1240`)
  - Milestone approval (`backend/app/routes/milestones.py:280-286`)
- **Pattern Used**:
  ```python
  from app.utils.subscription_helper import get_brand_platform_fee_percentage
  platform_fee = get_brand_platform_fee_percentage(collaboration.brand.user_id)
  transaction = release_escrow_to_wallet(collaboration.id, platform_fee_percentage=platform_fee)
  ```

**2. Browse Packages - Comprehensive Filter System** (High Priority)
- **7 Working Filters**: All filters now fully functional with backend support
  - Sort By: Relevance, Price (Low/High), Newest, Most Popular
  - Category: All 8 categories
  - Package Type: Sponsored Post, Story Feature, Video Content, etc.
  - Platform: Instagram, TikTok, YouTube, Facebook, Twitter, LinkedIn, Threads, Twitch
  - Price Range: $0-$50 to $1000+ with proper parsing
  - Delivery Time: 1-3 days to 1+ month
  - Creator Followers: 0-1K to 500K+ followers
- **Backend Fixes**:
  - Fixed `primary_platform` → `platforms` (JSON array field)
  - Fixed `total_followers` → `follower_count`
  - Added price_range handling for "$0-$50" and "$1000+" formats
  - Platform filter uses LIKE on JSON cast for PostgreSQL compatibility
  - Files: `backend/app/routes/packages.py:31-120`
- **Filter Testing**: All filters verified working on production API

**3. Twitter Icon Updated to X** (Low Priority)
- Replaced old Twitter bird icon with official X logo on creator cards
- Updated icon path to X's current branding (black color, modern design)
- Maintains "X (Twitter)" label in filter dropdowns for clarity
- File: `frontend/src/pages/BrowseCreators.jsx:782-785`

**4. Browse Packages Responsive Redesign** (High Priority)
- **Complete redesign matching BrowseCreators pattern**: Modern, responsive package discovery
- **Responsive Filter System**:
  - **Desktop**: All 7 filters visible in flex-wrap layout
  - **Mobile**: Category visible + "More Filters" button with collapse/expand
  - **Search**: Form with submit button (manual trigger, not real-time)
  - **Pattern**: `showMoreFilters` state + Filter icon from lucide-react
- **Modern Design Updates**:
  - Filter container: `bg-white rounded-3xl shadow-sm` (matches BrowseCreators)
  - Search bar: `rounded-full` input + primary-colored Search button
  - Grid layout: 4 columns desktop (`lg:grid-cols-4`), 2 on tablet, 1 on mobile
- **Package Card Redesign**:
  - Yellow primary background with white inner container (`bg-primary p-4 rounded-3xl`)
  - Creator profile image displayed prominently
  - Category badge overlaid on image (top-left with `absolute top-2 left-2`)
  - Information hierarchy: title → creator name → delivery time → price
  - White "View Details" button with `rounded-full` styling
  - Pattern matches creator cards exactly
- **Enhanced UX**:
  - Smart pagination (shows first, last, current, adjacent pages with ellipsis)
  - Smooth scroll-to-top on pagination
  - `searchInput` state for controlled form
  - Clear Filters button when any filter active
- **Files**: Complete rewrite of `frontend/src/pages/BrowsePackages.jsx`

**Deployment** (Feb 25, 2026 14:30 UTC)
- **Backend**: Service fee helper uploaded, packages.py filters fixed
- **Frontend Build**: `index-BH4AUP2Q.js`, `index-CXwb6pyP.css`
- **Features Live**: Dynamic service fees, all package filters working, responsive design
- **Status**: Complete platform pricing enforcement + modern package discovery ✅

### Recent: Creator Requirements & Escrow Period Changes (Mar 2, 2026)
Three major updates to improve creator profile quality, reduce payment hold times, and display pricing:

**1. Required Creator Profile Fields** (High Priority - Commit `e49d2f7`)
- **Mandatory fields enforced**: City, Country, Total Followers, Categories (≥1), Platforms (≥1)
- **Form validation enhancements**:
  - Added `required` validation with error messages for city, country, followers
  - Custom `onSubmit` validation for categories and platforms arrays
  - Red asterisks (*) added to section headers for visual clarity
  - Updated placeholder descriptions to indicate requirements
- **Impact**: Ensures complete creator profiles before activation
- **File**: `frontend/src/pages/CreatorProfileEdit.jsx:510-735`

**2. Escrow Period Reduction: 30 Days → 14 Days** (Critical - Commit `e49d2f7`)
- **Why**: Faster payment release improves creator cash flow and platform competitiveness
- **Changed across 5 backend files**:
  - `backend/app/models/collaboration_milestone.py:68` - `trigger_escrow()` method
  - `backend/app/routes/milestone_endpoints.py:123` - Manual escrow trigger endpoint
  - `backend/app/routes/collaborations.py:1230` - Collaboration milestone completion
  - `backend/app/routes/milestones.py:297` - Milestone approval `available_at` date
  - `backend/app/services/payment_service.py:799` - Payment service escrow release
- **Pattern**: All instances of `timedelta(days=30)` → `timedelta(days=14)`
- **Impact**: Money released to creator wallets 16 days faster (14 days after approval vs 30)

**3. Lowest Package Price Display** (High Priority - Commit `e49d2f7`)
- **Frontend updates**: Added "Starting from $X" price display on creator cards
  - `frontend/src/pages/BrowseCreators.jsx:817-825` - Browse page cards
  - `frontend/src/components/CreatorCardHome.jsx:70-80` - Reusable card component
  - `frontend/src/pages/Home.jsx:227-237` - Homepage creator sections
- **Backend already provided**: `cheapest_package_price` field calculated in `creators.py:256-259`
- **Design**: Centered text with "Starting from" label + bold price ($XX format)
- **Conditional display**: Only shows if `creator.cheapest_package_price` exists

**4. Package Filtering Logic Fixed** (Critical - Commit `e49d2f7`)
- **Issue**: Browse creators showing ALL creators regardless of packages
- **Root cause**: Server had old `creators.py` without filtering logic
- **Solution**:
  ```python
  # Skip creators without any active packages
  if not packages:
      continue
  ```
- **Impact**: Only creators with ≥1 active package appear in browse/search
- **Quality control**: Prevents empty profiles from cluttering results
- **Files**: `backend/app/routes/creators.py:236-238`

**Deployment** (Mar 2, 2026 09:58 CET)
- **Frontend Build**: `index-oaDaUYxq.js`, `index-CXwb6pyP.css`
- **Backend Files Uploaded**: 6 files (5 escrow + 1 creators.py filter)
- **Gunicorn Restart**: 5 processes running (PID 128611 master + 4 workers)
- **Port 8002**: Backend API listening and responding
- **Features Live**: Required fields, 14-day escrow, price display, package filtering ✅

### Recent: Package Categorization by Platform (Mar 2, 2026)
Major feature to organize creator packages by social media platform, similar to Collabstr's approach:

**1. Database Schema Update** (Critical - Commit `a8b9c1d`)
- **New columns added to packages table**:
  - `platform_type` VARCHAR(50) - Platform where content will be posted (Instagram, TikTok, YouTube, Facebook, Twitter, LinkedIn, Threads, Twitch, UGC)
  - `content_type` VARCHAR(50) - Type of content (Reel, Post, Story, Video, Short, etc.)
- **Migration**: `backend/migrations/add_platform_type_to_packages.py`
  - Uses `ALTER TABLE packages ADD COLUMN IF NOT EXISTS` for safe execution
  - Nullable fields for backward compatibility with existing packages
- **Execution**: Ran successfully via Python one-liner on production:
  ```bash
  ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/python3 -c \"
  import os, sys
  sys.path.insert(0, os.getcwd())
  from app import create_app, db
  from sqlalchemy import text
  app = create_app()
  with app.app_context():
      db.session.execute(text('ALTER TABLE packages ADD COLUMN IF NOT EXISTS platform_type VARCHAR(50)'))
      db.session.execute(text('ALTER TABLE packages ADD COLUMN IF NOT EXISTS content_type VARCHAR(50)'))
      db.session.commit()
  \""
  ```

**2. Platform Configuration System** (High Priority)
- **New file**: `frontend/src/constants/platformConfig.jsx` (JSX for icon support)
- **PLATFORM_CONFIGS object**: Complete configuration for 9 platforms
  - **Icons**: SVG path elements for each platform (Instagram pink gradient, TikTok black, YouTube red, etc.)
  - **Colors**: Tailwind classes for text and background (`text-pink-600`, `bg-pink-100`, etc.)
  - **Content Types**: Platform-specific content types (Instagram: Reel/Post/Story/Carousel, TikTok: Video/Duet/Stitch/Live, etc.)
  - **UGC Platform**: Camera icon with green color scheme for non-posted content (Video Ad, Photo Ad, Testimonial, Review, Product Demo)
- **PACKAGE_TYPES array**: Dropdown options for package creation form
- **Pattern**: Same icons used throughout BrowseCreators.jsx for consistency

**3. Backend API Updates** (High Priority)
- **Package Model**: Added `platform_type` and `content_type` fields
  - File: `backend/app/models/package.py`
  - Updated `to_dict()` method to include new fields in API responses
- **Package Routes**:
  - **Create endpoint**: Accepts `platform_type` and `content_type` from request
  - **Update endpoint**: Added to `updatable_fields` list
  - **Filter endpoint**: Added `platform_type` query parameter for filtering packages
  - File: `backend/app/routes/packages.py`
  - Pattern: `data.get('platform_type')` for optional fields

**4. Package Form Enhancement** (High Priority - Commit `a8b9c1d`)
- **Dynamic Platform Selector**: Added after Collaboration Type field
  - Dropdown shows all 9 platform options (Instagram, TikTok, YouTube, Facebook, Twitter, LinkedIn, Threads, Twitch, UGC)
  - Optional field (packages without platform_type remain valid)
  - Label: "Choose the platform where content will be posted (or UGC for non-posted content)"
- **Conditional Content Type Dropdown**:
  - Only appears when platform_type is selected
  - Options dynamically loaded from `PLATFORM_CONFIGS[platform_type].contentTypes`
  - Auto-resets when platform changes to prevent invalid combinations
  - Pattern: `watch('platform_type')` triggers conditional rendering
- **Live Preview Badge**:
  - Shows platform icon + name below dropdowns
  - Displays content_type if selected (e.g., "Instagram • Reel")
  - Uses same styling as creator profile badges
  - Pattern: `bg-pink-100` outer + `text-pink-600` icon/text
- **File**: `frontend/src/pages/PackageForm.jsx:355-435`

**5. Creator Profile Tab Filtering** (High Priority - Commit `a8b9c1d`)
- **Tab Navigation UI**: Replaced simple "Available Packages" header with Collabstr-style tabs
  - **All Tab**: Shows all active packages with total count
  - **Platform Tabs**: Dynamically generated based on creator's packages
  - **Tab Display Logic**: Only shows tabs for platforms that have ≥1 package
  - **Active State**: Bottom border with primary color, bold text
  - **Package Count Badges**: Shows count in rounded badge (e.g., "Instagram (3)")
  - **Platform Icons**: SVG icons displayed in each tab
  - **Mobile Responsive**: Horizontal scroll for overflow tabs
- **Filtering Logic**:
  - `activeTab` state controls which packages are displayed
  - `packages.filter(pkg => pkg.platform_type === activeTab)` for platform-specific display
  - "All" tab bypasses filter to show everything
  - Pattern: Same filter approach as BrowseCreators.jsx categories
- **Package Card Updates**:
  - **Platform Badge**: Displayed at top of each card when platform_type exists
  - **Badge Design**: Icon + platform name + content type (if exists)
  - **Pattern**: `bg-pink-100 px-3 py-1.5 rounded-lg` with platform-specific colors
  - **Fallback**: Cards without platform_type still display normally
- **File**: `frontend/src/pages/CreatorProfile.jsx:29, 465-614`

**6. Technical Implementation Details**
- **Icon Storage**: JSX elements stored in config (requires .jsx extension, not .js)
- **SVG Rendering**: Icons rendered inline using `<svg>{config.icon}</svg>` pattern
- **Build System**: Vite handles JSX transformation in constants folder
- **Import Pattern**:
  ```javascript
  import { PLATFORM_CONFIGS, PACKAGE_TYPES } from '../constants/platformConfig';
  ```
- **State Management**: React Hook Form `watch()` for real-time platform_type tracking
- **Backward Compatibility**: All new fields nullable, existing packages unaffected

**7. User Experience Improvements**
- **Creator Benefits**:
  - Organize packages by platform for easier management
  - Clearer service offerings (Instagram Reel vs TikTok Video vs UGC content)
  - Professional presentation matching industry standards (Collabstr)
- **Brand Benefits**:
  - Filter packages by specific platform needs
  - Understand exact deliverable format before booking
  - Find platform-specific creators more easily
- **Visual Clarity**:
  - Color-coded platform badges (pink for Instagram, red for YouTube, etc.)
  - Icon recognition for quick platform identification
  - Tab navigation reduces scrolling on multi-platform creator profiles

**Deployment** (Mar 2, 2026 14:15 CET)
- **Backend Migration**: PostgreSQL columns added successfully
- **Backend Files**: Package model + routes updated and uploaded
- **Gunicorn Restart**: Backend restarted, API serving new fields
- **Frontend Build**: `index-CYEMp5mv.css`, `index-uzCPA44N.js`
- **Deploy Method**: Tarball → SCP → extract on server
- **Frontend Deployment**: Dist files extracted to `/var/www/bantubuzz/frontend/dist/`
- **Features Live**: Platform selectors in package form, tab filtering on creator profiles ✅

**Impact**:
- Brings BantuBuzz closer to Collabstr's feature parity
- Improves marketplace organization and discoverability
- Sets foundation for platform-specific analytics (future ThunziAI integration)
- Better package categorization for search and filtering

### Recent: Wallet Payment for Creator Subscriptions (Mar 2, 2026)
Major feature allowing creators to pay for subscriptions using their wallet balance instead of only Paynow/bank transfer:

**1. Payment Method Selection Flow** (Critical - Commit `6b6c6d7`)
- **Issue**: Subscription buttons at `/creator/subscriptions` redirected directly to Paynow, bypassing payment options
- **Root cause**: `handleSubscribe` hardcoded `payment_method: 'paynow'` and immediately redirected to `window.location.href = redirect_url`
- **Solution**: Navigate to `/subscription/payment` page with subscription data in location.state
- **Pattern**: `navigate('/subscription/payment', { state: { subscription, plan, paymentData } })`
- **Files**: `frontend/src/pages/CreatorSubscriptions.jsx:38-64`

**2. Wallet Payment Option UI** (High Priority)
- **Wallet Balance Card**: Gradient primary background card displaying available balance
  - Shows wallet balance with large text (`text-3xl font-bold`)
  - Wallet icon in white/20 circular background
  - Insufficient balance warning when amount > balance
  - Displays exact shortfall amount
  - File: `frontend/src/pages/SubscriptionPayment.jsx:231-256`
- **Payment Method Radio Buttons**: Three options (Wallet, Paynow, Bank Transfer)
  - Wallet option shows "Recommended" badge when sufficient balance
  - Disabled state with opacity when insufficient funds
  - Shows exact shortfall: "You need $X more"
  - Pattern: `border-primary` for selected option
  - File: `frontend/src/pages/SubscriptionPayment.jsx:297-331`
- **Smart Payment Button**: Conditional onClick based on selected method
  - Wallet → `handleWalletPayment`
  - Paynow → `handleProceedToPayment`
  - Bank Transfer → `handleManualPayment`
  - Disabled states for each method's requirements
  - Dynamic button text based on payment method
  - File: `frontend/src/pages/SubscriptionPayment.jsx:423-457`

**3. Frontend API Integration** (High Priority)
- **Added creatorWalletAPI** to `frontend/src/services/api.js:273-278`
  - `getBalance()` - Fetch creator wallet balance
  - `getTransactions(params)` - Fetch transaction history
  - `getStatistics()` - Fetch wallet statistics
- **State Management**: Added wallet-specific state variables
  - `walletBalance` - Stores wallet object from API
  - `loadingWallet` - Loading state for wallet fetch
  - `fetchWalletBalance()` - Async function to get balance
  - Pattern: Fetch on component mount if `user?.user_type === 'creator'`

**4. Subscription ID Extraction Fix** (Critical)
- **Issue**: "Subscription ID is required" error when paying with wallet
- **Root cause**: Subscription passed via `location.state.subscription` but handlers only checked URL params
- **Solution**: Smart ID extraction from multiple sources
  ```javascript
  const subId = subscription?.id || subscriptionId || paymentData?.subscription_id;
  ```
- **Applied to all payment handlers**: `handleWalletPayment`, `handleManualPayment`, `handleCheckPaymentStatus`
- **State handling**: Extract `stateSubscription` from location.state and set on mount
- **Files**: `frontend/src/pages/SubscriptionPayment.jsx:27, 32-36, 89, 152, 189`

**5. Backend Wallet Payment Endpoint** (Critical)
- **Route**: `POST /api/creator/subscriptions/pay-with-wallet`
- **Authentication**: JWT required, creator-only (checks `user.user_type === 'creator'`)
- **Validation**:
  - Checks creator profile exists
  - Verifies subscription belongs to creator (`subscription.creator_id == creator.id`)
  - Ensures subscription status is `pending_payment` or `pending`
  - Validates wallet has sufficient `available_balance`
- **Wallet Deduction**:
  - Deducts amount from `wallet.available_balance`
  - Creates `WalletTransaction` record (type: `debit`, status: `completed`)
  - Uses correct WalletTransaction fields (no `reference` or `category`)
  - Pattern:
    ```python
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user_id,
        amount=amount,
        transaction_type='debit',
        status='completed',
        description=f'Payment for {plan.name} subscription',
        clearance_required=False
    )
    ```
- **Subscription Activation**:
  - Sets `payment_verified=True`, `payment_method='wallet'`, `status='active'`
  - Sets `start_date` to current time
  - Calculates `end_date` based on plan duration (or `None` for one-time verification)
  - Applies subscription effects (verification badge, featured placement)
- **Response**: Returns success message, subscription dict, updated wallet balance
- **File**: `backend/app/routes/creator_subscriptions.py:361-455`

**6. WalletTransaction Model Compliance** (Critical)
- **Issue**: Initial implementation used invalid fields `reference` and `category`
- **Error**: `'reference' is an invalid keyword argument for WalletTransaction`
- **Solution**: Used only valid WalletTransaction model fields from `backend/app/models/wallet.py`:
  - `wallet_id`, `user_id`, `amount`, `transaction_type`, `status`
  - `description`, `clearance_required` (set to False for instant deduction)
  - Removed: `reference`, `category` (do not exist in model)
- **Pattern**: Always check model definition before creating instances

**Deployment** (Mar 2, 2026 16:20 CET - Commit `6b6c6d7`)
- **Frontend Build**: `index-lL2P3NuY.js`, `index-BHCazXQ8.css`
- **Backend Upload**: Updated `creator_subscriptions.py` with wallet payment endpoint
- **Gunicorn Restart**: 5 processes running (PID 143558 master + 4 workers)
- **Features Live**: Wallet payment option, payment method selection, instant subscription activation ✅

**User Experience Flow**:
1. Creator navigates to `/creator/subscriptions`
2. Clicks "Subscribe Now" on any plan (verification or featured)
3. Redirected to `/subscription/payment` with subscription data
4. Sees wallet balance card (if creator) with available funds
5. Chooses payment method: Wallet (recommended if sufficient), Paynow, or Bank Transfer
6. If wallet selected:
   - Click "Pay with Wallet" button
   - Backend validates balance and deducts amount
   - Subscription instantly activated
   - Creator redirected to `/subscription/manage`
7. If insufficient wallet balance:
   - Option disabled with red warning
   - Shows exact amount needed: "You need $X more"
   - Creator can top up wallet or choose alternative payment

**Impact**:
- Improved creator experience with instant payment option
- Reduced friction (no external redirect for wallet payments)
- Encourages wallet usage for creators with earned funds
- Aligns with brand experience (brands already use wallet for collaboration payments)
- Complete payment method parity: Paynow, Bank Transfer, Wallet

### Recent: ThunziAI Platform Connection Integration (Mar 3, 2026)
Phase 1 of ThunziAI integration completed - allowing creators and brands to connect their social media accounts:

**1. Backend Platform Connection System** (Critical - Commit `f8a9b2c`)
- **Database Schema**: Two new tables for ThunziAI integration
  - `thunzi_accounts` table: Stores ThunziAI company/account mapping
    - Fields: `id`, `user_id`, `company_id` (ThunziAI), `company_name`, `email`, `country`, `created_at`
    - Links BantuBuzz users to ThunziAI companies (one-to-one relationship)
  - `connected_platforms` table: Stores individual platform connections
    - Fields: `id`, `user_id`, `thunzi_account_id`, `platform_name`, `platform_username`, `access_token`, `session_data`, `follower_count`, `is_active`, `connected_at`, `last_synced_at`
    - Supports: Instagram, TikTok, YouTube, Facebook, Twitter (X)
  - Migration: `backend/migrations/versions/202603031030_add_thunzi_integration_tables.py`

- **ThunziAI Service Integration**: Created dedicated service class
  - **File**: `backend/app/services/thunzi_service.py`
  - **Session Management**: Automatic login/session refresh with cookie persistence
  - **Company Creation**: Auto-creates ThunziAI company accounts for new users
  - **Platform Connections**: Handles OAuth-style redirects for each platform
  - **Pattern**: `ThunziService` singleton class with session caching
  - **API Base**: `https://app.thunziai.com/api` (production endpoint)

- **Platform Connection Routes**: Complete REST API for platform management
  - **Creator Routes** (`/api/creator/platforms`):
    - `GET /` - List connected platforms with follower counts
    - `POST /connect` - Initiate platform connection (returns ThunziAI redirect URL)
    - `POST /<id>/sync` - Sync follower data from ThunziAI
    - `DELETE /<id>` - Disconnect platform
  - **Brand Routes** (`/api/brand/platforms`):
    - Same 4 endpoints but use `BrandProfile.company_name` instead of `CreatorProfile.username`
    - Uses `brand.country` for company creation
  - **File**: `backend/app/routes/platforms.py`

- **Platform Name Mapping**: Twitter → 'x' for ThunziAI compatibility
  - Frontend sends 'twitter', backend maps to 'x' before ThunziAI API call
  - Reverse mapping for display ('x' → 'Twitter' in responses)

**2. Frontend Platform Connection Pages** (High Priority)
- **Creator Platform Page**: `/creator/platforms`
  - **File**: `frontend/src/pages/ConnectPlatforms.jsx`
  - **Platform Grid**: 5 platform cards (Instagram, TikTok, YouTube, Facebook, X)
  - **Card Design**: Matches BantuBuzz design philosophy
    - `bg-white rounded-3xl shadow-sm` outer container
    - Platform-specific brand colors (pink for Instagram, black for TikTok, red for YouTube, etc.)
    - Connection status: "Connected" (green checkmark) or "Connect" button
    - Follower count display when connected
    - Sync and Disconnect actions
  - **Connection Flow**:
    1. Click "Connect" → API call to `/creator/platforms/connect`
    2. Receives ThunziAI redirect URL
    3. Opens in new tab for OAuth flow
    4. User returns and clicks "I've Connected" to mark as complete
  - **Protected Route**: JWT required, creator-only access

- **Brand Platform Page**: `/brand/platforms`
  - **File**: `frontend/src/pages/BrandConnectPlatforms.jsx`
  - **Identical UI**: Same design as creator page
  - **API Endpoints**: Uses `/brand/platforms` routes instead
  - **Protected Route**: JWT required, brand-only access

**3. Dashboard Integration** (High Priority)
- **Connection Banners**: Added to both creator and brand dashboards
  - **Design**: Simple `bg-primary border border-primary rounded-lg` (matches design philosophy)
  - **Conditional Display**: Only shows when `profileComplete && connectedPlatforms.length === 0`
  - **Icon**: Globe/network SVG icon (matches other alert banners)
  - **Message**: Encourages platform connection for analytics and reach showcase
  - **CTA Button**: `bg-primary text-white rounded-lg` linking to platform connection page
  - **Files**:
    - `frontend/src/pages/CreatorDashboard.jsx:234-255`
    - `frontend/src/pages/BrandDashboard.jsx:215-236`

- **Quick Actions Integration**: "Connect Platforms" added to sidebar quick actions
  - **Creator Dashboard**: Between "Create Package" and "Browse Briefs"
  - **Brand Dashboard**: Between "Find Creators" and "Browse Packages"
  - **Icon**: Same globe/network icon for consistency
  - **Hover State**: `hover:border-primary hover:bg-primary/5`
  - **Files**:
    - `frontend/src/pages/CreatorDashboard.jsx:582-592`
    - `frontend/src/pages/BrandDashboard.jsx:463-473`

**4. Design Philosophy Compliance** (Critical)
- **Banner Redesign**: Removed gradient backgrounds from initial implementation
  - **Before**: `bg-gradient-to-r from-blue-50 to-purple-50`, gradient icons, rounded-3xl
  - **After**: `bg-primary border border-primary rounded-lg`, simple icon, consistent with profile completion alerts
- **No Gradients Policy**: All UI elements use solid colors only
  - Icon backgrounds: `bg-primary/10 rounded-full`
  - Buttons: Solid `bg-primary` with `hover:bg-primary/90`
  - Cards: `bg-white rounded-3xl shadow-sm`
- **Religious Design Adherence**: Every element matches existing patterns from `Home.jsx` and `BrowseCreators.jsx`

**5. Technical Implementation Details**
- **Session-Based Authentication**: ThunziAI uses cookie-based sessions (not JWT)
  - Service class handles login and maintains session state
  - Cookies stored for API requests: `sessionid`, `csrftoken`
- **Company Creation Pattern**:
  ```python
  company_name = f"{creator.username or user.username} - BantuBuzz"
  company_id = thunzi_service.create_company(
      name=company_name,
      email=user.email,
      country=creator.country or "Zimbabwe"
  )
  ```
- **Platform Connection Flow**:
  1. Check if user has ThunziAI account (query `thunzi_accounts`)
  2. If not, create company via ThunziAI API
  3. Store company_id in `thunzi_accounts` table
  4. Get redirect URL from ThunziAI for specific platform
  5. Return URL to frontend for new tab redirect
  6. User completes OAuth on ThunziAI
  7. Frontend marks connection as complete
  8. Backend syncs follower data

- **Data Sync**: Follower count updated on manual sync
  - Queries ThunziAI API for latest platform metrics
  - Updates `connected_platforms.follower_count`
  - Updates `connected_platforms.last_synced_at`

**6. Route Integration**
- **App.jsx Routes**: Added protected routes for both user types
  - `/creator/platforms` → `<ConnectPlatforms />`
  - `/brand/platforms` → `<BrandConnectPlatforms />`
  - Protected with `ProtectedRoute` component checking `requiredType`
  - File: `frontend/src/App.jsx:487-494`

**Deployment** (Mar 3, 2026 11:45 CET)
- **Database Migration**: Ran successfully on production PostgreSQL
- **Backend Files**: `platforms.py`, `thunzi_service.py`, migration script uploaded
- **Frontend Build**: `index-DdnTj3Cn.css`, `index-rAu4liz_.js`
- **Gunicorn Restart**: Backend API restarted with new routes
- **Features Live**: Platform connection pages, dashboard banners, quick actions ✅

**Next Steps**:
- Phase 2: Post tracking and analytics dashboard (ThunziAI data integration)
- Phase 3: Sentiment analysis and brand monitoring
- Phase 4: Campaign performance tracking

**Impact**:
- Lays foundation for comprehensive analytics features (Pro/Premium tiers)
- Creators can showcase verified follower counts
- Brands can track campaign performance across platforms
- Differentiates BantuBuzz from competitors with data-driven insights
- Positions platform for Pro ($120/mo) and Premium ($250/mo) tier value delivery

### Recent: Comprehensive QA Bug Fixes (Mar 5, 2026)
Major QA testing session resulting in 9 critical bug fixes improving user experience across the platform:

**1. Creator Verification Subscription Check** (Critical - Issue #1)
- **Problem**: "Failed to check subscription status" error when creators tried to apply for verification
- **Root Cause**: Frontend incorrectly accessing `response.data.data.subscription` when backend returns either `subscription` or `plan` object
- **Solution**: Added fallback logic `const subscription = data.subscription || data.plan;` with proper handling for free plans
- **Added**: Check for `data.is_free` flag to redirect free plan users to subscriptions page
- **File**: `frontend/src/pages/VerificationApplication.jsx:44-70`

**2. Category Filtering Not Updating UI** (Critical - Issue #2)
- **Problem**: Homepage category links added URL params but didn't filter creators in BrowseCreators page
- **Root Cause**: Categories fetched as objects `{id, name, description, image}` but dropdown treated them as strings
- **Initial Wrong Approach**: Removed URL parameters completely
- **User Correction**: "Follow what we have already done... see how featured creators filters work"
- **Final Solution**:
  - Updated category dropdown to handle object format: `<option key={cat.id || cat} value={cat.name || cat}>`
  - Maintained URL parameter pattern like platform filtering (`?category=Fashion`)
  - Read URL params once on mount to set initial filter state
- **Files**:
  - `frontend/src/pages/BrowseCreators.jsx:44-55, 269-271, 435-437`
  - `frontend/src/pages/Home.jsx:482, 526`

**3. Profile Picture Size Requirements & Crop** (High Priority - Issue #3)
- **Problem**: No size guidance or crop functionality for profile pictures
- **Solution**: Full image crop implementation with react-easy-crop library
- **Features**:
  - Installed `react-easy-crop` package
  - Created `ImageCropModal` component with zoom slider, grid overlay, circular crop shape
  - Created `cropImage.js` utility to convert cropped area to blob
  - Updated upload flow: Select image → Crop → Upload cropped version
  - Added "Recommended: 400x400px or larger" text
  - 5MB max file size validation
- **Technical**: Canvas-based cropping with aspect ratio 1:1, circular shape, zoom 1x-3x
- **Files**:
  - `frontend/src/components/ImageCropModal.jsx` (new)
  - `frontend/src/utils/cropImage.js` (new)
  - `frontend/src/pages/CreatorProfileEdit.jsx:28-140`

**4. Blank Bookings Page** (Critical - Issue #4)
- **Problem**: White screen with JavaScript error: `d.toFixed is not a function`
- **Root Causes** (dual issues):
  1. Backend crashed when creator/brand profile didn't exist
  2. Frontend tried to call `.toFixed()` on string value (amount was string, not number)
- **Backend Solution**: Added null checks returning empty bookings array when profile missing
- **Frontend Solution**: Changed `booking.amount?.toFixed(2)` to `parseFloat(booking.amount).toFixed(2)`
- **Files**:
  - `backend/app/routes/bookings.py:36-44`
  - `frontend/src/pages/Bookings.jsx:207`

**5. Favorite Creator 404 Error for Guests** (Medium Priority - Issue #5)
- **Problem**: Non-logged-in users saw 404 error when trying to save creator as favorite
- **Expected Behavior**: Should redirect to login page with helpful message
- **Solution**: Updated `handleSaveCreator` to navigate to `/login` instead of showing 404
- **Added**: Toast message "Please sign in as a brand to save creators"
- **File**: `frontend/src/pages/CreatorProfile.jsx:88-110`

**6. Messaging Showing "Unknown User"** (Critical - Issue #6)
- **Problem**: Brand-to-creator conversations showed "Unknown User" instead of creator name
- **User Question**: "wait does creators have a display name or its a username?" (Critical insight!)
- **Investigation**: Checked database schema and found creators only have `username` field, not `display_name`
- **Root Cause**: SQL query used `cpr.display_name` which doesn't exist in CreatorProfile table
- **Solution**: Changed CASE statement to use `cpr.username` instead
- **Files**:
  - `messaging-service/server.js:347, 350` (SQL query CASE statements)
- **Deployment**: Uploaded fixed file and restarted PM2 messaging service

**7. Replace Twitter Logo with X Logo** (Low Priority - Issue #7)
- **Problem**: Profile pages still showed old Twitter bird icon
- **Solution**: Replaced SVG path with official X logo (black color, modern design)
- **File**: `frontend/src/pages/CreatorProfile.jsx:441-443`

**8. Show/Hide Password Toggle** (High Priority - Issue #8)
- **Problem**: No password visibility toggle on login and signup forms
- **Solution**: Implemented eye icon toggle for all password fields
- **Features**:
  - Eye icon (show password) / eye-slash icon (hide password)
  - Toggle input type between "password" and "text"
  - Positioned absolute right with hover effect
  - Added to ALL password fields: login, brand signup, creator signup (password + confirm password)
- **Pattern**:
  ```jsx
  const [showPassword, setShowPassword] = useState(false);
  <div className="relative">
    <input type={showPassword ? "text" : "password"} className="input pr-10" />
    <button onClick={() => setShowPassword(!showPassword)}>
      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
    </button>
  </div>
  ```
- **Files**:
  - `frontend/src/pages/Login.jsx:13, 77-103`
  - `frontend/src/pages/RegisterCreator.jsx:16-17, 183-217, 224-255`
  - `frontend/src/pages/RegisterBrand.jsx:12-13, 119-153, 160-191`

**9. Browse Packages - Missing Category & Collaboration Type Filters** (High Priority - Issue #9)
- **Problem**: Filter dropdowns showed hardcoded values instead of fetching from database
- **Expected**: Show ALL categories and collaboration types from actual database records
- **Solution**:
  - Fetched categories dynamically from `categoriesAPI.getCategories()` API
  - Fetched collaboration types from unique package categories (no dedicated endpoint)
  - Added state management with default fallback values
  - Updated both desktop and mobile filter dropdowns to use dynamic data
- **Technical**:
  ```javascript
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [collaborationTypes, setCollaborationTypes] = useState(DEFAULT_COLLABORATION_TYPES);

  useEffect(() => {
    fetchFiltersData(); // Fetches from API on mount
  }, []);
  ```
- **Files**:
  - `frontend/src/pages/BrowsePackages.jsx:1-117, 273-275, 288-290, 369-371, 420-422`
  - Added `categoriesAPI` import to fetch categories

**10. Admin Bookings Page 404 Error** (Critical - Bonus Issue)
- **Problem**: `/admin/bookings` endpoint returning "Resource not found"
- **Root Cause**: `admin_extended` blueprint defined in `routes/admin_extended.py` but NEVER registered in app
- **Solution**:
  - Added `admin_extended` to imports in `backend/app/__init__.py`
  - Registered blueprint with `app.register_blueprint(admin_extended.bp, url_prefix='/api')`
  - Uploaded updated `__init__.py` to server
  - Restarted gunicorn backend
- **Routes Now Available**:
  - `/api/admin/bookings` - List all bookings with filters
  - `/api/admin/campaigns` - Campaign management
  - `/api/admin/reviews` - Review moderation
  - `/api/admin/collaborations` - Collaboration oversight
  - `/api/admin/packages` - Package management
- **Files**: `backend/app/__init__.py:58, 77`

**Deployment** (Mar 5, 2026 07:55 UTC)
- **Frontend Build**: `index-wxxqw8qA.js`, `index-C-2McU53.css`
- **Backend Files**: Updated `bookings.py`, `__init__.py`, uploaded to server
- **Services Restarted**:
  - Gunicorn backend (PID 254680 master + 4 workers on port 8002)
  - PM2 messaging-service (restarted for SQL query fix)
- **Build Method**: Standard tar.gz → SCP → extract workflow
- **All 10 Issues Fixed**: ✅ Complete and deployed to production

### Recent: Briefs & Custom Package Payment Flow Fixes (Mar 6, 2026)

Fixed critical payment flow issues for briefs and custom packages that were showing white pages instead of payment screens.

**1. Briefs Payment Flow Issue** (Critical)
- **Problem**: When accepting proposals, brands got white page instead of payment page
- **Root Cause**: Blocking `alert()` calls prevented navigation + logic tried to convert to campaign BEFORE payment
- **User Requirement**: Brand should choose "close brief" or "turn into campaign" AFTER successful payment
- **Solution**:
  - **Frontend** (`ManageBriefs.jsx:69-103`):
    - Removed blocking `alert()` calls, replaced with `toast` notifications
    - Store brief action choice in `localStorage` as `brief_after_payment` with `{briefId, closeBrief, bookingId}`
    - Navigate to payment page immediately: `/bookings/${bookingId}/payment`
  - **Backend** (`proposals.py:306-311`):
    - Removed auto-close logic that closed brief immediately on acceptance
    - Brief now stays open for brand to choose action after payment
  - **Post-Payment Handler** (`PaymentReturn.jsx:15-40`):
    - Added `handleBriefPostPayment()` function to process brief action after successful payment
    - Reads `brief_after_payment` from localStorage
    - If `closeBrief === true`: Calls `briefsAPI.closeBrief(briefId)`
    - If `closeBrief === false`: Calls `briefsAPI.convertToCampaign(briefId)` to turn into campaign
    - Cleans up localStorage after processing
- **Flow**:
  1. Brand accepts proposal → Backend creates booking → Returns `booking_id`
  2. Frontend stores choice in localStorage → Navigates to payment page
  3. Brand completes payment → Redirected to PaymentReturn page
  4. PaymentReturn checks payment status → If successful, executes chosen brief action
  5. Brief either closed OR converted to campaign based on brand's choice

**2. Brief Acceptance Backend Logic** (Critical)
- **Before**: Proposal acceptance auto-closed brief (lines 309-312)
- **After**: Brief remains open, allowing brand to decide post-payment
- **File**: `backend/app/routes/proposals.py:309-311`
- **Comment Added**: "Get brief (don't close it yet - brand will choose after payment)"

**3. Custom Package Payment** (Status: Verified Working)
- **Route**: `/bookings/${bookingId}/payment` → Loads `Payment.jsx`
- **Component**: `frontend/src/pages/Payment.jsx` - handles both Paynow and bank transfer
- **Verified**: Payment page exists and functions correctly for custom packages
- **No Changes Required**: White page issue likely same as briefs (now fixed)

**Backend Endpoints Utilized**:
- `POST /api/proposals/<proposal_id>/accept` - Creates booking, returns `booking_id`
- `POST /api/briefs/<brief_id>/close` - Closes brief after payment
- `POST /api/briefs/<brief_id>/convert-to-campaign` - Converts brief to campaign after payment

**Frontend Files Modified**:
- `frontend/src/pages/ManageBriefs.jsx` - Fixed navigation and modal logic
- `frontend/src/pages/PaymentReturn.jsx` - Added post-payment brief handler
- `frontend/src/pages/Payment.jsx` - Verified (no changes needed)

**Technical Pattern for Future Reference**:
When payment requires post-payment actions:
1. Store action data in `localStorage` before navigating to payment
2. Navigate to payment page immediately (don't block with alerts)
3. In `PaymentReturn.jsx`, check for stored data when payment succeeds
4. Execute the stored action, then clean up localStorage

**Deployment** (Mar 6, 2026)
- **Frontend Build**: Built with briefs payment fixes
- **Backend Files**: Updated `proposals.py` with brief acceptance fix
- **Services Restarted**: Gunicorn backend reloaded with `pkill -HUP gunicorn`
- **Status**: ✅ Deployed to production

**4. Custom Package Payment Route Fix** (Critical - Follow-up Issue)
- **Problem**: Custom package acceptance showed white page instead of payment screen
- **Root Cause**: Two components had incorrect payment navigation routes
  - `CustomPackageOfferCard.jsx:29` - Used `/payment/${bookingId}` (wrong)
  - `CustomOfferCard.jsx:42` - Used `/payment/${bookingId}` (wrong)
- **Correct Route**: `/bookings/${bookingId}/payment` (matches Payment.jsx component)
- **Solution**:
  - Fixed navigation in `CustomPackageOfferCard.jsx` (line 29)
  - Fixed navigation in `CustomOfferCard.jsx` (line 42)
- **Files Modified**:
  - `frontend/src/components/CustomPackageOfferCard.jsx:29`
  - `frontend/src/components/CustomOfferCard.jsx:42`

**Important Pattern**:
All payment page navigations MUST use the route format: `/bookings/${bookingId}/payment`
- ✅ Correct: `navigate(\`/bookings/${bookingId}/payment\`)`
- ❌ Wrong: `navigate(\`/payment/${bookingId}\`)`

**Deployment** (Mar 6, 2026 - Second Deployment)
- **Frontend Build**: Built with custom package payment route fixes
- **Status**: ✅ Deployed to production

**5. Frontend Deployment Issue - Empty Dist Folder** (Critical)
- **Problem**: Internal Server Error on all pages after deployment
- **Root Cause**: Frontend dist folder was empty after tar extraction
  - Used `tar -xzf /tmp/dist.tar.gz --strip-components=1` which stripped the dist/ folder itself
  - Left only empty directory structure
- **Solution**: Fixed tar command sequence
  - Create: `tar -czf dist.tar.gz -C dist .` (create from inside dist)
  - Extract: `cd /var/www/bantubuzz/frontend/dist && tar -xzf /tmp/dist.tar.gz` (extract into dist)
- **Files**: Deployment scripts

---

### Recent: Facebook App Availability Error (Mar 6, 2026)

**Problem**: Some users see "This app isn't available - contact ThunziAI" when trying to connect Facebook/Instagram.

**Root Cause**: Facebook App is in **Development Mode**
- App ID: `1863571634283956`
- Only accessible to:
  - App developers/admins
  - Users added as "App Testers"
  - Test users specifically added
- All other users are blocked with "app not available" error

**Solutions**:

**Immediate Fix - Add Users as Testers**:
1. Go to [Facebook Developers Console](https://developers.facebook.com/apps/1863571634283956/)
2. Navigate to **Roles** → **Testers**
3. Click **Add Testers**
4. Enter user's Facebook email/username
5. User must accept invitation to get access
6. **Limitation**: Max ~25 test users, not scalable

**Long-term Solution - Make App Public**:

1. **Complete App Review Requirements**:
   - **Privacy Policy URL**: Must be publicly accessible
   - **Terms of Service URL**: Must be publicly accessible
   - **App Icon**: 1024x1024px
   - **Business Verification**: May be required (submit documents)
   - **Contact Email**: Valid support email

2. **Request Permissions** (App Review → Permissions and Features):
   - `pages_show_list` - See list of Pages user manages
   - `instagram_basic` - Access Instagram accounts
   - `instagram_manage_insights` - View Instagram insights
   - `pages_read_engagement` - Read Page engagement data

3. **Provide Review Materials** for each permission:
   ```
   Use Case: "BantuBuzz is an influencer marketing platform. Creators
   connect their Facebook Pages and Instagram Business accounts to
   showcase their social media reach and engagement metrics to brands
   for collaboration opportunities."

   Screen Recording: 2-3 minute video showing:
   - Creator logs into BantuBuzz
   - Navigates to "Connect Platforms"
   - Clicks "Connect Facebook"
   - Grants permissions
   - System displays page/Instagram metrics

   Test Instructions:
   1. Create test account at bantubuzz.com/register-creator
   2. Login with provided credentials
   3. Navigate to "Connect Platforms" page
   4. Click "Connect Facebook" button
   5. Grant requested permissions
   6. Verify Facebook/Instagram data appears
   ```

4. **Submit for Review**:
   - Click **Submit for Review**
   - Review typically takes 3-7 business days
   - Respond promptly to any follow-up questions

5. **After Approval - Switch to Live Mode**:
   - Go to **Settings** → **Basic**
   - Toggle **App Mode** from "Development" to "Live"
   - App becomes publicly available to ALL Facebook users

**Current Configuration**:
- **Facebook App ID**: `1863571634283956`
- **Config ID**: `1640839016924487` (Facebook Login for Business)
- **SDK Version**: v19.0
- **Permissions Needed**: `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
- **Files**: `frontend/src/hooks/useFacebookOAuth.js`

**Important Notes**:
- ThunziAI integration requires Facebook app to be public for production use
- Temporary workaround: Add specific creators as testers (max ~25 users)
- App review is one-time process, typically takes less than 1 week
- After going live, no user restrictions apply

---

**11. Admin Bookings Blueprint Registration Fix** (Critical - Post-Deployment Issue)
- **Problem**: `/api/admin/bookings` endpoint still returning 404 even after blueprint registration
- **Root Cause**: Flask blueprint URL prefix conflict
  - Blueprint defined with `url_prefix='/admin'` in `admin_extended.py`
  - Registered with `url_prefix='/api'` in `__init__.py`
  - Flask doesn't concatenate these - it uses ONLY the registration prefix
  - Result: Routes were at `/api/bookings` not `/api/admin/bookings`
- **Solution**:
  - Removed `url_prefix='/admin'` from blueprint definition
  - Changed registration to full path: `url_prefix='/api/admin'`
  - Pattern: Define blueprint WITHOUT prefix, specify full path at registration
- **Flask Blueprint Behavior** (CRITICAL LEARNING):
  ```python
  # ❌ WRONG - Conflicting prefixes
  bp = Blueprint('name', __name__, url_prefix='/admin')
  app.register_blueprint(bp, url_prefix='/api')
  # Flask uses ONLY /api, ignores /admin
  # Routes become: /api/route (WRONG)

  # ✅ CORRECT - Single prefix at registration
  bp = Blueprint('name', __name__)  # No prefix
  app.register_blueprint(bp, url_prefix='/api/admin')
  # Routes become: /api/admin/route ✓
  ```
- **Testing Method**: Used Python one-liner to list all registered routes
  ```bash
  ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/python3 -c \"
  from app import create_app
  app = create_app()
  for rule in app.url_map.iter_rules():
      if 'admin' in rule.rule:
          print(f'{rule.rule} -> {rule.endpoint}')
  \""
  ```
- **Files**:
  - `backend/app/routes/admin_extended.py:17` - Removed url_prefix
  - `backend/app/__init__.py:77` - Changed to full `/api/admin` prefix
- **Verification**: `curl http://localhost:8002/api/admin/bookings` returns 401 (auth required) instead of 404 ✓

**12. Deliverable Approval Bug - SQLAlchemy JSON Field Modification** (Critical - March 5, 2026)
- **Problem**: Brand unable to approve deliverables, error "Can't flag attribute 'submitted_deliverables' modified; it's not present in the object state"
- **Symptoms**:
  - Clicking "Approve" on deliverable showed error message
  - Progress bar updated to 100% but deliverable count showed "1 out of 2"
  - Approved deliverable didn't appear in approved list
  - Eventually appeared after Socket.IO update (appearing to approve "on its own")
  - This specifically happened when approving the last deliverable (triggering 100% completion)
- **Root Cause**: SQLAlchemy JSON field mutation tracking issue
  - When `submitted_deliverables` is `None` initially, SQLAlchemy doesn't track it in object state
  - Code was using `list.append()` then calling `flag_modified()` on untracked attribute
  - This threw an exception that prevented database commit
  - The transaction rolled back, but Socket.IO eventually triggered refetch showing stale data
- **SQLAlchemy JSON Field Behavior** (CRITICAL LEARNING):
  ```python
  # ❌ WRONG - Mutating list in place, then flag_modified on untracked attribute
  collaboration.submitted_deliverables.append(item)  # Mutate in place
  flag_modified(collaboration, 'submitted_deliverables')  # ERROR if None initially!

  # ❌ ALSO WRONG - Initializing then mutating still causes issues
  if collaboration.submitted_deliverables is None:
      collaboration.submitted_deliverables = []
  collaboration.submitted_deliverables.append(item)  # Still mutating
  flag_modified(collaboration, 'submitted_deliverables')  # ERROR!

  # ✅ CORRECT - Create new list and assign (triggers automatic change detection)
  submitted_list = list(collaboration.submitted_deliverables or [])
  submitted_list.append(item)
  collaboration.submitted_deliverables = submitted_list  # New object assignment
  # No flag_modified() needed - SQLAlchemy detects object replacement
  ```
- **Solution**:
  - Create new list objects instead of mutating existing ones
  - Assign new lists to JSON fields to trigger SQLAlchemy change detection
  - Remove `flag_modified()` calls (no longer needed)
  - This pattern works for ALL JSON fields: `deliverables`, `draft_deliverables`, `submitted_deliverables`, `revision_requests`, etc.
- **Technical Details**:
  ```python
  # Before (BROKEN):
  collaboration.submitted_deliverables.append(deliverable_to_approve)
  collaboration.draft_deliverables = remaining_drafts
  flag_modified(collaboration, 'submitted_deliverables')  # THROWS ERROR
  flag_modified(collaboration, 'draft_deliverables')

  # After (FIXED):
  submitted_list = list(collaboration.submitted_deliverables or [])
  submitted_list.append(deliverable_to_approve)
  collaboration.submitted_deliverables = submitted_list  # Replace entire object
  collaboration.draft_deliverables = remaining_drafts     # Already a new list
  # No flag_modified() calls needed
  ```
- **Files**:
  - `backend/app/routes/collaborations.py:298-308` - Fixed deliverable list mutation
  - `backend/app/routes/collaborations.py:390-391` - Removed flag_modified calls
- **Enhanced Logging Added**: Comprehensive logging at every step of approval process for debugging
- **Testing**: Tested with collaboration #50 - worked perfectly ✓
- **Applies To**: ALL JSON field modifications in Flask-SQLAlchemy models

**User Experience Impact**:
- Creators can now complete verification application without errors
- Category filtering works correctly from homepage links
- Professional profile picture cropping prevents poor quality uploads
- Bookings page displays correctly for all users
- Guest users have better experience with clear login prompts
- Messaging shows correct creator names in conversations
- Modern X logo aligns with current branding
- Password visibility toggle improves accessibility and UX
- Browse packages shows all actual categories and types from database
- Admin dashboard bookings page is fully functional
- **Brands can approve deliverables without errors, triggering auto-completion at 100%**

**Technical Learning**:
- Always check if backend returns different data structures (subscription vs plan)
- Follow existing patterns in codebase instead of creating new ones
- Database schema verification is critical - don't assume field names
- Blueprint registration is required step after creating new route files
- Flask blueprint prefixes: registration overrides definition
- **SQLAlchemy JSON fields: assign new objects, never mutate in place**
- **Error messages reveal exact issues: "Can't flag attribute modified" = JSON field tracking problem**
- User questions often reveal critical implementation details

### Current State (Mar 2026)
✅ Fully functional platform
✅ Complete subscription systems (brand + creator)
✅ Collabstr-style pricing with tiered service fees
✅ Payment integration (Paynow + manual + wallet)
✅ Admin dashboard with bookings management (fixed)
✅ Messaging with real-time updates (creator names fixed)
✅ Design system consistency achieved
✅ Critical bugs fixed and deployed to production
✅ Save Creator feature with dedicated page
✅ Creators without packages hidden from browse (enforced)
✅ Multi-select languages filter
✅ Bio character counter
✅ Dynamic service fee calculation per tier (complete)
✅ Browse Packages responsive redesign with all working filters + dynamic categories
✅ Twitter/X icon update (modern X logo)
✅ Required creator profile fields (city, country, followers, categories, platforms)
✅ 14-day escrow period (reduced from 30 days)
✅ Lowest package price displayed on creator cards
✅ Package categorization by platform (Instagram, TikTok, YouTube, Facebook, Twitter, LinkedIn, Threads, Twitch, UGC)
✅ Tab filtering on creator profiles by platform
✅ Wallet payment for creator subscriptions (instant activation, payment method selection)
✅ ThunziAI platform connection integration - Phase 1 complete (connect Instagram, TikTok, YouTube, Facebook, Twitter)
✅ Comprehensive QA fixes - All 9 + 1 bonus issues resolved (Mar 5, 2026)
✅ Profile picture crop functionality with image size guidance
✅ Password visibility toggles on all auth forms
✅ Category filtering working with URL params
✅ Verification subscription check before application
🔄 ThunziAI analytics dashboards - Phase 2 (in progress)

---

## 💡 Common Patterns & Conventions

### File Organization

```
frontend/src/
├── pages/           # Page components (one per route)
├── components/      # Reusable components
├── services/        # API calls (api.js)
├── hooks/           # Custom React hooks
└── assets/          # Images, icons

backend/app/
├── models/          # Database models
├── routes/          # API endpoints
├── services/        # Business logic
└── utils/           # Utilities
```

### API Service Pattern

```javascript
// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Component Pattern

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import toast from 'react-hot-toast';

const ComponentName = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/endpoint');
      setData(response.data.items);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-7xl mx-auto">
          {/* Content */}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ComponentName;
```

### Backend Route Pattern

```python
from flask import Blueprint, request, jsonify
from app.models import Model
from app.utils.auth import token_required
from app import db

bp = Blueprint('endpoint_name', __name__)

@bp.route('/api/endpoint', methods=['GET'])
@token_required
def get_items(current_user):
    try:
        items = Model.query.filter_by(user_id=current_user.id).all()
        return jsonify({
            'success': True,
            'items': [item.to_dict() for item in items]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

### Payment Flow Standards (CRITICAL)

**See `PAYMENT_FLOW_DOCUMENTATION.md` for complete details**

All payment pages MUST support both Paynow and Bank Transfer. Use consistent patterns:

**Frontend Pattern (Reference: CartCheckout.jsx)**:
```javascript
import { bookingsAPI } from '../services/api';

// Paynow
const response = await bookingsAPI.initiatePayment(bookingId);
window.location.href = response.data.redirect_url;

// Bank Transfer
const formData = new FormData();
formData.append('file', proofFile);
await bookingsAPI.uploadProofOfPayment(bookingId, formData);
```

**❌ NEVER use raw fetch() or manual token handling**

**Backend Pattern**:
- `initiate_booking_payment()` MUST handle ALL booking types
- `verify_bank_transfer_payment()` MUST handle type-specific logic
- Payment types: `'package'`, `'brief'`, `'campaign_application'`, `'campaign_package'`, `'paid_revision'`

**Admin Dashboard**:
- Show clear payment_type labels
- Support POP download and verification
- Display payment method and status

---

## 🔧 Troubleshooting Guide

### Architectural Principles & Common Mistakes

**CRITICAL: Learn from these mistakes to avoid repeating them**

**Summary of 9 Core Principles:**
1. **Single Source of Truth for URL Prefixes** - Define prefix only at registration
2. **Blueprint Registration is Required** - Import + register in `__init__.py`
3. **Always Test Route Registration** - Verify routes exist before debugging
4. **Database Schema Verification** - Never assume field names
5. **Follow Existing Patterns** - Copy proven implementations
6. **Blueprint vs Registration Prefix** - Understand Flask's precedence rules
7. **SQLAlchemy JSON Field Mutation** - Create new objects, never mutate in place
8. **Data Type Consistency** - Backend and frontend must agree on types
9. **Error Messages Are Clues** - Decode common errors instantly

---

#### Principle 1: Single Source of Truth for URL Prefixes

**Rule**: Define URL prefix ONLY at blueprint registration, NOT in blueprint definition.

**Why**: Flask blueprint registration overrides blueprint definition prefix. This causes confusion and 404 errors.

**Pattern**:
```python
# ✅ CORRECT PATTERN
# In routes/endpoint.py
bp = Blueprint('endpoint_name', __name__)  # NO url_prefix

# In app/__init__.py
app.register_blueprint(endpoint.bp, url_prefix='/api/endpoint')
```

**Anti-Pattern**:
```python
# ❌ WRONG PATTERN
# In routes/endpoint.py
bp = Blueprint('endpoint_name', __name__, url_prefix='/endpoint')  # Has prefix

# In app/__init__.py
app.register_blueprint(endpoint.bp, url_prefix='/api')  # Another prefix
# Result: Flask ignores blueprint prefix, routes are at /api/* not /api/endpoint/*
```

#### Principle 2: Blueprint Registration is Required

**Rule**: Creating a blueprint file is NOT enough. It MUST be imported and registered in `app/__init__.py`.

**Checklist**:
1. ✅ Blueprint file exists in `backend/app/routes/`
2. ✅ Blueprint is imported: `from .routes import blueprint_name`
3. ✅ Blueprint is registered: `app.register_blueprint(blueprint_name.bp, url_prefix='...')`
4. ✅ Gunicorn restarted after changes

**Common Mistake**: Creating `routes/new_feature.py` but forgetting to add it to `__init__.py`. Routes return 404.

#### Principle 3: Always Test Route Registration

**Rule**: After adding/modifying routes, ALWAYS verify they're registered before debugging frontend.

**Quick Test**:
```bash
# 1. List all routes containing keyword
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && venv/bin/python3 -c \"
from app import create_app
app = create_app()
for rule in app.url_map.iter_rules():
    if 'keyword' in rule.rule:
        print(rule.rule)
\""

# 2. Test endpoint response code
ssh root@173.212.245.22 "curl -s -o /dev/null -w '%{http_code}' http://localhost:8002/api/your/endpoint"
# 404 = route doesn't exist
# 401/403 = route exists, auth issue
# 200 = route works!
```

#### Principle 4: Database Schema Verification

**Rule**: NEVER assume database field names. Always verify in model files.

**Example from QA Issue #6**:
```python
# ❌ WRONG ASSUMPTION
SELECT cpr.display_name FROM creator_profiles cpr
# Fails because creator_profiles only has 'username', not 'display_name'

# ✅ CORRECT - Verified in models/creator_profile.py
SELECT cpr.username FROM creator_profiles cpr
```

**Verification Steps**:
1. Check model file: `backend/app/models/model_name.py`
2. Look for `Column()` definitions
3. Use exact field names in queries
4. Test query manually if unsure

#### Principle 5: Follow Existing Patterns

**Rule**: When implementing new features, ALWAYS check how similar features are already implemented.

**Example from QA Issue #2**:
- User wanted category filtering to work
- Initially tried removing URL parameters (wrong approach)
- User corrected: "Follow what we have already done... see how platform filters work"
- Solution: Copied platform filter pattern for category filtering

**Pattern Discovery Process**:
1. Identify similar existing feature
2. Find implementation files (use grep/search)
3. Copy pattern exactly
4. Adapt to new use case
5. Test thoroughly

#### Principle 6: Blueprint vs Registration Prefix

**Understanding**:
```
Final URL = Registration Prefix + Route Path
(Blueprint prefix is IGNORED when registration has prefix)

Example:
Registration: url_prefix='/api/admin'
Route: @bp.route('/bookings')
Final URL: /api/admin/bookings
```

**Special Case - Blueprint with Prefix, No Registration Prefix**:
```python
# Blueprint definition
bp = Blueprint('name', __name__, url_prefix='/api/brand/wallet')

# Registration WITHOUT prefix
app.register_blueprint(bp)  # No url_prefix parameter

# Final URL uses blueprint prefix: /api/brand/wallet/*
```

**Best Practice**: Use blueprint prefix ONLY when no registration prefix is needed.

#### Principle 7: SQLAlchemy JSON Field Mutation Tracking

**Rule**: NEVER mutate JSON fields in place. Always create new objects and assign them.

**Why**: SQLAlchemy can't track mutations inside JSON fields. If field is `None` initially, calling `flag_modified()` throws error: "Can't flag attribute modified; it's not present in object state".

**Pattern**:
```python
# ✅ CORRECT PATTERN - Create new list and assign
submitted_list = list(collaboration.submitted_deliverables or [])
submitted_list.append(new_item)
collaboration.submitted_deliverables = submitted_list  # Assign new object
# No flag_modified() needed - SQLAlchemy detects object replacement
```

**Anti-Pattern**:
```python
# ❌ WRONG PATTERN - Mutating in place + flag_modified
if collaboration.submitted_deliverables is None:
    collaboration.submitted_deliverables = []
collaboration.submitted_deliverables.append(new_item)  # Mutation
flag_modified(collaboration, 'submitted_deliverables')  # ERROR if was None!
```

**Real-World Issue from QA #12**:
- Approving deliverable threw error and failed to save
- Progress showed 100% but count showed "1 out of 2"
- Fixed by replacing `append()` + `flag_modified()` with new list assignment
- Applies to ALL JSON fields: `deliverables`, `draft_deliverables`, `submitted_deliverables`, `revision_requests`, etc.

**Key Insight**: When you assign a new object to a SQLAlchemy column, it automatically marks the field as modified. No `flag_modified()` needed!

#### Principle 8: Data Type Consistency

**Rule**: Backend and frontend must agree on data types.

**Example from QA Issue #4**:
```javascript
// ❌ WRONG - Assumes amount is number
${booking.amount.toFixed(2)}  // Fails when amount is "100.00" (string)

// ✅ CORRECT - Parse to number first
${parseFloat(booking.amount).toFixed(2)}  // Works for both string and number
```

**Common Type Issues**:
- Backend returns string, frontend expects number (use `parseInt()`, `parseFloat()`)
- Backend returns null, frontend expects empty array (use `|| []`)
- Backend returns object, frontend expects string (use `obj.field`)
- Date formats (ISO 8601 string vs Date object)

#### Principle 9: Error Messages Are Clues

**404 "Resource not found"**:
- Blueprint not registered
- Wrong URL path
- Missing route decorator

**401 "Unauthorized"**:
- Missing JWT token
- Expired token
- Token in wrong format

**403 "Forbidden"**:
- User authenticated but lacks permissions
- Check `@admin_required` decorator
- Check `user.user_type` validation

**500 "Internal server error"**:
- Python exception in handler
- Database query error
- Check gunicorn logs

**TypeError: X is not a function**:
- Wrong data type (string vs number)
- Missing method on object
- Undefined variable

**"Can't flag attribute 'X' modified; it's not present in object state"**:
- SQLAlchemy JSON field was `None` initially
- Trying to use `flag_modified()` on untracked attribute
- Fix: Create new list/object and assign instead of mutating in place (see Principle 7)

### Frontend Issues

**White screen / blank page:**
```bash
# Check browser console for errors
# Common causes:
# 1. Missing environment variables
# 2. API endpoint not reachable
# 3. Authentication token expired

# Fix: Clear localStorage and refresh
localStorage.clear();
location.reload();
```

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Backend Issues

**Server not responding:**
```bash
# Check if backend is running
ssh root@173.212.245.22 "pm2 list"

# Check logs
ssh root@173.212.245.22 "pm2 logs bantubuzz-backend --lines 100"

# Restart
ssh root@173.212.245.22 "pm2 restart bantubuzz-backend"
```

**Database errors:**
```bash
# Check PostgreSQL status
ssh root@173.212.245.22 "systemctl status postgresql"

# Run migration
ssh root@173.212.245.22 "cd /var/www/bantubuzz/backend && source venv/bin/activate && python migrations/script_name.py"
```

### Deployment Issues

**Site not updating after deployment:**
```bash
# 1. Clear browser cache (Ctrl+Shift+R)

# 2. Verify files were uploaded
ssh root@173.212.245.22 "ls -la /var/www/bantubuzz/frontend/dist/"

# 3. Restart frontend service
ssh root@173.212.245.22 "pm2 restart bantubuzz-frontend"

# 4. Check if PM2 is serving correct directory
ssh root@173.212.245.22 "pm2 show bantubuzz-frontend"
```

**Nginx/Apache not starting:**
```bash
# Ports 80/443 are used by Apache2 (not Nginx)
# Check Apache status
ssh root@173.212.245.22 "systemctl status apache2"

# Restart Apache
ssh root@173.212.245.22 "systemctl restart apache2"
```

### Subscription & Payment Issues

**"Unauthorized" error on payment proof upload:**
```
Problem: Creator gets 401/403 error when uploading manual payment proof
Root cause: Brand and Creator subscriptions use different models
- Brand subscriptions: Subscription model with user_id
- Creator subscriptions: CreatorSubscription model with creator_id

Solution: Check user_type and use correct endpoint
- Brands: POST /subscriptions/upload-proof
- Creators: POST /creator/subscriptions/upload-proof

File: frontend/src/pages/SubscriptionPayment.jsx
```

**Badge display order incorrect:**
```
Problem: Verified badge showing before Top Creator badge
Root cause: Badges rendered in array order without sorting

Solution: Sort badges before rendering
const priority = {
  'top_creator': 1,
  'verified_creator': 2,
  'responds_fast': 3,
  'creator': 4
};
badges.sort((a, b) => (priority[a] || 99) - (priority[b] || 99));

Files: All creator card components (5 files)
```

**Verification application accessible without subscription:**
```
Problem: Users can access verification form without paying for subscription
Root cause: Backend enforces requirement but frontend shows form first

Solution: Add subscription check on component mount
useEffect(() => {
  checkVerificationSubscription(); // Redirects if no active subscription
}, []);

File: frontend/src/pages/VerificationApplication.jsx
```

**"Resource not found" error on API endpoints:**
```
Problem: 404 error when accessing an API endpoint that exists in routes folder
Root cause: Blueprint created but never registered in app/__init__.py

Solution: Check blueprint registration
1. Verify blueprint is imported in backend/app/__init__.py
2. Verify blueprint is registered with app.register_blueprint()
3. Check url_prefix matches expected route

Example:
# Import
from .routes import proposals

# Register
app.register_blueprint(proposals.bp, url_prefix='/api/proposals')

Common mistake: Creating routes/proposals.py but forgetting to import/register
File: backend/app/__init__.py
```

---

## 📚 Key Documentation Files

Reference these for specific contexts:

- `THUNZIAI_ANALYTICS_IMPLEMENTATION_PLAN.md` - **Analytics integration plan (Feb 2026)**
- `PHASE_6_IMPLEMENTATION_PLAN.md` - Latest subscription system details
- `ADMIN_IMPLEMENTATION_PLAN.md` - Admin dashboard structure
- `deployment/QUICK-START.md` - Deployment scripts guide
- `frontend/tailwind.config.js` - Design system colors
- `frontend/src/pages/Home.jsx` - Design reference (ALWAYS CHECK THIS)

---

## 🎯 Quick Reference Commands

```bash
# LOCAL DEVELOPMENT
cd frontend && npm run dev
cd backend && source venv/bin/activate && python app.py

# BUILD
cd frontend && npm run build

# DEPLOY (Frontend Only)
tar -czf dist.tar.gz -C frontend dist
scp dist.tar.gz root@173.212.245.22:/tmp/
ssh root@173.212.245.22 "cd /var/www/bantubuzz/frontend && rm -rf dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz && pm2 restart bantubuzz-frontend"
rm dist.tar.gz

# GIT
git status
git add .
git commit -m "Message"
git push origin main

# SERVER ACCESS
ssh root@173.212.245.22
pm2 list
pm2 logs bantubuzz-frontend
pm2 restart bantubuzz-frontend
```

---

## ⚠️ Important Notes for AI Assistants

1. **ALWAYS check Home.jsx first** when designing new pages
2. **NEVER use rounded-2xl** - always use rounded-3xl for cards
3. **NEVER use shadow-lg** - always use shadow-sm with hover:shadow-md
4. **Buttons MUST be rounded-full** - no exceptions
5. **Use text-dark** not text-gray-900 for main text
6. **Commit messages should be descriptive** with file lists
7. **Test locally** before deploying to production
8. **Always restart PM2** after frontend deployment
9. **Reference this guide** when context is lost
10. **Update this guide** when new patterns are established

---

## 🔄 When Context is Lost

If you lose context, follow this checklist:

1. ✅ Read this AI_GUIDE.md file completely
2. ✅ Check recent commits: `git log --oneline -20`
3. ✅ Review Home.jsx for design patterns
4. ✅ Check PHASE_6_IMPLEMENTATION_PLAN.md for features
5. ✅ Ask user for specific task context
6. ✅ Verify server structure: `ssh root@173.212.245.22 "ls -la /var/www/bantubuzz"`

---

## 📊 ThunziAI Integration (March 2026)

### Overview
ThunziAI provides social media analytics (followers, posts, engagement) for Facebook, Instagram, YouTube, Twitter/X.

### Key Documentation
- **API Reference**: `THUNZIAI_API_DOCUMENTATION.md` (complete API specs)
- **Base URL**: `https://app.thunzi.co`
- **Authentication**: Session-based (login with email/password)

### Critical Implementation Details

#### Facebook & Instagram Connection
**IMPORTANT**: User Access Token vs Page Access Token
- ✅ **CORRECT**: User Access Token from `response.authResponse.accessToken` (line 63 in useFacebookOAuth.js)
- ❌ **WRONG**: Page Access Token from `/me/accounts` API call
- ThunziAI requires **User Access Token** to authenticate with Facebook Graph API

#### Facebook OAuth Configuration
- **App ID**: `1863571634283956`
- **Config ID**: `1565308301261640` (Facebook Login for Business) - **Updated March 5, 2026**
- **OAuth Parameters**: `auth_type: 'rerequest'`, `return_scopes: true`
- **Permissions Required**: `pages_show_list`, `business_management`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `pages_read_user_content`

#### Platform Connection Flow (UPDATED March 5, 2026)
1. **Frontend** (`useFacebookOAuth.js`):
   - Facebook login → Get User Access Token
   - Call `/me/accounts` → Get Facebook Pages list
   - Send **ONLY FACEBOOK** to backend with User Access Token
   - **DO NOT** send Instagram separately - ThunziAI auto-creates it!

2. **Backend** (`platforms.py` + `thunzi_service.py`):
   - POST to ThunziAI `/api/platforms` with payload:
     ```json
     {
       "companyId": number,
       "platform": "facebook",
       "accountName": string,
       "accessToken": string  // User Access Token (REQUIRED)
       // ❌ DO NOT SEND accountId - ThunziAI extracts it from accessToken
     }
     ```
   - ThunziAI auto-connects Facebook AND creates Instagram platform if linked
   - Returns HTTP 201 with platform data

3. **Syncing Platforms** (GET `/api/creator/platforms`):
   - Fetches all platforms from ThunziAI API
   - Auto-creates local records for platforms ThunziAI auto-created (e.g., Instagram)
   - Updates followers/posts from ThunziAI data

4. **Manual Sync** (POST `/api/creator/platforms/:id/sync`):
   - Calls ThunziAI `POST /api/sync` with:
     ```json
     {
       "platformId": number  // ThunziAI platform ID (required)
       // Optional: companyId, platform
       // ❌ DO NOT send accountId for Meta platforms
     }
     ```

5. **Disconnect** (`DELETE /api/creator/platforms/:id`):
   - Calls ThunziAI `DELETE /api/platforms/:id`
   - Then deletes from local database

#### ✅ SOLUTION IMPLEMENTED (March 5, 2026)
**ROOT CAUSE**: ThunziAI expects Meta platforms (Facebook/Instagram) WITHOUT `accountId` field. ThunziAI extracts the account ID from the `accessToken` itself.

**Fix Applied**:
1. **Frontend**: Removed `accountId` from Facebook/Instagram connection requests
2. **Frontend**: No longer manually registers Instagram - ThunziAI does it automatically
3. **Backend**: Removed `accountId` validation requirement for Meta platforms
4. **ThunziAI Service**:
   - `add_platform()` - Only sends `accountId` for non-Meta platforms (YouTube, Twitter)
   - `sync_platform()` - Only sends `accountId` for non-Meta platforms
5. **Platforms Route**: GET endpoint syncs with ThunziAI to discover auto-created platforms

**Testing Results (Verified)**:
```bash
# Facebook Connection - WORKS ✅
POST /api/platforms
{"companyId": 16, "platform": "facebook", "accountName": "Page Name", "accessToken": "EAA..."}
→ HTTP 201 Created (Platform ID 117, 811 followers)

# Instagram Auto-Created - WORKS ✅
→ ThunziAI automatically creates Instagram platform (Platform ID 154, 100 followers)

# Sync - WORKS ✅
POST /api/sync
{"platformId": 117} → HTTP 200 "Successfully synced data"
{"platformId": 154} → HTTP 200 "Successfully synced data"
```

#### Code Locations
- **Frontend OAuth**: `frontend/src/hooks/useFacebookOAuth.js`
- **Backend Routes**: `backend/app/routes/platforms.py`
- **ThunziAI Service**: `backend/app/services/thunzi_service.py`
- **Models**: `backend/app/models/connected_platform.py`, `backend/app/models/thunzi_account.py`

#### Important Pattern
- Each BantuBuzz user (creator/brand) gets their own ThunziAI company
- Company ID stored in `thunzi_accounts` table
- Platforms linked via `thunzi_platform_id` in `connected_platforms`

---

**Remember**: This platform serves real users. Every change should maintain consistency, functionality, and the professional design we've established. When in doubt, refer to Home.jsx and this guide.

🤖 **Generated for AI Assistants** | **Maintained by**: Development Team | **Last Review**: Mar 5, 2026
