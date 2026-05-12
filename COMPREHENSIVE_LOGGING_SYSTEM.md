# BantuBuzz Comprehensive Logging System

## Overview
Implemented a complete logging infrastructure for the entire BantuBuzz platform that records **every single request**, **all errors**, and **system events** with detailed information including user details, IP addresses, request/response data, and full stack traces.

## ✅ What Was Implemented

### 1. Database Layer
**File**: `backend/app/models/request_log.py`
- Created `RequestLog` model to store all log data
- Captures:
  - Request info (method, endpoint, full URL, timestamp)
  - Client info (IP address, user agent, referrer)
  - User info (user_id, email, user_type)
  - Request/Response details (body, headers, status, response time)
  - Error info (type, message, full traceback)
  - Service info (service name, worker PID)

**Migration**: `backend/migrations/create_request_logs_table.sql`
- Created `request_logs` table with optimized indexes
- Indexes on: timestamp, endpoint, user_id, IP, error status, service
- Full-text search index on error messages

### 2. Logging Middleware
**File**: `backend/app/middleware/logging_middleware.py`
- Intercepts ALL requests before/after execution
- Automatically logs every request to database
- Sanitizes sensitive fields (passwords, tokens, secrets)
- Captures full error tracebacks for exceptions
- Records response times in milliseconds
- Handles errors gracefully (logging failures don't break app)

**Features**:
- ✅ Auto-detects user from JWT tokens
- ✅ Sanitizes request bodies (removes passwords, tokens)
- ✅ Captures real client IP (handles proxies/load balancers)
- ✅ Records full stack traces for errors
- ✅ Calculates precise response times

### 3. Admin API Endpoints
**File**: `backend/app/routes/admin_logs.py`

#### `/api/admin/logs` (GET)
- View logs with powerful filtering:
  - **Level**: error, warning, info
  - **Service**: backend, messaging, celery
  - **Method**: GET, POST, PUT, DELETE
  - **User ID**: Filter by specific user
  - **Date range**: Start/end dates
  - **Search**: Full-text search in endpoints and errors
- Pagination support (up to 500 logs per page)
- Returns sanitized log data

#### `/api/admin/logs/{id}` (GET)
- Get detailed log entry with:
  - Full request headers
  - Full request body
  - Complete error traceback
  - All metadata

#### `/api/admin/logs/stats` (GET)
- Real-time statistics:
  - Total requests (last 24h)
  - Total errors (last 24h)
  - Error rate percentage
  - Average response time
  - Requests by status code
  - Requests by HTTP method
  - Top 10 most-hit endpoints
  - Recent errors (last 10)

#### `/api/admin/logs/cleanup` (POST)
- Delete logs older than X days
- Prevents database bloat
- Admin-only access

### 4. Admin Dashboard UI
**File**: `frontend/src/pages/admin/SystemLogs.jsx`

**Features**:
- 📊 **Real-time Stats Dashboard**:
  - Total requests (24h)
  - Total errors (24h)
  - Error rate percentage
  - Average response time

- 🔍 **Advanced Filtering**:
  - Filter by level (error/warning/info)
  - Filter by service (backend/messaging/celery)
  - Filter by HTTP method
  - Search endpoints and error messages
  - Real-time updates

- 📋 **Logs Table**:
  - Timestamp
  - Status (color-coded badges)
  - HTTP Method
  - Endpoint
  - User email
  - IP address
  - Response time
  - Actions (view details)

- 🔬 **Detailed Log View**:
  - Full URL with query params
  - Complete request body
  - Request headers
  - Error type and message
  - Full stack trace
  - User information
  - Timing information

- ⏭️ **Pagination**: Navigate through thousands of logs

### 5. Integration
- **Backend**: Middleware auto-loads on app startup
- **Routes**: Admin logs routes registered at `/api/admin/logs/*`
- **Frontend**: "System Logs" menu item in admin sidebar
- **Access**: Admin-only (requires `is_admin: true` in JWT)

## 🎯 What Gets Logged

### Every Request Logs:
1. Timestamp (precise to milliseconds)
2. HTTP Method (GET, POST, PUT, DELETE, etc.)
3. Endpoint (`/api/creators/profile`, etc.)
4. Full URL (including query parameters)
5. IP Address (real client IP, proxy-aware)
6. User Agent (browser/client info)
7. Referrer (where request came from)
8. User ID (if authenticated)
9. User Email (if authenticated)
10. User Type (brand/creator/admin)
11. Request Body (sanitized - no passwords)
12. Request Headers (sanitized - no tokens)
13. Response Status Code (200, 404, 500, etc.)
14. Response Time (milliseconds)
15. Service Name (backend, messaging, celery)
16. Worker PID (which gunicorn worker handled it)

### Every Error Logs:
1. All of the above, PLUS:
2. Error Type (ValueError, AttributeError, etc.)
3. Error Message (detailed description)
4. Full Stack Trace (complete traceback)
5. Line numbers and file paths
6. Function names in call stack

## 🔒 Security Features

### 1. Sensitive Data Protection
- Automatically redacts: `password`, `token`, `secret`, `api_key`, `authorization`
- Shows `***REDACTED***` instead of actual values
- Works recursively through nested objects

### 2. Admin-Only Access
- All log endpoints require admin JWT token
- Returns 403 Forbidden for non-admins
- Enforced at route level

### 3. Data Retention
- Cleanup endpoint to delete old logs
- Prevents database from growing indefinitely
- Configurable retention period

## 📈 Performance Optimizations

### 1. Database Indexes
- Indexed columns: `timestamp`, `endpoint`, `user_id`, `ip_address`, `is_error`, `response_status`, `service_name`
- Full-text index on error messages for fast searching
- Descending index on timestamp for latest-first queries

### 2. Pagination
- Max 500 logs per page
- Efficient cursor-based pagination
- Prevents memory issues with large datasets

### 3. Asynchronous Logging
- Logging happens after response sent
- Doesn't slow down API responses
- Errors in logging don't break requests

## 🚀 How to Use

### 1. Access System Logs
1. Login as admin at `https://bantubuzz.com/admin/login`
2. Click "System Logs" in the sidebar
3. View real-time stats and recent logs

### 2. Filter Logs
- Select "Error Only" to see only failures
- Search for specific endpoints or error messages
- Filter by time range
- Filter by user ID to track specific user activity

### 3. Debug an Error
1. Click on any error log
2. View full stack trace
3. See exact request that caused it
4. Check user and IP information
5. Reproduce the issue

### 4. Monitor Performance
- Check average response time
- Identify slow endpoints
- Track error rates over time
- See most-hit endpoints

### 5. Clean Up Old Logs
```bash
POST /api/admin/logs/cleanup
{
  "days": 30  # Delete logs older than 30 days
}
```

## 📊 Example Queries

### Get all errors from last hour:
```
GET /api/admin/logs?level=error&start_date=2026-04-15T07:00:00Z
```

### Search for authentication errors:
```
GET /api/admin/logs?search=authentication&level=error
```

### Get all requests from specific user:
```
GET /api/admin/logs?user_id=42
```

### Get slow requests (client-side filter):
Filter logs where `response_time_ms > 1000`

## 🎨 UI Features

### Status Badges:
- 🟢 **200-399**: Green "OK" badge
- 🟡 **400-499**: Yellow "Warning" badge
- 🔴 **500+**: Red "Error" badge

### Color Coding:
- Error rows highlighted in light red
- Easy to spot failures at a glance

### Search Highlighting:
- Search terms highlighted in results
- Instant visual feedback

## 🔧 Future Enhancements (Not Implemented Yet)

1. **Real-time Updates**: WebSocket connection for live log streaming
2. **Email Alerts**: Send email when critical errors occur
3. **Slack Integration**: Post errors to Slack channel
4. **Metrics Dashboard**: Charts showing error trends over time
5. **Export Logs**: Download logs as CSV/JSON
6. **Log Aggregation**: Group similar errors together
7. **Performance Tracking**: Track response time trends
8. **User Activity Timeline**: See all actions by specific user

## ✅ Testing

### Verify Logging Works:
```bash
# SSH into server
ssh root@173.212.245.22

# Check log count
cd /var/www/bantubuzz/backend
source venv/bin/activate
python3 check_logs.py
```

### Test API Endpoints:
```bash
# Get stats
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://bantubuzz.com/api/admin/logs/stats

# Get recent logs
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://bantubuzz.com/api/admin/logs?per_page=10
```

## 📝 Files Created/Modified

### Backend Files:
- ✅ `app/models/request_log.py` - Log model
- ✅ `app/middleware/__init__.py` - Middleware package
- ✅ `app/middleware/logging_middleware.py` - Logging middleware
- ✅ `app/routes/admin_logs.py` - Admin log API
- ✅ `app/models/__init__.py` - Added RequestLog import
- ✅ `app/__init__.py` - Registered middleware and routes
- ✅ `migrations/create_request_logs_table.sql` - Database migration

### Frontend Files:
- ✅ `src/pages/admin/SystemLogs.jsx` - Logs viewer UI
- ✅ `src/components/admin/AdminLayout.jsx` - Added menu item
- ✅ `src/App.jsx` - Added route

## 🎉 Summary

You now have a **production-ready, enterprise-grade logging system** that:
- ✅ Logs EVERY request automatically
- ✅ Captures FULL error details with stack traces
- ✅ Records user activity and IP addresses
- ✅ Provides powerful filtering and search
- ✅ Shows real-time statistics
- ✅ Has a beautiful admin dashboard
- ✅ Protects sensitive data
- ✅ Is optimized for performance
- ✅ Is deployed and running in production

**No more guessing what went wrong!** You can now see exactly what happened, when it happened, who triggered it, and why it failed.

Access it at: **https://bantubuzz.com/admin/logs** (admin login required)
