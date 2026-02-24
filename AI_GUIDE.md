# 🤖 AI Assistant Guide for BantuBuzz Platform

**Last Updated**: February 24, 2026
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
- **Subscription Tiers**: For both brands (Free, Starter, Pro, Agency) and creators (Featured, Verification)
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

### Directory Structure
```
/var/www/bantubuzz/
├── frontend/
│   ├── dist/              # Built React app (served by Express)
│   ├── src/              # Source files
│   ├── serve.js          # Express server
│   └── package.json
├── backend/
│   ├── app/              # Flask application
│   ├── migrations/       # Database migrations
│   ├── uploads/          # User uploads (served by nginx)
│   └── venv/             # Python virtual environment
└── messaging-service/
    └── server.js         # Socket.io messaging server
```

### Running Services (PM2)

```bash
# Check services
ssh root@173.212.245.22 "pm2 list"

# Services:
# - bantubuzz-backend      (Gunicorn on port 8002)
# - bantubuzz-frontend     (Express on port 8080)
# - bantubuzz-messaging    (Socket.io on port 8001)

# Restart services
ssh root@173.212.245.22 "pm2 restart bantubuzz-frontend"
ssh root@173.212.245.22 "pm2 restart bantubuzz-backend"
ssh root@173.212.245.22 "pm2 restart bantubuzz-messaging"

# View logs
ssh root@173.212.245.22 "pm2 logs bantubuzz-frontend --lines 50"
```

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

### Current State (Feb 2026)
✅ Fully functional platform
✅ Complete subscription systems (brand + creator)
✅ Payment integration (Paynow + manual)
✅ Admin dashboard
✅ Messaging with real-time updates
✅ Design system consistency achieved
✅ Critical bugs fixed and deployed to production
🔄 Analytics integration planning complete (awaiting implementation)
🔄 Multi-select languages (in progress)
🔄 Bio character counter (pending)
🔄 Desktop "More Filters" button (pending)

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
