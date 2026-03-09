# BantuBuzz Trust, Safety, Messaging & Support System - Implementation Plan

**Created**: March 9, 2026
**Updated**: March 9, 2026
**Purpose**: Complete implementation roadmap for Trust, Safety, Messaging Governance, and Support systems
**Alignment**: Enforces BantuBuzz Trust, Safety, Messaging & Support Feature Framework

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Privacy & Governance Model](#privacy--governance-model)
3. [Database Schema](#database-schema)
4. [Implementation Phases](#implementation-phases)
5. [Core Features](#core-features)
6. [Messaging Safety Features](#messaging-safety-features)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Admin Tools](#admin-tools)
10. [Testing & Deployment](#testing--deployment)

---

## 🎯 System Overview

### Philosophy

BantuBuzz implements a **conditional monitoring model** that balances:
- ✅ **User Privacy** - Messages are private by default
- ✅ **Platform Safety** - Review happens only when needed
- ✅ **Revenue Protection** - Detect off-platform payment attempts
- ✅ **Fair Resolution** - Evidence-based dispute handling
- ✅ **Proactive Safety** - Automated warnings prevent harm before it happens

### Core Principles

1. **Privacy by Default**: The platform does NOT routinely monitor private messages
2. **Review on Trigger**: Messages reviewed only when:
   - User submits a report
   - Dispute is opened
   - Fraud detection flags suspicious activity
   - Legal obligations require review
3. **Proactive Warnings**: Automated nudges prevent violations before sending
4. **Evidence-Based**: All investigations backed by system-captured data

---

## 🔐 Privacy & Governance Model

### Message Privacy States

```
┌─────────────────────────────────────────────────────────────┐
│                  MESSAGE PRIVACY FLOW                       │
└─────────────────────────────────────────────────────────────┘

Normal Messages
├─ PRIVATE (default)
│  ├─ Not monitored by platform
│  ├─ Not visible to admins
│  └─ Encrypted at rest
│
└─ FLAGGED FOR REVIEW (conditional triggers)
   ├─ User reports message
   ├─ Dispute opened referencing conversation
   ├─ Contact-sharing pattern detected
   ├─ Harmful language detected
   └─ Off-platform payment attempt detected

Admin Access Rules
├─ NO routine monitoring
├─ Access ONLY when triggered
├─ All admin access logged
└─ User notified of review (except ongoing investigations)
```

### Conditional Monitoring Triggers

| Trigger | Action | Admin Access | User Notified |
|---------|--------|--------------|---------------|
| User report | Review message + context | ✅ Yes | After review |
| Dispute opened | Auto-capture message history | ✅ Yes | Immediate |
| Contact sharing detected | Warning shown, logged | ❌ No | Immediate warning |
| Harmful language detected | Warning shown, logged | ❌ No | Immediate warning |
| Repeated pattern abuse | Admin review triggered | ✅ Yes | After review |
| Legal request | Full conversation access | ✅ Yes | As required by law |

---

## 💾 Database Schema

### Core Support & Safety Tables

#### 1. User Blocks Table

```sql
CREATE TABLE user_blocks (
    id SERIAL PRIMARY KEY,
    blocker_user_id INTEGER NOT NULL REFERENCES users(id),
    blocked_user_id INTEGER NOT NULL REFERENCES users(id),

    -- Block Details
    reason VARCHAR(100),  -- optional, user doesn't have to specify

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unblocked_at TIMESTAMP,

    -- System Logging (not visible to users)
    CONSTRAINT unique_block UNIQUE(blocker_user_id, blocked_user_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_user_id);
CREATE INDEX idx_user_blocks_active ON user_blocks(is_active);
```

#### 2. Message Risk Signals Table

```sql
CREATE TABLE message_risk_signals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Risk Signals
    blocks_received_count INTEGER DEFAULT 0,
    harassment_reports_count INTEGER DEFAULT 0,
    contact_sharing_attempts_count INTEGER DEFAULT 0,
    flagged_messages_count INTEGER DEFAULT 0,
    false_reports_count INTEGER DEFAULT 0,

    -- Risk Score (calculated)
    risk_score INTEGER DEFAULT 0,  -- 0-100 scale
    risk_level VARCHAR(20) DEFAULT 'low',  -- low, medium, high, critical

    -- Tracking Period
    tracking_period_start DATE DEFAULT CURRENT_DATE,
    last_signal_detected_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_risk UNIQUE(user_id)
);

CREATE INDEX idx_risk_signals_user ON message_risk_signals(user_id);
CREATE INDEX idx_risk_signals_level ON message_risk_signals(risk_level);
```

#### 3. Message Safety Warnings Table

```sql
CREATE TABLE message_safety_warnings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    conversation_id INTEGER NOT NULL,

    -- Warning Details
    warning_type VARCHAR(50) NOT NULL,  -- harmful_language, contact_sharing, off_platform_payment
    message_content TEXT,  -- the message that triggered warning
    detected_patterns JSONB,  -- specific patterns detected

    -- User Action
    user_action VARCHAR(30),  -- edited, cancelled, sent_anyway
    final_message_sent TEXT,  -- if they edited and sent

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_safety_warnings_user ON message_safety_warnings(user_id);
CREATE INDEX idx_safety_warnings_type ON message_safety_warnings(warning_type);
```

#### 4. Support Tickets Table

```sql
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "TICKET-2026-00001"
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Ticket Details
    category VARCHAR(50) NOT NULL,  -- technical, campaign, payment, messaging, account, inquiry
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, emergency

    -- References (optional - can link to collaboration, booking, payment, or message thread)
    collaboration_id INTEGER REFERENCES collaborations(id),
    booking_id INTEGER REFERENCES bookings(id),
    payment_reference VARCHAR(100),
    message_thread_id VARCHAR(100),  -- messaging system conversation ID

    -- Status
    status VARCHAR(30) DEFAULT 'open',  -- open, under_review, awaiting_user, investigating, resolved, closed
    assigned_to INTEGER REFERENCES users(id),  -- admin user

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,

    -- Tracking
    response_count INTEGER DEFAULT 0,
    last_response_at TIMESTAMP,
    last_response_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
```

#### 5. Support Ticket Messages Table

```sql
CREATE TABLE support_ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    is_admin BOOLEAN DEFAULT FALSE,

    -- Message Content
    message TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Read Status
    read_by_user BOOLEAN DEFAULT FALSE,
    read_by_admin BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created ON support_ticket_messages(created_at);
```

#### 6. Support Ticket Attachments Table

```sql
CREATE TABLE support_ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES support_ticket_messages(id) ON DELETE CASCADE,

    -- File Details
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,

    -- Metadata
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_attachments_ticket ON support_ticket_attachments(ticket_id);
```

#### 7. Collaboration Disputes Table

```sql
CREATE TABLE collaboration_disputes (
    id SERIAL PRIMARY KEY,
    dispute_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "DISPUTE-2026-00001"

    -- Parties
    collaboration_id INTEGER NOT NULL REFERENCES collaborations(id),
    raised_by INTEGER NOT NULL REFERENCES users(id),  -- creator or brand
    against_user INTEGER NOT NULL REFERENCES users(id),

    -- Dispute Details
    dispute_type VARCHAR(50) NOT NULL,  -- deliverable, payment, timeline, scope, quality
    description TEXT NOT NULL,
    requested_resolution TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'open',  -- open, investigating, mediation, resolved, closed
    assigned_to INTEGER REFERENCES users(id),  -- admin mediator

    -- Resolution
    resolution_notes TEXT,
    resolution_type VARCHAR(50),  -- refund, revision, partial_refund, no_action, milestone_release
    resolved_in_favor_of INTEGER REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX idx_disputes_collaboration ON collaboration_disputes(collaboration_id);
CREATE INDEX idx_disputes_raised_by ON collaboration_disputes(raised_by);
CREATE INDEX idx_disputes_status ON collaboration_disputes(status);
CREATE INDEX idx_disputes_created ON collaboration_disputes(created_at);
```

#### 8. Dispute Evidence Table

```sql
CREATE TABLE dispute_evidence (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER NOT NULL REFERENCES collaboration_disputes(id) ON DELETE CASCADE,

    -- Evidence Details
    evidence_type VARCHAR(50) NOT NULL,  -- file, screenshot, link, message_excerpt, system_log
    description TEXT,

    -- File Evidence
    filename VARCHAR(255),
    file_path VARCHAR(500),
    file_type VARCHAR(50),

    -- Link Evidence
    external_url VARCHAR(500),

    -- Message Evidence (references messaging system)
    message_thread_id VARCHAR(100),
    message_excerpt TEXT,

    -- System Evidence (auto-captured)
    system_data JSONB,  -- stores campaign agreement, milestones, payment records

    -- Metadata
    submitted_by INTEGER NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
```

#### 9. Message Reports Table

```sql
CREATE TABLE message_reports (
    id SERIAL PRIMARY KEY,
    report_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "REPORT-2026-00001"

    -- Reporter & Reported
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    reported_user_id INTEGER NOT NULL REFERENCES users(id),

    -- Message Details
    conversation_id VARCHAR(100) NOT NULL,  -- references messaging system conversation
    message_id VARCHAR(100) NOT NULL,  -- message identifier from messaging service
    message_content TEXT,
    message_context JSONB,  -- stores 3 messages before and after for context

    -- Report Details
    report_category VARCHAR(50) NOT NULL,  -- harassment, hate_speech, scam, spam, fraud, abusive
    description TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'pending',  -- pending, under_review, action_taken, dismissed, escalated
    reviewed_by INTEGER REFERENCES users(id),

    -- Safety Flags
    is_emergency BOOLEAN DEFAULT FALSE,
    auto_escalated BOOLEAN DEFAULT FALSE,

    -- Actions Taken
    action_taken VARCHAR(100),  -- warning_issued, messaging_restricted, account_suspended, no_action, false_report
    action_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    action_taken_at TIMESTAMP
);

CREATE INDEX idx_message_reports_reporter ON message_reports(reporter_id);
CREATE INDEX idx_message_reports_reported ON message_reports(reported_user_id);
CREATE INDEX idx_message_reports_status ON message_reports(status);
CREATE INDEX idx_message_reports_emergency ON message_reports(is_emergency);
CREATE INDEX idx_message_reports_conversation ON message_reports(conversation_id);
```

#### 10. User Violations Table

```sql
CREATE TABLE user_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Violation Details
    violation_type VARCHAR(50) NOT NULL,  -- conduct, harassment, fraud, support_abuse, payment_dispute, off_platform
    severity VARCHAR(20) NOT NULL,  -- minor, moderate, severe, critical
    description TEXT NOT NULL,

    -- Source
    source_type VARCHAR(50),  -- support_ticket, dispute, message_report, admin_action, system_detection
    source_id INTEGER,  -- ID of source record

    -- Enforcement Action
    action_taken VARCHAR(100) NOT NULL,  -- warning, messaging_restricted, account_suspended, account_removed, campaign_restricted, support_limited
    action_duration INTEGER,  -- duration in days (null = permanent)
    action_expires_at TIMESTAMP,

    -- Admin
    issued_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'active',  -- active, expired, appealed, reversed

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_violations_user ON user_violations(user_id);
CREATE INDEX idx_violations_status ON user_violations(status);
CREATE INDEX idx_violations_severity ON user_violations(severity);
CREATE INDEX idx_violations_type ON user_violations(violation_type);
```

#### 11. Safety Escalations Table

```sql
CREATE TABLE safety_escalations (
    id SERIAL PRIMARY KEY,
    escalation_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "ESC-2026-00001"

    -- Source
    source_type VARCHAR(50) NOT NULL,  -- message_report, support_ticket, dispute, system_detection
    source_id INTEGER NOT NULL,

    -- Threat Assessment
    threat_level VARCHAR(20) NOT NULL,  -- low, medium, high, critical
    threat_category VARCHAR(50) NOT NULL,  -- violence, severe_harassment, hate_speech, scam, repeat_abuse, off_platform

    -- User Involved
    flagged_user_id INTEGER NOT NULL REFERENCES users(id),
    reported_by_user_id INTEGER REFERENCES users(id),

    -- Status
    status VARCHAR(30) DEFAULT 'pending',  -- pending, investigating, action_taken, resolved
    assigned_to INTEGER REFERENCES users(id),

    -- Automatic Actions
    auto_action_taken VARCHAR(100),  -- messaging_freeze, temporary_suspension, account_lock

    -- Resolution
    final_action VARCHAR(100),
    resolution_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_safety_escalations_user ON safety_escalations(flagged_user_id);
CREATE INDEX idx_safety_escalations_status ON safety_escalations(status);
CREATE INDEX idx_safety_escalations_threat ON safety_escalations(threat_level);
CREATE INDEX idx_safety_escalations_created ON safety_escalations(created_at);
```

#### 12. Admin Activity Log Table

```sql
CREATE TABLE admin_activity_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),

    -- Action Details
    action_type VARCHAR(50) NOT NULL,  -- ticket_response, dispute_resolved, violation_issued, user_suspended, message_reviewed
    target_type VARCHAR(50),  -- ticket, dispute, report, user, message
    target_id VARCHAR(100),  -- ID of target (can be string for message IDs)

    -- Action Data
    action_data JSONB,  -- stores action details, before/after states

    -- Metadata
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_type ON admin_activity_log(action_type);
CREATE INDEX idx_admin_activity_created ON admin_activity_log(created_at);
```

---

## 📅 Implementation Phases

### **Phase 1: Core Messaging Safety (Week 1-2)**

**Goal**: Implement messaging governance, privacy controls, and proactive safety

#### Week 1: Messaging Safety Backend
- [ ] **Block User System**
  - Create `user_blocks` table
  - Build block/unblock endpoints
  - Integrate with messaging service to prevent messaging
  - Silent logging (no notifications to blocked user)
- [ ] **Automated Safety Warnings**
  - Build harmful language detection module
  - Create pattern matching for threats, hate speech, abuse
  - Build warning nudge system (show before sending)
  - Store warnings in `message_safety_warnings` table
- [ ] **Contact Sharing Detection**
  - Pattern detection for phone numbers, emails, "WhatsApp me", etc.
  - Warning system for off-platform contact sharing
  - Log repeated attempts for moderation review

#### Week 2: Messaging Safety Frontend
- [ ] **Block User Interface**
  - Add "Block User" button in messaging interface
  - Add "Manage Blocked Users" page under settings
  - Show blocked status in conversation list
- [ ] **Safety Warning Modals**
  - "This message may violate community standards" modal
  - "Sharing contact details removes payment protection" modal
  - Edit/Cancel/Send Anyway options
  - Store user choice for analytics
- [ ] **Message Reporting UI**
  - "Report Message" icon on each message
  - Report modal with category selection
  - Confirmation message after submission

---

### **Phase 2: Support & Ticketing System (Week 3-4)**

**Goal**: Launch Help & Support Center with full ticketing

#### Week 3: Support System Backend
- [ ] Create `support_tickets`, `support_ticket_messages`, `support_ticket_attachments` tables
- [ ] Build ticket generation system (auto-increment ticket numbers)
- [ ] Create support ticket CRUD endpoints
- [ ] Build file upload handling for attachments
- [ ] Implement email notifications for ticket events
- [ ] Create ticket status transition logic

#### Week 4: Support System Frontend
- [ ] **Help Center Page** (`/help-center`)
  - Overview of support options
  - "Submit New Ticket" button
  - "My Tickets" list view
  - FAQ section (optional for MVP)
- [ ] **Submit Ticket Form** (`/help-center/submit`)
  - Category selector (required)
  - Subject and description fields
  - Optional references: collaboration, booking, payment, message thread
  - File attachments (max 5 files, 10MB total)
- [ ] **My Tickets Page** (`/my-tickets`)
  - List of user's tickets with status badges
  - Filter by status, category
  - Click to view ticket details
- [ ] **Ticket Detail Page** (`/tickets/:id`)
  - Full conversation thread
  - Reply functionality
  - Attachment uploads
  - Close ticket button
  - Status updates displayed

---

### **Phase 3: Dispute Resolution System (Week 5-6)**

**Goal**: Enable collaboration disputes with evidence auto-capture

#### Week 5: Dispute System Backend
- [ ] Create `collaboration_disputes` and `dispute_evidence` tables
- [ ] Build dispute creation endpoint with auto-evidence capture:
  - Campaign agreement details
  - Milestone status and history
  - Payment records
  - Message history (from messaging service)
- [ ] Create dispute management endpoints (assign, update status, resolve)
- [ ] Build admin resolution workflow (refund, milestone release, etc.)
- [ ] Notification system for dispute events

#### Week 6: Dispute System Frontend
- [ ] **Open Dispute Button** in collaboration details page
  - Only shown when collaboration is active/completed
- [ ] **Dispute Submission Form** (`/collaborations/:id/dispute`)
  - Dispute type selector (deliverable, payment, timeline, scope, quality)
  - Description field
  - Requested resolution field
  - Evidence upload (files, screenshots, links)
  - Show auto-captured evidence preview
- [ ] **My Disputes Page** (`/my-disputes`)
  - List of user's disputes (both as creator and brand)
  - Status tracking
  - Link to dispute details
- [ ] **Dispute Detail Page** (`/disputes/:id`)
  - Full dispute information
  - Evidence viewer
  - Resolution status
  - Accept/reject resolution buttons

---

### **Phase 4: Admin Moderation Dashboard (Week 7-8)**

**Goal**: Empower admins with comprehensive moderation tools

#### Week 7: Admin Backend
- [ ] Admin ticket management endpoints
- [ ] Admin dispute mediation endpoints
- [ ] Message report review endpoints
- [ ] Enforcement action endpoints:
  - Issue warning
  - Restrict messaging
  - Suspend account
  - Remove account
  - Restrict campaign participation
  - Limit support submissions
- [ ] Admin activity logging for all actions
- [ ] User violation tracking and history

#### Week 8: Admin Dashboard Frontend
- [ ] **Moderation Dashboard** (`/admin/moderation`)
  - Overview panel with key metrics
  - Tab navigation: Tickets | Disputes | Reports | Escalations
- [ ] **Ticket Queue**
  - Table view with filters
  - Assign to self/team
  - Quick response actions
- [ ] **Dispute Mediation Interface**
  - Full evidence viewer
  - Message history access
  - Resolution proposal form
  - Apply refund/milestone release
- [ ] **Message Report Review**
  - View reported message with context
  - User violation history
  - Take action buttons (warn, restrict, suspend)
- [ ] **Enforcement Action Modals**
  - User summary
  - Violation history
  - Action selector with duration
  - Reason field
  - Confirmation

---

### **Phase 5: Advanced Safety & Intelligence (Week 9-10)**

**Goal**: Automate threat detection and risk scoring

#### Week 9: Advanced Detection
- [ ] **Emergency Escalation System**
  - Keyword triggers for violence, severe harassment, scams
  - Auto-create safety escalation records
  - Immediate admin notifications
  - Optional temporary messaging freeze
- [ ] **Messaging Risk Monitoring**
  - Build risk scoring algorithm
  - Track behavioral patterns: blocks received, reports, contact sharing
  - Generate risk profiles (low/medium/high/critical)
  - Flag high-risk users for admin review
- [ ] **Support Abuse Detection**
  - Detect false reports
  - Detect duplicate tickets
  - Detect spam submissions
  - Auto-restrict repeat offenders

#### Week 10: Advanced Admin Tools
- [ ] **Safety Escalation Queue**
  - High-priority dashboard for emergency cases
  - Red badges for critical threats
  - One-click enforcement actions
- [ ] **Risk Profile Viewer**
  - User risk score and level
  - Signal breakdown (blocks, reports, violations)
  - Trend over time
- [ ] **Bulk Operations**
  - Bulk ticket assignment
  - Bulk close/archive
- [ ] **Response Templates**
  - Pre-written responses for common issues
  - Customizable templates per category

---

### **Phase 6: Polish & Scale (Week 11-12)**

**Goal**: Refine UX, add analytics, prepare for scale

#### Week 11: User Experience
- [ ] Email notification templates (HTML styled)
- [ ] In-app notification integration
- [ ] Appeal submission for violations
- [ ] User feedback surveys post-resolution
- [ ] FAQ and self-service articles
- [ ] Message status indicators (sent, delivered, read)

#### Week 12: Analytics & Monitoring
- [ ] Admin analytics dashboard:
  - Ticket volume trends
  - Resolution time metrics
  - Top issue categories
  - Dispute resolution rates
  - Safety escalation frequency
- [ ] Platform health metrics
- [ ] Export functionality (CSV reports)
- [ ] Performance optimization for large datasets

---

## 🔧 Core Features

### 1. Core Messaging System

#### Messaging Features

**Users can**:
- Send messages to other users
- View conversation history
- Receive notifications for new messages
- Attach files/links related to collaborations
- Reference collaboration discussions within messages
- Block other users
- Report inappropriate messages

#### Message Status Indicators

Messages display:
- ✅ **Sent** - Message delivered to server
- ✅ **Delivered** - Message delivered to recipient's device
- ✅ **Read** - Recipient has opened and viewed message

**Technical Implementation**:
- Messaging service (Node.js + Socket.io on port 3002)
- Message status stored in messaging database
- Real-time status updates via WebSocket
- Read receipts tracked per message

---

### 2. Block User System

#### Block Flow

1. **User Action**: User clicks "Block User" in conversation
2. **Immediate Effects**:
   - Blocked user cannot send new messages to blocker
   - Blocker cannot send messages to blocked user
   - Conversation removed from blocked user's inbox
   - All notifications from blocked user stop
3. **Silent System Logging**:
   - Block recorded in `user_blocks` table
   - Blocked user is NOT notified
   - Block count increments in `message_risk_signals` for blocked user
4. **Admin Visibility**:
   - Blocking alone does NOT trigger admin review
   - Admins can view block patterns in risk profiles
   - High block count may trigger investigation

#### Technical Requirements

**Backend**:
- `POST /api/messaging/block/:userId` - Block a user
- `DELETE /api/messaging/block/:userId` - Unblock a user
- `GET /api/messaging/blocked` - List blocked users

**Frontend**:
- Block button in conversation header
- Confirmation modal: "Block [username]?"
- "Manage Blocked Users" page in settings
- Unblock functionality

**Messaging Service Integration**:
- Check block status before delivering messages
- Return "blocked" status to sender (generic error)
- Filter blocked users from conversation list

---

### 3. Message Reporting System

#### Report Flow

1. **User sees inappropriate message**
2. **Clicks "Report Message" icon**
3. **Fills report form**:
   - Select category (harassment, hate speech, scam, spam, fraud, abusive)
   - Optional: Add additional context
4. **System captures**:
   - Message content
   - Conversation context (3 messages before and after)
   - Timestamp
   - Both user profiles
   - Reporter and reported user IDs
5. **Emergency detection**:
   - If keywords match threat patterns → Auto-escalate
   - Create safety escalation record
   - Notify admin team immediately
6. **Confirmation shown**:
   - "Thank you for your report. Our team will review within 24 hours."
7. **Admin reviews**:
   - View message context
   - Check reported user's violation history
   - Decide action
8. **Reporter notified of outcome**

#### Report Categories

- **Harassment** - Repeated unwanted contact, bullying
- **Hate Speech** - Discriminatory language, slurs
- **Scam** - Fraudulent schemes, fake profiles
- **Spam** - Unsolicited marketing, repetitive messages
- **Fraud** - Fake payment requests, impersonation
- **Abusive Communication** - Threats, intimidation, explicit content

#### Technical Requirements

**Backend**:
- `POST /api/reports/messages` - Submit message report
- `GET /api/reports/messages` - List user's reports
- `GET /api/reports/messages/:id` - Get report status

**Messaging Service**:
- Expose endpoint to retrieve message context
- Return 3 messages before and after reported message
- Include timestamp, sender, content

**Frontend**:
- Report icon on each message (flag or ellipsis menu)
- Report modal with category selector
- Confirmation toast

---

## 🛡️ Messaging Safety Features

### 1. Automated Safety Nudges

#### Harmful Language Detection

**Trigger Patterns**:
- **Violence**: "kill", "hurt", "attack", "beat up", "bomb", "shoot"
- **Threats**: "I will [harm]", "watch out", "you'll regret"
- **Hate Speech**: Racial slurs, discriminatory language (configurable list)
- **Explicit Abuse**: Sexual harassment, graphic threats

**User Flow**:
1. User types message containing trigger pattern
2. User clicks "Send"
3. **Warning Modal Appears**:
   ```
   ⚠️ This message may violate community standards

   Your message contains language that could be harmful or abusive.
   Our community guidelines prohibit harassment and threats.

   Would you like to review it before sending?
   ```
4. **User Options**:
   - **Edit Message** - Return to message input
   - **Cancel** - Delete message entirely
   - **Send Anyway** - Proceed (message sent, warning logged)
5. **System Action**:
   - Log warning in `message_safety_warnings` table
   - Record user action (edited, cancelled, sent_anyway)
   - If "sent anyway", increment flagged_messages_count in risk signals
   - Multiple "sent anyway" actions → Admin review triggered

**Technical Implementation**:
- **Frontend**: Pre-send validation before WebSocket emit
- **Pattern Matching**: Regex patterns + keyword lists
- **Configurable**: Admin can update pattern lists
- **Language Support**: English patterns (expand later)

**Code Pattern** (Frontend):
```javascript
const checkHarmfulLanguage = (message) => {
  const patterns = [
    /\b(kill|hurt|attack|beat up|bomb|shoot)\b/gi,
    /\b(rape|assault|molest)\b/gi,
    // ... more patterns
  ];

  for (const pattern of patterns) {
    if (pattern.test(message)) {
      return {
        detected: true,
        pattern: pattern.source,
        type: 'harmful_language'
      };
    }
  }
  return { detected: false };
};

// Before sending
const result = checkHarmfulLanguage(message);
if (result.detected) {
  showWarningModal({
    type: 'harmful_language',
    onEdit: () => { /* return to input */ },
    onCancel: () => { /* clear message */ },
    onSendAnyway: () => { logWarning(); sendMessage(); }
  });
}
```

---

### 2. Contact Sharing Detection

#### Patterns to Detect

- **Phone Numbers**: International formats, local formats
  - `+263 77 123 4567`, `0771234567`, `(555) 123-4567`
- **Email Addresses**: Standard email format
  - `user@example.com`, `contact.me@domain.co.zw`
- **External Platforms**: Common chat app mentions
  - "WhatsApp me", "Telegram", "text me", "call me"
  - "DM on Instagram", "add me on Snapchat"

**User Flow**:
1. User types message with contact info
2. User clicks "Send"
3. **Warning Modal Appears**:
   ```
   🛡️ For your safety, keep communication on BantuBuzz

   Sharing contact details or moving conversations off-platform may:
   • Remove payment protection
   • Void dispute support
   • Violate collaboration agreements

   Are you sure you want to share this information?
   ```
4. **User Options**:
   - **Edit Message** - Remove contact info
   - **Cancel** - Delete message
   - **Send Anyway** - Proceed (message sent, warning logged)
5. **System Action**:
   - Log in `message_safety_warnings` table
   - Increment `contact_sharing_attempts_count` in risk signals
   - If repeated attempts (>3 in 7 days) → Admin review triggered

**Technical Implementation**:
```javascript
const detectContactSharing = (message) => {
  const patterns = {
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    whatsapp: /whatsapp|watsapp|WhatsApp me|wa\.me/gi,
    telegram: /telegram|@[a-zA-Z0-9_]+/gi,
    externalDM: /(DM|message) me on (Instagram|Facebook|Twitter|Snapchat)/gi
  };

  const detected = [];
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      detected.push(type);
    }
  }

  return {
    detected: detected.length > 0,
    types: detected,
    type: 'contact_sharing'
  };
};
```

---

### 3. Messaging Risk Monitoring

#### Risk Signals Tracked

**Per User**:
- `blocks_received_count` - How many users have blocked this person
- `harassment_reports_count` - Reports of harassment/abuse
- `contact_sharing_attempts_count` - Attempts to move off-platform
- `flagged_messages_count` - Messages sent despite warnings
- `false_reports_count` - Reports they filed that were dismissed

#### Risk Scoring Algorithm

```
Risk Score (0-100) =
  (blocks_received_count * 10) +
  (harassment_reports_count * 15) +
  (contact_sharing_attempts_count * 5) +
  (flagged_messages_count * 8) +
  -(false_reports_count * 5)  // penalty for false reporting

Risk Levels:
- 0-20: Low (green)
- 21-50: Medium (yellow)
- 51-80: High (orange)
- 81-100: Critical (red)
```

#### Admin Risk Profile View

**User Profile Panel**:
```
User: @creatorname
Risk Level: 🟡 Medium (42/100)

Risk Signals:
├─ Blocks Received: 3 users
├─ Harassment Reports: 1 pending, 0 confirmed
├─ Contact Sharing Attempts: 5 in last 30 days
├─ Flagged Messages: 2 sent despite warnings
└─ False Reports: 0

Last Signal Detected: 2 days ago
Tracking Since: Jan 15, 2026
```

#### Auto-Triggered Admin Review

**Triggers**:
- Risk score ≥ 60
- ≥ 5 blocks received in 30 days
- ≥ 3 confirmed harassment reports
- ≥ 10 contact sharing attempts in 30 days

**Action**: Create task in admin moderation queue for manual review

---

## 🌐 API Endpoints

### Messaging & Safety

```
User Block System:
POST   /api/messaging/block/:userId              - Block a user
DELETE /api/messaging/block/:userId              - Unblock a user
GET    /api/messaging/blocked                    - List blocked users
GET    /api/messaging/blocked/by                 - Users who blocked you (limited info)

Message Safety:
POST   /api/messaging/safety/check               - Pre-send safety check
POST   /api/messaging/safety/warnings            - Log safety warning
GET    /api/messaging/safety/patterns            - Get current detection patterns (admin)

Message Reports:
POST   /api/reports/messages                     - Report a message
GET    /api/reports/messages                     - List user's reports
GET    /api/reports/messages/:id                 - Get report status

Admin Message Reports:
GET    /api/admin/reports/messages               - List all message reports (filtered)
GET    /api/admin/reports/messages/:id           - Get report details with context
PUT    /api/admin/reports/messages/:id/review    - Mark under review
POST   /api/admin/reports/messages/:id/action    - Take action (warn, restrict, suspend)
PUT    /api/admin/reports/messages/:id/dismiss   - Dismiss report
```

### Support Tickets

```
POST   /api/support/tickets                      - Create ticket
GET    /api/support/tickets                      - List user's tickets
GET    /api/support/tickets/:id                  - Get ticket details
POST   /api/support/tickets/:id/messages         - Reply to ticket
POST   /api/support/tickets/:id/attachments      - Upload attachment
PUT    /api/support/tickets/:id/close            - Close ticket
PUT    /api/support/tickets/:id/reopen           - Reopen ticket

Admin Support:
GET    /api/admin/support/tickets                - List all tickets (filtered)
GET    /api/admin/support/tickets/:id            - Get ticket details
PUT    /api/admin/support/tickets/:id/assign     - Assign ticket to admin
PUT    /api/admin/support/tickets/:id/status     - Update ticket status
POST   /api/admin/support/tickets/:id/respond    - Admin response
PUT    /api/admin/support/tickets/:id/resolve    - Mark resolved
PUT    /api/admin/support/tickets/:id/close      - Close ticket
```

### Disputes

```
POST   /api/disputes                             - Create dispute
GET    /api/disputes                             - List user's disputes
GET    /api/disputes/:id                         - Get dispute details
POST   /api/disputes/:id/evidence                - Upload evidence
PUT    /api/disputes/:id/accept-resolution       - Accept proposed resolution

Admin Disputes:
GET    /api/admin/disputes                       - List all disputes (filtered)
GET    /api/admin/disputes/:id                   - Get full dispute details
PUT    /api/admin/disputes/:id/assign            - Assign to mediator
POST   /api/admin/disputes/:id/propose           - Propose resolution
PUT    /api/admin/disputes/:id/resolve           - Apply resolution
GET    /api/admin/disputes/:id/evidence          - View all evidence
GET    /api/admin/disputes/:id/messages          - Get message history (from messaging service)
```

### Enforcement & Violations

```
GET    /api/users/me/violations                  - User's violation history
POST   /api/users/me/violations/:id/appeal       - Appeal a violation

Admin Enforcement:
POST   /api/admin/enforcement/warn               - Issue warning
POST   /api/admin/enforcement/restrict-messaging - Restrict messaging
POST   /api/admin/enforcement/restrict-campaigns - Restrict campaign participation
POST   /api/admin/enforcement/suspend            - Suspend account
POST   /api/admin/enforcement/remove             - Remove account
POST   /api/admin/enforcement/limit-support      - Limit support submissions

GET    /api/admin/violations                     - List all violations (filtered)
GET    /api/admin/violations/user/:id            - User violation history
PUT    /api/admin/violations/:id/reverse         - Reverse violation
```

### Safety Escalations

```
Admin Safety:
GET    /api/admin/safety/escalations             - List safety escalations
GET    /api/admin/safety/escalations/:id         - Get escalation details
PUT    /api/admin/safety/escalations/:id/resolve - Resolve escalation
POST   /api/admin/safety/escalations/:id/action  - Take immediate action
```

### Risk Monitoring

```
Admin Risk:
GET    /api/admin/risk/users                     - List users by risk level
GET    /api/admin/risk/users/:id                 - Get user risk profile
PUT    /api/admin/risk/users/:id/signals         - Manually adjust risk signals
GET    /api/admin/risk/high-risk                 - Users above risk threshold
```

---

## 🎨 Frontend Components

### User-Facing Messaging Components

#### 1. Message Input with Safety Check

```jsx
<MessageInput onSend={handleSend}>
  <TextArea
    value={message}
    onChange={handleMessageChange}
    onSend={handlePreSendCheck}
  />
  {attachments && <AttachmentPreview files={attachments} />}
  <SendButton onClick={handlePreSendCheck} />
</MessageInput>

{/* Safety Warning Modal */}
<SafetyWarningModal
  isOpen={showWarning}
  type={warningType}  // harmful_language or contact_sharing
  onEdit={handleEditMessage}
  onCancel={handleCancelMessage}
  onSendAnyway={handleSendAnyway}
/>
```

#### 2. Conversation Header with Block Button

```jsx
<ConversationHeader>
  <UserAvatar user={recipient} />
  <UserName>{recipient.name}</UserName>
  <MoreMenu>
    <MenuItem onClick={handleBlockUser}>
      <BlockIcon /> Block User
    </MenuItem>
    <MenuItem onClick={handleReportUser}>
      <FlagIcon /> Report User
    </MenuItem>
  </MoreMenu>
</ConversationHeader>

{/* Block Confirmation Modal */}
<BlockUserModal
  isOpen={showBlockModal}
  user={recipient}
  onConfirm={handleConfirmBlock}
  onCancel={handleCancelBlock}
/>
```

#### 3. Message with Report Button

```jsx
<MessageBubble isOwnMessage={message.sender_id === currentUser.id}>
  <MessageContent>{message.content}</MessageContent>
  <MessageMeta>
    <Timestamp>{formatTime(message.created_at)}</Timestamp>
    {message.status && <StatusIcon status={message.status} />}
  </MessageMeta>

  {!isOwnMessage && (
    <ReportButton onClick={() => handleReportMessage(message)}>
      <FlagIcon size={14} />
    </ReportButton>
  )}
</MessageBubble>

{/* Report Message Modal */}
<ReportMessageModal
  isOpen={showReportModal}
  message={selectedMessage}
  onSubmit={handleSubmitReport}
  onCancel={handleCancelReport}
/>
```

#### 4. Blocked Users Management Page

```jsx
<BlockedUsersPage>
  <PageHeader title="Blocked Users" />

  {blockedUsers.length === 0 ? (
    <EmptyState>
      <p>You haven't blocked anyone yet.</p>
    </EmptyState>
  ) : (
    <BlockedUsersList>
      {blockedUsers.map(user => (
        <BlockedUserCard key={user.id}>
          <UserAvatar user={user} />
          <UserInfo>
            <UserName>{user.name}</UserName>
            <BlockedDate>Blocked {formatDate(user.blocked_at)}</BlockedDate>
          </UserInfo>
          <UnblockButton onClick={() => handleUnblock(user.id)}>
            Unblock
          </UnblockButton>
        </BlockedUserCard>
      ))}
    </BlockedUsersList>
  )}
</BlockedUsersPage>
```

---

### Support System Components

#### 5. Help Center Page

```jsx
<HelpCenter>
  <PageHeader title="Help & Support" />

  <QuickActions>
    <ActionCard onClick={() => navigate('/help-center/submit')}>
      <Icon>📝</Icon>
      <Title>Submit New Ticket</Title>
      <Description>Get help from our support team</Description>
    </ActionCard>

    <ActionCard onClick={() => navigate('/faq')}>
      <Icon>❓</Icon>
      <Title>FAQ</Title>
      <Description>Find answers to common questions</Description>
    </ActionCard>
  </QuickActions>

  <Section title="My Tickets">
    {tickets.length === 0 ? (
      <EmptyState>No tickets yet</EmptyState>
    ) : (
      <TicketList>
        {tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => navigate(`/tickets/${ticket.id}`)}
          />
        ))}
      </TicketList>
    )}
  </Section>
</HelpCenter>
```

#### 6. Submit Ticket Form

```jsx
<SubmitTicketForm onSubmit={handleSubmit}>
  <FormField label="Category" required>
    <Select name="category" options={ticketCategories} />
  </FormField>

  <FormField label="Subject" required>
    <Input name="subject" maxLength={200} />
  </FormField>

  <FormField label="Description" required>
    <Textarea name="description" minLength={20} rows={6} />
  </FormField>

  <FormField label="Related Collaboration" optional>
    <CollaborationSelect
      name="collaboration_id"
      options={userCollaborations}
    />
  </FormField>

  <FormField label="Attachments" optional>
    <FileUploader
      maxFiles={5}
      maxSize="10MB"
      accept="image/*,application/pdf,.doc,.docx"
    />
  </FormField>

  <SubmitButton>Submit Ticket</SubmitButton>
</SubmitTicketForm>
```

#### 7. Ticket Detail Page

```jsx
<TicketDetailPage>
  <TicketHeader>
    <TicketNumber>{ticket.ticket_number}</TicketNumber>
    <StatusBadge status={ticket.status} />
    <Category>{ticket.category}</Category>
  </TicketHeader>

  <TicketInfo>
    <Subject>{ticket.subject}</Subject>
    <Meta>
      Created {formatDate(ticket.created_at)}
      · Last update {formatDate(ticket.updated_at)}
    </Meta>
  </TicketInfo>

  <MessageThread>
    {messages.map(message => (
      <MessageCard
        key={message.id}
        message={message}
        isAdmin={message.is_admin}
      />
    ))}
  </MessageThread>

  {ticket.status !== 'closed' && (
    <ReplyForm onSubmit={handleReply}>
      <Textarea placeholder="Type your reply..." />
      <FileUploader />
      <SendButton>Send Reply</SendButton>
    </ReplyForm>
  )}

  {ticket.status === 'resolved' && (
    <ResolvedBanner>
      <p>This ticket has been marked as resolved.</p>
      <CloseButton onClick={handleCloseTicket}>
        Close Ticket
      </CloseButton>
      <ReopenButton onClick={handleReopenTicket}>
        Reopen
      </ReopenButton>
    </ResolvedBanner>
  )}
</TicketDetailPage>
```

---

### Dispute System Components

#### 8. Open Dispute Button (in Collaboration Detail)

```jsx
<CollaborationActions>
  {/* Other actions */}

  {canOpenDispute && (
    <ActionButton
      variant="secondary"
      onClick={() => navigate(`/collaborations/${collaboration.id}/dispute`)}
    >
      <FlagIcon />
      Open Dispute
    </ActionButton>
  )}
</CollaborationActions>
```

#### 9. Dispute Submission Form

```jsx
<DisputeForm collaboration={collaboration} onSubmit={handleSubmit}>
  <CollaborationSummary>
    <h3>{collaboration.title}</h3>
    <p>With: {otherParty.name}</p>
  </CollaborationSummary>

  <FormField label="Dispute Type" required>
    <Select name="dispute_type" options={disputeTypes} />
  </FormField>

  <FormField label="Description" required>
    <Textarea
      name="description"
      placeholder="Describe the issue in detail..."
      minLength={50}
      rows={8}
    />
  </FormField>

  <FormField label="Requested Resolution" required>
    <Textarea
      name="requested_resolution"
      placeholder="What would you like to happen?"
      rows={4}
    />
  </FormField>

  <FormField label="Evidence">
    <EvidenceUploader
      maxFiles={10}
      accept="image/*,application/pdf,.doc,.docx"
    />
  </FormField>

  <AutoCapturedEvidenceSection>
    <SectionTitle>System-Captured Evidence</SectionTitle>
    <p>The following will be automatically included:</p>
    <EvidenceList>
      <li>✓ Campaign agreement and terms</li>
      <li>✓ Milestone status and history</li>
      <li>✓ Payment records and transactions</li>
      <li>✓ Message history between parties</li>
    </EvidenceList>
  </AutoCapturedEvidenceSection>

  <SubmitButton>Submit Dispute</SubmitButton>
</DisputeForm>
```

#### 10. Dispute Detail Page

```jsx
<DisputeDetailPage>
  <DisputeHeader>
    <DisputeNumber>{dispute.dispute_number}</DisputeNumber>
    <StatusBadge status={dispute.status} />
  </DisputeHeader>

  <DisputeInfo>
    <InfoRow>
      <Label>Collaboration:</Label>
      <Value>{collaboration.title}</Value>
    </InfoRow>
    <InfoRow>
      <Label>Type:</Label>
      <Value>{dispute.dispute_type}</Value>
    </InfoRow>
    <InfoRow>
      <Label>Raised by:</Label>
      <Value>{dispute.raised_by.name}</Value>
    </InfoRow>
    <InfoRow>
      <Label>Against:</Label>
      <Value>{dispute.against_user.name}</Value>
    </InfoRow>
  </DisputeInfo>

  <DisputeDescription>
    <SectionTitle>Description</SectionTitle>
    <p>{dispute.description}</p>
  </DisputeDescription>

  <RequestedResolution>
    <SectionTitle>Requested Resolution</SectionTitle>
    <p>{dispute.requested_resolution}</p>
  </RequestedResolution>

  <EvidenceSection>
    <SectionTitle>Evidence</SectionTitle>
    <EvidenceGallery evidence={dispute.evidence} />
  </EvidenceSection>

  {dispute.resolution_notes && (
    <ResolutionSection>
      <SectionTitle>Admin Resolution</SectionTitle>
      <p>{dispute.resolution_notes}</p>

      {dispute.status === 'mediation' && (
        <ResolutionActions>
          <AcceptButton onClick={handleAcceptResolution}>
            Accept Resolution
          </AcceptButton>
          <DeclineButton onClick={handleDeclineResolution}>
            Decline
          </DeclineButton>
        </ResolutionActions>
      )}
    </ResolutionSection>
  )}
</DisputeDetailPage>
```

---

## 🔧 Admin Tools

### Admin Moderation Dashboard

#### 11. Moderation Dashboard Overview

```jsx
<ModerationDashboard>
  <DashboardHeader>
    <Title>Moderation Dashboard</Title>
    <AdminInfo>{admin.name}</AdminInfo>
  </DashboardHeader>

  <MetricsPanel>
    <MetricCard>
      <MetricValue>{metrics.open_tickets}</MetricValue>
      <MetricLabel>Open Tickets</MetricLabel>
    </MetricCard>
    <MetricCard>
      <MetricValue>{metrics.active_disputes}</MetricValue>
      <MetricLabel>Active Disputes</MetricLabel>
    </MetricCard>
    <MetricCard urgent>
      <MetricValue>{metrics.pending_reports}</MetricValue>
      <MetricLabel>Pending Reports</MetricLabel>
    </MetricCard>
    <MetricCard critical>
      <MetricValue>{metrics.safety_escalations}</MetricValue>
      <MetricLabel>Safety Escalations</MetricLabel>
    </MetricCard>
  </MetricsPanel>

  <TabNavigation>
    <Tab active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')}>
      Tickets <Badge>{metrics.open_tickets}</Badge>
    </Tab>
    <Tab active={activeTab === 'disputes'} onClick={() => setActiveTab('disputes')}>
      Disputes <Badge>{metrics.active_disputes}</Badge>
    </Tab>
    <Tab active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>
      Reports <Badge>{metrics.pending_reports}</Badge>
    </Tab>
    <Tab active={activeTab === 'escalations'} onClick={() => setActiveTab('escalations')}>
      Escalations <Badge critical>{metrics.safety_escalations}</Badge>
    </Tab>
  </TabNavigation>

  <MainContent>
    {activeTab === 'tickets' && <TicketQueue />}
    {activeTab === 'disputes' && <DisputeQueue />}
    {activeTab === 'reports' && <ReportQueue />}
    {activeTab === 'escalations' && <EscalationQueue />}
  </MainContent>
</ModerationDashboard>
```

#### 12. Ticket Queue

```jsx
<TicketQueue>
  <FilterBar>
    <FilterSelect name="status" options={statusOptions} />
    <FilterSelect name="category" options={categoryOptions} />
    <FilterSelect name="priority" options={priorityOptions} />
    <FilterSelect name="assigned_to" options={adminOptions} />
    <DateRangePicker name="date_range" />
    <ClearFiltersButton>Clear All</ClearFiltersButton>
  </FilterBar>

  <TicketTable>
    <thead>
      <tr>
        <th>Ticket #</th>
        <th>User</th>
        <th>Category</th>
        <th>Subject</th>
        <th>Status</th>
        <th>Priority</th>
        <th>Created</th>
        <th>Assigned To</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {tickets.map(ticket => (
        <TicketRow
          key={ticket.id}
          ticket={ticket}
          onClick={() => openTicketModal(ticket)}
        />
      ))}
    </tbody>
  </TicketTable>

  <Pagination
    currentPage={page}
    totalPages={totalPages}
    onPageChange={handlePageChange}
  />
</TicketQueue>
```

#### 13. Admin Ticket Detail Modal

```jsx
<AdminTicketModal ticket={ticket} isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <TicketNumber>{ticket.ticket_number}</TicketNumber>
    <StatusBadge status={ticket.status} />
    <CloseButton onClick={onClose}>×</CloseButton>
  </ModalHeader>

  <TicketDetails>
    <Section title="User Information">
      <UserCard user={ticket.user}>
        <UserAvatar user={ticket.user} />
        <UserInfo>
          <UserName>{ticket.user.name}</UserName>
          <UserType>{ticket.user.user_type}</UserType>
          <UserEmail>{ticket.user.email}</UserEmail>
        </UserInfo>
        <ViewProfileButton onClick={() => viewUserProfile(ticket.user.id)}>
          View Full Profile
        </ViewProfileButton>
      </UserCard>
    </Section>

    <Section title="Ticket Information">
      <InfoGrid>
        <InfoItem label="Category" value={ticket.category} />
        <InfoItem label="Priority" value={ticket.priority} />
        <InfoItem label="Subject" value={ticket.subject} />
        <InfoItem label="Created" value={formatDate(ticket.created_at)} />
        {ticket.collaboration_id && (
          <InfoItem label="Collaboration" value={ticket.collaboration.title} link />
        )}
      </InfoGrid>
    </Section>

    <Section title="Conversation">
      <MessageThread messages={ticket.messages} />
    </Section>

    <Section title="User Violation History">
      <ViolationHistory userId={ticket.user.id} />
    </Section>
  </TicketDetails>

  <AdminActions>
    <Select
      name="assigned_to"
      value={ticket.assigned_to}
      onChange={handleAssign}
      options={adminOptions}
    />
    <Select
      name="status"
      value={ticket.status}
      onChange={handleStatusChange}
      options={statusOptions}
    />
    <TextArea
      placeholder="Type your response..."
      value={response}
      onChange={e => setResponse(e.target.value)}
    />
    <ButtonGroup>
      <Button onClick={handleSendResponse}>Send Response</Button>
      <Button variant="secondary" onClick={handleRequestInfo}>Request Info</Button>
      <Button variant="success" onClick={handleResolve}>Resolve</Button>
      <Button variant="danger" onClick={handleClose}>Close</Button>
    </ButtonGroup>
  </AdminActions>
</AdminTicketModal>
```

#### 14. Message Report Review

```jsx
<MessageReportReview report={report}>
  <ReportHeader>
    <ReportNumber>{report.report_number}</ReportNumber>
    <StatusBadge status={report.status} />
    {report.is_emergency && <EmergencyBadge>URGENT</EmergencyBadge>}
  </ReportHeader>

  <ReportInfo>
    <InfoGrid>
      <InfoItem label="Reporter" value={report.reporter.name} />
      <InfoItem label="Reported User" value={report.reported_user.name} />
      <InfoItem label="Category" value={report.report_category} />
      <InfoItem label="Submitted" value={formatDate(report.created_at)} />
    </InfoGrid>
  </ReportInfo>

  <ReportedUserSection>
    <SectionTitle>Reported User Profile</SectionTitle>
    <UserCard user={report.reported_user}>
      <RiskBadge level={report.reported_user.risk_level}>
        Risk: {report.reported_user.risk_score}/100
      </RiskBadge>
      <ViewRiskProfileButton onClick={() => viewRiskProfile(report.reported_user.id)}>
        View Risk Profile
      </ViewRiskProfileButton>
    </UserCard>
  </ReportedUserSection>

  <MessageContextSection>
    <SectionTitle>Message Context</SectionTitle>
    <MessageTimeline>
      {report.message_context.before.map(msg => (
        <MessageBubble key={msg.id} dim>{msg.content}</MessageBubble>
      ))}
      <MessageBubble reported highlighted>
        {report.message_content}
      </MessageBubble>
      {report.message_context.after.map(msg => (
        <MessageBubble key={msg.id} dim>{msg.content}</MessageBubble>
      ))}
    </MessageTimeline>
  </MessageContextSection>

  <ViolationHistorySection>
    <SectionTitle>Violation History</SectionTitle>
    <ViolationList violations={report.reported_user.violations} />
  </ViolationHistorySection>

  <AdminActionPanel>
    <ActionButton variant="warning" onClick={() => handleIssueWarning(report)}>
      Issue Warning
    </ActionButton>
    <ActionButton variant="danger" onClick={() => handleRestrictMessaging(report)}>
      Restrict Messaging
    </ActionButton>
    <ActionButton variant="critical" onClick={() => handleSuspendAccount(report)}>
      Suspend Account
    </ActionButton>
    <ActionButton variant="secondary" onClick={() => handleDismissReport(report)}>
      Dismiss Report
    </ActionButton>
  </AdminActionPanel>
</MessageReportReview>
```

#### 15. Enforcement Action Modal

```jsx
<EnforcementActionModal isOpen={isOpen} user={user} onClose={onClose}>
  <ModalHeader>
    <Title>Take Enforcement Action</Title>
    <CloseButton onClick={onClose}>×</CloseButton>
  </ModalHeader>

  <UserSummary>
    <UserAvatar user={user} large />
    <UserInfo>
      <UserName>{user.name}</UserName>
      <UserType>{user.user_type}</UserType>
      <RiskBadge level={user.risk_level}>
        Risk Score: {user.risk_score}/100
      </RiskBadge>
    </UserInfo>
  </UserSummary>

  <ViolationHistoryPreview>
    <SectionTitle>Recent Violations</SectionTitle>
    {user.violations.slice(0, 3).map(violation => (
      <ViolationCard key={violation.id} violation={violation} compact />
    ))}
  </ViolationHistoryPreview>

  <EnforcementForm onSubmit={handleSubmit}>
    <FormField label="Action" required>
      <Select
        name="action_taken"
        options={enforcementActions}
        onChange={handleActionChange}
      />
    </FormField>

    {requiresDuration && (
      <FormField label="Duration" required>
        <Select
          name="action_duration"
          options={durationOptions}
        />
      </FormField>
    )}

    <FormField label="Reason" required>
      <Textarea
        name="notes"
        placeholder="Explain why this action is being taken..."
        minLength={20}
        rows={4}
      />
    </FormField>

    <NotificationPreview>
      <SectionTitle>User will receive:</SectionTitle>
      <PreviewBox>
        {generateNotificationPreview(selectedAction, duration, reason)}
      </PreviewBox>
    </NotificationPreview>

    <FormActions>
      <Button type="submit" variant="danger">
        Confirm Action
      </Button>
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </FormActions>
  </EnforcementForm>
</EnforcementActionModal>
```

#### 16. User Risk Profile Viewer

```jsx
<UserRiskProfile userId={userId}>
  <ProfileHeader>
    <UserInfo>
      <UserAvatar user={user} large />
      <UserName>{user.name}</UserName>
      <UserType>{user.user_type}</UserType>
    </UserInfo>
    <RiskScoreCard level={riskData.risk_level}>
      <ScoreValue>{riskData.risk_score}</ScoreValue>
      <ScoreLabel>Risk Score</ScoreLabel>
      <ScoreLevel>{riskData.risk_level}</ScoreLevel>
    </RiskScoreCard>
  </ProfileHeader>

  <RiskSignalsSection>
    <SectionTitle>Risk Signals</SectionTitle>
    <SignalGrid>
      <SignalCard>
        <SignalIcon>🚫</SignalIcon>
        <SignalValue>{riskData.blocks_received_count}</SignalValue>
        <SignalLabel>Blocks Received</SignalLabel>
      </SignalCard>
      <SignalCard>
        <SignalIcon>⚠️</SignalIcon>
        <SignalValue>{riskData.harassment_reports_count}</SignalValue>
        <SignalLabel>Harassment Reports</SignalLabel>
      </SignalCard>
      <SignalCard>
        <SignalIcon>📞</SignalIcon>
        <SignalValue>{riskData.contact_sharing_attempts_count}</SignalValue>
        <SignalLabel>Contact Sharing Attempts</SignalLabel>
      </SignalCard>
      <SignalCard>
        <SignalIcon>🏴</SignalIcon>
        <SignalValue>{riskData.flagged_messages_count}</SignalValue>
        <SignalLabel>Flagged Messages</SignalLabel>
      </SignalCard>
    </SignalGrid>
  </RiskSignalsSection>

  <ViolationHistorySection>
    <SectionTitle>Violation History</SectionTitle>
    {violations.map(violation => (
      <ViolationCard key={violation.id} violation={violation} />
    ))}
  </ViolationHistorySection>

  <ActivityTimelineSection>
    <SectionTitle>Recent Activity</SectionTitle>
    <Timeline>
      {recentActivity.map(activity => (
        <TimelineItem key={activity.id} activity={activity} />
      ))}
    </Timeline>
  </ActivityTimelineSection>

  <AdminActions>
    <Button onClick={handleManualAdjust}>Manually Adjust Signals</Button>
    <Button onClick={handleTakeAction}>Take Enforcement Action</Button>
  </AdminActions>
</UserRiskProfile>
```

---

## 🧪 Testing & Deployment

### Testing Strategy

#### Unit Tests
- Block/unblock user logic
- Message safety pattern detection
- Risk scoring algorithm
- Ticket creation and validation
- Dispute evidence auto-capture
- Enforcement action application

#### Integration Tests
- End-to-end block flow (messaging service integration)
- Safety warning → send → log flow
- Message report → admin review → enforcement
- Ticket submission → admin response → resolution
- Dispute creation → mediation → resolution

#### User Acceptance Testing
**Scenarios**:
1. User receives harassing message → reports → admin takes action
2. User tries to share phone number → warning shown → edits message
3. User blocks another user → messaging disabled → unblocks later
4. Creator submits support ticket → admin responds → ticket resolved
5. Brand opens dispute → admin mediates → resolution applied
6. High-risk user triggers auto-escalation → admin reviews → account restricted

#### Performance Tests
- 1000 concurrent message safety checks
- Admin dashboard load with 10,000+ tickets
- Search performance on message reports
- Risk score calculation for 100,000 users

---

### Deployment Checklist

#### Phase 1 Go-Live (Messaging Safety)
- [ ] Database migration executed (blocks, risk_signals, safety_warnings)
- [ ] Messaging service updated with block checking
- [ ] Safety pattern detection deployed
- [ ] Warning modals tested on staging
- [ ] Admin team briefed on new features
- [ ] Announcement to users about safety features

#### Phase 2 Go-Live (Support System)
- [ ] Support tables migrated
- [ ] Email templates configured
- [ ] File upload directory created (`/var/www/bantubuzz/backend/uploads/support/`)
- [ ] Help Center linked in navigation
- [ ] Admin accounts granted support access
- [ ] Ticket notification system tested

#### Phase 3 Go-Live (Disputes)
- [ ] Dispute tables migrated
- [ ] Evidence auto-capture tested
- [ ] Messaging service message history export tested
- [ ] Admin mediation workflow trained
- [ ] Legal team briefed on dispute process

#### Phase 4 Go-Live (Admin Tools)
- [ ] Admin dashboard deployed
- [ ] Enforcement actions tested
- [ ] Activity logging verified
- [ ] Admin team trained on moderation tools
- [ ] Escalation notification system configured

---

## 📊 Success Metrics

### User Safety Metrics
- **Block Usage**: % of users who have blocked someone
- **Report Response Time**: Time from report to admin review (target: <2 hours)
- **Safety Warning Effectiveness**: % of warned messages that are edited/cancelled
- **Contact Sharing Prevention**: % of detected attempts that are stopped

### Support Metrics
- **Ticket Resolution Time**: Average time to resolve (target: <24 hours)
- **User Satisfaction**: Post-resolution survey score (target: >4.5/5)
- **First Response Time**: Time to admin first response (target: <4 hours)
- **Ticket Volume**: Tickets per day (monitor trends)

### Dispute Metrics
- **Dispute Resolution Rate**: % resolved favorably (target: >80%)
- **Mediation Time**: Average time from open to resolution (target: <5 days)
- **Dispute Recurrence**: % of users with multiple disputes

### Platform Health
- **False Report Rate**: % of dismissed reports (target: <10%)
- **High-Risk User Rate**: % of users with risk score >60 (monitor)
- **Enforcement Actions**: Warnings vs suspensions vs bans (track ratio)
- **Appeal Success Rate**: % of appeals granted

---

## 🎯 Next Steps

1. **Review and approve** this implementation plan
2. **Phase 1 Start**: Create database migration for messaging safety tables
3. **Build safety detection module** (harmful language + contact sharing)
4. **Implement block system** in messaging service
5. **Deploy Phase 1 MVP** within Week 2
6. **Iterate** based on user feedback and admin input
7. **Phase 2 Start**: Support ticketing system
8. **Phase 3 Start**: Dispute resolution
9. **Phase 4 Start**: Admin moderation dashboard
10. **Phase 5 Start**: Advanced safety and intelligence

---

**Document Status**: Complete Implementation Plan v2.0
**Last Updated**: March 9, 2026
**Next Review**: After each phase completion
**Maintained By**: BantuBuzz Development Team

---

## 📝 Implementation Notes

### Design Philosophy Compliance
- All components follow BantuBuzz design system
- Cards: `rounded-3xl`, `shadow-sm`, `hover:shadow-md`
- Buttons: `rounded-full`, `bg-primary`, `text-dark`
- Icons: `bg-primary/10 rounded-full`, `text-primary`
- NO gradients (solid colors only)
- Warning modals use yellow/red accents for urgency
- Safety badges use color-coded system (green/yellow/orange/red)

### Backend Patterns
- Blueprint registration: `/api/messaging`, `/api/support`, `/api/disputes`, `/api/admin/moderation`
- JWT protection on all endpoints
- File uploads to `/var/www/bantubuzz/backend/uploads/support/`
- Email service for notifications
- Integration with existing messaging service (Node.js on port 3002)

### Frontend Patterns
- Protected routes for user pages (require login)
- Admin-only routes (require `is_admin=true`)
- React Hook Form for all forms
- Toast notifications for actions
- Loading states and error handling
- Real-time updates via WebSocket for messaging
- Confirmation modals for destructive actions

### Privacy Compliance
- Messages encrypted at rest
- Admin access logged in `admin_activity_log`
- User notified when message reviewed (except ongoing investigations)
- GDPR-compliant data retention (2 years for resolved cases)
- User can request data export

---

**Ready to implement? Let's start with Phase 1: Core Messaging Safety!**
