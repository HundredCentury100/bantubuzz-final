# BantuBuzz × ThunziAI Analytics Integration Plan

**Last Updated**: February 24, 2026
**Status**: Planning Phase
**Integration Partner**: ThunziAI (https://app.thunzi.co)

---

## 📊 Executive Summary

This document outlines the strategic integration of ThunziAI's analytics API into BantuBuzz's creator marketplace. ThunziAI will serve as our external analytics engine, providing real-time social media metrics, sentiment analysis, and performance tracking for creator collaborations.

### Key Benefits
- **Real-time Analytics**: Live tracking of social media post performance
- **Multi-Platform Support**: Instagram, TikTok, YouTube, Facebook, X (Twitter)
- **Sentiment Analysis**: AI-powered comment sentiment and brand safety monitoring
- **Creator KPIs**: Engagement rates, reach, impressions, and growth metrics
- **Campaign ROI**: Comprehensive analytics for brand campaign performance

---

## 🔍 Current State Analysis

### Existing Infrastructure

#### **Database Models**
```
✅ CreatorProfile
   - platforms (JSON): List of platform names
   - social_links (JSON): {platform: url} mapping
   - follower_count, engagement_rate (basic metrics)

✅ Collaboration
   - submitted_deliverables (JSON): Stores deliverable data
   - status: in_progress, completed, cancelled
   - No link to actual social media posts

✅ Analytics (Basic)
   - Dashboard stats (bookings, earnings)
   - No social media metrics integration
```

#### **Missing Components**
```
❌ Social Platform Connection Flow
❌ OAuth Token Management
❌ Post Tracking System
❌ Real-time Metrics Storage
❌ ThunziAI API Integration Layer
❌ Analytics Dashboard UI
```

### Gap Analysis

| Feature | Current State | Required State | Priority |
|---------|--------------|----------------|----------|
| Platform OAuth | Manual links only | OAuth + token storage | **HIGH** |
| Post Tracking | None | Real-time metric polling | **HIGH** |
| Sentiment Analysis | None | AI-powered comments analysis | **MEDIUM** |
| Campaign Analytics | Basic counts | Detailed KPIs + trends | **HIGH** |
| Creator KPIs | Static metrics | Live platform data | **HIGH** |

---

## 🏗️ Technical Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        BantuBuzz Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐   ┌──────────────┐ │
│  │   Creator    │         │    Brand     │   │    Admin     │ │
│  │  Dashboard   │◄───────►│  Dashboard   │   │   Console    │ │
│  └──────────────┘         └──────────────┘   └──────────────┘ │
│         │                         │                   │         │
│         └─────────────┬───────────┴───────────────────┘         │
│                       │                                         │
│              ┌────────▼────────┐                               │
│              │  Flask Backend  │                               │
│              └────────┬────────┘                               │
│                       │                                         │
│        ┌──────────────┼──────────────┐                        │
│        │              │              │                         │
│  ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐                  │
│  │ Analytics │  │ Platform │  │  Metrics  │                  │
│  │  Service  │  │ OAuth    │  │  Polling  │                  │
│  └─────┬─────┘  │ Manager  │  │  Engine   │                  │
│        │        └────┬────┘  └─────┬─────┘                  │
│        │             │             │                          │
└────────┼─────────────┼─────────────┼──────────────────────────┘
         │             │             │
         └─────────────┴─────────────┘
                       │
                       │ HTTPS
                       │
         ┌─────────────▼─────────────┐
         │    ThunziAI API           │
         │  https://app.thunzi.co    │
         ├───────────────────────────┤
         │ • Creator Analytics       │
         │ • Platform Connections    │
         │ • Post Performance        │
         │ • Sentiment Analysis      │
         │ • Comments Tracking       │
         └───────────────────────────┘
```

### Data Flow

```
1. Creator Onboarding
   Creator → Connect Platforms → ThunziAI OAuth → Store Tokens → Sync Data

2. Content Submission
   Creator → Submit Post URL → Validate Ownership → Track Post → Poll Metrics

3. Analytics Display
   Brand/Creator → Request Analytics → Fetch from ThunziAI → Cache → Display

4. Background Sync
   Scheduler → Poll Active Posts → Update Metrics → Trigger Alerts
```

---

## 📦 Database Schema Changes

### New Tables

#### **1. platform_connections**
```sql
CREATE TABLE platform_connections (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

    -- ThunziAI fields
    thunzi_platform_id VARCHAR(50),  -- ThunziAI's platform ID
    thunzi_creator_id VARCHAR(50),   -- ThunziAI's creator ID

    -- Platform info
    platform VARCHAR(20) NOT NULL,   -- 'instagram', 'tiktok', 'youtube', 'facebook', 'x'
    platform_username VARCHAR(100),
    platform_user_id VARCHAR(100),

    -- OAuth tokens (encrypted)
    access_token TEXT,               -- Encrypted
    refresh_token TEXT,              -- Encrypted
    token_expires_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'expired', 'revoked', 'disconnected'
    last_synced_at TIMESTAMP,
    last_sync_status VARCHAR(20),    -- 'success', 'failed', 'expired_token'

    -- Metadata
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(creator_id, platform)
);

CREATE INDEX idx_platform_connections_creator ON platform_connections(creator_id);
CREATE INDEX idx_platform_connections_status ON platform_connections(status);
```

#### **2. tracked_posts**
```sql
CREATE TABLE tracked_posts (
    id SERIAL PRIMARY KEY,
    collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES creator_profiles(id),
    platform_connection_id INTEGER REFERENCES platform_connections(id),

    -- ThunziAI fields
    thunzi_post_id VARCHAR(100) UNIQUE,  -- ThunziAI's post ID

    -- Post info
    platform VARCHAR(20) NOT NULL,
    post_url TEXT NOT NULL,
    post_id VARCHAR(100),                 -- Platform's post ID
    permalink_url TEXT,

    -- Content
    caption TEXT,
    media_type VARCHAR(20),               -- 'photo', 'video', 'carousel', 'reel', 'story'
    thumbnail_url TEXT,
    published_at TIMESTAMP,

    -- Tracking config
    tracking_tier VARCHAR(20) DEFAULT 'normal',  -- 'campaign', 'fast', 'normal'
    tracking_status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'expired'
    track_until TIMESTAMP,                       -- Auto-stop tracking after this

    -- Latest metrics (cached)
    latest_impressions INTEGER DEFAULT 0,
    latest_reach INTEGER DEFAULT 0,
    latest_views INTEGER DEFAULT 0,
    latest_likes INTEGER DEFAULT 0,
    latest_comments INTEGER DEFAULT 0,
    latest_shares INTEGER DEFAULT 0,
    latest_saves INTEGER DEFAULT 0,
    latest_engagement_rate FLOAT DEFAULT 0.0,

    -- Metadata
    last_fetched_at TIMESTAMP,
    fetch_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracked_posts_collaboration ON tracked_posts(collaboration_id);
CREATE INDEX idx_tracked_posts_creator ON tracked_posts(creator_id);
CREATE INDEX idx_tracked_posts_status ON tracked_posts(tracking_status);
CREATE INDEX idx_tracked_posts_thunzi ON tracked_posts(thunzi_post_id);
```

#### **3. post_metrics_history**
```sql
CREATE TABLE post_metrics_history (
    id SERIAL PRIMARY KEY,
    tracked_post_id INTEGER NOT NULL REFERENCES tracked_posts(id) ON DELETE CASCADE,

    -- Metrics snapshot
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,

    -- Calculated
    engagements INTEGER DEFAULT 0,      -- likes + comments + shares + saves
    engagement_rate FLOAT DEFAULT 0.0,

    -- Trends
    impressions_trend VARCHAR(20),      -- 'up', 'down', 'stable'
    engagement_trend VARCHAR(20),

    -- Timestamp
    recorded_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tracked_post_id, recorded_at)
);

CREATE INDEX idx_metrics_history_post ON post_metrics_history(tracked_post_id);
CREATE INDEX idx_metrics_history_time ON post_metrics_history(recorded_at);
```

#### **4. post_sentiment_analysis**
```sql
CREATE TABLE post_sentiment_analysis (
    id SERIAL PRIMARY KEY,
    tracked_post_id INTEGER NOT NULL REFERENCES tracked_posts(id) ON DELETE CASCADE,

    -- Overall sentiment
    positive_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,

    -- Percentages
    positive_percent FLOAT DEFAULT 0.0,
    neutral_percent FLOAT DEFAULT 0.0,
    negative_percent FLOAT DEFAULT 0.0,

    -- Brand safety flags
    has_spam BOOLEAN DEFAULT FALSE,
    has_hate_speech BOOLEAN DEFAULT FALSE,
    has_inappropriate BOOLEAN DEFAULT FALSE,

    -- Metadata
    analyzed_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sentiment_post ON post_sentiment_analysis(tracked_post_id);
```

#### **5. post_comments**
```sql
CREATE TABLE post_comments (
    id SERIAL PRIMARY KEY,
    tracked_post_id INTEGER NOT NULL REFERENCES tracked_posts(id) ON DELETE CASCADE,

    -- ThunziAI fields
    thunzi_comment_id VARCHAR(100),

    -- Comment data
    comment_text TEXT,
    author_username VARCHAR(100),
    author_profile_url TEXT,

    -- Metrics
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    engagement_score FLOAT DEFAULT 0.0,

    -- Sentiment
    sentiment VARCHAR(20),              -- 'positive', 'neutral', 'negative'
    sentiment_score FLOAT,

    -- Metadata
    posted_at TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tracked_post_id, thunzi_comment_id)
);

CREATE INDEX idx_comments_post ON post_comments(tracked_post_id);
CREATE INDEX idx_comments_sentiment ON post_comments(sentiment);
```

#### **6. thunzi_sync_log**
```sql
CREATE TABLE thunzi_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,     -- 'platform_connect', 'metrics_fetch', 'comments_fetch'
    entity_type VARCHAR(50),             -- 'platform_connection', 'tracked_post'
    entity_id INTEGER,

    status VARCHAR(20) NOT NULL,         -- 'success', 'failed', 'partial'
    error_message TEXT,
    response_data JSON,

    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_log_type ON thunzi_sync_log(sync_type);
CREATE INDEX idx_sync_log_status ON thunzi_sync_log(status);
CREATE INDEX idx_sync_log_time ON thunzi_sync_log(created_at);
```

### Modified Tables

#### **collaborations** (add fields)
```sql
ALTER TABLE collaborations ADD COLUMN has_tracked_content BOOLEAN DEFAULT FALSE;
ALTER TABLE collaborations ADD COLUMN total_tracked_posts INTEGER DEFAULT 0;
ALTER TABLE collaborations ADD COLUMN total_impressions BIGINT DEFAULT 0;
ALTER TABLE collaborations ADD COLUMN total_engagement INTEGER DEFAULT 0;
```

#### **creator_profiles** (add fields)
```sql
ALTER TABLE creator_profiles ADD COLUMN thunzi_creator_id VARCHAR(50) UNIQUE;
ALTER TABLE creator_profiles ADD COLUMN connected_platforms_count INTEGER DEFAULT 0;
ALTER TABLE creator_profiles ADD COLUMN last_analytics_sync TIMESTAMP;
```

---

## 🚀 Implementation Phases

### **PHASE 1: Foundation & Platform Connections** (Week 1-2)

#### Goals
- Set up ThunziAI API client
- Implement OAuth connection flow
- Store and manage platform tokens

#### Tasks

**Backend**
1. ✅ Create database migration for new tables
2. ✅ Create models: `PlatformConnection`, `ThunziSyncLog`
3. ✅ Build ThunziAI API service class
   ```python
   # backend/app/services/thunzi_api.py
   class ThunziAPI:
       def __init__(self):
           self.base_url = "https://app.thunzi.co/api"
           self.session = None

       def login(self):
           # Authenticate with ThunziAI

       def connect_platform(self, creator_id, platform, access_token):
           # POST /api/platforms

       def get_creator_platforms(self, thunzi_creator_id):
           # GET /api/creators/:id/platforms

       def sync_platform_data(self, platform_id):
           # POST /api/sync
   ```

4. ✅ Create routes: `/api/analytics/platforms/*`
   - `POST /connect` - Initiate platform connection
   - `GET /` - List creator's connected platforms
   - `DELETE /:id` - Disconnect platform
   - `POST /:id/sync` - Manually trigger sync

**Frontend**
1. ✅ Create PlatformConnection component
2. ✅ OAuth flow for Meta platforms (Instagram/Facebook)
3. ✅ Platform status indicators (connected, expired, disconnected)
4. ✅ Reconnection prompts

#### Acceptance Criteria
- [ ] Creator can connect Instagram account
- [ ] Platform status displays correctly
- [ ] Token expiry is detected and flagged
- [ ] Manual sync works

---

### **PHASE 2: Content Tracking Engine** (Week 3-4)

#### Goals
- Enable post URL submission
- Validate post ownership
- Begin tracking metrics

#### Tasks

**Backend**
1. ✅ Create models: `TrackedPost`, `PostMetricsHistory`
2. ✅ Build post validation service
   ```python
   # backend/app/services/post_validator.py
   class PostValidator:
       def extract_post_id(self, url):
           # Parse platform-specific URL formats

       def validate_ownership(self, creator_id, platform, post_id):
           # Verify post belongs to creator via ThunziAI API
   ```

3. ✅ Create routes: `/api/analytics/posts/*`
   - `POST /track` - Submit post for tracking
   - `GET /collaboration/:id` - Get posts for collaboration
   - `DELETE /:id` - Stop tracking post

4. ✅ Build metrics polling scheduler
   ```python
   # backend/app/tasks/metrics_poller.py
   def poll_active_posts():
       # Get posts with tracking_status='active'
       # Fetch latest metrics from ThunziAI
       # Store in post_metrics_history
       # Update tracked_posts.latest_*
   ```

**Frontend**
1. ✅ Post URL submission form (in collaboration view)
2. ✅ Post validation feedback
3. ✅ Tracked posts list per collaboration

#### Acceptance Criteria
- [ ] Creator can submit Instagram post URL
- [ ] System validates post ownership
- [ ] Post metrics are fetched and stored
- [ ] Historical metrics are recorded

---

### **PHASE 3: Creator Dashboard Analytics** (Week 5-6)

#### Goals
- Display creator KPIs
- Show platform-specific metrics
- Visualize performance trends

#### Tasks

**Backend**
1. ✅ Create routes: `/api/analytics/creator/*`
   - `GET /overview` - KPIs summary
   - `GET /platforms` - Per-platform breakdown
   - `GET /posts` - Recent posts with metrics
   - `GET /trends` - Performance over time

2. ✅ Build aggregation service
   ```python
   # backend/app/services/analytics_aggregator.py
   class AnalyticsAggregator:
       def get_creator_kpis(self, creator_id, range='30d'):
           # Aggregate metrics across all tracked posts
           # Return: total_impressions, total_engagement, avg_engagement_rate

       def get_platform_breakdown(self, creator_id):
           # Group metrics by platform
   ```

**Frontend**
1. ✅ Creator Analytics Dashboard page
2. ✅ KPI cards (Impressions, Reach, Engagement Rate, Growth)
3. ✅ Performance trend charts (Chart.js/Recharts)
4. ✅ Platform comparison chart
5. ✅ Recent posts performance table

#### Acceptance Criteria
- [ ] Dashboard displays accurate KPIs
- [ ] Charts render performance trends
- [ ] Platform breakdown is visible
- [ ] Data updates when range changes

---

### **PHASE 4: Campaign Analytics for Brands** (Week 7-8)

#### Goals
- Show campaign-level analytics
- Compare creator performance
- ROI calculations

#### Tasks

**Backend**
1. ✅ Create routes: `/api/analytics/campaign/*`
   - `GET /:id/overview` - Campaign summary
   - `GET /:id/creators` - Per-creator breakdown
   - `GET /:id/posts` - All tracked posts
   - `GET /:id/roi` - ROI metrics

2. ✅ Build campaign aggregation
   ```python
   def get_campaign_analytics(campaign_id):
       # Get all collaborations for campaign
       # Aggregate metrics from all tracked posts
       # Calculate: Total reach, Total engagement, Cost per engagement
   ```

**Frontend**
1. ✅ Campaign Analytics tab in Brand Dashboard
2. ✅ Campaign summary cards
3. ✅ Creator comparison table
4. ✅ Post performance ranking
5. ✅ ROI calculator widget

#### Acceptance Criteria
- [ ] Brand sees all campaign metrics
- [ ] Top-performing creators are highlighted
- [ ] Cost per engagement is calculated
- [ ] Export to CSV works

---

### **PHASE 5: Sentiment & Comments** (Week 9-10)

#### Goals
- Fetch and analyze comments
- Display sentiment breakdown
- Brand safety alerts

#### Tasks

**Backend**
1. ✅ Create models: `PostSentimentAnalysis`, `PostComments`
2. ✅ Create routes: `/api/analytics/posts/:id/sentiment`
3. ✅ Create routes: `/api/analytics/posts/:id/comments`
4. ✅ Build comment fetcher
   ```python
   def fetch_post_comments(tracked_post_id):
       # Fetch from ThunziAI
       # Store in post_comments table
       # Calculate sentiment percentages
       # Flag inappropriate content
   ```

**Frontend**
1. ✅ Sentiment breakdown chart (pie/donut)
2. ✅ Top comments widget
3. ✅ Brand safety warnings
4. ✅ Comment sentiment filter

#### Acceptance Criteria
- [ ] Sentiment analysis displays correctly
- [ ] Top comments show with engagement scores
- [ ] Negative sentiment triggers alert
- [ ] Brand can filter by sentiment

---

### **PHASE 6: Automation & Alerts** (Week 11-12)

#### Goals
- Automated metric polling
- Performance alerts
- Email notifications

#### Tasks

**Backend**
1. ✅ Set up Celery/APScheduler for background tasks
2. ✅ Implement polling tiers
   ```python
   POLLING_INTERVALS = {
       'story': 300,      # 5 minutes (expires 24h)
       'campaign': 3600,  # 1 hour (high priority)
       'fast': 7200,      # 2 hours
       'normal': 14400    # 4 hours
   }
   ```

3. ✅ Build alert system
   ```python
   def check_viral_content(tracked_post):
       # If engagement_rate > 10% in 1 hour → Alert

   def check_performance_drop(tracked_post):
       # If engagement_rate drops 50% → Alert
   ```

4. ✅ Email notification service

**Frontend**
1. ✅ Alert preferences page
2. ✅ In-app notifications
3. ✅ Email notification toggles

#### Acceptance Criteria
- [ ] Stories are polled every 5 minutes
- [ ] Campaign posts are polled hourly
- [ ] Viral content triggers alert
- [ ] Email notifications work

---

### **PHASE 7: Polish & Optimization** (Week 13-14)

#### Goals
- Performance optimization
- Caching strategy
- Error handling
- Testing

#### Tasks

1. ✅ Implement Redis caching for analytics data
2. ✅ Add rate limiting for ThunziAI API calls
3. ✅ Error recovery and retry logic
4. ✅ Comprehensive testing
5. ✅ Performance monitoring
6. ✅ Documentation

#### Acceptance Criteria
- [ ] API response time < 500ms (with cache)
- [ ] Graceful handling of ThunziAI downtime
- [ ] 95% test coverage
- [ ] Documentation complete

---

## 🔐 Security Considerations

### Token Storage
```python
# Use encryption for sensitive tokens
from cryptography.fernet import Fernet

class TokenEncryption:
    def encrypt_token(self, token):
        # Encrypt access/refresh tokens before storing

    def decrypt_token(self, encrypted_token):
        # Decrypt when making API calls
```

### API Rate Limiting
- Implement request throttling to ThunziAI API
- Respect API rate limits (track in `thunzi_sync_log`)
- Queue requests during high load

### Data Privacy
- Store only necessary user data
- Implement GDPR-compliant data deletion
- Encrypt tokens at rest

---

## 📈 Success Metrics

### Technical KPIs
- **API Uptime**: >99.5%
- **Sync Success Rate**: >95%
- **Average Response Time**: <500ms (cached), <2s (live)
- **Token Expiry Detection**: 100%

### Business KPIs
- **Platform Connection Rate**: >80% of active creators
- **Post Tracking Adoption**: >60% of collaborations
- **Analytics Dashboard Usage**: >70% of brands
- **Creator Satisfaction**: >4.5/5 for analytics features

---

## 🛠️ Development Guidelines

### Code Structure
```
backend/
├── app/
│   ├── models/
│   │   ├── platform_connection.py
│   │   ├── tracked_post.py
│   │   ├── post_metrics.py
│   │   └── sentiment_analysis.py
│   ├── routes/
│   │   └── analytics/
│   │       ├── __init__.py
│   │       ├── platforms.py
│   │       ├── posts.py
│   │       ├── creator.py
│   │       └── campaign.py
│   ├── services/
│   │   ├── thunzi_api.py
│   │   ├── post_validator.py
│   │   ├── analytics_aggregator.py
│   │   └── token_manager.py
│   └── tasks/
│       ├── metrics_poller.py
│       └── comment_fetcher.py

frontend/
├── src/
│   ├── pages/
│   │   ├── CreatorAnalytics.jsx
│   │   ├── CampaignAnalytics.jsx
│   │   └── PlatformConnections.jsx
│   ├── components/
│   │   ├── analytics/
│   │   │   ├── KPICard.jsx
│   │   │   ├── PerformanceChart.jsx
│   │   │   ├── PlatformBreakdown.jsx
│   │   │   ├── SentimentChart.jsx
│   │   │   └── CommentsWidget.jsx
│   │   └── platforms/
│   │       ├── PlatformCard.jsx
│   │       └── ConnectButton.jsx
│   └── services/
│       └── analyticsAPI.js
```

### API Client Pattern
```python
# Always use singleton pattern for ThunziAPI
from app.services.thunzi_api import thunzi_client

@bp.route('/platforms')
@jwt_required()
def get_platforms():
    platforms = thunzi_client.get_creator_platforms(creator_id)
    return jsonify(platforms)
```

### Error Handling
```python
try:
    response = thunzi_client.fetch_metrics(post_id)
    # Process response
except ThunziAPIError as e:
    # Log error
    # Store in sync_log
    # Return cached data if available
    # Notify user if critical
```

---

## 📚 Resources

### ThunziAI API Documentation
- Base URL: `https://app.thunzi.co/api`
- Authentication: Session-based
- Rate Limits: TBD (monitor and document)

### Key Endpoints
1. `POST /api/login` - Authenticate
2. `GET /api/creators/:id/analytics` - Creator KPIs
3. `GET /api/creators/:id/platforms` - Connected platforms
4. `GET /api/creators/:id/posts` - Creator posts
5. `GET /api/posts/:id/performance` - Post metrics
6. `GET /api/posts/:id/insights` - Sentiment analysis
7. `GET /api/posts/:id/comments` - Post comments
8. `POST /api/platforms` - Connect platform
9. `POST /api/sync` - Trigger sync

### External Libraries
- **requests**: HTTP client for ThunziAI API
- **APScheduler**: Background task scheduling
- **cryptography**: Token encryption
- **pandas**: Data aggregation (optional)
- **Chart.js/Recharts**: Frontend charts

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. Review and approve this implementation plan
2. Set up ThunziAI test account and API credentials
3. Create database migration scripts for Phase 1
4. Begin ThunziAI API client development

### Questions to Resolve
1. ThunziAI API rate limits and quotas?
2. Cost per API call or monthly subscription?
3. Which platforms to prioritize first? (Suggest: Instagram, TikTok)
4. Should we cache metrics? For how long?
5. Polling frequency preferences for different post types?

### Risk Mitigation
- **ThunziAI API Downtime**: Implement caching and graceful degradation
- **Token Expiry**: Automated monitoring and user notifications
- **Data Volume**: Implement data retention policies (e.g., keep metrics for 12 months)
- **Cost Overruns**: Monitor API usage and implement budget alerts

---

## 🐛 Recent Platform Bug Fixes (February 24, 2026)

Before proceeding with ThunziAI integration, critical platform bugs were resolved to ensure a stable foundation:

### ✅ Completed Fixes

1. **Package Edit 404 Error** (Critical)
   - Standardized route pattern to `/creator/packages/:id/edit`
   - Removed duplicate route causing 404 errors
   - Files: `frontend/src/App.jsx`, `frontend/src/pages/PackageManagement.jsx`
   - Commit: `4ead564`

2. **Campaign Apply Button State** (Critical)
   - Fixed button not updating after application submission
   - Implemented server data refetch for state synchronization
   - File: `frontend/src/pages/CreatorCampaignDetails.jsx`
   - Commit: `1c2bc3a`

3. **Search Button Visibility** (High Priority)
   - Added visible Search button to browse creators page
   - Changed from real-time to manual search trigger
   - File: `frontend/src/pages/BrowseCreators.jsx`
   - Commit: `ee7c80e`

4. **Location Display Inconsistency** (High Priority)
   - Fixed "Location not set" appearing when city/country data exists
   - Implemented proper fallback logic: city+country → location → city → country
   - File: `frontend/src/pages/CreatorProfile.jsx`
   - Commit: `5149dc7`

5. **Platform Filter Updates** (Medium Priority)
   - Added Twitch and Threads to platform filters
   - Renamed Twitter to "X (Twitter)" for brand alignment
   - File: `frontend/src/pages/BrowseCreators.jsx`
   - Commit: `8d7f9f8`

6. **Messages Page Enhancement** (High Priority)
   - Added "New Conversation" button in header
   - Enhanced empty state with call-to-action
   - File: `frontend/src/pages/Messages.jsx`
   - Commit: `0b00d25`

### 📋 Remaining Non-Critical Items

These enhancements can be addressed post-ThunziAI integration:
- Mobile package creation validation improvements
- Location filter with multi-select languages
- Character counter for bio field
- Responsive "More Filters" button for desktop overflow

**Build Status**: ✅ Frontend builds successfully with all fixes
**Test Status**: Manual testing recommended for all fixed flows
**Deployment**: Ready for staging deployment

---

**Document Owner**: Development Team
**Last Reviewed**: February 24, 2026
**Status**: Awaiting Approval - Platform Stabilized for Integration
