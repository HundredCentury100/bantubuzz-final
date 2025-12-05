# BantuBuzz Account Tier System - Implementation Plan

**Document Version:** 1.0
**Date:** November 24, 2025
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Fiverr's System Analysis](#fiverrs-system-analysis)
3. [BantuBuzz Tier System Design](#bantubuzz-tier-system-design)
4. [Database Schema](#database-schema)
5. [Tier Requirements & Benefits](#tier-requirements--benefits)
6. [Automatic Tier Progression Logic](#automatic-tier-progression-logic)
7. [Implementation Plan](#implementation-plan)
8. [UI/UX Design](#uiux-design)
9. [Technical Considerations](#technical-considerations)

---

## 1. Overview

### Purpose
Implement a multi-tier account system for creators (similar to Fiverr's seller levels) that rewards performance, encourages quality service delivery, and helps brands identify reliable creators.

### Goals
- **Incentivize Quality:** Reward creators who consistently deliver excellent work
- **Build Trust:** Help brands easily identify experienced, reliable creators
- **Gamification:** Create engagement through achievement and progression
- **Platform Growth:** Encourage creators to improve their performance metrics
- **Retention:** Keep top performers engaged with exclusive benefits

---

## 2. Fiverr's System Analysis

### Fiverr Seller Levels

#### **Level Structure:**
1. **New Seller** (Default)
   - Just joined the platform
   - No special badges or benefits
   - Building initial reputation

2. **Level 1 Seller**
   - Requirements:
     - 60 days on platform
     - 10+ orders completed
     - 90% completion rate
     - 4.7+ star rating
     - No warnings/violations
   - Benefits:
     - Level 1 badge
     - Priority in search results (slight boost)
     - Can create custom offers

3. **Level 2 Seller**
   - Requirements:
     - 120 days on platform
     - 50+ orders completed
     - 90% completion rate
     - 4.7+ star rating
     - $2,000+ earnings
     - 5+ unique buyers
     - No warnings/violations
   - Benefits:
     - Level 2 badge
     - Higher search ranking
     - Featured in promotional materials
     - Video consultations enabled
     - Custom order extras

4. **Top Rated Seller**
   - Requirements:
     - 180 days on platform
     - $20,000+ earnings (past 6 months)
     - 100+ orders completed
     - 90% completion rate
     - 4.7+ star rating
     - 10+ unique buyers
     - Exceptional customer satisfaction
     - Quick response time (under 6 hours)
     - No warnings/violations
   - Benefits:
     - Top Rated badge
     - Highest search priority
     - Dedicated account manager
     - Priority customer support
     - Featured in homepage
     - Early access to new features
     - Withdrawal priority

5. **Fiverr Pro** (Application-based)
   - Manually vetted by Fiverr
   - Portfolio review
   - Professional credentials
   - Premium pricing
   - Elite marketplace section

### Key Metrics Tracked:
- **Order Completion Rate:** % of orders delivered successfully
- **Rating:** Average star rating from buyers
- **Response Time:** How quickly seller responds to messages
- **Delivery Time:** On-time delivery percentage
- **Earnings:** Total revenue generated
- **Customer Retention:** Repeat buyer rate
- **Account Duration:** Time on platform
- **Violations:** Warnings, cancellations, disputes

### Demotion/Evaluation:
- **Monthly Evaluation:** Levels reviewed every 30 days
- **Can be demoted** if metrics fall below requirements
- **Warning System:** 1-2 warnings before demotion
- **Grace Period:** 15-day grace period to improve metrics

---

## 3. BantuBuzz Tier System Design

### Proposed Tier Structure for Creators

#### **Tier 1: New Creator** 🆕
**Default tier for all new creators**

**Entry Requirements:**
- Verified account
- Complete profile (100%)
- At least 1 active package

**Key Metrics:**
- None (starting tier)

**Benefits:**
- Basic platform access
- Standard visibility in search
- Standard support
- Can receive bookings
- Can apply to campaigns

**Limitations:**
- Maximum 3 active packages
- Standard support response time (48 hours)
- No priority placement
- 15% platform fee

---

#### **Tier 2: Rising Star** ⭐
**Early achievers showing promise**

**Requirements:**
- ✅ 30 days on platform
- ✅ 5+ completed collaborations
- ✅ 85%+ completion rate
- ✅ 4.0+ average rating
- ✅ $200+ total earnings
- ✅ 2+ unique brands worked with
- ✅ Average response time < 24 hours
- ✅ No active violations

**Benefits:**
- Rising Star badge 🌟
- +10% search ranking boost
- Maximum 5 active packages
- Can create custom offers for brands
- Featured in "Rising Stars" section
- 12% platform fee (3% discount)
- Priority email support (24-hour response)
- Analytics dashboard access

**Visual Identity:**
- Badge color: Bronze/Orange
- Profile border: Bronze shimmer
- Special icon next to name

---

#### **Tier 3: Established Creator** 💎
**Proven track record and consistency**

**Requirements:**
- ✅ 90 days on platform
- ✅ 20+ completed collaborations
- ✅ 90%+ completion rate
- ✅ 4.3+ average rating
- ✅ $1,000+ total earnings
- ✅ 5+ unique brands worked with
- ✅ 80%+ on-time delivery rate
- ✅ Average response time < 12 hours
- ✅ No violations in past 60 days

**Benefits:**
- Established Creator badge 💎
- +25% search ranking boost
- Maximum 10 active packages
- Featured in search results
- Can offer subscription packages
- Custom profile URL
- 10% platform fee (5% discount)
- Priority support (12-hour response)
- Early access to campaigns
- Portfolio featured on homepage (rotation)
- Collaboration history highlighted
- Can set "unavailable" status without penalty

**Visual Identity:**
- Badge color: Silver/Blue
- Profile border: Silver shine
- Verified checkmark icon

---

#### **Tier 4: Elite Creator** 👑
**Top performers with exceptional service**

**Requirements:**
- ✅ 180 days on platform
- ✅ 50+ completed collaborations
- ✅ 92%+ completion rate
- ✅ 4.5+ average rating
- ✅ $5,000+ total earnings (past 6 months)
- ✅ 10+ unique brands worked with
- ✅ 85%+ on-time delivery rate
- ✅ 90%+ brand satisfaction score
- ✅ Average response time < 6 hours
- ✅ 30%+ repeat brand rate
- ✅ No violations in past 90 days

**Benefits:**
- Elite Creator badge 👑
- +50% search ranking boost
- Unlimited active packages
- Top of search results
- Priority visibility in all campaigns
- Can create subscription packages
- 8% platform fee (7% discount)
- VIP support (6-hour response)
- Dedicated account manager
- Monthly performance reports
- Featured creator spotlight (homepage)
- Exclusive campaign invitations
- Early withdrawal access (3-day processing)
- Can decline bookings without penalty
- Custom branding options
- Video consultation feature
- Verified phone badge
- Access to premium brand directory

**Visual Identity:**
- Badge color: Gold
- Profile border: Gold glow effect
- Crown icon + verified checkmark
- Exclusive banner on profile

---

#### **Tier 5: BantuBuzz Pro** 🏆
**Application-based elite tier**

**Entry Method:**
- **Application Required**
- Manual review by BantuBuzz team
- Portfolio assessment
- Professional credentials verification
- Interview process
- Reference checks
- Minimum Tier 3 status required

**Requirements:**
- ✅ All Tier 4 requirements PLUS:
- ✅ Professional portfolio with high-quality work
- ✅ Verifiable professional credentials
- ✅ Industry recognition/awards (optional but preferred)
- ✅ $10,000+ lifetime earnings
- ✅ 100+ completed collaborations
- ✅ 95%+ completion rate
- ✅ 4.7+ average rating
- ✅ Exceptional brand testimonials

**Benefits:**
- BantuBuzz Pro badge 🏆
- Exclusive "Pro Creator" marketplace section
- Premium pricing ability (no cap)
- +100% search ranking boost
- 5% platform fee (10% discount)
- White-glove support (2-hour response)
- Dedicated account manager
- Monthly strategy calls
- Featured in all marketing materials
- Press releases for major collaborations
- Exclusive brand partnerships
- Can set minimum project value
- Priority campaign access (7-day early access)
- Instant withdrawal (same-day processing)
- Custom contract templates
- Legal support for disputes
- Business development support
- Networking events access
- Speaking opportunities at BantuBuzz events

**Visual Identity:**
- Badge color: Platinum/Purple gradient
- Profile border: Animated platinum shine
- Trophy icon + verified checkmark
- "BantuBuzz Pro" banner
- Custom profile design options

---

### Brand Tier System (Optional - Future)

**Note:** Initially focus on creators, but consider brand tiers later:

1. **Startup Brand** - New brands
2. **Growing Brand** - Regular collaborations
3. **Enterprise Brand** - High-volume, premium access
4. **Verified Partner** - Long-term platform partners

---

## 4. Database Schema

### 4.1 Creator Tiers Table

```sql
CREATE TABLE creator_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    tier_level INTEGER NOT NULL UNIQUE, -- 1=New, 2=Rising, 3=Established, 4=Elite, 5=Pro
    badge_icon VARCHAR(255),
    badge_color VARCHAR(50),
    description TEXT,
    is_application_based BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Tier Requirements Table

```sql
CREATE TABLE tier_requirements (
    id SERIAL PRIMARY KEY,
    tier_id INTEGER REFERENCES creator_tiers(id),
    requirement_type VARCHAR(50) NOT NULL, -- 'days_on_platform', 'completed_collaborations', etc.
    requirement_value DECIMAL(10,2) NOT NULL,
    operator VARCHAR(10) NOT NULL, -- '>=', '<=', '=', '>'
    display_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 Tier Benefits Table

```sql
CREATE TABLE tier_benefits (
    id SERIAL PRIMARY KEY,
    tier_id INTEGER REFERENCES creator_tiers(id),
    benefit_type VARCHAR(50) NOT NULL, -- 'max_packages', 'platform_fee', 'search_boost', etc.
    benefit_value VARCHAR(255) NOT NULL, -- Could be number, percentage, boolean
    display_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.4 Update Creator Profile Table

```sql
ALTER TABLE creator_profiles ADD COLUMN tier_id INTEGER REFERENCES creator_tiers(id) DEFAULT 1;
ALTER TABLE creator_profiles ADD COLUMN tier_achieved_at TIMESTAMP;
ALTER TABLE creator_profiles ADD COLUMN previous_tier_id INTEGER REFERENCES creator_tiers(id);
ALTER TABLE creator_profiles ADD COLUMN tier_evaluation_date TIMESTAMP;
ALTER TABLE creator_profiles ADD COLUMN pro_application_status VARCHAR(20); -- 'pending', 'approved', 'rejected', NULL
ALTER TABLE creator_profiles ADD COLUMN pro_applied_at TIMESTAMP;
ALTER TABLE creator_profiles ADD COLUMN pro_rejected_reason TEXT;
```

### 4.5 Creator Performance Metrics Table

```sql
CREATE TABLE creator_metrics (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES creator_profiles(id) NOT NULL,

    -- Time-based
    days_on_platform INTEGER DEFAULT 0,

    -- Collaboration metrics
    total_collaborations INTEGER DEFAULT 0,
    completed_collaborations INTEGER DEFAULT 0,
    cancelled_collaborations INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage

    -- Quality metrics
    average_rating DECIMAL(3,2) DEFAULT 0.00, -- Out of 5
    total_reviews INTEGER DEFAULT 0,
    five_star_reviews INTEGER DEFAULT 0,
    four_star_reviews INTEGER DEFAULT 0,
    three_star_reviews INTEGER DEFAULT 0,
    two_star_reviews INTEGER DEFAULT 0,
    one_star_reviews INTEGER DEFAULT 0,

    -- Financial metrics
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    earnings_last_30_days DECIMAL(10,2) DEFAULT 0.00,
    earnings_last_60_days DECIMAL(10,2) DEFAULT 0.00,
    earnings_last_90_days DECIMAL(10,2) DEFAULT 0.00,
    earnings_last_180_days DECIMAL(10,2) DEFAULT 0.00,

    -- Client metrics
    unique_brands_count INTEGER DEFAULT 0,
    repeat_brand_count INTEGER DEFAULT 0,
    repeat_brand_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage

    -- Response metrics
    average_response_time INTEGER DEFAULT 0, -- In minutes
    response_count INTEGER DEFAULT 0,

    -- Delivery metrics
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage

    -- Satisfaction metrics
    brand_satisfaction_score DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    satisfaction_count INTEGER DEFAULT 0,

    -- Violation metrics
    total_violations INTEGER DEFAULT 0,
    active_violations INTEGER DEFAULT 0,
    violations_last_30_days INTEGER DEFAULT 0,
    violations_last_60_days INTEGER DEFAULT 0,
    violations_last_90_days INTEGER DEFAULT 0,

    -- Last updated
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(creator_id)
);
```

### 4.6 Tier History Table

```sql
CREATE TABLE tier_history (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES creator_profiles(id) NOT NULL,
    old_tier_id INTEGER REFERENCES creator_tiers(id),
    new_tier_id INTEGER REFERENCES creator_tiers(id) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'promotion', 'demotion', 'manual'
    change_reason TEXT,
    metrics_snapshot JSONB, -- Store metrics at time of change
    changed_by INTEGER REFERENCES users(id), -- NULL for automatic, user_id for manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.7 Tier Evaluation Log Table

```sql
CREATE TABLE tier_evaluations (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES creator_profiles(id) NOT NULL,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_tier_id INTEGER REFERENCES creator_tiers(id),
    eligible_tier_id INTEGER REFERENCES creator_tiers(id),
    tier_changed BOOLEAN DEFAULT FALSE,
    requirements_met JSONB, -- Array of met requirements
    requirements_not_met JSONB, -- Array of unmet requirements
    evaluation_notes TEXT,
    next_evaluation_date TIMESTAMP
);
```

---

## 5. Tier Requirements & Benefits

### 5.1 Detailed Requirements Matrix

| Metric | New Creator | Rising Star | Established | Elite | Pro |
|--------|-------------|-------------|-------------|-------|-----|
| **Days on Platform** | 0 | 30+ | 90+ | 180+ | 365+ |
| **Completed Collaborations** | 0 | 5+ | 20+ | 50+ | 100+ |
| **Completion Rate** | - | 85%+ | 90%+ | 92%+ | 95%+ |
| **Average Rating** | - | 4.0+ | 4.3+ | 4.5+ | 4.7+ |
| **Total Earnings** | $0 | $200+ | $1,000+ | $5,000 (6mo) | $10,000+ |
| **Unique Brands** | 0 | 2+ | 5+ | 10+ | 20+ |
| **On-time Delivery** | - | - | 80%+ | 85%+ | 90%+ |
| **Response Time** | - | <24h | <12h | <6h | <3h |
| **Repeat Brand Rate** | - | - | - | 30%+ | 40%+ |
| **Violations (60d)** | - | 0 | 0 | 0 | 0 |
| **Application Required** | No | No | No | No | **Yes** |

### 5.2 Detailed Benefits Matrix

| Benefit | New Creator | Rising Star | Established | Elite | Pro |
|---------|-------------|-------------|-------------|-------|-----|
| **Platform Fee** | 15% | 12% | 10% | 8% | 5% |
| **Max Active Packages** | 3 | 5 | 10 | Unlimited | Unlimited |
| **Search Ranking Boost** | 0% | +10% | +25% | +50% | +100% |
| **Support Response Time** | 48h | 24h | 12h | 6h | 2h |
| **Custom Offers** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Subscription Packages** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Priority Campaigns** | ❌ | ❌ | ✅ | ✅ | ✅ (7d early) |
| **Featured Placement** | ❌ | ✅ (Section) | ✅ (Search) | ✅ (Homepage) | ✅ (All) |
| **Analytics Dashboard** | Basic | ✅ | ✅ Advanced | ✅ Premium | ✅ Enterprise |
| **Account Manager** | ❌ | ❌ | ❌ | ✅ | ✅ Dedicated |
| **Withdrawal Time** | 7 days | 7 days | 5 days | 3 days | Same day |
| **Decline Bookings** | Penalty | Penalty | Limited | No penalty | No penalty |
| **Custom Branding** | ❌ | ❌ | ❌ | ✅ | ✅ Full |
| **Video Consultation** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Legal Support** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 6. Automatic Tier Progression Logic

### 6.1 Evaluation Frequency

**Monthly Automated Evaluation:**
- Runs on the 1st of every month at 00:00 UTC
- Evaluates all creators (except Pro tier)
- Checks if creators meet requirements for higher tier
- Checks if creators still meet current tier requirements
- Generates evaluation reports

**Real-time Checks:**
- After each collaboration completion
- After each review submission
- When metrics are updated
- Quick check for instant promotions

### 6.2 Promotion Logic

```python
def evaluate_tier_promotion(creator):
    """
    Evaluate if creator is eligible for tier promotion
    """
    current_tier = creator.tier_id
    metrics = get_creator_metrics(creator.id)

    # Get next tier
    next_tier = Tier.query.filter_by(tier_level=current_tier.tier_level + 1).first()

    if not next_tier:
        return False  # Already at highest non-Pro tier

    if next_tier.is_application_based:
        return False  # Pro tier requires manual application

    # Check all requirements
    requirements = TierRequirement.query.filter_by(tier_id=next_tier.id).all()

    requirements_met = []
    requirements_not_met = []

    for req in requirements:
        metric_value = getattr(metrics, req.requirement_type, None)

        if metric_value is None:
            requirements_not_met.append(req)
            continue

        # Evaluate requirement based on operator
        if req.operator == '>=':
            met = metric_value >= req.requirement_value
        elif req.operator == '>':
            met = metric_value > req.requirement_value
        elif req.operator == '=':
            met = metric_value == req.requirement_value
        elif req.operator == '<=':
            met = metric_value <= req.requirement_value
        else:
            met = False

        if met:
            requirements_met.append(req)
        else:
            requirements_not_met.append(req)

    # All requirements must be met
    if len(requirements_not_met) == 0:
        # PROMOTE
        promote_creator_tier(creator, next_tier, requirements_met)
        return True
    else:
        # Log evaluation
        log_tier_evaluation(creator, next_tier, requirements_met, requirements_not_met)
        return False
```

### 6.3 Demotion Logic

```python
def evaluate_tier_demotion(creator):
    """
    Check if creator still meets current tier requirements
    """
    current_tier = creator.tier_id
    metrics = get_creator_metrics(creator.id)

    if current_tier.tier_level == 1:
        return False  # Can't demote from Tier 1

    if current_tier.is_application_based:
        return False  # Pro tier doesn't get auto-demoted (manual review)

    # Check current tier requirements
    requirements = TierRequirement.query.filter_by(tier_id=current_tier.id).all()

    failed_requirements = []

    for req in requirements:
        metric_value = getattr(metrics, req.requirement_type, None)

        if metric_value is None:
            continue

        # Evaluate requirement
        if req.operator == '>=':
            met = metric_value >= req.requirement_value
        elif req.operator == '>':
            met = metric_value > req.requirement_value
        elif req.operator == '=':
            met = metric_value == req.requirement_value
        elif req.operator == '<=':
            met = metric_value <= req.requirement_value
        else:
            met = False

        if not met:
            failed_requirements.append(req)

    # Use grace period system
    if len(failed_requirements) > 0:
        if creator.grace_period_active:
            # Already in grace period, check if expired
            if creator.grace_period_expires < datetime.now():
                # Grace period expired, demote
                previous_tier = Tier.query.filter_by(
                    tier_level=current_tier.tier_level - 1
                ).first()
                demote_creator_tier(creator, previous_tier, failed_requirements)
                return True
            else:
                # Still in grace period
                return False
        else:
            # Start grace period (15 days)
            start_grace_period(creator, 15)
            notify_creator_grace_period(creator, failed_requirements)
            return False
    else:
        # All requirements met, clear grace period if active
        if creator.grace_period_active:
            clear_grace_period(creator)
        return False
```

### 6.4 Metrics Calculation

**Real-time Metrics:**
- Updated after each action
- Examples: total_collaborations, total_earnings

**Calculated Metrics:**
- Calculated periodically (daily or on-demand)
- Examples: completion_rate, average_rating, on_time_delivery_rate

**Formula Examples:**

```python
# Completion Rate
completion_rate = (completed_collaborations / total_collaborations) * 100

# Average Rating
average_rating = total_rating_points / total_reviews

# On-time Delivery Rate
on_time_delivery_rate = (on_time_deliveries / (on_time_deliveries + late_deliveries)) * 100

# Repeat Brand Rate
repeat_brand_rate = (repeat_brand_count / unique_brands_count) * 100

# Average Response Time (in minutes)
average_response_time = total_response_time_minutes / response_count

# Brand Satisfaction Score
# Based on post-collaboration surveys
brand_satisfaction_score = (satisfied_brands / total_satisfaction_surveys) * 100
```

---

## 7. Implementation Plan

### Phase 1: Database & Backend (Week 1-2)

#### Week 1: Database Setup
- [ ] Create migration for all new tables
- [ ] Seed default tier data (5 tiers)
- [ ] Seed tier requirements
- [ ] Seed tier benefits
- [ ] Add new columns to creator_profiles
- [ ] Test migrations locally
- [ ] Run migrations on production

#### Week 2: Metrics System
- [ ] Create `creator_metrics` model
- [ ] Build metrics calculation service
- [ ] Create background job for metrics updates
- [ ] Implement metric calculation formulas
- [ ] Create API endpoints for metrics
- [ ] Add metrics to creator profile response
- [ ] Test metrics accuracy

### Phase 2: Tier Evaluation System (Week 3)

- [ ] Create tier evaluation service
- [ ] Implement promotion logic
- [ ] Implement demotion logic
- [ ] Implement grace period system
- [ ] Create scheduled job for monthly evaluations
- [ ] Create manual evaluation endpoint (admin)
- [ ] Implement tier history tracking
- [ ] Create notification system for tier changes
- [ ] Test evaluation logic thoroughly

### Phase 3: API Endpoints (Week 3-4)

#### Creator Endpoints:
- [ ] GET `/api/creators/me/tier` - Get current tier info
- [ ] GET `/api/creators/me/metrics` - Get performance metrics
- [ ] GET `/api/creators/me/tier-progress` - Progress to next tier
- [ ] GET `/api/creators/me/tier-history` - Tier change history
- [ ] POST `/api/creators/me/apply-pro` - Apply for Pro tier

#### Admin Endpoints:
- [ ] GET `/api/admin/tiers` - List all tiers
- [ ] PUT `/api/admin/tiers/:id` - Update tier
- [ ] GET `/api/admin/creators/:id/evaluate` - Manual evaluation
- [ ] POST `/api/admin/creators/:id/promote` - Manual promotion
- [ ] POST `/api/admin/creators/:id/demote` - Manual demotion
- [ ] GET `/api/admin/pro-applications` - List Pro applications
- [ ] PUT `/api/admin/pro-applications/:id/approve` - Approve Pro
- [ ] PUT `/api/admin/pro-applications/:id/reject` - Reject Pro

#### Public Endpoints:
- [ ] GET `/api/tiers` - List all tiers (public info)
- [ ] GET `/api/creators?tier=elite` - Filter creators by tier

### Phase 4: Frontend - Creator Dashboard (Week 4-5)

#### Components to Create:
- [ ] `TierBadge.jsx` - Display tier badge
- [ ] `TierProgress.jsx` - Progress bar to next tier
- [ ] `MetricsDashboard.jsx` - Performance metrics overview
- [ ] `TierRequirements.jsx` - Show requirements for next tier
- [ ] `TierBenefits.jsx` - Show current tier benefits
- [ ] `TierHistory.jsx` - Tier change timeline
- [ ] `ProApplicationForm.jsx` - Apply for Pro tier

#### Pages to Create/Update:
- [ ] Update `CreatorDashboard.jsx` - Add tier section
- [ ] Create `TierInfo.jsx` - Detailed tier information page
- [ ] Update `CreatorProfile.jsx` - Show tier badge
- [ ] Update `CreatorProfileEdit.jsx` - Show tier status
- [ ] Create `ApplyPro.jsx` - Pro application page

#### UI Elements:
- [ ] Badge designs for each tier
- [ ] Icons and colors
- [ ] Progress indicators
- [ ] Celebration animations for tier upgrades
- [ ] Notification toasts for tier changes

### Phase 5: Frontend - Brand Experience (Week 5)

- [ ] Update creator cards with tier badges
- [ ] Add tier filters in creator search
- [ ] Show tier benefits on creator profiles
- [ ] Highlight elite/pro creators in search
- [ ] Add "Verified" indicators
- [ ] Update booking flow to show tier

### Phase 6: Admin Dashboard (Week 6)

- [ ] Tier management page
- [ ] Pro application review interface
- [ ] Creator evaluation tools
- [ ] Manual tier adjustment interface
- [ ] Tier analytics dashboard
- [ ] Bulk evaluation tools

### Phase 7: Notifications & Communications (Week 6)

- [ ] Email template: Tier promotion
- [ ] Email template: Grace period warning
- [ ] Email template: Tier demotion
- [ ] Email template: Pro application status
- [ ] In-app notifications for tier changes
- [ ] Push notifications (if enabled)
- [ ] Celebration modal for promotions

### Phase 8: Testing & Refinement (Week 7)

- [ ] Unit tests for tier evaluation logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for tier progression
- [ ] Performance testing for metrics calculation
- [ ] Load testing for evaluation jobs
- [ ] UAT with test creators
- [ ] Bug fixes and refinements

### Phase 9: Documentation & Launch (Week 8)

- [ ] API documentation
- [ ] Creator guide: "Understanding Tiers"
- [ ] FAQ about tier system
- [ ] Admin documentation
- [ ] Video tutorials
- [ ] Launch announcement
- [ ] Marketing materials
- [ ] Monitor system performance

---

## 8. UI/UX Design

### 8.1 Tier Badges

**Visual Design:**
- **New Creator:** Simple gray icon, no special styling
- **Rising Star:** Bronze/orange badge with star icon, subtle glow
- **Established Creator:** Silver/blue badge with diamond icon, shimmer effect
- **Elite Creator:** Gold badge with crown icon, glow animation
- **BantuBuzz Pro:** Platinum/purple gradient badge with trophy, animated shine

**Placement:**
- Next to creator name on profile
- In creator cards on browse page
- In search results
- In messages
- In booking confirmations

### 8.2 Creator Dashboard - Tier Section

```
┌─────────────────────────────────────────────────────┐
│ Your Tier Status                                    │
│                                                     │
│ [BADGE]  Rising Star  ⭐                           │
│                                                     │
│ Next Tier: Established Creator 💎                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 65%                  │
│                                                     │
│ What you need:                                      │
│ ✅ 30 days on platform (45/30)                     │
│ ✅ 5 completed collaborations (8/5)                │
│ ⏳ 20 completed collaborations (8/20)              │
│ ⏳ $1,000 total earnings ($450/$1,000)             │
│ ✅ 85% completion rate (92%)                       │
│                                                     │
│ [View All Requirements] [See Benefits]             │
└─────────────────────────────────────────────────────┘
```

### 8.3 Metrics Dashboard

```
┌─────────────────────────────────────────────────────┐
│ Performance Metrics                                 │
│                                                     │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│ │  4.7★   │  │   92%   │  │  $450   │            │
│ │ Rating  │  │Complete │  │Earnings │            │
│ └─────────┘  └─────────┘  └─────────┘            │
│                                                     │
│ Response Time: 8 hours avg                         │
│ On-time Delivery: 88%                              │
│ Repeat Brands: 3 (37.5%)                           │
│                                                     │
│ [Detailed Analytics]                               │
└─────────────────────────────────────────────────────┘
```

### 8.4 Tier Promotion Celebration

**Modal Design:**
```
┌─────────────────────────────────────────────────────┐
│                    🎉 CONGRATULATIONS! 🎉           │
│                                                     │
│      [Animated Badge Reveal]                       │
│                                                     │
│        You're now an Established Creator!          │
│                                                     │
│ Your hard work paid off! You've unlocked:          │
│  ✨ 10% platform fee (was 12%)                     │
│  ✨ Up to 10 active packages                       │
│  ✨ Featured in search results                     │
│  ✨ Early campaign access                          │
│  ✨ Custom profile URL                             │
│                                                     │
│       [Share on Social] [View Benefits]            │
└─────────────────────────────────────────────────────┘
```

### 8.5 Grace Period Warning

**Email/Notification:**
```
⚠️ Your tier status needs attention

Hi [Creator Name],

We noticed your performance metrics have dropped below the
requirements for your current tier (Rising Star).

Metrics below threshold:
• Completion rate: 82% (need 85%+)
• Response time: 28 hours (need <24h)

Grace Period: 15 days remaining

To maintain your Rising Star status, focus on:
1. Complete ongoing collaborations on time
2. Respond to brand messages within 24 hours
3. Maintain quality in your deliverables

Need help? Contact our support team.

[View Performance] [Get Tips]
```

---

## 9. Technical Considerations

### 9.1 Performance Optimization

**Metrics Calculation:**
- Use database triggers for real-time metrics
- Batch process for calculated metrics (daily job)
- Cache metrics for frequently accessed creators
- Index all metric columns for fast queries

**Tier Evaluation:**
- Run evaluations during off-peak hours
- Batch process in chunks (100 creators at a time)
- Use async/background jobs (Celery/RQ)
- Log all evaluations for debugging

**Search Performance:**
- Index tier_id column
- Denormalize tier_level in creator_profiles for sorting
- Cache tier badge images
- Pre-generate tier filters

### 9.2 Data Integrity

**Validation:**
- Validate all metrics before updating
- Use database constraints for metric ranges
- Implement transaction locks for tier changes
- Audit trail for all tier modifications

**Backup:**
- Daily backups of metrics tables
- Version control for tier requirements
- Store metrics snapshots with tier changes
- Keep full evaluation history

### 9.3 Scalability

**As Platform Grows:**
- Partition metrics table by date ranges
- Archive old tier history
- Implement caching layer (Redis)
- Use read replicas for metrics queries
- Consider moving metrics to time-series DB (InfluxDB/TimescaleDB)

### 9.4 Security

**Authorization:**
- Creators can only view their own metrics
- Admins can view all metrics
- Tier changes logged with user attribution
- Rate limiting on metrics API endpoints

**Data Privacy:**
- Don't expose exact earnings to brands
- Aggregate metrics only for public view
- Secure Pro application data
- GDPR compliance for metrics storage

### 9.5 Monitoring & Alerts

**System Monitoring:**
- Alert if evaluation job fails
- Monitor metrics calculation performance
- Track tier distribution across platform
- Alert on unusual tier changes (mass demotions)
- Monitor grace period expiries

**Analytics:**
- Track tier progression rates
- Monitor average time to tier advancement
- Analyze which metrics are bottlenecks
- A/B test tier requirements

---

## 10. Migration Strategy for Existing Creators

### Initial Tier Assignment

When launching the tier system, existing creators should be:

**Option A: Start Everyone at Tier 1**
- Fair for new system launch
- Creators immediately see progression opportunities
- May frustrate high-performing creators

**Option B: Retroactive Tier Assignment**
- Calculate historical metrics
- Assign appropriate tier based on past performance
- More fair to established creators
- Complex migration process

**Recommended: Hybrid Approach**
1. Calculate metrics for all existing creators
2. Assign tiers based on current performance
3. Announce system with grandfathering period
4. Give all creators 30 days to understand system before first evaluation

### Communication Plan

**Pre-Launch (2 weeks before):**
- Announcement email to all creators
- Blog post explaining tier system
- Webinar/video tutorial
- FAQ page
- Allow feedback and questions

**Launch Day:**
- Email with current tier assignment
- Dashboard notification
- Highlight benefits
- Show path to next tier
- Celebration for those starting at higher tiers

**Post-Launch (First 30 days):**
- Weekly tips for tier advancement
- Success stories
- Q&A sessions
- Support for concerns
- Monitor sentiment and adjust if needed

---

## 11. Success Metrics

### Platform KPIs to Track

**Engagement:**
- % of creators actively working toward next tier
- Time spent on metrics/tier pages
- Application rate for Pro tier

**Quality:**
- Overall platform completion rate improvement
- Average rating improvement
- Response time improvement

**Retention:**
- Churn rate by tier
- Re-activation of inactive creators
- Tier correlation with activity

**Revenue:**
- Earnings growth by tier
- Platform fee revenue by tier
- Premium tier adoption rate

**Brand Satisfaction:**
- Booking rate by creator tier
- Repeat booking rate
- Brand preference for higher tiers

---

## 12. Future Enhancements

### Phase 2 Features (6-12 months)

1. **Tier Leaderboards**
   - Monthly top performers by tier
   - Showcase rising stars
   - Competitive element

2. **Tier Milestones**
   - Celebrate 100th collaboration
   - $10k earnings milestone
   - 1-year anniversary

3. **Tier Challenges**
   - Special monthly challenges
   - Bonus tier points for completing
   - Limited-time achievements

4. **Brand Tiers**
   - Implement similar system for brands
   - Reward loyal brands
   - Premium brand features

5. **Tier Subscriptions**
   - Optional: Pay to maintain tier
   - Reduce fee percentage further
   - Additional benefits

6. **Tier Insurance**
   - Protect against temporary dips
   - Extended grace periods
   - Metrics freeze during issues

7. **Peer Recognition**
   - Creators endorse each other
   - Professional network within platform
   - Collaboration opportunities

---

## Questions for Discussion

1. **Tier Count:** Is 5 tiers too many? Should we start with 3 and expand?

2. **Platform Fees:** Are the fee reductions appropriate? (15% → 5%)

3. **Pro Tier:** Should it be application-based or purely metric-based?

4. **Grace Period:** Is 15 days the right length?

5. **Evaluation Frequency:** Monthly, or more frequent (weekly/real-time)?

6. **Requirements:** Are the metrics achievable but challenging?

7. **Benefits:** What other benefits would motivate creators?

8. **Brand Impact:** Should brands pay less to book higher-tier creators or more?

9. **Launch Strategy:** Retroactive assignment or fresh start?

10. **Mobile App:** Do we need mobile-specific tier UI?

---

## Next Steps

1. **Review & Approve** this plan
2. **Refine requirements** based on current platform data
3. **Design mockups** for UI components
4. **Set timeline** for implementation
5. **Assign development team** resources
6. **Begin Phase 1** (Database setup)

---

**Document Owner:** Development Team
**Stakeholders:** Product, Design, Marketing, Support
**Last Updated:** November 24, 2025
**Next Review:** After Phase 1 completion
