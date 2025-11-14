# BantuBuzz Platform

A comprehensive creator-brand collaboration platform connecting African creators with global brands.

## Features

- **Creator Profiles**: Showcase portfolios, skills, and services
- **Brand Profiles**: Company profiles with campaign management
- **Service Packages**: Creators can offer customizable service packages
- **Campaigns**: Brands can create and manage marketing campaigns
- **Bookings**: Secure booking and payment system with Paynow integration
- **Real-time Chat**: Built-in messaging between creators and brands
- **Reviews & Ratings**: Review system for completed collaborations
- **Collaborations**: Track and manage ongoing projects
- **Analytics**: Dashboard with performance metrics

## Tech Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: Flask-JWT-Extended
- **Real-time**: Flask-SocketIO for WebSocket support
- **Payment**: Paynow integration

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router DOM v6.20.0
- **Styling**: Tailwind CSS
- **Icons**: Heroicons

## Project Structure

```
Bantubuzz Platform/
├── backend/
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   ├── utils/          # Utility functions
│   │   └── __init__.py     # App initialization
│   ├── run.py             # Backend entry point
│   └── requirements.txt   # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/    # Reusable components
    │   ├── pages/         # Page components
    │   ├── services/      # API services
    │   └── App.jsx        # Main app component
    ├── package.json       # Node dependencies
    └── vite.config.js     # Vite configuration
```

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   python run.py
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register/creator` - Register as creator
- `POST /api/auth/register/brand` - Register as brand
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Creators
- `GET /api/creators` - Get all creators (with filters)
- `GET /api/creators/:id` - Get creator by ID
- `GET /api/creators/profile` - Get own profile
- `PUT /api/creators/profile` - Update profile

### Packages
- `GET /api/packages` - Get all packages
- `POST /api/packages` - Create package
- `PUT /api/packages/:id` - Update package
- `DELETE /api/packages/:id` - Delete package

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/browse` - Browse available campaigns
- `POST /api/campaigns/:id/apply` - Apply to campaign

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/status` - Update booking status

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/creator/:id` - Get creator reviews
- `PATCH /api/reviews/:id/response` - Add creator response

## Contributing

This is a private project. Please contact the repository owner for contribution guidelines.

## License

All rights reserved.
