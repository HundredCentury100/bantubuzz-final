# 🤖 AI Assistant Guide for BantuBuzz Platform

**Last Updated**: March 2, 2026
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
ssh root@173.212.245.22 "sudo -u postgres psql bantubuzz_db"
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

### Current State (Mar 2026)
✅ Fully functional platform
✅ Complete subscription systems (brand + creator)
✅ Collabstr-style pricing with tiered service fees
✅ Payment integration (Paynow + manual)
✅ Admin dashboard
✅ Messaging with real-time updates
✅ Design system consistency achieved
✅ Critical bugs fixed and deployed to production
✅ Save Creator feature with dedicated page
✅ Creators without packages hidden from browse (enforced)
✅ Multi-select languages filter
✅ Bio character counter
✅ Dynamic service fee calculation per tier (complete)
✅ Browse Packages responsive redesign with all working filters
✅ Twitter/X icon update
✅ Required creator profile fields (city, country, followers, categories, platforms)
✅ 14-day escrow period (reduced from 30 days)
✅ Lowest package price displayed on creator cards
🔄 Analytics integration planning complete (awaiting implementation)

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

---

## 🔧 Troubleshooting Guide

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

**Remember**: This platform serves real users. Every change should maintain consistency, functionality, and the professional design we've established. When in doubt, refer to Home.jsx and this guide.

🤖 **Generated for AI Assistants** | **Maintained by**: Development Team | **Last Review**: Feb 24, 2026
