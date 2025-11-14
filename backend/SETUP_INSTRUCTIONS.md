# Backend Setup Instructions

## Fix Applied ✅

The `eventlet` async mode issue has been fixed. The SocketIO async mode is now set to `threading` which works with Python 3.13.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: If you get errors with `psycopg2-binary`, you can:
- Use SQLite instead (already configured in .env)
- Or install PostgreSQL and use it

### 2. Initialize Database

For SQLite (Quick Start - Default):
```bash
# The .env file is already configured for SQLite
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

For PostgreSQL (Production):
```bash
# First, create the database
# Then update .env with:
# DATABASE_URL=postgresql://username:password@localhost:5432/bantubuzz

flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 3. Seed Database (Optional)

```bash
flask seed_db
```

This creates test accounts:
- Creator: creator@example.com / password123
- Brand: brand@example.com / password123

### 4. Run the Server

```bash
python run.py
```

Server will start at: http://localhost:5000

### 5. Test the API

Visit: http://localhost:5000/api/health

You should see:
```json
{
  "status": "healthy",
  "message": "BantuBuzz API is running"
}
```

## Common Issues & Solutions

### Issue 1: `eventlet` error (FIXED ✅)
**Solution**: Already fixed - using `threading` async mode instead

### Issue 2: Database connection error
**Solution**:
- Using SQLite by default (no setup needed)
- Database file will be created automatically at `backend/bantubuzz.db`

### Issue 3: Module not found
**Solution**:
```bash
# Make sure virtual environment is activated
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Mac/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue 4: Port already in use
**Solution**: Change port in `run.py` line 96:
```python
socketio.run(app, debug=app.config['DEBUG'], host='0.0.0.0', port=5001)  # Change to 5001
```

### Issue 5: Flask db commands not working
**Solution**:
```bash
# Make sure FLASK_APP is set
set FLASK_APP=run.py  # Windows
# or
export FLASK_APP=run.py  # Mac/Linux

# Or use python -m flask
python -m flask db init
python -m flask db migrate -m "Initial migration"
python -m flask db upgrade
```

## Verification Checklist

- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Virtual environment activated
- [ ] Database initialized (`flask db upgrade`)
- [ ] Server runs without errors (`python run.py`)
- [ ] Health check returns success (http://localhost:5000/api/health)
- [ ] Database seeded (optional - `flask seed_db`)

## Next Steps

Once the backend is running:

1. **Test Authentication**:
   - Try registering: POST http://localhost:5000/api/auth/register/creator
   - Try logging in: POST http://localhost:5000/api/auth/login

2. **Start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Environment Variables (.env)

The `.env` file is already created with sensible defaults:
- ✅ SQLite database (no setup needed)
- ✅ Development mode
- ✅ JWT configured
- ⚠️ Email not configured (optional - for email verification)
- ⚠️ Paynow not configured (optional - for payments)

## Database Options

### Option 1: SQLite (Default - Easiest)
- ✅ Already configured
- ✅ No installation needed
- ✅ Good for development
- ❌ Not suitable for production

### Option 2: PostgreSQL (Recommended for Production)
1. Install PostgreSQL
2. Create database: `CREATE DATABASE bantubuzz;`
3. Update .env: `DATABASE_URL=postgresql://user:pass@localhost:5432/bantubuzz`
4. Run migrations: `flask db upgrade`

## Testing the API with curl

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register Creator
```bash
curl -X POST http://localhost:5000/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"creator@example.com\",\"password\":\"password123\"}"
```

## Support

If you encounter issues:
1. Check this document first
2. Review the error message carefully
3. Check the Flask logs in the terminal
4. Verify your .env file settings

---

**Status**: Backend ready to run! ✅
