# Debugging Report Message "Resource Not Found" Issue

**Date**: March 10, 2026
**Status**: Investigating

---

## What We Know

### ✅ Backend is Correct
1. **Route exists**: `/api/messaging/report` exists in `messaging_safety.py` at line 200
2. **Blueprint registered**: Confirmed in `__init__.py` at line 86 with prefix `/api/messaging`
3. **Endpoint accessible**: Test curl confirms endpoint responds (with JWT error as expected)

```bash
curl https://bantubuzz.com/api/messaging/report
# Returns: {"error": "Invalid token: Not enough segments"}
# This proves the endpoint exists!
```

### ✅ Frontend Code is Correct
1. **URL format**: `${import.meta.env.VITE_API_URL}/api/messaging/report`
2. **Environment variable**: `VITE_API_URL=https://bantubuzz.com/api`
3. **Full URL**: `https://bantubuzz.com/api/api/messaging/report` ❌ **DUPLICATE /api!**

---

## 🐛 **FOUND THE BUG!**

The issue is **URL duplication**:

### Current Setup:
```javascript
// .env file
VITE_API_URL=https://bantubuzz.com/api  // Already has /api

// ReportMessageModal.jsx line 32
fetch(`${import.meta.env.VITE_API_URL}/api/messaging/report`)
//     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ = https://bantubuzz.com/api
//                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^ + /api/messaging/report
// Result: https://bantubuzz.com/api/api/messaging/report ❌ 404 NOT FOUND
```

### Correct URL Should Be:
```
https://bantubuzz.com/api/messaging/report
```

---

## 🔧 Solution Options

### Option 1: Fix Environment Variable (RECOMMENDED)
Change `.env` to remove `/api`:
```env
VITE_API_URL=https://bantubuzz.com
```

Then the code will correctly build:
```javascript
${import.meta.env.VITE_API_URL}/api/messaging/report
// https://bantubuzz.com + /api/messaging/report
// ✅ https://bantubuzz.com/api/messaging/report
```

### Option 2: Fix Frontend Code
Change `ReportMessageModal.jsx` line 32:
```javascript
// Remove the /api prefix since it's already in VITE_API_URL
fetch(`${import.meta.env.VITE_API_URL}/messaging/report`)
```

### Option 3: Use Consistent Pattern
Check how other API calls are made in the codebase and match that pattern.

---

## 📋 Action Items

1. **Check `.env` file** - What is the actual value?
2. **Check other API calls** - How do they handle the URL?
3. **Fix the duplication** - Choose one of the solution options
4. **Rebuild frontend** - After fixing the .env or code
5. **Test on production** - Verify the report feature works

---

## 🔍 How to Verify

### Test 1: Check Environment Variable
```bash
cat "d:\Bantubuzz Platform\frontend\.env"
```

### Test 2: Check Other API Calls
```bash
grep -r "import.meta.env.VITE_API_URL" "d:\Bantubuzz Platform\frontend\src" | head -5
```

### Test 3: After Fix, Test Locally
```bash
cd "d:\Bantubuzz Platform\frontend"
npm run dev
# Open browser console and try reporting
# Check Network tab for the actual URL being called
```

---

## 🎯 Most Likely Root Cause

Looking at the `.env` file:
```env
VITE_API_URL=https://bantubuzz.com/api  # ← This already includes /api
```

So when the code does:
```javascript
`${import.meta.env.VITE_API_URL}/api/messaging/report`
```

It becomes:
```
https://bantubuzz.com/api/api/messaging/report  # ← WRONG! 404!
```

**Fix**: Change `.env` to:
```env
VITE_API_URL=https://bantubuzz.com
```

---

## ✅ Next Steps

1. Confirm this is the issue by checking browser DevTools Network tab
2. Fix the `.env` file
3. Rebuild frontend: `npm run build`
4. Deploy to production
5. Test again

**Would you like me to:**
- A) Fix the `.env` file and rebuild?
- B) Check how other components handle API URLs first?
- C) Something else?
