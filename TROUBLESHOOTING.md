# BantuBuzz - Troubleshooting Guide

## Fixed Issues ✅

### ✅ 1. Eventlet Async Mode Error
**Error**: `ValueError: Invalid async_mode specified`

**Fix Applied**:
- Changed SocketIO async mode from `eventlet` to `threading`
- Removed `eventlet` dependency
- Added `simple-websocket` for WebSocket support

**Status**: FIXED - You can now run `python run.py`

---

## Common Issues & Solutions

### Backend Issues

#### Issue: ModuleNotFoundError
**Symptoms**:
```
ModuleNotFoundError: No module named 'flask'
```

**Solutions**:
1. Make sure virtual environment is activated:
   ```bash
   cd backend
   venv\Scripts\activate  # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

#### Issue: Database Connection Error
**Symptoms**:
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solutions**:
1. **Using SQLite (Default)**:
   - No action needed - SQLite is file-based
   - Database file will be created automatically

2. **Using PostgreSQL**:
   - Make sure PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Create database: `CREATE DATABASE bantubuzz;`

#### Issue: Migration Errors
**Symptoms**:
```
flask db migrate fails
```

**Solutions**:
1. Delete migrations folder and start fresh:
   ```bash
   rmdir /s migrations  # Windows
   rm -rf migrations    # Mac/Linux

   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

2. If table already exists:
   ```bash
   flask db stamp head
   ```

#### Issue: Port Already in Use
**Symptoms**:
```
OSError: [Errno 48] Address already in use
```

**Solution**:
1. Find and kill the process:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F

   # Mac/Linux
   lsof -ti:5000 | xargs kill -9
   ```

2. Or change the port in `run.py`:
   ```python
   socketio.run(app, debug=app.config['DEBUG'], host='0.0.0.0', port=5001)
   ```

#### Issue: CORS Error
**Symptoms**:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution**:
- Verify FRONTEND_URL in backend/.env matches your frontend URL
- Default is http://localhost:3000
- Make sure backend is running on port 5000

#### Issue: JWT Token Error
**Symptoms**:
```
{"msg": "Token has expired"}
```

**Solution**:
1. Login again to get a new token
2. Increase token expiry in .env:
   ```
   JWT_ACCESS_TOKEN_EXPIRES=7200  # 2 hours
   ```

### Frontend Issues

#### Issue: npm install fails
**Symptoms**:
```
npm ERR! code ERESOLVE
```

**Solution**:
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### Issue: Vite Port Error
**Symptoms**:
```
Port 3000 is already in use
```

**Solution**:
1. Change port in `vite.config.js`:
   ```javascript
   server: {
     port: 3001,  // Change to 3001
   }
   ```

2. Update backend/.env:
   ```
   FRONTEND_URL=http://localhost:3001
   ```

#### Issue: API Calls Fail
**Symptoms**:
- Network errors in browser console
- 404 Not Found

**Solutions**:
1. Check backend is running (http://localhost:5000/api/health)
2. Verify VITE_API_URL in frontend/.env
3. Check browser console for CORS errors

#### Issue: Cannot Login
**Symptoms**:
- Login form submits but nothing happens
- "Invalid credentials" error

**Solutions**:
1. Check backend logs for errors
2. Verify user exists in database:
   ```bash
   # Using SQLite
   sqlite3 backend/bantubuzz.db
   SELECT * FROM users;
   .quit
   ```

3. Seed database if no users exist:
   ```bash
   cd backend
   flask seed_db
   ```

### Database Issues

#### Issue: SQLite Database Locked
**Symptoms**:
```
sqlite3.OperationalError: database is locked
```

**Solution**:
1. Close all connections to the database
2. Restart the backend server
3. If persists, delete `bantubuzz.db` and re-initialize

#### Issue: PostgreSQL Connection Refused
**Symptoms**:
```
psycopg2.OperationalError: could not connect
```

**Solutions**:
1. Start PostgreSQL service:
   ```bash
   # Windows
   net start postgresql

   # Mac
   brew services start postgresql

   # Linux
   sudo systemctl start postgresql
   ```

2. Verify connection string in .env

#### Issue: Table Does Not Exist
**Symptoms**:
```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable)
```

**Solution**:
```bash
flask db upgrade
```

### Email Issues

#### Issue: Email Not Sending
**Symptoms**:
- No verification email received
- Email errors in logs

**Solutions**:
1. Email is optional for development
2. To configure Gmail:
   - Enable 2-Step Verification
   - Generate App Password
   - Update .env:
     ```
     MAIL_USERNAME=your-email@gmail.com
     MAIL_PASSWORD=your-16-char-app-password
     ```

3. For development, skip email verification:
   - Login to database
   - Set `is_verified=True` manually

### Payment Issues

#### Issue: Paynow Integration Error
**Symptoms**:
- Payment initialization fails

**Solutions**:
1. Paynow is optional for development
2. To configure:
   - Sign up at paynow.co.zw
   - Get Integration ID and Key
   - Update .env with credentials

---

## Diagnostic Commands

### Check Backend Status
```bash
cd backend

# Test imports
python -c "from app import create_app; print('OK')"

# Check database
sqlite3 bantubuzz.db ".tables"

# List installed packages
pip list

# Check Flask version
flask --version
```

### Check Frontend Status
```bash
cd frontend

# Check Node/npm versions
node --version
npm --version

# List installed packages
npm list --depth=0

# Check for errors
npm run dev
```

### Full System Check
```bash
# Backend health
curl http://localhost:5000/api/health

# Frontend accessible
curl http://localhost:3000

# Database tables
sqlite3 backend/bantubuzz.db ".schema"
```

---

## Quick Reset

If everything is broken, start fresh:

```bash
# Backend
cd backend
rmdir /s venv migrations  # Windows
pip install -r requirements.txt
flask db init
flask db migrate -m "Initial"
flask db upgrade
flask seed_db

# Frontend
cd frontend
rmdir /s node_modules  # Windows
npm install

# Start both
cd backend && python run.py
cd frontend && npm run dev
```

---

## Getting Help

### Before Asking for Help

1. ✅ Read error message completely
2. ✅ Check this troubleshooting guide
3. ✅ Check backend logs (terminal running Flask)
4. ✅ Check frontend console (browser DevTools)
5. ✅ Verify .env files are configured
6. ✅ Ensure both backend and frontend are running

### Provide These Details

When reporting an issue:
- Full error message
- Command that caused the error
- Operating system
- Python version (`python --version`)
- Node version (`node --version`)
- What you've already tried

---

## Success Checklist

Backend is working if:
- ✅ `python run.py` starts without errors
- ✅ http://localhost:5000/api/health returns JSON
- ✅ No error messages in terminal
- ✅ Database file exists (bantubuzz.db)

Frontend is working if:
- ✅ `npm run dev` starts without errors
- ✅ http://localhost:3000 loads the page
- ✅ No errors in browser console
- ✅ Can see the BantuBuzz landing page

Integration is working if:
- ✅ Can register a new account
- ✅ Can login successfully
- ✅ Dashboard loads after login
- ✅ No CORS errors in console

---

**Status**: Most common issues documented and solutions provided ✅
