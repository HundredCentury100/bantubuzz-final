# Phase 6: Platform Settings - Aligned Implementation Plan

## Your Exact Requirements

### Brand Subscriptions (For paying for collaborations)
1. **Free** - 10% platform fee
2. **Pro** - 10% platform fee
3. **Premium** - 5% platform fee (reduced fees)

### Creator Subscriptions (Separate from brand subscriptions)

#### Featured Creator Subscriptions (Weekly)
1. **General Featured** - $10/week (shown on homepage for all visitors)
2. **Facebook Featured** - $5/week (shown in Facebook section)
3. **Instagram Featured** - $5/week (shown in Instagram section)
4. **TikTok Featured** - $5/week (shown in TikTok section)

#### Verification Subscription
- **Creator Verification** - $5/month
  - Apply with form + documents
  - Admin reviews and approves
  - Get verified badge on profile

### Featured Display Rules
1. **Homepage:** General, Facebook, Instagram, TikTok featured creators shown in respective sections
2. **Browse/Search:**
   - Featured creators get **priority/precedence** when filtering/searching
   - **EXCEPT** when user explicitly changes sort from "relevance" to something else
   - If sort = "relevance" → Featured first
   - If sort = "followers" / "newest" / etc → No featured precedence

---

## Current State Issues to Fix

### ❌ Problem 1: Wrong Subscription Plans
**Current:** Plans named "Starter", "Pro", "Agency" with creator-focused features
**Should be:** "Free", "Pro", "Premium" for **brands only**

**Solution:** Rename/restructure existing subscription_plans table to be brand-specific

### ❌ Problem 2: No Creator Subscriptions
**Current:** No subscription system for creators
**Should be:** Separate creator subscription system for Featured & Verification

**Solution:** Create new `creator_subscription_plans` and `creator_subscriptions` tables

### ❌ Problem 3: No Platform Fees
**Current:** No platform fee calculation based on subscription tier
**Should be:** 10% for Free/Pro, 5% for Premium

**Solution:** Add `platform_fee_percentage` column to subscription_plans

### ❌ Problem 4: Facebook Featured Missing
**Current:** Only general, tiktok, instagram featured types
**Should be:** Add facebook as featured type

**Solution:** Already supported in DB, just need to add to admin UI

### ❌ Problem 5: Featured Search Priority Not Implemented
**Current:** Featured creators not prioritized in search
**Should be:** Featured first when sort = "relevance"

**Solution:** Update creators search endpoint

---

## Implementation Steps

### Step 1: Fix Brand Subscription Plans

#### 1.1 Update Existing Plans
**File:** `backend/migrations/fix_brand_subscription_plans.py`

```python
"""
Rename and restructure subscription plans for brands
"""
from app import create_app, db
from app.models import SubscriptionPlan
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Add platform_fee_percentage column
    db.session.execute(text('''
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2) DEFAULT 10.00
    '''))

    # Update existing plans to be brand-focused
    free_plan = SubscriptionPlan.query.filter_by(slug='free').first()
    if free_plan:
        free_plan.name = 'Free'
        free_plan.description = 'Get started with basic features - 10% platform fee'
        free_plan.platform_fee_percentage = 10.00
        free_plan.price_monthly = 0.00
        free_plan.price_yearly = 0.00
        free_plan.badge_label = None

    # Rename Starter to Pro
    starter = SubscriptionPlan.query.filter_by(slug='starter').first()
    if starter:
        starter.name = 'Pro'
        starter.slug = 'pro-brand'
        starter.description = 'Professional features for active brands - 10% platform fee'
        starter.platform_fee_percentage = 10.00

    # Rename Agency to Premium
    agency = SubscriptionPlan.query.filter_by(slug='agency').first()
    if agency:
        agency.name = 'Premium'
        agency.slug = 'premium'
        agency.description = 'Premium features with reduced platform fees - 5% platform fee'
        agency.platform_fee_percentage = 5.00

    # Delete old Pro plan if exists
    old_pro = SubscriptionPlan.query.filter_by(slug='pro').first()
    if old_pro and old_pro.id != starter.id:
        db.session.delete(old_pro)

    db.session.commit()
    print('✅ Brand subscription plans updated')
```

#### 1.2 Update Model
**File:** `backend/app/models/subscription_plan.py`

```python
# Add to SubscriptionPlan model
platform_fee_percentage = db.Column(db.Float, default=10.00)

def to_dict(self):
    return {
        # ... existing fields ...
        'platform_fee_percentage': float(self.platform_fee_percentage),
    }
```

---

### Step 2: Create Creator Subscription System

#### 2.1 Create Tables
**File:** `backend/migrations/create_creator_subscriptions.py`

```python
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Creator Subscription Plans
    db.session.execute(text('''
        CREATE TABLE IF NOT EXISTS creator_subscription_plans (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            subscription_type VARCHAR(20) NOT NULL, -- 'featured' or 'verification'
            featured_category VARCHAR(20), -- 'general', 'facebook', 'instagram', 'tiktok', NULL
            price DECIMAL(10,2) NOT NULL,
            duration_days INTEGER NOT NULL, -- 7 for featured, 30 for verification
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # Creator Subscriptions
    db.session.execute(text('''
        CREATE TABLE IF NOT EXISTS creator_subscriptions (
            id SERIAL PRIMARY KEY,
            creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
            plan_id INTEGER NOT NULL REFERENCES creator_subscription_plans(id),
            status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'pending_payment'

            -- Payment
            payment_method VARCHAR(30), -- 'paynow', 'manual'
            payment_reference VARCHAR(100),
            paynow_poll_url TEXT,
            payment_verified BOOLEAN DEFAULT FALSE,

            -- Subscription period
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            auto_renew BOOLEAN DEFAULT FALSE,

            -- Metadata
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))

    # Insert default creator subscription plans
    db.session.execute(text('''
        INSERT INTO creator_subscription_plans
        (name, slug, subscription_type, featured_category, price, duration_days, description)
        VALUES
        ('General Featured', 'general-featured', 'featured', 'general', 10.00, 7,
         'Featured on homepage for all visitors - $10 per week'),
        ('Facebook Featured', 'facebook-featured', 'featured', 'facebook', 5.00, 7,
         'Featured in Facebook influencers section - $5 per week'),
        ('Instagram Featured', 'instagram-featured', 'featured', 'instagram', 5.00, 7,
         'Featured in Instagram influencers section - $5 per week'),
        ('TikTok Featured', 'tiktok-featured', 'featured', 'tiktok', 5.00, 7,
         'Featured in TikTok influencers section - $5 per week'),
        ('Creator Verification', 'creator-verification', 'verification', NULL, 5.00, 30,
         'Get verified badge on your profile - $5 per month')
        ON CONFLICT (slug) DO NOTHING
    '''))

    db.session.commit()
    print('✅ Creator subscription tables created')
```

#### 2.2 Create Models
**File:** `backend/app/models/creator_subscription_plan.py`

```python
from app import db
from datetime import datetime

class CreatorSubscriptionPlan(db.Model):
    __tablename__ = 'creator_subscription_plans'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    subscription_type = db.Column(db.String(20), nullable=False)  # 'featured' or 'verification'
    featured_category = db.Column(db.String(20))  # 'general', 'facebook', 'instagram', 'tiktok', NULL
    price = db.Column(db.Float, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'subscription_type': self.subscription_type,
            'featured_category': self.featured_category,
            'price': float(self.price),
            'duration_days': self.duration_days,
            'description': self.description,
            'is_active': self.is_active
        }
```

**File:** `backend/app/models/creator_subscription.py`

```python
from app import db
from datetime import datetime, timedelta

class CreatorSubscription(db.Model):
    __tablename__ = 'creator_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('creator_subscription_plans.id'), nullable=False)
    status = db.Column(db.String(20), default='active')

    payment_method = db.Column(db.String(30))
    payment_reference = db.Column(db.String(100))
    paynow_poll_url = db.Column(db.Text)
    payment_verified = db.Column(db.Boolean, default=False)

    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    auto_renew = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    plan = db.relationship('CreatorSubscriptionPlan', backref='subscriptions')
    creator = db.relationship('CreatorProfile', backref='subscriptions')

    def is_active(self):
        if self.status != 'active':
            return False
        if self.end_date and datetime.utcnow() > self.end_date:
            return False
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'plan': self.plan.to_dict() if self.plan else None,
            'status': self.status,
            'payment_method': self.payment_method,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'auto_renew': self.auto_renew,
            'is_active': self.is_active(),
            'created_at': self.created_at.isoformat()
        }
```

---

### Step 3: Verification Application System

#### 3.1 Create Verification Table
**File:** `backend/migrations/create_verification_applications.py`

```python
db.session.execute(text('''
    CREATE TABLE IF NOT EXISTS verification_applications (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
        subscription_id INTEGER REFERENCES creator_subscriptions(id),

        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'pending_payment'

        -- Application data
        real_name VARCHAR(100) NOT NULL,
        id_type VARCHAR(50) NOT NULL, -- 'national_id', 'passport', 'drivers_license'
        id_number VARCHAR(100) NOT NULL,

        -- Document uploads (file paths)
        id_document_front VARCHAR(255),
        id_document_back VARCHAR(255),
        selfie_with_id VARCHAR(255),

        -- Social proof
        instagram_verified BOOLEAN DEFAULT FALSE,
        instagram_username VARCHAR(100),
        instagram_followers INTEGER,
        tiktok_verified BOOLEAN DEFAULT FALSE,
        tiktok_username VARCHAR(100),
        tiktok_followers INTEGER,
        facebook_verified BOOLEAN DEFAULT FALSE,
        facebook_username VARCHAR(100),
        facebook_followers INTEGER,

        -- Additional info
        reason TEXT, -- Why they should be verified

        -- Payment
        payment_reference VARCHAR(100),
        payment_verified BOOLEAN DEFAULT FALSE,

        -- Admin review
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        rejection_reason TEXT,
        admin_notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
'''))
```

---

### Step 4: Update Featured Display Logic

#### 4.1 Add Facebook to Admin Featured Page
**File:** `frontend/src/pages/admin/FeaturedCreators.jsx`

Update the featured type options to include 'facebook':
```javascript
const featuredTypes = [
  { value: 'general', label: 'General Featured ($10/week)' },
  { value: 'facebook', label: 'Facebook Featured ($5/week)' },
  { value: 'instagram', label: 'Instagram Featured ($5/week)' },
  { value: 'tiktok', label: 'TikTok Featured ($5/week)' },
];
```

#### 4.2 Add Facebook Section to Homepage
**File:** `frontend/src/pages/Home.jsx`

After Instagram section, add:
```javascript
{/* Facebook Section */}
<PlatformSection
  title="Facebook"
  subtitle="Hire Facebook influencers"
  linkTo="/browse/creators?platform=Facebook"
  bgColor="white"
  creators={featuredCreators.filter(c => c.featured_type === 'facebook')}
/>
```

#### 4.3 Update Search Priority
**File:** `backend/app/routes/creators.py`

```python
def get_creators():
    # ... existing filters ...

    sort_by = request.args.get('sort', 'relevance')

    if sort_by == 'relevance':
        # Featured creators get priority
        query = query.order_by(
            CreatorProfile.is_featured.desc(),
            CreatorProfile.featured_order.asc(),
            CreatorProfile.follower_count.desc()
        )
    elif sort_by == 'followers':
        # User explicitly chose sort - NO featured priority
        query = query.order_by(CreatorProfile.follower_count.desc())
    elif sort_by == 'newest':
        query = query.order_by(CreatorProfile.created_at.desc())
    # ... other sorts ...
```

---

### Step 5: Platform Fees Integration

#### 5.1 Update Payment Service
**File:** `backend/app/services/payment_service.py`

```python
def calculate_platform_fee(amount, brand_user_id):
    """Calculate platform fee based on brand's subscription tier"""
    from app.models import User, Subscription

    # Get brand's active subscription
    subscription = Subscription.query.filter_by(
        user_id=brand_user_id,
        status='active'
    ).first()

    if subscription and subscription.plan:
        fee_percentage = subscription.plan.platform_fee_percentage
    else:
        fee_percentage = 10.00  # Default for free tier

    platform_fee = amount * (fee_percentage / 100)

    return {
        'platform_fee': platform_fee,
        'fee_percentage': fee_percentage,
        'creator_amount': amount,
        'total_amount': amount + platform_fee
    }
```

#### 5.2 Update All Payment Routes
Need to update:
- `backend/app/routes/payments.py`
- `backend/app/routes/bookings.py`
- `backend/app/routes/collaborations.py`

Add platform fee to payment calculations and show in breakdown.

---

## Design Consistency Requirements

### Admin Pages Design Pattern
**Reference:** [Dashboard.jsx](frontend/src/pages/admin/Dashboard.jsx), [Users.jsx](frontend/src/pages/admin/Users.jsx)

```javascript
// Standard admin page structure
<AdminLayout>
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Page Title</h1>
        <p className="text-gray-600 leading-relaxed mt-1">Description</p>
      </div>
      <button className="px-4 py-2 bg-primary text-dark font-medium rounded-lg hover:bg-primary/90">
        Action Button
      </button>
    </div>

    {/* Content */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Content here */}
    </div>
  </div>
</AdminLayout>
```

**Key styles:**
- Cards: `bg-white rounded-lg shadow-sm border border-gray-200`
- Headings: `text-3xl font-bold text-gray-900 leading-tight`
- Buttons: `rounded-lg` (NOT rounded-full)
- No excessive shadows or blur effects

### Creator Pages Design Pattern
**Reference:** [CreatorDashboard.jsx](frontend/src/pages/CreatorDashboard.jsx)

**Key styles:**
- Background: `bg-light`
- Cards: `bg-white rounded-3xl shadow-lg`
- Primary buttons: `bg-primary text-dark rounded-full`
- Gradients and modern effects allowed

### Brand Pages Design Pattern
**Reference:** [BrandDashboard.jsx](frontend/src/pages/BrandDashboard.jsx)

Same as creator pages - consistent modern design with rounded cards.

---

## Implementation Priority

1. ✅ **Fix Brand Subscriptions** (Update plans to Free/Pro/Premium with fees)
2. ✅ **Create Creator Subscriptions** (Featured & Verification tables + models)
3. ✅ **Creator Featured Payment Flow** (Frontend pages for subscribing)
4. ✅ **Verification Application** (Multi-step form + document upload)
5. ✅ **Platform Fees** (Calculate and display in all payment flows)
6. ✅ **Featured Search Priority** (Update search logic)
7. ✅ **Platform Settings Page** (Admin page to edit fees & prices)

---

Ready to start? I'll begin with **fixing the brand subscriptions** to match your exact requirements!
