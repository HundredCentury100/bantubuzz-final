# BantuBuzz - Quick Start Guide

Get BantuBuzz up and running in 5 minutes!

## Prerequisites Checklist

- [ ] Python 3.9+ installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 13+ installed and running
- [ ] Redis 6+ installed and running (optional for now)

## Quick Setup

### 1. Database Setup (2 minutes)

Create a PostgreSQL database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bantubuzz;

# Create user (optional)
CREATE USER bantubuzz_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bantubuzz TO bantubuzz_user;

# Exit
\q
```

### 2. Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# IMPORTANT: Edit .env and update:
# - DATABASE_URL (with your database credentials)
# - SECRET_KEY (generate a random string)
# - JWT_SECRET_KEY (generate a random string)

# Initialize database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Optional: Seed sample data
flask seed_db

# Run backend
python run.py
```

Backend is now running at: http://localhost:5000

### 3. Frontend Setup (1 minute)

Open a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run frontend
npm run dev
```

Frontend is now running at: http://localhost:3000

## 🎉 You're Done!

Visit http://localhost:3000 to see BantuBuzz in action!

## Test Accounts (if you ran seed_db)

### Creator Account
- Email: `creator@example.com`
- Password: `password123`

### Brand Account
- Email: `brand@example.com`
- Password: `password123`

## Common Issues

### Database Connection Error
- Make sure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database exists: `psql -l`

### Port Already in Use
- Backend: Change port in run.py
- Frontend: Change port in vite.config.js

### Module Not Found
- Backend: Make sure venv is activated
- Frontend: Delete node_modules and run `npm install` again

### CORS Error
- Check FRONTEND_URL in backend/.env
- Verify backend is running on port 5000

## Next Steps

1. **Create Your Account**: Register as a Creator or Brand
2. **Set Up Profile**: Complete your profile information
3. **For Creators**: Create your first package
4. **For Brands**: Browse creators and start a campaign

## Need Help?

- Check the full README.md for detailed documentation
- Review API endpoints in README.md
- Check the backend logs for errors

## Development Tips

### Backend Hot Reload
Flask will auto-reload when you make changes to Python files.

### Frontend Hot Reload
Vite provides instant hot module replacement (HMR).

### Database Migrations
After changing models:
```bash
flask db migrate -m "Description of changes"
flask db upgrade
```

### View Database
```bash
psql -U postgres -d bantubuzz
\dt  # List tables
SELECT * FROM users;  # Query users
```

## Email Configuration (Optional)

For email verification and password reset:

1. Get a Gmail App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password

2. Update backend/.env:
   ```
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   ```

## Paynow Configuration (Optional)

For payment processing:

1. Sign up at https://www.paynow.co.zw
2. Get your Integration ID and Key
3. Update backend/.env:
   ```
   PAYNOW_INTEGRATION_ID=your-integration-id
   PAYNOW_INTEGRATION_KEY=your-integration-key
   ```

---

Happy building! 🚀
