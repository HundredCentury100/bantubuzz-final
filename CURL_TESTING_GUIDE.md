# 🧪 BantuBuzz - cURL Testing Guide

> **Complete guide to testing BantuBuzz with cURL**

---

## ✅ Prerequisites

Before testing with cURL, make sure:

1. **Backend is running**:
   ```bash
   cd backend
   python run.py
   ```
   You should see output like:
   ```
   * Running on http://0.0.0.0:5000
   ```

2. **Frontend is running** (optional for API testing):
   ```bash
   cd frontend
   npm run dev
   ```

---

## 🔍 Common Error: "Cannot GET /api/health"

### Problem
When you see "Cannot GET /api/health", it means:
- ❌ Backend server is **NOT running**
- ❌ You're trying to access a URL in the browser/curl but the server isn't started

### Solution
**Always start the backend server FIRST:**

```bash
# Open a terminal
cd "d:\Bantubuzz Platform\backend"

# Activate virtual environment (if not already)
venv\Scripts\activate

# Start the server
python run.py
```

You should see:
```
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://192.168.x.x:5000
```

**Keep this terminal open!** The server must stay running.

---

## 🧪 Testing with cURL

### Test 1: Health Check (No Auth Required)

```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "message": "BantuBuzz API is running",
  "status": "healthy"
}
```

**If you get "Connection refused" or "Cannot connect":**
- ❌ Server is not running
- ✅ Start the server: `python run.py`

---

### Test 2: Register a Creator

```bash
curl -X POST http://localhost:5000/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testcreator@example.com\",\"password\":\"Test123456\"}"
```

**Expected Response:**
```json
{
  "message": "Creator account created successfully. Please check your email to verify your account.",
  "user": {
    "id": 1,
    "email": "testcreator@example.com",
    "user_type": "creator",
    "is_verified": false,
    "is_active": true,
    ...
  }
}
```

---

### Test 3: Register a Brand

```bash
curl -X POST http://localhost:5000/api/auth/register/brand \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testbrand@example.com\",\"password\":\"Test123456\",\"company_name\":\"Test Company\"}"
```

---

### Test 4: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"creator@example.com\",\"password\":\"password123\"}"
```

**Expected Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhb...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
  "user": {...},
  "profile": {...}
}
```

**Save the access_token** - you'll need it for authenticated requests!

---

### Test 5: Get Current User (Requires Auth)

First, login and copy the `access_token` from the response.

```bash
# Replace YOUR_TOKEN with the actual token
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example with full token:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

---

### Test 6: Get All Creators

```bash
curl http://localhost:5000/api/creators
```

**Expected Response:**
```json
{
  "creators": [...],
  "total": 1,
  "pages": 1,
  "current_page": 1
}
```

---

### Test 7: Get Specific Creator

```bash
curl http://localhost:5000/api/creators/1
```

---

### Test 8: Get All Packages

```bash
curl http://localhost:5000/api/packages
```

---

## 📝 Windows CMD vs PowerShell vs Git Bash

### Windows CMD
```cmd
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"creator@example.com\",\"password\":\"password123\"}"
```
Note: Use `^` for line continuation

### PowerShell
```powershell
curl.exe -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"creator@example.com\",\"password\":\"password123\"}'
```
Note: Use `curl.exe` (not curl alias) and backtick `` ` `` for continuation

### Git Bash / Linux / Mac
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"password123"}'
```
Note: Use backslash `\` and single quotes for JSON

---

## 🔐 Testing Protected Endpoints

Many endpoints require authentication. Here's the workflow:

### Step 1: Login and get token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"creator@example.com\",\"password\":\"password123\"}" \
  > login_response.json
```

### Step 2: Extract token (manually or with jq)
```bash
# If you have jq installed:
TOKEN=$(cat login_response.json | jq -r '.access_token')

# Otherwise, copy the token manually from login_response.json
```

### Step 3: Use token in requests
```bash
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Complete Test Sequence

Run these commands in order to test the full flow:

```bash
# 1. Health check
curl http://localhost:5000/api/health

# 2. Register creator
curl -X POST http://localhost:5000/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"newcreator@test.com\",\"password\":\"Test123456\"}"

# 3. Login with test account
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"creator@example.com\",\"password\":\"password123\"}"

# 4. Copy the access_token from response

# 5. Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 6. Get creators list
curl http://localhost:5000/api/creators

# 7. Get packages list
curl http://localhost:5000/api/packages
```

---

## 🐛 Troubleshooting

### Error: "Connection refused" or "Failed to connect"
**Cause**: Backend server is not running
**Solution**:
```bash
cd backend
python run.py
```

### Error: "Cannot GET /api/health"
**Cause**: Same as above - server not running
**Solution**: Start the backend server

### Error: 401 Unauthorized
**Cause**: Missing or invalid token
**Solution**:
1. Login to get a fresh token
2. Include token: `-H "Authorization: Bearer YOUR_TOKEN"`

### Error: 404 Not Found
**Cause**: Wrong endpoint URL
**Solution**: Check the route in the API endpoints list

### Error: 500 Internal Server Error
**Cause**: Server-side error
**Solution**:
1. Check backend terminal for error details
2. Check if database is initialized: `flask db upgrade`

### Error: "Invalid JSON"
**Cause**: Malformed JSON in request
**Solution**:
- Check quotes are properly escaped: `\"`
- Use proper JSON format
- Try with single-line JSON

---

## 📋 All Available Endpoints

### Authentication
```bash
POST   /api/auth/register/creator
POST   /api/auth/register/brand
POST   /api/auth/login
POST   /api/auth/logout                    [AUTH]
POST   /api/auth/refresh
GET    /api/auth/me                        [AUTH]
GET    /api/auth/verify/<token>
POST   /api/auth/forgot-password
POST   /api/auth/reset-password/<token>
```

### Users
```bash
GET    /api/users/profile                  [AUTH]
PUT    /api/users/profile                  [AUTH]
```

### Creators
```bash
GET    /api/creators
GET    /api/creators/<id>
```

### Brands
```bash
GET    /api/brands/<id>
GET    /api/brands/saved-creators          [AUTH]
POST   /api/brands/saved-creators/<id>     [AUTH]
DELETE /api/brands/saved-creators/<id>     [AUTH]
```

### Packages
```bash
GET    /api/packages
GET    /api/packages/<id>
POST   /api/packages                       [AUTH - Creator]
PUT    /api/packages/<id>                  [AUTH - Creator]
DELETE /api/packages/<id>                  [AUTH - Creator]
```

### Campaigns
```bash
GET    /api/campaigns                      [AUTH - Brand]
GET    /api/campaigns/<id>
POST   /api/campaigns                      [AUTH - Brand]
PUT    /api/campaigns/<id>                 [AUTH - Brand]
DELETE /api/campaigns/<id>                 [AUTH - Brand]
```

### Bookings
```bash
GET    /api/bookings                       [AUTH]
GET    /api/bookings/<id>                  [AUTH]
POST   /api/bookings                       [AUTH - Brand]
PUT    /api/bookings/<id>/status           [AUTH]
```

### Messages
```bash
GET    /api/messages                       [AUTH]
POST   /api/messages                       [AUTH]
PUT    /api/messages/<id>/read             [AUTH]
GET    /api/messages/conversations         [AUTH]
```

### Notifications
```bash
GET    /api/notifications                  [AUTH]
PUT    /api/notifications/<id>/read        [AUTH]
PUT    /api/notifications/mark-all-read    [AUTH]
```

### Analytics
```bash
GET    /api/analytics/dashboard            [AUTH]
GET    /api/analytics/earnings             [AUTH - Creator]
```

**[AUTH]** = Requires Authorization header with Bearer token

---

## 💡 Pro Tips

1. **Use Postman or Insomnia** for easier API testing with GUI
2. **Save tokens** in environment variables for easier testing
3. **Pretty print JSON** responses with `| jq` (if installed)
4. **Keep server running** in a separate terminal window
5. **Check backend logs** for detailed error messages

---

## 🚀 Quick Test Script

Save this as `test_api.bat` (Windows) or `test_api.sh` (Mac/Linux):

```bash
@echo off
echo Testing BantuBuzz API...
echo.

echo [1] Health Check...
curl http://localhost:5000/api/health
echo.
echo.

echo [2] Get Creators...
curl http://localhost:5000/api/creators
echo.
echo.

echo [3] Get Packages...
curl http://localhost:5000/api/packages
echo.
echo.

echo All tests complete!
pause
```

Run it: `test_api.bat`

---

## ✅ Success Checklist

- [x] Backend server is running
- [x] Health endpoint returns 200
- [x] Can register new user
- [x] Can login and get token
- [x] Can access protected endpoint with token
- [x] All responses are valid JSON

---

**Happy Testing!** 🧪

For more help, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
