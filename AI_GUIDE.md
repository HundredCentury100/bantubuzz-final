# 🤖 AI Assistant Guide for BantuBuzz Platform

**Last Updated**: February 23, 2026
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

#### 1. **Card Design**
```jsx
// CORRECT - Homepage style
<div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 md:p-8">

// WRONG - Don't use
<div className="bg-white rounded-2xl shadow-lg">
```

**Rules:**
- ✅ Use `rounded-3xl` for ALL cards
- ✅ Use `shadow-sm` default, `hover:shadow-md` on hover
- ✅ Padding: `p-6 md:p-8` for cards
- ❌ Never use `rounded-2xl`, `rounded-lg`, or `shadow-lg`

#### 2. **Buttons**
```jsx
// CORRECT - All buttons must be rounded-full
<button className="px-8 py-3 bg-dark text-white rounded-full font-medium hover:bg-gray-800">
<button className="px-8 py-3 bg-primary text-dark rounded-full font-semibold hover:bg-primary/90">

// WRONG
<button className="px-6 py-4 bg-dark text-white rounded-xl">
```

**Rules:**
- ✅ Always `rounded-full`
- ✅ Padding: `px-8 py-3` (standard), `px-6 py-3` (compact)
- ✅ Font: `font-medium` (normal) or `font-semibold` (emphasis)
- ❌ Never use `rounded-xl`, `rounded-2xl`, or `rounded-lg`

#### 3. **Typography**
```jsx
// Page headers
<h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-dark mb-6 leading-tight">

// Section headers
<h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">

// Body text
<p className="text-lg md:text-xl text-gray-600 leading-relaxed">
```

#### 4. **Color Usage**
- **Primary Text**: Use `text-dark` (NOT `text-gray-900`)
- **Secondary Text**: Use `text-gray-600`
- **Backgrounds**: `bg-white`, `bg-light`, `bg-primary`
- **Buttons**:
  - Dark: `bg-dark text-white hover:bg-gray-800`
  - Primary: `bg-primary text-dark hover:bg-primary/90`
  - Secondary: `bg-light text-dark hover:bg-gray-200`

#### 5. **Reference File**
**ALWAYS check** [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx) when designing new pages. It's the design system source of truth.

Key patterns from Home.jsx:
- Creator cards: `rounded-3xl`, `shadow-sm`, proper spacing
- Platform sections: Clean section padding `py-12 px-6 lg:px-12 xl:px-20`
- Buttons: `rounded-full` with proper hover states
- Gradients: Used sparingly in category cards

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

### Recent: Design System Alignment (Complete)
- Homepage design as reference (Home.jsx)
- All pages redesigned to match Homepage style
- Subscription pages updated (Feb 2026)
- Consistent card borders (rounded-3xl)
- Unified button styles (rounded-full)
- Proper color usage (primary, dark, light)

### Current State (Feb 2026)
✅ Fully functional platform
✅ Complete subscription systems (brand + creator)
✅ Payment integration (Paynow + manual)
✅ Admin dashboard
✅ Messaging with real-time updates
✅ Design system consistency achieved

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

---

## 📚 Key Documentation Files

Reference these for specific contexts:

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

🤖 **Generated for AI Assistants** | **Maintained by**: Development Team | **Last Review**: Feb 23, 2026
