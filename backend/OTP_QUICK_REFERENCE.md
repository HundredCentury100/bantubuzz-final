# OTP Quick Reference Card

## 🚀 Quick Start

### Test OTP Flow
```bash
cd "d:\Bantubuzz Platform\backend"
python test_otp.py
```

---

## 📡 API Endpoints

### Register with OTP
```bash
# Creator
curl -X POST http://localhost:5000/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# Brand
curl -X POST http://localhost:5000/api/auth/register/brand \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","company_name":"Test Inc"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

### Resend OTP
```bash
curl -X POST http://localhost:5000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🔑 SMTP Settings

```env
MAIL_SERVER=bantubuzz.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USERNAME=user@bantubuzz.com
MAIL_PASSWORD=-=hdZ!J_pd^s
```

---

## 📊 Database

### OTP Table Schema
```sql
CREATE TABLE otps (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Query OTPs
```python
# Get user's latest OTP
from app.models import OTP, User

user = User.query.filter_by(email='test@example.com').first()
otp = OTP.query.filter_by(user_id=user.id, is_used=False)\
         .order_by(OTP.created_at.desc()).first()

print(f"Code: {otp.code}")
print(f"Valid: {otp.is_valid()}")
print(f"Expires: {otp.expires_at}")
```

---

## 🧪 Testing Checklist

- [ ] Register new account
- [ ] Receive OTP email
- [ ] Verify OTP code
- [ ] Check user is verified
- [ ] Try login with verified account
- [ ] Test expired OTP (wait 10+ minutes)
- [ ] Test invalid OTP code
- [ ] Test resend OTP
- [ ] Test duplicate email registration

---

## 🐛 Troubleshooting

### Email not received?
1. Check spam folder
2. Verify SMTP settings in `.env`
3. Check server logs for errors
4. Test SMTP connection

### OTP verification failed?
- Check code is exactly 6 digits
- Verify code hasn't expired (10 min)
- Ensure code hasn't been used
- Check email matches registration

### Server errors?
```bash
# Check server logs
cd "d:\Bantubuzz Platform\backend"
# Look at terminal where server is running
```

---

## 📚 Documentation

- [OTP_COMPLETE.md](OTP_COMPLETE.md) - Summary
- [OTP_IMPLEMENTATION.md](OTP_IMPLEMENTATION.md) - Full docs

---

## ✅ Status

- Server: http://localhost:5000
- Health: http://localhost:5000/api/health
- Database: bantubuzz.db
- SMTP: bantubuzz.com:465 (SSL)
