# BantuBuzz - Development Guide

## Project Structure

```
Bantubuzz Platform/
├── backend/                 # Flask backend
│   ├── app/
│   │   ├── __init__.py     # App factory
│   │   ├── config.py       # Configuration
│   │   ├── models/         # Database models
│   │   │   ├── user.py
│   │   │   ├── creator_profile.py
│   │   │   ├── brand_profile.py
│   │   │   ├── package.py
│   │   │   ├── campaign.py
│   │   │   ├── booking.py
│   │   │   ├── message.py
│   │   │   ├── notification.py
│   │   │   ├── saved_creator.py
│   │   │   └── analytics.py
│   │   ├── routes/         # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── creators.py
│   │   │   ├── brands.py
│   │   │   ├── packages.py
│   │   │   ├── campaigns.py
│   │   │   ├── bookings.py
│   │   │   ├── messages.py
│   │   │   ├── notifications.py
│   │   │   └── analytics.py
│   │   ├── services/       # Business logic
│   │   │   ├── email_service.py
│   │   │   └── payment_service.py
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── run.py             # Application entry point
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   ├── pages/         # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── RegisterCreator.jsx
│   │   │   ├── RegisterBrand.jsx
│   │   │   ├── Creators.jsx
│   │   │   ├── CreatorProfile.jsx
│   │   │   ├── Packages.jsx
│   │   │   ├── PackageDetails.jsx
│   │   │   ├── Messages.jsx
│   │   │   ├── CreatorDashboard.jsx
│   │   │   ├── BrandDashboard.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/      # API services
│   │   │   └── api.js
│   │   ├── hooks/         # Custom hooks
│   │   │   └── useAuth.jsx
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── public/            # Static assets
│   ├── package.json       # Dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── tailwind.config.js # Tailwind configuration
│   └── .env.example       # Environment template
│
├── README.md              # Main documentation
├── QUICKSTART.md          # Quick start guide
├── DEVELOPMENT.md         # This file
├── PROJECT_STATUS.md      # Project status
└── .gitignore            # Git ignore rules
```

## Development Workflow

### 1. Backend Development

#### Adding a New Model

1. Create model file in `backend/app/models/`:
```python
from app import db
from datetime import datetime

class YourModel(db.Model):
    __tablename__ = 'your_table'

    id = db.Column(db.Integer, primary_key=True)
    # Add fields...
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

2. Import in `backend/app/models/__init__.py`
3. Create migration:
```bash
flask db migrate -m "Add YourModel"
flask db upgrade
```

#### Adding a New API Endpoint

1. Create/edit route file in `backend/app/routes/`:
```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint('your_route', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def your_endpoint():
    # Your logic here
    return jsonify({'data': 'response'}), 200
```

2. Register blueprint in `backend/app/__init__.py`

#### Testing API Endpoints

Use tools like:
- **Postman**: GUI for API testing
- **curl**: Command line testing
- **HTTPie**: User-friendly HTTP client

Example:
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Protected endpoint
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Frontend Development

#### Adding a New Page

1. Create page in `frontend/src/pages/YourPage.jsx`:
```jsx
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const YourPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container-custom section-padding">
        <h1 className="text-4xl font-bold mb-8">Your Page</h1>
        {/* Your content */}
      </div>
      <Footer />
    </div>
  );
};

export default YourPage;
```

2. Add route in `frontend/src/App.jsx`:
```jsx
import YourPage from './pages/YourPage';

// In Routes component:
<Route path="/your-path" element={<YourPage />} />
```

#### Adding a New Component

1. Create component in `frontend/src/components/YourComponent.jsx`:
```jsx
const YourComponent = ({ prop1, prop2 }) => {
  return (
    <div className="your-classes">
      {/* Your JSX */}
    </div>
  );
};

export default YourComponent;
```

#### Making API Calls

Use the configured API services:
```jsx
import { creatorsAPI } from '../services/api';
import { useQuery } from '@tanstack/react-query';

const YourComponent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['creators'],
    queryFn: () => creatorsAPI.getCreators({ page: 1 }),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render data */}</div>;
};
```

### 3. Styling Guidelines

#### Using Tailwind Classes
```jsx
// Buttons
<button className="btn btn-primary">Primary Button</button>
<button className="btn btn-secondary">Secondary Button</button>
<button className="btn btn-outline">Outline Button</button>

// Inputs
<input className="input" placeholder="Enter text" />

// Cards
<div className="card">Card content</div>

// Badges
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-error">Error</span>
```

#### Custom Colors
```jsx
// Primary lime green
<div className="bg-primary text-dark">Primary</div>

// Dark gray
<div className="bg-dark text-white">Dark</div>

// Light gray
<div className="bg-light text-dark">Light</div>

// Semantic colors
<div className="bg-success">Success</div>
<div className="bg-warning">Warning</div>
<div className="bg-error">Error</div>
```

## Common Development Tasks

### Database Reset
```bash
# Drop all tables
flask db downgrade base

# Re-run migrations
flask db upgrade

# Seed data
flask seed_db
```

### Clear Cache
```bash
# Backend - clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +

# Frontend - clear node modules
rm -rf node_modules
npm install
```

### View Logs
```bash
# Backend logs (in terminal running flask)
# Frontend logs (in browser console)
```

### Database Queries
```bash
# Connect to database
psql -U postgres -d bantubuzz

# Useful queries
SELECT * FROM users;
SELECT * FROM creator_profiles;
SELECT * FROM packages;
\dt  # List tables
\d users  # Describe table
```

## Code Style Guidelines

### Python (Backend)
- Use PEP 8 style guide
- Function names: `snake_case`
- Class names: `PascalCase`
- Constants: `UPPER_CASE`
- Docstrings for all functions
- Type hints where applicable

### JavaScript/React (Frontend)
- Use ES6+ syntax
- Component names: `PascalCase`
- File names: `PascalCase.jsx`
- Variables/functions: `camelCase`
- Constants: `UPPER_CASE`
- Functional components with hooks

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation

### Commit Messages
```
feat: Add creator discovery page
fix: Resolve login authentication issue
refactor: Improve API error handling
docs: Update README with API endpoints
```

### Typical Workflow
```bash
# Create feature branch
git checkout -b feature/creator-discovery

# Make changes
git add .
git commit -m "feat: Add creator discovery filters"

# Push to remote
git push origin feature/creator-discovery

# Create pull request on GitHub
```

## Testing Checklist

### Backend
- [ ] All endpoints return correct status codes
- [ ] Authentication works correctly
- [ ] Database operations complete successfully
- [ ] Email sending works (test mode)
- [ ] Error handling returns proper messages

### Frontend
- [ ] Pages load without errors
- [ ] Forms validate correctly
- [ ] API calls succeed
- [ ] Authentication flow works
- [ ] Responsive on mobile
- [ ] No console errors

## Performance Tips

### Backend
- Use database indexes on frequently queried fields
- Implement pagination for list endpoints
- Use lazy loading for relationships
- Cache frequently accessed data with Redis

### Frontend
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Optimize images (WebP format)
- Code splitting with React.lazy
- Use TanStack Query caching

## Debugging

### Backend Debugging
```python
# Add breakpoint
import pdb; pdb.set_trace()

# Print debugging
print(f"Debug: {variable}")

# Flask debug mode (in .env)
FLASK_ENV=development
DEBUG=True
```

### Frontend Debugging
```jsx
// Console logging
console.log('Debug:', data);

// React DevTools (browser extension)
// Network tab (browser DevTools)
```

## Environment-Specific Configuration

### Development
- Debug mode enabled
- Detailed error messages
- CORS allows localhost
- Email in console mode

### Production
- Debug mode disabled
- Generic error messages
- CORS restricted to domain
- Real email sending
- HTTPS enabled
- Environment variables from secure source

## Useful Commands

### Backend
```bash
flask db migrate -m "Description"  # Create migration
flask db upgrade                    # Apply migration
flask db downgrade                  # Revert migration
flask seed_db                       # Seed database
flask shell                         # Interactive shell
```

### Frontend
```bash
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview build
npm run lint       # Run linter
```

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query/)
- [SQLAlchemy](https://www.sqlalchemy.org/)

---

Happy coding! 🚀
