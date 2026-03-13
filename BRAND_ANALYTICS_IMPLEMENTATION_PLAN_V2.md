# BantuBuzz Brand Analytics Dashboard - Complete Implementation Plan v2.0

**Created**: March 12, 2026
**Updated**: March 12, 2026 (Added detailed analytics specifications)
**Scope**: Complete Brand Analytics Dashboard with ThunziAI Social Media Tracking
**Estimated Time**: 65-80 hours
**Priority**: High (Core Brand Feature)

---

## 📋 Table of Contents

1. [Overview & Objectives](#overview--objectives)
2. [Analytics Dashboard Structure](#analytics-dashboard-structure)
3. [Phase Breakdown](#phase-breakdown)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)

---

## 🎯 Overview & Objectives

### Core Questions to Answer
1. **Is my marketing spend producing results?** → Core Metrics + Spend Analytics
2. **Which campaigns are performing well?** → Campaign Post Analytics
3. **Which creators deliver the best value?** → Creator Tier Spend Distribution
4. **Is campaign performance improving over time?** → Trend analysis

### Key Principles
- ✅ **Actionable insights only** - No vanity metrics
- ✅ **Real social media data** - ThunziAI provides actual post performance
- ✅ **Clarity over complexity** - Simple, clean interface
- ✅ **Decision-enabling** - Every metric should drive action

---

## 📊 Analytics Dashboard Structure

### **Dashboard Layout (Top to Bottom)**

```
┌─────────────────────────────────────────────────────────────┐
│  BRAND ANALYTICS DASHBOARD                                   │
│                                                               │
│  [Time Range Selector: Last 7 Days ▼] [Campaign Filter ▼]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CORE METRICS (Metric Cards Row)                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │Impress.│ │ Reach  │ │ Likes  │ │ Saves  │ │ Shares   │  │
│  │450,000 │ │320,000 │ │18,400  │ │2,400   │ │ 1,100    │  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────────────┐  │
│  │Comment │ │Engage  │ │Sentimnt│ │     Mentions        │  │
│  │  860   │ │ 4.6%   │ │72% Pos │ │       540           │  │
│  └────────┘ └────────┘ └────────┘ └─────────────────────┘  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  2. CREATOR TIER SPEND DISTRIBUTION                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Bar Chart: Nano/Micro/Macro/Mega spend distribution]  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Table: Tier | # Creators | Total Spend | Avg Spend]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  3. CAMPAIGN POST ANALYTICS                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Filters: [Creator ▼] [Platform ▼] [Date Range ▼]       │ │
│  │  ┌─────────────────────────────────────────────────────┐│ │
│  │  │ Post | Creator | Platform | Likes | Comments | ... ││ │
│  │  │ ...                                                  ││ │
│  │  └─────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  4. COMMENT SENTIMENT ANALYSIS                               │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  [Donut Chart]   │  │  [Comment Detail Table]          │ │
│  │  Positive: 72%   │  │  Username | Comment | Sentiment │ │
│  │  Neutral: 18%    │  │  ...                             │ │
│  │  Negative: 8%    │  │                                  │ │
│  │  Critical: 2%    │  │                                  │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  5. TOP COMMENTS & AUDIENCE REACTIONS                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Tabs: Top Comments | Most Positive | Most Negative]   │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │ @username: "Great product!" | 👍 245 | ⭐Positive │  │ │
│  │  │ @user2: "Amazing campaign" | 👍 198 | ⭐Positive  │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Phase Breakdown (Updated)

### **Phase 1: Deliverables URL Tracking (8-10 hours)** ⭐ PRIORITY

**Goal**: Allow creators to submit post URLs and brands to track them

**Database Changes**:
```sql
ALTER TABLE campaign_deliverables
ADD COLUMN post_url TEXT,
ADD COLUMN post_platform VARCHAR(50),
ADD COLUMN post_id VARCHAR(255),
ADD COLUMN thunzi_post_id INTEGER,
ADD COLUMN url_submitted_at TIMESTAMP;
```

**Tasks**:
1. ✅ Create URL parser utility (Instagram, Facebook, YouTube, TikTok, Twitter)
2. ✅ Update deliverable model with new fields
3. ✅ Create API endpoint: `PUT /api/creator/deliverables/:id/submit-url`
4. ✅ Build `DeliverableURLInput.jsx` component
5. ✅ Integrate into collaboration detail page

**Deliverable**: Creators can paste post URLs in their collaborations

---

### **Phase 2: ThunziAI Creator Registration (10-12 hours)**

**Goal**: Register creators with brand's ThunziAI company for tracking

**New Table**: `thunzi_creators`

**Tasks**:
1. ✅ Create `thunzi_creators` table
2. ✅ Add methods to `ThunziService`: `register_creator()`, `get_creator_platforms()`
3. ✅ Create auto-registration on collaboration acceptance
4. ✅ Store ThunziAI creator ID mapping
5. ✅ Handle creator sync errors gracefully

**Deliverable**: Creators auto-registered with brand's ThunziAI account when collaboration starts

---

### **Phase 3: Post Performance Tracking (12-15 hours)**

**Goal**: Fetch and store comprehensive post metrics from ThunziAI

**New Table**: `campaign_post_metrics`

**Metrics Tracked**:
- **Reach**: Unique users who saw the post
- **Impressions**: Total post views
- **Likes**: Post likes
- **Comments**: Comment count
- **Shares**: Share count
- **Saves**: Save count (Instagram)
- **Engagement Rate**: (likes + comments + shares + saves) / reach × 100
- **Sentiment**: positive, negative, neutral
- **Sentiment Score**: -100 to +100
- **Comment Breakdown**: positive, negative, neutral, critical counts

**Tasks**:
1. ✅ Create `campaign_post_metrics` table
2. ✅ Build `PostMetricsService` class
3. ✅ Implement post sync from ThunziAI
4. ✅ Create scheduled job for metrics updates
5. ✅ Handle missing/deleted posts
6. ✅ Sync comment sentiment data

**Deliverable**: System automatically fetches post performance data from ThunziAI

---

### **Phase 4: Core Metrics Calculation (10-12 hours)**

**Goal**: Calculate and aggregate core campaign metrics

**Core Metrics to Calculate**:
1. **Impressions** - Sum of all post impressions
2. **Reach** - Sum of all post reach
3. **Likes** - Total likes across all posts
4. **Saves** - Total saves
5. **Shares** - Total shares
6. **Comments** - Total comments
7. **Engagement Rate** - Weighted average across posts
8. **Sentiment** - Percentage positive comments
9. **Mentions** - Brand mentions count (from comments/posts)

**Tasks**:
1. ✅ Create `AnalyticsService` class
2. ✅ Implement `get_core_metrics(brand_id, start_date, end_date, campaign_id?)`
3. ✅ Add caching layer (1-hour cache)
4. ✅ Calculate weighted averages for engagement rate
5. ✅ Extract brand mentions from posts/comments

**Deliverable**: Core metrics API returns aggregated data

---

### **Phase 5: Creator Tier Spend Distribution (8-10 hours)**

**Goal**: Analyze spend across creator tiers (Nano, Micro, Macro, Mega)

**Creator Tier Definitions**:
- **Nano**: 1K - 10K followers
- **Micro**: 10K - 100K followers
- **Macro**: 100K - 1M followers
- **Mega**: 1M+ followers

**Calculations**:
1. Get follower count from `connected_platforms` table
2. Categorize each creator into tier
3. Sum spend per tier from `bookings` table
4. Calculate average spend per creator per tier

**Tasks**:
1. ✅ Add follower count to creator queries
2. ✅ Implement tier categorization logic
3. ✅ Create `get_creator_tier_distribution(brand_id, start_date, end_date)`
4. ✅ Return: tier, creator_count, total_spend, avg_spend

**Deliverable**: Brand can see how budget is distributed across creator sizes

---

### **Phase 6: Campaign Post Analytics (10-12 hours)**

**Goal**: Show individual post performance with filtering

**Features**:
- Table of all campaign posts
- Filter by: creator, platform, date range, campaign
- Sort by: likes, comments, impressions, engagement rate
- Click post row → opens post in new tab + shows details

**Data Points per Post**:
- Post preview/thumbnail
- Creator name
- Platform (Instagram, Facebook, YouTube, etc.)
- Publish date
- Likes, Comments, Shares, Saves
- Impressions, Reach
- Engagement rate
- Sentiment score

**Tasks**:
1. ✅ Create `get_campaign_posts(brand_id, filters)` endpoint
2. ✅ Build `CampaignPostAnalytics.jsx` component
3. ✅ Implement filtering UI
4. ✅ Add sortable table headers
5. ✅ Pagination (20 posts per page)
6. ✅ Post detail modal/page

**Deliverable**: Brand can filter and analyze individual post performance

---

### **Phase 7: Comment Sentiment Analysis (8-10 hours)**

**Goal**: Visualize audience sentiment and show comment details

**Components**:
1. **Sentiment Summary Chart** (D3.js Donut Chart)
   - Positive: % and count
   - Neutral: % and count
   - Negative: % and count
   - Critical: % and count

2. **Comment Detail Table**
   - Username
   - Comment text
   - Sentiment category
   - Likes
   - Views
   - Post link

**Tasks**:
1. ✅ Store comment data in `campaign_post_metrics`
2. ✅ Create `get_comment_sentiment(brand_id, filters)` endpoint
3. ✅ Build `CommentSentimentChart.jsx` with D3.js
4. ✅ Build `CommentDetailTable.jsx`
5. ✅ Add filter by sentiment type
6. ✅ Pagination for comments

**Deliverable**: Brand can see sentiment breakdown and read actual comments

---

### **Phase 8: Top Comments & Audience Reactions (6-8 hours)**

**Goal**: Surface the most impactful audience responses

**Tabs**:
1. **Top Comments** - Highest likes/engagement
2. **Most Positive** - Highest positive sentiment scores
3. **Most Negative** - Highlight criticisms early

**Display Format**:
```
┌────────────────────────────────────────────────────┐
│ @username                                          │
│ "This is an amazing product! Highly recommend!"    │
│ 👍 245 likes | ⭐ Positive | 📅 2 days ago         │
│ Post: instagram.com/p/ABC123                       │
└────────────────────────────────────────────────────┘
```

**Tasks**:
1. ✅ Create `get_top_comments(brand_id, type, limit)` endpoint
2. ✅ Build `TopComments.jsx` component with tabs
3. ✅ Rank by: likes, engagement score, sentiment
4. ✅ Link to original post
5. ✅ Show 10 comments per tab

**Deliverable**: Brand can quickly identify praise and criticism

---

### **Phase 9: Date Range Filtering (4-6 hours)**

**Goal**: Enable time-based analytics comparison

**Supported Filters**:
1. **Campaign Date Range** - Specific campaign's duration
2. **Custom Date Range** - User-selected start/end dates
3. **Last 7 Days** - Quick filter
4. **Last 30 Days** - Quick filter
5. **Last 90 Days** - Quick filter
6. **All Time** - No date filter

**Tasks**:
1. ✅ Create `TimeRangeSelector.jsx` component
2. ✅ Add campaign selector dropdown
3. ✅ Update all API endpoints to accept date filters
4. ✅ Store selected range in URL params (persistence)
5. ✅ Add "Compare to previous period" toggle

**Deliverable**: Brand can analyze performance across any time period

---

### **Phase 10: Frontend Analytics Dashboard (12-15 hours)**

**Goal**: Build beautiful, cohesive analytics UI

**Page Structure**: `BrandAnalytics.jsx`

**Sections** (in order):
1. Header with Time Range Selector
2. Core Metrics Cards (9 metrics)
3. Creator Tier Spend Distribution (chart + table)
4. Campaign Post Analytics (filterable table)
5. Comment Sentiment Analysis (donut chart + table)
6. Top Comments & Audience Reactions (tabbed view)

**Design Requirements**:
- ✅ BantuBuzz design system (rounded-3xl cards, rounded-full buttons)
- ✅ Chart.js for bar charts
- ✅ D3.js for donut charts
- ✅ Responsive (mobile, tablet, desktop)
- ✅ Loading states for all sections
- ✅ Empty states when no data
- ✅ Tooltips on metric cards

**Tasks**:
1. ✅ Create main `BrandAnalytics.jsx` layout
2. ✅ Build `CoreMetricsCards.jsx`
3. ✅ Build `CreatorTierChart.jsx` (Chart.js)
4. ✅ Build `CreatorTierTable.jsx`
5. ✅ Build `CampaignPostAnalytics.jsx`
6. ✅ Build `CommentSentimentChart.jsx` (D3.js)
7. ✅ Build `CommentDetailTable.jsx`
8. ✅ Build `TopComments.jsx`
9. ✅ Add quick navigation (jump to section)
10. ✅ Integrate all API endpoints

**Deliverable**: Complete analytics dashboard matching spec

---

### **Phase 11: Backend API Endpoints (10-12 hours)**

**Goal**: Create REST API for all analytics data

**Endpoints to Create**:

```python
# Core Metrics
GET /api/brand/analytics/core-metrics
Query params: start_date, end_date, campaign_id (optional)
Returns: {impressions, reach, likes, saves, shares, comments, engagement_rate, sentiment, mentions}

# Creator Tier Distribution
GET /api/brand/analytics/creator-tiers
Query params: start_date, end_date, campaign_id (optional)
Returns: [{tier, creator_count, total_spend, avg_spend, creators: [...]}]

# Campaign Posts
GET /api/brand/analytics/campaign-posts
Query params: start_date, end_date, campaign_id, platform, creator_id, page, per_page
Returns: {posts: [...], total, page, pages}

# Comment Sentiment
GET /api/brand/analytics/comment-sentiment
Query params: start_date, end_date, campaign_id
Returns: {positive_count, neutral_count, negative_count, critical_count, percentages}

# Comment Details
GET /api/brand/analytics/comments
Query params: start_date, end_date, sentiment_filter, page, per_page
Returns: {comments: [...], total, page, pages}

# Top Comments
GET /api/brand/analytics/top-comments
Query params: type (top|positive|negative), limit (default 10)
Returns: {comments: [...]}

# Summary (All Data)
GET /api/brand/analytics/summary
Query params: start_date, end_date, campaign_id (optional)
Returns: {core_metrics, creator_tiers, sentiment_summary}
```

**Tasks**:
1. ✅ Create `backend/app/routes/brand/analytics.py`
2. ✅ Implement all 7 endpoints
3. ✅ Add proper JWT authentication
4. ✅ Add brand_required decorator
5. ✅ Implement caching (1-hour expiry)
6. ✅ Add comprehensive logging
7. ✅ Error handling for missing data
8. ✅ Register blueprint in `__init__.py`

**Deliverable**: Complete analytics API ready for frontend

---

### **Phase 12: Testing & Polish (6-8 hours)**

**Goal**: Ensure reliability and performance

**Testing Tasks**:
1. ✅ Unit tests for analytics calculations
2. ✅ Test edge cases:
   - No campaigns
   - No post URLs submitted
   - Deleted posts
   - Creator not on ThunziAI
   - ThunziAI API down
3. ✅ Performance testing:
   - Load time under 2 seconds
   - Caching effectiveness
   - Query optimization
4. ✅ Mobile responsiveness
5. ✅ Cross-browser testing (Chrome, Firefox, Safari)
6. ✅ Accessibility (screen readers, keyboard navigation)

**Polish Tasks**:
1. ✅ Add loading skeletons
2. ✅ Error boundaries
3. ✅ Empty state illustrations
4. ✅ Export to CSV functionality
5. ✅ Print-friendly view
6. ✅ Chart animations

**Deliverable**: Production-ready analytics system

---

## 🗄️ Database Schema (Complete)

### **1. Update `campaign_deliverables`**

```sql
ALTER TABLE campaign_deliverables
ADD COLUMN post_url TEXT,
ADD COLUMN post_platform VARCHAR(50),
ADD COLUMN post_id VARCHAR(255),
ADD COLUMN thunzi_post_id INTEGER,
ADD COLUMN url_submitted_at TIMESTAMP;

CREATE INDEX idx_campaign_deliverables_post_id ON campaign_deliverables(post_id);
CREATE INDEX idx_campaign_deliverables_thunzi_post_id ON campaign_deliverables(thunzi_post_id);
CREATE INDEX idx_campaign_deliverables_platform ON campaign_deliverables(post_platform);
```

### **2. New Table: `thunzi_creators`**

```sql
CREATE TABLE thunzi_creators (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    brand_thunzi_company_id INTEGER NOT NULL,
    thunzi_creator_id INTEGER,
    creator_name VARCHAR(255) NOT NULL,
    creator_email VARCHAR(255) NOT NULL,
    bantubuzz_creator_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    registration_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, creator_id)
);

CREATE INDEX idx_thunzi_creators_brand ON thunzi_creators(brand_id);
CREATE INDEX idx_thunzi_creators_creator ON thunzi_creators(creator_id);
CREATE INDEX idx_thunzi_creators_thunzi_id ON thunzi_creators(thunzi_creator_id);
```

### **3. New Table: `campaign_post_metrics`**

```sql
CREATE TABLE campaign_post_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    deliverable_id INTEGER REFERENCES campaign_deliverables(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    thunzi_post_id INTEGER NOT NULL,
    thunzi_creator_id INTEGER,

    -- Post info
    post_url TEXT NOT NULL,
    post_platform VARCHAR(50) NOT NULL,
    original_post_id VARCHAR(255) NOT NULL,
    post_content TEXT,
    published_at TIMESTAMP,

    -- Performance metrics
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0,

    -- Sentiment
    sentiment VARCHAR(50),
    sentiment_score DECIMAL(5, 2),
    positive_comments INTEGER DEFAULT 0,
    negative_comments INTEGER DEFAULT 0,
    neutral_comments INTEGER DEFAULT 0,
    critical_comments INTEGER DEFAULT 0,

    -- Brand mentions
    mentions_count INTEGER DEFAULT 0,

    -- Sync metadata
    last_synced_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(deliverable_id)
);

CREATE INDEX idx_campaign_post_metrics_campaign ON campaign_post_metrics(campaign_id);
CREATE INDEX idx_campaign_post_metrics_creator ON campaign_post_metrics(creator_id);
CREATE INDEX idx_campaign_post_metrics_deliverable ON campaign_post_metrics(deliverable_id);
CREATE INDEX idx_campaign_post_metrics_thunzi_post ON campaign_post_metrics(thunzi_post_id);
CREATE INDEX idx_campaign_post_metrics_platform ON campaign_post_metrics(post_platform);
CREATE INDEX idx_campaign_post_metrics_published ON campaign_post_metrics(published_at);
CREATE INDEX idx_campaign_post_metrics_engagement ON campaign_post_metrics(engagement_rate);
```

### **4. New Table: `post_comments`** (Optional - for detailed comment storage)

```sql
CREATE TABLE post_comments (
    id SERIAL PRIMARY KEY,
    post_metrics_id INTEGER REFERENCES campaign_post_metrics(id) ON DELETE CASCADE,
    thunzi_comment_id INTEGER,

    -- Comment data
    username VARCHAR(255),
    comment_text TEXT NOT NULL,
    sentiment VARCHAR(50),
    sentiment_score DECIMAL(5, 2),
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,

    -- Metadata
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_comments_post_metrics ON post_comments(post_metrics_id);
CREATE INDEX idx_post_comments_sentiment ON post_comments(sentiment);
CREATE INDEX idx_post_comments_likes ON post_comments(likes DESC);
CREATE INDEX idx_post_comments_published ON post_comments(published_at);
```

### **5. New Table: `brand_analytics_cache`**

```sql
CREATE TABLE brand_analytics_cache (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, cache_key)
);

CREATE INDEX idx_brand_analytics_cache_brand ON brand_analytics_cache(brand_id);
CREATE INDEX idx_brand_analytics_cache_key ON brand_analytics_cache(brand_id, cache_key);
CREATE INDEX idx_brand_analytics_cache_expires ON brand_analytics_cache(expires_at);
```

---

## ⏱️ Updated Time Estimates

| Phase | Tasks | Hours |
|-------|-------|-------|
| **Phase 1**: Deliverables URL Tracking | Database, validation, UI | 8-10 |
| **Phase 2**: ThunziAI Creator Registration | Registration API, linking | 10-12 |
| **Phase 3**: Post Performance Tracking | Metrics sync, storage | 12-15 |
| **Phase 4**: Core Metrics Calculation | Aggregation, calculations | 10-12 |
| **Phase 5**: Creator Tier Spend Distribution | Tier logic, charts | 8-10 |
| **Phase 6**: Campaign Post Analytics | Table, filtering, sorting | 10-12 |
| **Phase 7**: Comment Sentiment Analysis | D3 charts, tables | 8-10 |
| **Phase 8**: Top Comments & Reactions | Tabs, ranking logic | 6-8 |
| **Phase 9**: Date Range Filtering | Time filters, UI | 4-6 |
| **Phase 10**: Frontend Analytics Dashboard | Complete UI assembly | 12-15 |
| **Phase 11**: Backend API Endpoints | 7 endpoints, caching | 10-12 |
| **Phase 12**: Testing & Polish | Tests, optimization, polish | 6-8 |
| **TOTAL** | | **104-130 hours** |

**Revised Estimate**: 65-80 hours if we leverage existing patterns and components

---

## 🎯 Success Criteria

### **Minimum Viable Product (MVP)**
- ✅ Creators can submit post URLs
- ✅ System fetches metrics from ThunziAI
- ✅ Core metrics displayed (9 metric cards)
- ✅ Creator tier spend distribution shown
- ✅ Campaign posts table with filtering
- ✅ Basic sentiment breakdown

### **Full Feature Set**
- ✅ All MVP features
- ✅ Comment sentiment analysis with D3 donut chart
- ✅ Top comments ranking (positive/negative/most liked)
- ✅ Date range filtering
- ✅ Campaign-specific filtering
- ✅ Exportable reports
- ✅ Mobile responsive
- ✅ Real-time sync capability

---

## 🚀 Implementation Priority Order

### **Week 1: Foundation** (18-22 hours)
- Phase 1: URL tracking
- Phase 2: Creator registration

### **Week 2: Data Collection** (22-27 hours)
- Phase 3: Post metrics syncing
- Phase 4: Core metrics calculation

### **Week 3: Analytics Features** (24-30 hours)
- Phase 5: Creator tier distribution
- Phase 6: Campaign post analytics
- Phase 7: Comment sentiment

### **Week 4: Advanced Features** (16-22 hours)
- Phase 8: Top comments
- Phase 9: Date filtering
- Phase 11: Backend APIs

### **Week 5: Dashboard & Polish** (18-23 hours)
- Phase 10: Frontend dashboard
- Phase 12: Testing & polish

---

**Ready to start implementation!** 🚀

Would you like me to begin with Phase 1 (Deliverables URL Tracking)?
