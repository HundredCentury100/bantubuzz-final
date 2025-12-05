# Admin Dashboard Rebuild - Implementation Plan

## Phase 1: Core Features Implementation

### Priority Order:
1. **Dashboard Overview** - Central hub with statistics
2. **User Management** - Verify creators/brands, manage users
3. **Cashout Management** - Process cashout requests
4. **Categories Management** - Already partially done, enhance it
5. **Featured Creators** - Set creators as featured
6. **Collaboration Management** - Payment & cancellation handling
7. **Support Tickets** - Full ticketing system (NEW)

---

## Step 1: Backend Foundation

### A. Create Admin Decorator (`backend/app/decorators/admin.py`)
```python
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models import User

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        return fn(*args, **kwargs)
    return wrapper

def role_required(allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            if not user or not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403

            if user.admin_role not in allowed_roles:
                return jsonify({'error': f'Required role: {", ".join(allowed_roles)}'}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
```

### B. Create New Admin Routes Structure
- Delete old `admin.py`, `admin_extended.py`, `admin_wallet.py`
- Create new `backend/app/routes/admin/__init__.py`
- Create separate files for each feature module

---

## Step 2: Feature 1 - Dashboard Overview

### Backend: `backend/app/routes/admin/dashboard.py`
```python
from flask import Blueprint, jsonify
from app import db
from app.models import *
from app.decorators.admin import admin_required
from datetime import datetime, timedelta

bp = Blueprint('admin_dashboard', __name__)

@bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""

    # User stats
    total_users = User.query.filter_by(is_active=True).count()
    creators_count = User.query.filter_by(user_type='creator', is_active=True).count()
    brands_count = User.query.filter_by(user_type='brand', is_active=True).count()

    # Verification stats
    unverified_creators = User.query.join(CreatorProfile).filter(
        User.is_verified == False,
        User.is_active == True
    ).count()
    unverified_brands = User.query.join(BrandProfile).filter(
        User.is_verified == False,
        User.is_active == True
    ).count()

    # Collaboration stats
    active_collaborations = Collaboration.query.filter_by(status='in_progress').count()
    completed_collaborations = Collaboration.query.filter_by(status='completed').count()

    # Cashout stats
    pending_cashouts = CashoutRequest.query.filter_by(status='pending').count()
    pending_cashouts_amount = db.session.query(
        db.func.sum(CashoutRequest.amount)
    ).filter_by(status='pending').scalar() or 0

    # Cancellation requests
    pending_cancellations = Collaboration.query.filter(
        Collaboration.cancellation_request.isnot(None),
        Collaboration.cancellation_request['status'].astext == 'pending'
    ).count()

    # Financial stats
    total_platform_revenue = Payment.query.filter_by(
        status='completed'
    ).with_entities(db.func.sum(Payment.amount)).scalar() or 0

    # This month revenue
    first_day_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    month_revenue = Payment.query.filter(
        Payment.status == 'completed',
        Payment.created_at >= first_day_month
    ).with_entities(db.func.sum(Payment.amount)).scalar() or 0

    # This week revenue
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_revenue = Payment.query.filter(
        Payment.status == 'completed',
        Payment.created_at >= week_ago
    ).with_entities(db.func.sum(Payment.amount)).scalar() or 0

    # Featured creators
    featured_count = CreatorProfile.query.filter_by(is_featured=True).count() if hasattr(CreatorProfile, 'is_featured') else 0

    # Recent activity (last 10 of each)
    recent_cashouts = CashoutRequest.query.order_by(
        CashoutRequest.created_at.desc()
    ).limit(10).all()

    recent_users = User.query.order_by(
        User.created_at.desc()
    ).limit(10).all()

    return jsonify({
        'users': {
            'total': total_users,
            'creators': creators_count,
            'brands': brands_count,
            'unverified_creators': unverified_creators,
            'unverified_brands': unverified_brands
        },
        'collaborations': {
            'active': active_collaborations,
            'completed': completed_collaborations
        },
        'cashouts': {
            'pending_count': pending_cashouts,
            'pending_amount': pending_cashouts_amount
        },
        'cancellations': {
            'pending': pending_cancellations
        },
        'revenue': {
            'total': total_platform_revenue,
            'this_month': month_revenue,
            'this_week': week_revenue
        },
        'featured_creators': featured_count,
        'recent_activity': {
            'cashouts': [c.to_dict() for c in recent_cashouts],
            'users': [u.to_dict() for u in recent_users]
        }
    }), 200
```

### Frontend: `frontend/src/pages/admin/Dashboard.jsx`
```jsx
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/adminAPI';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'primary', onClick }) => (
    <div
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`text-${color} opacity-20`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Welcome to the BantuBuzz Admin Panel</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.users.total}
          subtitle={`${stats.users.creators} creators, ${stats.users.brands} brands`}
          color="blue-600"
        />
        <StatCard
          title="Pending Verifications"
          value={stats.users.unverified_creators + stats.users.unverified_brands}
          subtitle={`${stats.users.unverified_creators} creators, ${stats.users.unverified_brands} brands`}
          color="yellow-600"
          onClick={() => navigate('/admin/users?filter=unverified')}
        />
        <StatCard
          title="Pending Cashouts"
          value={stats.cashouts.pending_count}
          subtitle={`$${stats.cashouts.pending_amount.toFixed(2)} total`}
          color="green-600"
          onClick={() => navigate('/admin/cashouts')}
        />
        <StatCard
          title="Active Collaborations"
          value={stats.collaborations.active}
          subtitle={`${stats.collaborations.completed} completed`}
          color="purple-600"
        />
      </div>

      {/* Revenue Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Platform Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.revenue.total.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-2xl font-bold text-blue-600">
              ${stats.revenue.this_month.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-purple-600">
              ${stats.revenue.this_week.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cashouts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Cashout Requests</h2>
          <div className="space-y-3">
            {stats.recent_activity.cashouts.slice(0, 5).map((cashout) => (
              <div key={cashout.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{cashout.creator_name}</p>
                  <p className="text-sm text-gray-600">${cashout.amount}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  cashout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  cashout.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {cashout.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Registrations</h2>
          <div className="space-y-3">
            {stats.recent_activity.users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-gray-600">{user.user_type}</p>
                </div>
                {!user.is_verified && (
                  <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                    Unverified
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 3: Feature 2 - User Management

This will be the most comprehensive feature. Will include separate document for full implementation.

Key endpoints:
- GET `/api/admin/users` - List with filters
- GET `/api/admin/users/:id` - Get user details
- PUT `/api/admin/users/:id/verify` - Verify user
- PUT `/api/admin/users/:id/activate` - Activate/deactivate
- DELETE `/api/admin/users/:id` - Delete user
- PUT `/api/admin/users/:id` - Update user details

---

## Step 4: Feature 3 - Cashout Management

Already exists but needs UI rebuild with consistent design.

---

## File Structure After Rebuild:

```
backend/
├── app/
│   ├── decorators/
│   │   └── admin.py (NEW)
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── __init__.py (NEW)
│   │   │   ├── dashboard.py (NEW)
│   │   │   ├── users.py (NEW)
│   │   │   ├── cashouts.py (REBUILD)
│   │   │   ├── collaborations.py (NEW)
│   │   │   ├── categories.py (KEEP, ENHANCE)
│   │   │   ├── featured.py (NEW)
│   │   │   └── support.py (NEW)
│   │   └── support.py (NEW - user-facing)
│   └── models/
│       ├── support_ticket.py (NEW)
│       └── creator_profile.py (UPDATE - add featured fields)

frontend/
├── src/
│   ├── pages/
│   │   └── admin/
│   │       ├── Dashboard.jsx (REBUILD)
│   │       ├── Users.jsx (REBUILD)
│   │       ├── Cashouts.jsx (REBUILD)
│   │       ├── Collaborations.jsx (REBUILD)
│   │       ├── Categories.jsx (REBUILD)
│   │       ├── Featured.jsx (NEW)
│   │       └── Support.jsx (NEW)
│   ├── components/
│   │   └── admin/
│   │       ├── Layout.jsx (REBUILD)
│   │       ├── StatCard.jsx (NEW)
│   │       ├── DataTable.jsx (NEW)
│   │       └── StatusBadge.jsx (NEW)
│   └── services/
│       └── adminAPI.js (REBUILD)
```

---

## Next Steps:

1. ✅ Create admin decorator
2. ✅ Implement Dashboard Overview backend
3. ✅ Implement Dashboard Overview frontend
4. Move to User Management
5. Then Cashouts
6. Then other features

---

**Ready to start implementation!**
