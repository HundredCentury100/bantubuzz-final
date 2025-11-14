# 🚀 BantuBuzz - Quick Reference Card

## 📌 Bookmark This!

---

## ⚡ Start Servers

```bash
# Backend (Terminal 1)
cd backend
venv\Scripts\activate
python run.py

# Frontend (Terminal 2)
cd frontend
npm run dev
```

---

## 🌐 URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React app |
| Backend | http://localhost:5000 | Flask API |
| Health Check | http://localhost:5000/api/health | API status |

---

## 🔑 Test Accounts

| Type | Email | Password |
|------|-------|----------|
| Creator | creator@example.com | password123 |
| Brand | brand@example.com | password123 |

---

## 🎨 Brand Colors

```css
Primary:  #B5E61D  /* Lime Green */
Dark:     #1F2937  /* Dark Gray */
Light:    #F3F4F6  /* Light Gray */
Success:  #10B981  /* Green */
Warning:  #F59E0B  /* Orange */
Error:    #EF4444  /* Red */
```

---

## 📁 Key Directories

```
backend/app/models/     ← Database models
backend/app/routes/     ← API endpoints
backend/app/services/   ← Business logic
frontend/src/pages/     ← Page components
frontend/src/components/← Reusable components
```

---

## 🛠️ Common Commands

### Backend
```bash
flask db migrate -m "msg"  # Create migration
flask db upgrade           # Apply migrations
flask seed_db             # Seed test data
flask shell               # Interactive shell
flask routes              # List all routes
```

### Frontend
```bash
npm install package-name   # Add package
npm run dev               # Dev server
npm run build             # Build for production
```

### Database
```bash
sqlite3 backend/bantubuzz.db  # Open database
.tables                       # List tables
SELECT * FROM users;          # Query users
.quit                         # Exit
```

---

## 🔧 API Endpoints (Quick)

### Auth
```
POST /api/auth/register/creator
POST /api/auth/register/brand
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Creators
```
GET  /api/creators
GET  /api/creators/:id
```

### Packages
```
GET    /api/packages
POST   /api/packages
GET    /api/packages/:id
PUT    /api/packages/:id
DELETE /api/packages/:id
```

### Bookings
```
GET  /api/bookings
POST /api/bookings
PUT  /api/bookings/:id/status
```

---

## 🧪 Quick Tests

### Backend Health
```bash
curl http://localhost:5000/api/health
```

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123456"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"password123"}'
```

---

## 📂 Important Files

```
backend/.env              ← Configuration
backend/run.py            ← Start backend
backend/bantubuzz.db      ← SQLite database
frontend/package.json     ← Frontend dependencies
frontend/src/App.jsx      ← Main routing
frontend/src/services/api.js ← API client
```

---

## 🐛 Quick Fixes

### Backend won't start?
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

### Database error?
```bash
flask db upgrade
```

### Port in use?
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Frontend errors?
```bash
rm -rf node_modules
npm install
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `SUCCESS.md` | You are here! |
| `STARTUP_GUIDE.md` | Getting started |
| `CHECKLIST.md` | Verify setup |
| `TROUBLESHOOTING.md` | Fix issues |
| `DEVELOPMENT.md` | Build features |
| `README.md` | Full docs |

---

## ✅ Quick Health Check

**Backend OK if:**
- ✅ `python run.py` runs without errors
- ✅ http://localhost:5000/api/health returns JSON

**Frontend OK if:**
- ✅ `npm run dev` runs without errors
- ✅ http://localhost:3000 shows landing page

**Integration OK if:**
- ✅ Can register new account
- ✅ Can login successfully
- ✅ No CORS errors in browser console

---

## 🎯 Phase Status

```
✅ Phase 1: Foundation (DONE)
🚧 Phase 2: Core Features (NEXT)
📋 Phase 3: Communication
💳 Phase 4: Payments
🚀 Phase 5: Production
```

---

## 💡 Quick Tips

1. Both servers must be running
2. Use test accounts to save time
3. Check browser console (F12) for errors
4. Watch backend terminal for API logs
5. SQLite = easy, PostgreSQL = production

---

## 🚨 Emergency Reset

If everything is broken:
```bash
# Backend
cd backend
rmdir /s migrations
flask db init
flask db migrate -m "Initial"
flask db upgrade
flask seed_db

# Frontend
cd frontend
rmdir /s node_modules
npm install
```

---

## 📊 Project Stats

- **Models**: 10
- **Endpoints**: 40+
- **Pages**: 12
- **Files**: 60+
- **Lines**: 8,000+

---

## 🎨 Tailwind Classes

```jsx
{/* Buttons */}
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-outline">Outline</button>

{/* Inputs */}
<input className="input" />

{/* Cards */}
<div className="card">Content</div>

{/* Badges */}
<span className="badge badge-success">Success</span>
```

---

## 🔐 Security

- ✅ Passwords hashed (Werkzeug)
- ✅ JWT tokens
- ✅ CORS enabled
- ✅ Protected routes
- ✅ Input validation

---

## 📱 Tech Stack

**Backend:**
- Flask 3.0
- SQLAlchemy
- JWT Extended
- SocketIO
- SQLite/PostgreSQL

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- React Router v6
- TanStack Query

---

## 🎉 You're Ready!

Everything you need is at your fingertips!

**Next:** Pick a Phase 2 feature and start building! 💚

---

*BantuBuzz - African Creator-Brand Collaboration Platform*
