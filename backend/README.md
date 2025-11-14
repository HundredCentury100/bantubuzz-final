# BantuBuzz Backend

Flask-based REST API for the BantuBuzz platform.

## 🚀 Quick Start

### Automated Installation (Windows)
```bash
# Install everything automatically
install.bat

# Start the server
start.bat
```

### Manual Installation
```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Initialize database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# 4. Seed sample data (optional)
flask seed_db

# 5. Run server
python run.py
```

Server will be running at: **http://localhost:5000**

## ✅ Verify Installation

Visit: http://localhost:5000/api/health

Expected response:
```json
{
  "status": "healthy",
  "message": "BantuBuzz API is running"
}
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py           # App factory
│   ├── config.py             # Configuration
│   ├── models/               # Database models (10 models)
│   ├── routes/               # API endpoints (10 blueprints)
│   ├── services/             # Business logic
│   └── utils/                # Utilities
├── migrations/               # Database migrations
├── .env                      # Environment variables
├── requirements.txt          # Dependencies
├── run.py                   # Application entry point
├── install.bat              # Automated installer
└── start.bat                # Quick start script
```

## 🔧 Configuration

Edit `.env` file:

```env
# Database (SQLite default - change to PostgreSQL for production)
DATABASE_URL=sqlite:///bantubuzz.db

# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# Email (optional)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Paynow (optional)
PAYNOW_INTEGRATION_ID=your-id
PAYNOW_INTEGRATION_KEY=your-key
```

## 📊 Database

### SQLite (Default)
- ✅ No installation needed
- ✅ Auto-created on first run
- ✅ Perfect for development
- File: `backend/bantubuzz.db`

### PostgreSQL (Production)
1. Install PostgreSQL
2. Create database:
   ```sql
   CREATE DATABASE bantubuzz;
   ```
3. Update .env:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/bantubuzz
   ```
4. Run migrations:
   ```bash
   flask db upgrade
   ```

## 🧪 Test Accounts

After running `flask seed_db`:

**Creator Account**
- Email: `creator@example.com`
- Password: `password123`

**Brand Account**
- Email: `brand@example.com`
- Password: `password123`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/creator` - Register creator
- `POST /api/auth/register/brand` - Register brand
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Creators
- `GET /api/creators` - List creators
- `GET /api/creators/:id` - Get creator profile

### Packages
- `GET /api/packages` - List packages
- `POST /api/packages` - Create package
- `GET /api/packages/:id` - Get package

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message

### Campaigns, Brands, Notifications, Analytics
See full API documentation in main README.md

## 🐛 Troubleshooting

### Common Issues

**1. Module not found**
```bash
# Activate virtual environment
venv\Scripts\activate
pip install -r requirements.txt
```

**2. Database error**
```bash
# Reset database
flask db upgrade
```

**3. Port in use**
```bash
# Change port in run.py or kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**4. Import errors**
```bash
# Make sure you're in backend directory
cd backend
python run.py
```

See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for detailed troubleshooting.

## 🔨 Development Commands

```bash
# Database migrations
flask db migrate -m "Description"  # Create migration
flask db upgrade                    # Apply migrations
flask db downgrade                  # Rollback migration

# Database management
flask seed_db                       # Seed sample data
flask init_db                       # Initialize database

# Run server
python run.py                       # Production mode
flask run --debug                   # Debug mode

# Interactive shell
flask shell                         # Access app context
```

## 📦 Dependencies

Key packages:
- **Flask** - Web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT auth
- **Flask-SocketIO** - Real-time features
- **Flask-CORS** - CORS support
- **Flask-Mail** - Email service
- **Paynow** - Payment integration

See `requirements.txt` for full list.

## 🔐 Security

- ✅ Password hashing (Werkzeug)
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ SQL injection prevention (ORM)
- ✅ Input validation
- ✅ XSS protection

## 🚨 Important Notes

1. **Change default secrets** in `.env` before production
2. **Email verification** is optional for development
3. **SQLite** is for development only - use PostgreSQL in production
4. **Paynow** credentials needed for payment features

## ✨ Features

- ✅ JWT authentication
- ✅ Email verification
- ✅ Password reset
- ✅ Real-time messaging (SocketIO)
- ✅ File upload support
- ✅ Payment integration (Paynow)
- ✅ Analytics tracking
- ✅ Notification system

## 📚 Documentation

- [Setup Instructions](SETUP_INSTRUCTIONS.md) - Detailed setup guide
- [Main README](../README.md) - Full project documentation
- [Troubleshooting](../TROUBLESHOOTING.md) - Common issues
- [Development Guide](../DEVELOPMENT.md) - Developer guidelines

## 🎯 Next Steps

1. ✅ Start the backend server
2. ✅ Test the health check endpoint
3. ✅ Seed the database
4. ✅ Test registration/login
5. ✅ Start the frontend
6. ✅ Begin Phase 2 development

---

**Status**: Ready to run! ✅

For questions or issues, see [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
