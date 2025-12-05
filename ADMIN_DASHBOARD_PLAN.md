# BantuBuzz Admin Dashboard - Complete Rebuild Plan

## Executive Summary
Complete redesign and reimplementation of the admin dashboard to ensure consistency with the platform design and provide comprehensive administrative functionality.

---

## 1. CURRENT STATE ANALYSIS

### Existing Files to Remove/Replace
**Frontend:**
- `AdminDashboard.jsx` - Replace with new implementation
- `AdminUsers.jsx` - Expand significantly
- `AdminCategories.jsx` - Keep but enhance
- `AdminPayments.jsx` - Replace with collaboration payment management
- `AdminCashouts.jsx` - Enhance with better workflow
- `AdminCampaigns.jsx` - Keep structure, update design
- `AdminCollaborations.jsx` - Enhance with cancellation requests
- `AdminBookings.jsx` - Keep structure, update design
- `AdminReviews.jsx` - Keep structure, update design
- `AdminLayout.jsx` - Update navigation and design

**Backend:**
- `admin.py` - Keep core, add new endpoints
- `admin_extended.py` - Merge into admin.py or enhance
- `admin_wallet.py` - Keep and enhance

### Database Models Analysis
**Existing Models (Good to Use):**
- ✅ `User` - has `is_admin`, `admin_role`, `is_verified`
- ✅ `CreatorProfile` - has all needed fields
- ✅ `BrandProfile` - has all needed fields
- ✅ `Collaboration` - has `cancellation_request` field
- ✅ `CashoutRequest` - exists for cashout management
- ✅ `Category` & `Niche` - exist for category management
- ✅ `Payment` - exists for payment tracking
- ✅ `Booking`, `Campaign`, `Review` - all exist

**Models to Create:**
- ❌ `SupportTicket` - NEW MODEL NEEDED
- ❌ `FeaturedCreator` - NEW MODEL NEEDED (or add `is_featured` to CreatorProfile)

---

## 2. ADMIN DASHBOARD FEATURES - DETAILED SPECIFICATION

### 2.1 Dashboard Overview (Home)
**URL:** `/admin/dashboard`

**Stats to Display:**
- Total Users (Creators, Brands, Admins)
- Pending Verifications (Creators + Brands)
- Active Collaborations
- Pending Cashout Requests (count + total amount)
- Pending Cancel Requests (collaborations)
- Open Support Tickets (count by priority)
- Platform Revenue (total, this month, this week)
- Featured Creators Count

**Quick Actions:**
- Verify Users
- Process Cashouts
- Review Cancellation Requests
- View Support Tickets
- Manage Categories
- Set Featured Creators

**Recent Activity Feed:**
- Last 10 cashout requests
- Last 10 cancellation requests
- Last 10 support tickets
- Last 10 new user registrations

---

### 2.2 User Management
**URL:** `/admin/users`

**Features:**

**List View:**
- Filterable table: All Users | Creators | Brands | Admins
- Search by: email, name, ID
- Filters: Verified/Unverified, Active/Inactive, Date Range
- Display columns:
  - Profile Picture/Avatar
  - Name/Email
  - User Type
  - Verification Status (✓ or ✗)
  - Account Status (Active/Inactive)
  - Join Date
  - Last Login
  - Actions (View, Verify, Edit, Delete)

**User Detail View (Modal or Page):**
- Full user information
- Creator/Brand profile details
- Verification documents (if uploaded)
- Activity history (bookings, campaigns, collaborations)
- Wallet balance
- Reviews received/given
- Support tickets submitted

**Actions:**
- ✅ **Verify Creator/Brand** - Toggle `is_verified` to true
- ❌ **Unverify** - Remove verification
- 🔒 **Suspend Account** - Set `is_active` to false
- ✅ **Activate Account** - Set `is_active` to true
- 🗑️ **Delete User** - Soft delete or hard delete with confirmation
- ✏️ **Edit User Details** - Update email, user type, admin role
- 👑 **Make Admin** - Set `is_admin` to true and assign `admin_role`
- 📊 **View Full Profile** - See all user data

**Backend Endpoints:**
```
GET    /api/admin/users                    # List users with filters
GET    /api/admin/users/:id                # Get user details
PUT    /api/admin/users/:id/verify         # Verify user
PUT    /api/admin/users/:id/unverify       # Unverify user
PUT    /api/admin/users/:id/activate       # Activate account
PUT    /api/admin/users/:id/deactivate     # Deactivate account
DELETE /api/admin/users/:id                # Delete user
PUT    /api/admin/users/:id                # Update user details
POST   /api/admin/users/:id/make-admin     # Promote to admin
```

---

### 2.3 Collaboration Payment Management
**URL:** `/admin/collaborations/payments`

**Features:**

**List View:**
- All collaborations with payment status
- Filters: Pending Payment | Paid | Escrow | Completed
- Display columns:
  - Collaboration ID & Title
  - Brand Name
  - Creator Name
  - Amount
  - Payment Status
  - Escrow Status
  - Created Date
  - Actions (View, Update Payment, Release Escrow)

**Detail View:**
- Full collaboration details
- Payment history timeline
- Deliverables submitted/approved
- Current escrow status
- Payment method details

**Actions:**
- 💰 **Update Payment Status** - Mark as paid, pending, failed
- 🔓 **Release Escrow** - Release funds to creator wallet
- ⏸️ **Hold Escrow** - Keep funds in escrow
- 🔄 **Refund Payment** - Refund to brand wallet
- 📝 **Add Payment Note** - Admin notes on payment

**Backend Endpoints:**
```
GET    /api/admin/collaborations/payments           # List collaborations with payments
GET    /api/admin/collaborations/:id/payment        # Get payment details
PUT    /api/admin/collaborations/:id/payment/status # Update payment status
POST   /api/admin/collaborations/:id/payment/escrow/release # Release escrow
POST   /api/admin/collaborations/:id/payment/refund # Refund payment
POST   /api/admin/collaborations/:id/payment/note   # Add payment note
```

---

### 2.4 Cashout Requests Management
**URL:** `/admin/cashouts`

**Features:**

**List View:**
- All cashout requests
- Filters: Pending | Approved | Rejected | Completed
- Search by creator name or email
- Display columns:
  - Creator Name & Email
  - Amount Requested
  - Current Balance
  - Payment Method (Bank, Mobile Money, etc.)
  - Account Details
  - Request Date
  - Status
  - Actions (Approve, Reject, Complete)

**Detail View (Modal):**
- Creator full details
- Wallet balance history
- Cashout request details
- Payment method & account details
- Admin notes field

**Actions:**
- ✅ **Approve Cashout** - Move to approved status
- ❌ **Reject Cashout** - Reject with reason
- ✔️ **Mark as Completed** - Funds transferred, close request
- 📝 **Add Admin Note** - Internal notes
- 📧 **Send Message to Creator** - Communicate about cashout

**Backend Endpoints:**
```
GET    /api/admin/cashouts                # List cashout requests
GET    /api/admin/cashouts/:id            # Get cashout details
PUT    /api/admin/cashouts/:id/approve    # Approve cashout
PUT    /api/admin/cashouts/:id/reject     # Reject cashout
PUT    /api/admin/cashouts/:id/complete   # Mark as completed
POST   /api/admin/cashouts/:id/note       # Add admin note
```

---

### 2.5 Collaboration Cancellation Requests
**URL:** `/admin/collaborations/cancellations`

**Features:**

**List View:**
- All collaborations with pending cancellation requests
- Filters: Pending | Approved | Rejected
- Requested by: Brand | Creator
- Display columns:
  - Collaboration ID & Title
  - Requested By (Brand/Creator name)
  - Reason
  - Request Date
  - Collaboration Progress %
  - Amount Involved
  - Status
  - Actions (View, Approve, Reject)

**Detail View (Modal):**
- Full collaboration details
- Cancellation request details
- Progress and deliverables submitted
- Payment/escrow status
- Both parties' profiles
- Cancellation reason
- Admin decision notes field

**Actions:**
- ✅ **Approve Cancellation** - Cancel collaboration, handle refund/payment
- ❌ **Reject Cancellation** - Deny request with reason
- 💬 **Request More Info** - Ask for clarification
- 📝 **Add Decision Note** - Document decision reasoning

**Backend Endpoints:**
```
GET    /api/admin/collaborations/cancellations        # List cancellation requests
GET    /api/admin/collaborations/:id/cancellation     # Get cancellation details
PUT    /api/admin/collaborations/:id/cancellation/approve # Approve cancellation
PUT    /api/admin/collaborations/:id/cancellation/reject  # Reject cancellation
POST   /api/admin/collaborations/:id/cancellation/note    # Add decision note
```

---

### 2.6 Categories & Niches Management
**URL:** `/admin/categories`

**Features:**

**List View:**
- All categories with niche count
- Display columns:
  - Icon/Image Preview
  - Category Name
  - Slug
  - Niche Count
  - Display Order
  - Active Status
  - Actions (Edit, Add Niche, Delete)

**Category Form (Create/Edit):**
- Name (required)
- Slug (auto-generated, editable)
- Description
- Icon/Image Upload
- Display Order (integer)
- Active Status (toggle)

**Niche Management:**
- Add niches to category
- Edit/delete niches
- Niche fields: Name, Slug, Description, Active Status

**Actions:**
- ➕ **Add Category** - Create new category
- ✏️ **Edit Category** - Update category details
- 🗑️ **Delete Category** - Remove category (check for usage first)
- ➕ **Add Niche** - Add niche to category
- ✏️ **Edit Niche** - Update niche details
- 🗑️ **Delete Niche** - Remove niche
- ↕️ **Reorder Categories** - Drag-and-drop ordering

**Backend Endpoints:**
```
GET    /api/admin/categories              # List categories
POST   /api/admin/categories              # Create category
PUT    /api/admin/categories/:id          # Update category
DELETE /api/admin/categories/:id          # Delete category
POST   /api/admin/categories/:id/niches   # Add niche
PUT    /api/admin/niches/:id              # Update niche
DELETE /api/admin/niches/:id              # Delete niche
PUT    /api/admin/categories/reorder      # Reorder categories
```

---

### 2.7 Support Tickets System
**URL:** `/admin/support`

**Database Model (NEW):**
```python
class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50))  # 'technical', 'billing', 'account', 'other'
    priority = db.Column(db.String(20), default='medium')  # 'low', 'medium', 'high', 'urgent'
    status = db.Column(db.String(20), default='open')  # 'open', 'in_progress', 'resolved', 'closed'
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))  # Admin user ID
    messages = db.Column(db.JSON, default=list)  # [{from: user/admin, message, timestamp}]
    attachments = db.Column(db.JSON, default=list)  # List of file URLs
    resolution = db.Column(db.Text)  # Final resolution note
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], backref='tickets')
    assigned_admin = db.relationship('User', foreign_keys=[assigned_to])
```

**Features:**

**List View:**
- All support tickets
- Filters: Open | In Progress | Resolved | Closed
- Priority filters: Low | Medium | High | Urgent
- Category filters
- Assigned to: Me | All | Unassigned
- Display columns:
  - Ticket ID
  - User Name & Type
  - Subject
  - Category
  - Priority (color-coded)
  - Status
  - Assigned To
  - Last Updated
  - Actions (View, Assign, Resolve)

**Ticket Detail View:**
- User information
- Ticket details (subject, description, category, priority)
- Message thread (conversation with user)
- Attachments
- Timeline of status changes
- Assignment history
- Resolution form

**Actions:**
- 👁️ **View Ticket** - Open full ticket details
- 👤 **Assign to Me** - Assign ticket to logged-in admin
- 👥 **Assign to Admin** - Assign to specific admin
- 💬 **Reply to User** - Send message in ticket
- ⚠️ **Change Priority** - Update priority level
- 🔄 **Change Status** - Update status (in progress, resolved, etc.)
- ✅ **Resolve Ticket** - Mark as resolved with resolution note
- 🔒 **Close Ticket** - Close ticket permanently

**User-Side Features (Creators/Brands):**
- Submit support ticket form
- View own tickets
- Reply to tickets
- Upload attachments

**Backend Endpoints:**
```
# Admin Endpoints
GET    /api/admin/support/tickets             # List all tickets
GET    /api/admin/support/tickets/:id         # Get ticket details
PUT    /api/admin/support/tickets/:id/assign  # Assign ticket
POST   /api/admin/support/tickets/:id/reply   # Reply to ticket
PUT    /api/admin/support/tickets/:id/priority # Update priority
PUT    /api/admin/support/tickets/:id/status  # Update status
PUT    /api/admin/support/tickets/:id/resolve # Resolve ticket

# User Endpoints (for creators/brands)
POST   /api/support/tickets                   # Create ticket
GET    /api/support/tickets                   # Get own tickets
GET    /api/support/tickets/:id               # Get ticket details
POST   /api/support/tickets/:id/reply         # Reply to ticket
```

---

### 2.8 Featured Creators Management
**URL:** `/admin/creators/featured`

**Database Update:**
Add to `CreatorProfile` model:
```python
is_featured = db.Column(db.Boolean, default=False)
featured_order = db.Column(db.Integer, default=0)
featured_since = db.Column(db.DateTime)
```

**Features:**

**List View:**
- All creators
- Filters: Featured | Not Featured | Eligible (verified + active)
- Search by name, category, location
- Display columns:
  - Profile Picture
  - Creator Name
  - Categories
  - Follower Count
  - Engagement Rate
  - Average Rating
  - Featured Status
  - Actions (Set Featured, Remove Featured)

**Featured Creators Section:**
- Current featured creators
- Drag-and-drop ordering
- Preview of how they appear on homepage

**Actions:**
- ⭐ **Set as Featured** - Add to featured list
- ❌ **Remove from Featured** - Remove from featured
- ↕️ **Reorder Featured** - Change display order
- 👁️ **Preview** - See how it looks on frontend

**Backend Endpoints:**
```
GET    /api/admin/creators/featured           # List featured creators
POST   /api/admin/creators/:id/feature        # Set as featured
DELETE /api/admin/creators/:id/feature        # Remove from featured
PUT    /api/admin/creators/featured/reorder   # Reorder featured creators
```

**Frontend Public Endpoint:**
```
GET    /api/creators/featured                 # Get featured creators (public)
```

---

## 3. DATABASE SCHEMA CHANGES

### New Tables to Create:
```sql
-- Support Tickets Table
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    messages JSON DEFAULT '[]',
    attachments JSON DEFAULT '[]',
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
```

### Modify Existing Tables:
```sql
-- Add featured fields to creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN featured_order INTEGER DEFAULT 0,
ADD COLUMN featured_since TIMESTAMP;

CREATE INDEX idx_creator_profiles_featured ON creator_profiles(is_featured, featured_order);
```

---

## 4. DESIGN SYSTEM & UI/UX CONSISTENCY

### Design Principles:
1. **Match Platform Design** - Use existing Tailwind classes and color scheme
2. **Responsive** - Mobile-first approach
3. **Accessible** - WCAG 2.1 AA compliance
4. **Consistent** - Same components across all pages

### Component Library:
**Reusable Components to Create/Use:**
- `AdminLayout` - Consistent layout with sidebar nav
- `StatCard` - Dashboard statistics cards
- `DataTable` - Paginated, sortable, filterable tables
- `ActionButton` - Consistent action buttons
- `Modal` - Standard modal for detail views/forms
- `ConfirmDialog` - Confirmation dialogs for destructive actions
- `StatusBadge` - Colored status indicators
- `LoadingSpinner` - Loading states
- `EmptyState` - Empty state illustrations
- `Pagination` - Consistent pagination

### Color Scheme (from existing dashboard):
- Primary: `text-primary`, `bg-primary`
- Success: `text-green-600`, `bg-green-100`
- Warning: `text-yellow-600`, `bg-yellow-100`
- Error: `text-red-600`, `bg-red-100`
- Info: `text-blue-600`, `bg-blue-100`
- Neutral: `text-gray-600`, `bg-gray-50`

### Navigation Structure:
```
Admin Dashboard
├── 🏠 Dashboard (Overview)
├── 👥 User Management
│   ├── All Users
│   ├── Creators
│   ├── Brands
│   └── Admins
├── 💰 Financial
│   ├── Collaboration Payments
│   ├── Cashout Requests
│   └── Revenue Reports
├── 🤝 Collaborations
│   ├── All Collaborations
│   ├── Cancellation Requests
│   └── Manage Payments
├── 📋 Content
│   ├── Campaigns
│   ├── Bookings
│   └── Reviews
├── ⚙️ Platform Settings
│   ├── Categories & Niches
│   ├── Featured Creators
│   └── Platform Configuration
└── 🎫 Support
    ├── Support Tickets
    └── Message Users
```

---

## 5. IMPLEMENTATION PHASES

### Phase 1: Database & Backend Foundation (Week 1)
- Create `SupportTicket` model
- Add featured fields to `CreatorProfile`
- Run migrations
- Implement all backend API endpoints
- Test all endpoints with Postman/curl

### Phase 2: Frontend Component Library (Week 2)
- Create reusable admin components
- Implement `AdminLayout` with new navigation
- Build `DataTable` component
- Create all modal/dialog components

### Phase 3: Core Admin Features (Week 3-4)
- Dashboard Overview
- User Management (full CRUD)
- Collaboration Payment Management
- Cashout Requests Management

### Phase 4: Advanced Features (Week 5)
- Cancellation Requests Management
- Categories & Niches Management
- Featured Creators Management

### Phase 5: Support System (Week 6)
- Support Tickets Backend
- Admin Support Interface
- User Support Interface (create ticket)

### Phase 6: Testing & Refinement (Week 7)
- End-to-end testing
- Security testing
- Performance optimization
- Bug fixes

### Phase 7: Deployment (Week 8)
- Production deployment
- Database migrations on production
- Monitoring and hotfixes

---

## 6. SECURITY CONSIDERATIONS

### Authentication & Authorization:
- All admin routes require `@admin_required` decorator
- Check `is_admin` flag on User model
- Role-based permissions using `admin_role` field
- JWT tokens with short expiration for admin sessions

### Admin Roles:
- `super_admin` - Full access to everything
- `moderator` - User management, content moderation
- `support` - Support tickets, user communication
- `finance` - Payments, cashouts, financial reports

### Audit Logging:
- Log all admin actions (who, what, when)
- Store in database or separate logging service
- Include IP address and user agent

### Data Protection:
- Sanitize all inputs
- Validate all requests
- Rate limiting on admin endpoints
- HTTPS only
- Secure password reset for admins

---

## 7. API ENDPOINT SUMMARY

### User Management
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user
- `PUT /api/admin/users/:id/verify` - Verify user
- `PUT /api/admin/users/:id/deactivate` - Deactivate
- `DELETE /api/admin/users/:id` - Delete user

### Payments & Financial
- `GET /api/admin/collaborations/payments` - List payments
- `PUT /api/admin/collaborations/:id/payment/status` - Update payment
- `POST /api/admin/collaborations/:id/payment/escrow/release` - Release escrow

### Cashouts
- `GET /api/admin/cashouts` - List cashouts
- `PUT /api/admin/cashouts/:id/approve` - Approve
- `PUT /api/admin/cashouts/:id/reject` - Reject
- `PUT /api/admin/cashouts/:id/complete` - Complete

### Cancellations
- `GET /api/admin/collaborations/cancellations` - List cancellations
- `PUT /api/admin/collaborations/:id/cancellation/approve` - Approve
- `PUT /api/admin/collaborations/:id/cancellation/reject` - Reject

### Categories
- `GET /api/admin/categories` - List categories
- `POST /api/admin/categories` - Create
- `PUT /api/admin/categories/:id` - Update
- `DELETE /api/admin/categories/:id` - Delete

### Featured Creators
- `GET /api/admin/creators/featured` - List featured
- `POST /api/admin/creators/:id/feature` - Feature creator
- `DELETE /api/admin/creators/:id/feature` - Unfeature

### Support Tickets
- `GET /api/admin/support/tickets` - List tickets
- `POST /api/admin/support/tickets/:id/reply` - Reply
- `PUT /api/admin/support/tickets/:id/resolve` - Resolve

---

## 8. SUCCESS CRITERIA

### Functional Requirements:
- ✅ All 8 feature areas fully implemented
- ✅ All CRUD operations working correctly
- ✅ Real-time updates where applicable
- ✅ Proper error handling and validation
- ✅ Responsive design on all devices

### Performance Requirements:
- Page load time < 2 seconds
- API response time < 500ms
- Handles 1000+ users efficiently
- Optimized database queries

### Security Requirements:
- All endpoints protected with authentication
- Role-based access control working
- No security vulnerabilities (XSS, CSRF, SQL injection)
- Audit logging implemented

### User Experience:
- Intuitive navigation
- Consistent design throughout
- Clear feedback for all actions
- Helpful error messages
- Loading states for async operations

---

## 9. RISKS & MITIGATION

### Risk 1: Data Loss During Migration
**Mitigation:**
- Backup database before any migrations
- Test migrations on staging first
- Use Django/Flask migration tools
- Have rollback plan ready

### Risk 2: Breaking Existing Features
**Mitigation:**
- Don't modify existing models unless necessary
- Create new models for new features
- Extensive testing before deployment
- Feature flags for gradual rollout

### Risk 3: Performance Issues with Large Datasets
**Mitigation:**
- Implement pagination on all list views
- Add database indexes
- Use lazy loading for relationships
- Optimize queries with joins

### Risk 4: Security Vulnerabilities
**Mitigation:**
- Code review before merge
- Security testing (OWASP Top 10)
- Regular dependency updates
- Penetration testing

---

## 10. NEXT STEPS

1. **Review this plan** with stakeholders
2. **Approve the plan** and prioritize features if needed
3. **Set up development environment** and branches
4. **Begin Phase 1** - Database & Backend Foundation
5. **Daily standups** to track progress
6. **Weekly demos** to show progress

---

## APPENDIX A: File Structure

```
backend/
├── app/
│   ├── models/
│   │   ├── support_ticket.py (NEW)
│   │   └── (update creator_profile.py)
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── __init__.py (NEW - combined admin routes)
│   │   │   ├── users.py (NEW)
│   │   │   ├── payments.py (NEW)
│   │   │   ├── cashouts.py (ENHANCE existing)
│   │   │   ├── cancellations.py (NEW)
│   │   │   ├── categories.py (ENHANCE existing)
│   │   │   ├── featured.py (NEW)
│   │   │   └── support.py (NEW)
│   │   └── support.py (NEW - user-facing support)
│   └── decorators/
│       └── admin.py (admin_required, role_required)

frontend/
├── src/
│   ├── pages/admin/
│   │   ├── Dashboard.jsx (REPLACE)
│   │   ├── Users/
│   │   │   ├── UserList.jsx (REPLACE)
│   │   │   ├── UserDetail.jsx (NEW)
│   │   │   └── UserForm.jsx (NEW)
│   │   ├── Financial/
│   │   │   ├── Payments.jsx (NEW)
│   │   │   ├── Cashouts.jsx (ENHANCE)
│   │   │   └── Revenue.jsx (NEW)
│   │   ├── Collaborations/
│   │   │   ├── CollaborationList.jsx (ENHANCE)
│   │   │   └── Cancellations.jsx (NEW)
│   │   ├── Content/
│   │   │   ├── Categories.jsx (ENHANCE)
│   │   │   ├── Featured.jsx (NEW)
│   │   │   ├── Campaigns.jsx (ENHANCE)
│   │   │   └── Reviews.jsx (ENHANCE)
│   │   └── Support/
│   │       ├── TicketList.jsx (NEW)
│   │       └── TicketDetail.jsx (NEW)
│   ├── components/admin/
│   │   ├── Layout.jsx (UPDATE)
│   │   ├── StatCard.jsx
│   │   ├── DataTable.jsx (NEW)
│   │   ├── Modal.jsx
│   │   ├── ConfirmDialog.jsx (NEW)
│   │   ├── StatusBadge.jsx (NEW)
│   │   └── Pagination.jsx (NEW)
│   └── services/
│       └── adminAPI.js (EXPAND significantly)
```

---

**End of Plan Document**
**Version:** 1.0
**Date:** 2025-11-25
**Author:** Claude AI Assistant
**Status:** Awaiting Approval
