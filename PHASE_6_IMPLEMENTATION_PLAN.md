# Phase 6: Platform Settings & Enhanced Subscription System

## Current State Analysis

### ✅ Already Implemented:
1. **Subscription System (Brands)**
   - Models: `Subscription`, `SubscriptionPlan`
   - Plans: Free, Starter, Pro, Agency
   - Payment integration (Paynow + Manual)
   - Admin management at `/admin/subscriptions`

2. **Featured Creators (Partial)**
   - Model fields: `is_featured`, `featured_type`, `featured_order`, `featured_since`
   - Featured types: 'general', 'tiktok', 'instagram'
   - Admin page: `/admin/featured` (FeaturedCreators.jsx)
   - Can feature/unfeature creators
   - Filter by featured type

3. **Verification System (Basic)**
   - User model has `is_verified` boolean field
   - Verification badge shown on creator profiles
   - Admin can verify/unverify users

### ❌ Missing/Needs Enhancement:

1. **Creator Subscriptions (Featured & Verification)**
   - No subscription plans for creators
   - No payment flow for featured subscriptions
   - No verification application/payment flow
   - No verification documents upload

2. **Platform Fees (Brand Payments)**
   - Platform fees not calculated based on subscription tier
   - No 10% fee for Free/Pro, 5% for Premium

3. **Featured Display on Homepage**
   - Facebook featured not implemented (only general, tiktok, instagram)
   - Featured creators not prioritized in browse/search
   - No precedence logic when filtering

4. **Platform Settings Admin Page**
   - No admin page to manage platform settings
   - No way to edit platform fee percentages
   - No way to edit subscription prices globally

---

## Implementation Plan

### Part A: Creator Subscription Plans (Featured)

#### 1. Create Creator Subscription Plans Table
**File:** `backend/migrations/create_creator_subscription_plans.py`

```sql
CREATE TABLE creator_subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'featured' or 'verification'
    featured_category VARCHAR(20), -- 'general', 'facebook', 'instagram', 'tiktok'
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL, -- 7 for featured, 30 for verification
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plans
INSERT INTO creator_subscription_plans (name, slug, type, featured_category, price, duration_days, description) VALUES
('General Featured', 'general-featured', 'featured', 'general', 10.00, 7, 'Featured on homepage for all visitors - $10/week'),
('Facebook Featured', 'facebook-featured', 'featured', 'facebook', 5.00, 7, 'Featured in Facebook creators section - $5/week'),
('Instagram Featured', 'instagram-featured', 'featured', 'instagram', 5.00, 7, 'Featured in Instagram creators section - $5/week'),
('TikTok Featured', 'tiktok-featured', 'featured', 'tiktok', 5.00, 7, 'Featured in TikTok creators section - $5/week'),
('Creator Verification', 'verification', 'verification', NULL, 5.00, 30, 'Get verified badge - $5/month');
```

#### 2. Create Creator Subscriptions Table
**File:** `backend/migrations/create_creator_subscriptions.py`

```sql
CREATE TABLE creator_subscriptions (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES creator_subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    payment_method VARCHAR(30),
    payment_reference VARCHAR(100),
    paynow_poll_url TEXT,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Backend Routes
**File:** `backend/app/routes/creator_subscriptions.py`

```python
# GET /api/creator/subscriptions/plans - Get available plans
# POST /api/creator/subscriptions/subscribe - Subscribe to featured/verification
# GET /api/creator/subscriptions - Get my active subscriptions
# POST /api/creator/subscriptions/{id}/cancel - Cancel subscription
# POST /api/creator/subscriptions/{id}/renew - Renew subscription
```

#### 4. Frontend Pages
- **`frontend/src/pages/creator/FeaturedSubscription.jsx`** - Choose featured type & pay
- **`frontend/src/pages/creator/VerificationApplication.jsx`** - Apply for verification
- Update **`CreatorDashboard.jsx`** - Show active subscriptions & CTAs

---

### Part B: Verification Application System

#### 1. Create Verification Applications Table
**File:** `backend/migrations/create_verification_applications.py`

```sql
CREATE TABLE verification_applications (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected

    -- Application data
    real_name VARCHAR(100) NOT NULL,
    id_type VARCHAR(50) NOT NULL, -- 'national_id', 'passport', 'drivers_license'
    id_number VARCHAR(100) NOT NULL,

    -- Document uploads
    id_document_front VARCHAR(255), -- path to file
    id_document_back VARCHAR(255),
    selfie_with_id VARCHAR(255),
    additional_documents TEXT, -- JSON array of file paths

    -- Social proof
    social_media_proof TEXT, -- JSON: verified accounts, follower counts
    reason TEXT, -- Why they should be verified

    -- Payment
    payment_reference VARCHAR(100),
    payment_verified BOOLEAN DEFAULT FALSE,
    subscription_id INTEGER REFERENCES creator_subscriptions(id),

    -- Admin review
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Backend Routes
**File:** `backend/app/routes/verification.py`

```python
# POST /api/creator/verification/apply - Submit verification application
# GET /api/creator/verification/status - Get application status
# POST /api/creator/verification/{id}/upload - Upload documents

# Admin routes
# GET /api/admin/verification/applications - List all applications
# POST /api/admin/verification/{id}/approve - Approve application
# POST /api/admin/verification/{id}/reject - Reject application
```

#### 3. Frontend Pages
- **`frontend/src/pages/creator/VerificationApplication.jsx`** - Multi-step form
  - Step 1: Payment ($5/month)
  - Step 2: Personal info
  - Step 3: Upload ID documents
  - Step 4: Upload selfie with ID
  - Step 5: Social media verification
  - Step 6: Submit
- **`frontend/src/pages/creator/VerificationStatus.jsx`** - Check status
- **`frontend/src/pages/admin/VerificationQueue.jsx`** - Admin review queue (already exists!)

---

### Part C: Platform Fees Based on Brand Subscription

#### 1. Add Platform Fees to Subscription Plans
**Migration:** `backend/migrations/add_platform_fees_to_subscription_plans.py`

```sql
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2) DEFAULT 10.00;

-- Update existing plans
UPDATE subscription_plans SET platform_fee_percentage = 10.00 WHERE slug IN ('free', 'starter', 'pro');
UPDATE subscription_plans SET platform_fee_percentage = 5.00 WHERE slug = 'agency';

-- Or better naming
UPDATE subscription_plans SET slug = 'premium', platform_fee_percentage = 5.00 WHERE slug = 'agency';
```

#### 2. Update Payment Service
**File:** `backend/app/services/payment_service.py`

```python
def calculate_platform_fee(amount, user_id):
    """Calculate platform fee based on user's subscription tier"""
    user = User.query.get(user_id)
    subscription = Subscription.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()

    if subscription and subscription.plan:
        fee_percentage = subscription.plan.platform_fee_percentage
    else:
        fee_percentage = 10.00  # Default for free tier

    platform_fee = amount * (fee_percentage / 100)
    return platform_fee, fee_percentage
```

#### 3. Update Collaboration/Booking Payment Flow
**Files to update:**
- `backend/app/routes/payments.py` - Add platform fee to payment calculations
- `backend/app/routes/bookings.py` - Show platform fee breakdown
- `frontend/src/pages/Payment.jsx` - Display platform fee in breakdown
- `frontend/src/pages/CampaignPayment.jsx` - Display platform fee

---

### Part D: Featured Creators Display & Search Priority

#### 1. Add Facebook Featured Type
**Migration:** Already has `featured_type` column supporting any string

**Update FeaturedCreators admin page:**
- Add 'facebook' option to featured type radio buttons
- Update filters to include Facebook

#### 2. Homepage Display Logic
**File:** `frontend/src/pages/Home.jsx`

```javascript
// Add Facebook section after Instagram
<PlatformSection
  title="Facebook"
  subtitle="Hire Facebook influencers"
  linkTo="/browse/creators?platform=Facebook"
  bgColor="primary"
  creators={featuredCreators.filter(c => c.featured_type === 'facebook')}
/>
```

#### 3. Search Priority in Browse Creators
**File:** `backend/app/routes/creators.py` - Update `get_creators()`

```python
def get_creators():
    query = CreatorProfile.query

    # Apply filters...

    # Sorting
    sort_by = request.args.get('sort', 'relevance')

    if sort_by == 'relevance':
        # Give precedence to featured creators
        query = query.order_by(
            CreatorProfile.is_featured.desc(),  # Featured first
            CreatorProfile.featured_order.asc(),  # Then by order
            CreatorProfile.follower_count.desc()  # Then by followers
        )
    elif sort_by == 'followers':
        # User explicitly chose sort - no featured precedence
        query = query.order_by(CreatorProfile.follower_count.desc())
    # ... other sorts
```

**File:** `frontend/src/pages/BrowseCreators.jsx`

```javascript
// When sort === 'relevance' - featured get precedence
// When sort !== 'relevance' - no precedence, respect user's choice
```

---

### Part E: Platform Settings Admin Page

#### 1. Create Platform Settings Table
**File:** `backend/migrations/create_platform_settings.py`

```sql
CREATE TABLE platform_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    value_type VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    category VARCHAR(50), -- 'fees', 'subscriptions', 'features', 'limits'
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO platform_settings (setting_key, setting_value, value_type, category, description) VALUES
('default_platform_fee', '10.00', 'number', 'fees', 'Default platform fee percentage'),
('premium_platform_fee', '5.00', 'number', 'fees', 'Platform fee for premium subscribers'),
('verification_price', '5.00', 'number', 'subscriptions', 'Monthly verification subscription price'),
('general_featured_price', '10.00', 'number', 'subscriptions', 'Weekly general featured price'),
('platform_featured_price', '5.00', 'number', 'subscriptions', 'Weekly platform-specific featured price'),
('max_featured_creators', '20', 'number', 'limits', 'Maximum featured creators per category');
```

#### 2. Backend Routes
**File:** `backend/app/routes/admin/platform_settings.py`

```python
# GET /api/admin/settings - Get all settings
# PUT /api/admin/settings/{key} - Update a setting
# GET /api/admin/settings/category/{category} - Get settings by category
```

#### 3. Frontend Admin Page
**File:** `frontend/src/pages/admin/PlatformSettings.jsx`

```javascript
// Tabs: Fees, Subscriptions, Features, Limits
// Each setting shows: Name, Value (editable), Description
// Save button updates via API
// Audit log shows who changed what
```

---

## Implementation Order (Recommended)

### Week 1: Creator Subscriptions & Featured
1. ✅ Day 1-2: Database migrations (creator subscription plans & subscriptions)
2. ✅ Day 3-4: Backend routes for creator subscriptions
3. ✅ Day 5-6: Frontend - Featured subscription payment flow
4. ✅ Day 7: Testing & fixes

### Week 2: Verification System
1. ✅ Day 1-2: Verification applications table & document upload
2. ✅ Day 3-4: Backend verification routes
3. ✅ Day 5-6: Frontend - Verification application form
4. ✅ Day 7: Admin verification queue enhancements

### Week 3: Platform Fees & Search Priority
1. ✅ Day 1-2: Platform fees in subscription plans
2. ✅ Day 3-4: Update payment service to calculate fees
3. ✅ Day 5-6: Update all payment flows to show fees
4. ✅ Day 7: Featured creators search priority

### Week 4: Platform Settings & Polish
1. ✅ Day 1-2: Platform settings table & backend
2. ✅ Day 3-4: Platform settings admin page
3. ✅ Day 5-6: Facebook featured implementation
4. ✅ Day 7: Testing, deployment, documentation

---

## Database Schema Summary

```
creator_subscription_plans
├── id
├── name (General Featured, Facebook Featured, etc.)
├── slug
├── type (featured/verification)
├── featured_category (general/facebook/instagram/tiktok/null)
├── price
├── duration_days
└── is_active

creator_subscriptions
├── id
├── creator_id → creator_profiles
├── plan_id → creator_subscription_plans
├── status (active/expired/cancelled)
├── payment_method
├── payment_reference
├── start_date
├── end_date
└── auto_renew

verification_applications
├── id
├── creator_id → creator_profiles
├── status (pending/approved/rejected)
├── real_name
├── id_type
├── id_number
├── id_document_front (file path)
├── id_document_back (file path)
├── selfie_with_id (file path)
├── social_media_proof (JSON)
├── payment_reference
├── subscription_id
├── reviewed_by
└── rejection_reason

platform_settings
├── id
├── setting_key
├── setting_value
├── value_type
├── category
└── description

subscription_plans (UPDATE)
└── + platform_fee_percentage (10% default, 5% premium)
```

---

## API Endpoints Summary

### Creator Subscription Endpoints
```
GET    /api/creator/subscriptions/plans
POST   /api/creator/subscriptions/subscribe
GET    /api/creator/subscriptions
POST   /api/creator/subscriptions/{id}/cancel
POST   /api/creator/subscriptions/{id}/renew
```

### Verification Endpoints
```
POST   /api/creator/verification/apply
GET    /api/creator/verification/status
POST   /api/creator/verification/{id}/upload

GET    /api/admin/verification/applications
POST   /api/admin/verification/{id}/approve
POST   /api/admin/verification/{id}/reject
```

### Platform Settings Endpoints
```
GET    /api/admin/settings
GET    /api/admin/settings/category/{category}
PUT    /api/admin/settings/{key}
```

---

## Frontend Pages Summary

### New Pages
1. `/creator/featured-subscription` - Subscribe to featured
2. `/creator/verification/apply` - Apply for verification
3. `/creator/verification/status` - Check verification status
4. `/admin/settings` - Platform settings (MAIN PHASE 6 PAGE)

### Pages to Update
1. `/creator/dashboard` - Show active subscriptions & verification status
2. `/admin/featured` - Add Facebook option
3. `/browse/creators` - Featured precedence logic
4. `/` (Home) - Facebook featured section
5. All payment pages - Show platform fee breakdown

---

## Success Criteria

### Creator Subscriptions
- [✅] Creators can subscribe to featured (general/facebook/instagram/tiktok)
- [✅] Creators can subscribe to verification
- [✅] Payment integration works (Paynow + Manual)
- [✅] Subscriptions auto-expire after duration
- [✅] Creators can renew subscriptions

### Verification System
- [✅] Creators can apply for verification
- [✅] Upload ID documents & selfie
- [✅] Admins can review & approve/reject
- [✅] Verified badge shows on profile
- [✅] Monthly subscription ($5/month)

### Platform Fees
- [✅] Free/Pro brands pay 10% platform fee
- [✅] Premium brands pay 5% platform fee
- [✅] Fee shown in payment breakdown
- [✅] Fee calculated correctly on all payment types

### Featured Display
- [✅] General featured shows on homepage
- [✅] Facebook/Instagram/TikTok featured shows in sections
- [✅] Featured creators prioritized in search (relevance mode)
- [✅] No precedence when user sorts by other criteria

### Platform Settings
- [✅] Admins can edit platform fee percentages
- [✅] Admins can edit subscription prices
- [✅] Changes reflect immediately
- [✅] Audit log tracks changes

---

## Ready to Start?

We'll begin with **Part A: Creator Subscription Plans**. Let me know when you're ready to proceed!
