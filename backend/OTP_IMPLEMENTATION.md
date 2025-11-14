# OTP Email Verification Implementation

## Overview

BantuBuzz now uses **OTP (One-Time Password)** codes for email verification instead of verification tokens. When users sign up, they receive a 6-digit code via email that expires in 10 minutes.

---

## Features Implemented

### 1. OTP Model
- **Location**: `backend/app/models/otp.py`
- **Features**:
  - 6-digit random code generation
  - 10-minute expiry (configurable)
  - Purpose field (registration, password_reset, email_change)
  - Single-use validation (is_used flag)
  - Automatic expiry checking

### 2. Email Service
- **Location**: `backend/app/services/email_service.py`
- **New Function**: `send_otp_email(email, otp_code, purpose='registration')`
- **Features**:
  - Beautiful HTML email with BantuBuzz branding (#B5E61D lime green)
  - Large, prominent OTP code display
  - Expiry warning (10 minutes)
  - Purpose-specific messaging

### 3. Auth Endpoints

#### POST `/api/auth/register/creator`
**Modified to use OTP**
```json
// Request
{
  "email": "creator@example.com",
  "password": "YourPassword123"
}

// Response
{
  "message": "Creator account created successfully. Please check your email for the verification code.",
  "user": { ... },
  "requires_verification": true
}
```

#### POST `/api/auth/register/brand`
**Modified to use OTP**
```json
// Request
{
  "email": "brand@example.com",
  "password": "YourPassword123",
  "company_name": "Your Company Inc"
}

// Response
{
  "message": "Brand account created successfully. Please check your email for the verification code.",
  "user": { ... },
  "requires_verification": true
}
```

#### POST `/api/auth/verify-otp` (NEW)
**Verify OTP code**
```json
// Request
{
  "email": "user@example.com",
  "code": "123456"
}

// Response (Success)
{
  "message": "Email verified successfully",
  "user": { ... }
}

// Response (Error - Invalid Code)
{
  "error": "Invalid verification code"
}

// Response (Error - Expired)
{
  "error": "Verification code has expired"
}
```

#### POST `/api/auth/resend-otp` (NEW)
**Resend OTP code**
```json
// Request
{
  "email": "user@example.com"
}

// Response
{
  "message": "Verification code sent successfully"
}
```

---

## SMTP Configuration

### Current Settings (in `.env`)
```env
MAIL_SERVER=bantubuzz.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USE_TLS=False
MAIL_USERNAME=user@bantubuzz.com
MAIL_PASSWORD=-=hdZ!J_pd^s
MAIL_DEFAULT_SENDER=user@bantubuzz.com
```

### Configuration Support (in `config.py`)
- Added `MAIL_USE_SSL` configuration option
- Supports both SSL (port 465) and TLS (port 587)
- Uses environment variables for all SMTP settings

---

## Database Changes

### New Table: `otps`
```sql
CREATE TABLE otps (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users (id)
)
```

### Migration Applied
- **Migration File**: `migrations/versions/9f12f6159b31_add_otp_table.py`
- **Status**: ✅ Applied successfully

---

## Testing

### Automated Test Script
**Location**: `backend/test_otp.py`

Run the interactive test script:
```bash
cd "d:\Bantubuzz Platform\backend"
python test_otp.py
```

**Available Tests**:
1. Register Creator - Creates test creator account
2. Register Brand - Creates test brand account
3. Verify OTP - Verifies OTP code (requires code from email)
4. Resend OTP - Requests new OTP code

### Manual Testing with cURL

#### 1. Register a Creator
```bash
curl -X POST http://localhost:5000/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testcreator@example.com\",\"password\":\"Test123456\"}"
```

#### 2. Check Email for OTP
- Subject: "Your BantuBuzz verification code: 123456"
- Check inbox for 6-digit code

#### 3. Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testcreator@example.com\",\"code\":\"123456\"}"
```

#### 4. Resend OTP (if needed)
```bash
curl -X POST http://localhost:5000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testcreator@example.com\"}"
```

---

## User Flow

### Registration Flow
1. **User submits registration form**
   - Frontend sends POST to `/api/auth/register/creator` or `/api/auth/register/brand`

2. **Backend creates account**
   - Creates User record (not verified yet)
   - Creates Profile record (Creator or Brand)
   - Generates 6-digit OTP code
   - Stores OTP in database with 10-minute expiry
   - Sends OTP via email

3. **User receives email**
   - Email contains 6-digit code
   - Code is valid for 10 minutes
   - Email shows expiry warning

4. **User enters OTP code**
   - Frontend sends POST to `/api/auth/verify-otp` with email and code

5. **Backend verifies OTP**
   - Finds matching OTP in database
   - Checks if code is correct
   - Checks if code is not expired
   - Checks if code is not already used
   - Marks user as verified
   - Marks OTP as used

6. **User can now login**
   - User account is fully activated
   - Can login with email and password

### Resend Flow
1. User clicks "Resend Code" button
2. Frontend sends POST to `/api/auth/resend-otp`
3. Backend generates new OTP
4. New OTP email is sent
5. Old OTPs remain in database but will expire naturally

---

## Email Template

### HTML Email Structure
- **Header**: Lime green (#B5E61D) with BantuBuzz logo text
- **Body**:
  - Welcome message
  - Large OTP code display (dark background with lime green text)
  - Expiry warning (10 minutes)
  - Security note
- **Footer**: Dark footer with copyright

### OTP Display
```
┌────────────────────────┐
│                        │
│      1  2  3  4  5  6  │  ← Large, bold, letter-spaced
│                        │
└────────────────────────┘
```

---

## Security Features

### OTP Security
1. **6-digit random code** - 1 million possible combinations
2. **10-minute expiry** - Limits brute force window
3. **Single-use** - Cannot reuse expired or used codes
4. **Purpose field** - Prevents cross-purpose OTP reuse
5. **Most recent OTP** - Query orders by created_at DESC

### Email Security
1. **SSL/TLS encryption** - Secure email transmission
2. **Authenticated SMTP** - Prevents spoofing
3. **Verified sender** - user@bantubuzz.com

### User Privacy
1. **No email enumeration** - Resend endpoint doesn't reveal if email exists
2. **Error messages** - Generic messages for invalid codes
3. **Rate limiting** - Can be added to prevent spam (future enhancement)

---

## Code Structure

### Files Modified
1. ✅ `backend/app/models/otp.py` - Created OTP model
2. ✅ `backend/app/models/__init__.py` - Added OTP import
3. ✅ `backend/app/services/email_service.py` - Added send_otp_email function
4. ✅ `backend/app/routes/auth.py` - Modified registration, added verify-otp and resend-otp
5. ✅ `backend/app/config.py` - Added MAIL_USE_SSL support
6. ✅ `backend/.env` - Updated SMTP credentials
7. ✅ `backend/migrations/versions/9f12f6159b31_add_otp_table.py` - Database migration

### Files Created
1. ✅ `backend/test_otp.py` - Interactive test script
2. ✅ `backend/OTP_IMPLEMENTATION.md` - This documentation

---

## Future Enhancements

### Potential Improvements
1. **Rate Limiting**
   - Limit OTP requests per email (e.g., 3 per hour)
   - Prevent spam and abuse

2. **SMS OTP Option**
   - Add phone number field
   - Send OTP via SMS as alternative

3. **2FA (Two-Factor Authentication)**
   - Use OTP for login (not just registration)
   - Add 2FA settings to user profile

4. **OTP for Password Reset**
   - Replace reset tokens with OTP
   - More user-friendly than clicking links

5. **Analytics**
   - Track OTP success rate
   - Monitor failed verification attempts
   - Alert on suspicious activity

6. **Cleanup Task**
   - Celery task to delete expired OTPs
   - Keep database clean

---

## Troubleshooting

### OTP Email Not Received

**Check 1: SMTP Configuration**
```bash
# Verify .env settings
cd "d:\Bantubuzz Platform\backend"
cat .env | findstr MAIL
```

**Check 2: Email Service Logs**
```bash
# Check server output for email errors
# Look for Flask-Mail error messages
```

**Check 3: Spam Folder**
- OTP emails might be filtered as spam
- Check user's spam/junk folder

**Check 4: Email Service Status**
- Verify bantubuzz.com email service is active
- Test SMTP connection manually

### OTP Verification Failed

**Error: "Invalid verification code"**
- Check if code matches exactly (6 digits)
- Ensure no spaces or extra characters
- Code is case-sensitive (digits only)

**Error: "Verification code has expired"**
- OTP expires after 10 minutes
- Request new OTP with resend-otp endpoint

**Error: "User not found"**
- Email might be incorrect
- Check email spelling
- Email is case-insensitive (stored as lowercase)

### Database Issues

**OTP table not found**
```bash
# Run migrations
cd "d:\Bantubuzz Platform\backend"
python -m flask db upgrade
```

**Multiple OTPs for user**
- This is normal - old OTPs expire naturally
- System always uses most recent OTP
- Can add cleanup task to delete old OTPs

---

## API Summary

### New Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/verify-otp` | Verify OTP code | No |
| POST | `/api/auth/resend-otp` | Resend OTP code | No |

### Modified Endpoints
| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/api/auth/register/creator` | Now sends OTP instead of token |
| POST | `/api/auth/register/brand` | Now sends OTP instead of token |

### Legacy Endpoints (Still Work)
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/api/auth/verify/<token>` | Legacy token-based verification |

---

## Success Metrics

### Implementation Status
- ✅ OTP model created
- ✅ Database migration applied
- ✅ Email service updated
- ✅ Auth endpoints modified
- ✅ SMTP configuration updated
- ✅ Test script created
- ✅ Documentation complete

### Ready for Testing
- ✅ Backend server running on http://localhost:5000
- ✅ All endpoints registered
- ✅ Database schema up to date
- ✅ Email service configured with bantubuzz.com SMTP

---

## Next Steps

### For Development
1. **Test OTP flow end-to-end**
   - Register test account
   - Verify OTP code received
   - Complete verification

2. **Update Frontend**
   - Add OTP input form after registration
   - Add resend OTP button
   - Update registration flow

3. **Monitor Email Delivery**
   - Check email logs
   - Verify delivery rate
   - Adjust SMTP if needed

### For Production
1. **Enable Rate Limiting**
   - Flask-Limiter on OTP endpoints
   - Prevent abuse

2. **Add Monitoring**
   - Track OTP generation
   - Monitor verification success rate
   - Alert on failures

3. **Setup Email Analytics**
   - Track open rates
   - Monitor bounce rates
   - Optimize email template

---

## Support

For issues or questions about OTP implementation:
1. Check this documentation
2. Review error messages in server logs
3. Test with `test_otp.py` script
4. Verify SMTP credentials in `.env`

---

**Implementation Date**: 2025-11-11
**Status**: ✅ Complete and Ready for Testing
**Version**: 1.0
