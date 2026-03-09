# BantuBuzz Support & Customer Assistance System - Implementation Plan

**Created**: March 9, 2026
**Purpose**: Complete implementation roadmap for Help & Support, Dispute Resolution, and Safety systems
**Alignment**: Enforces BantuBuzz Support & Customer Assistance Policy

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Implementation Phases](#implementation-phases)
5. [Feature Specifications](#feature-specifications)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Admin Dashboard](#admin-dashboard)
9. [Security & Compliance](#security--compliance)
10. [Testing Strategy](#testing-strategy)

---

## 🎯 Overview

### Goals
- Provide structured support request system
- Enable collaboration dispute resolution
- Enforce platform safety and conduct policies
- Prevent support system abuse
- Protect users from off-platform risks
- Enable fair investigation with evidence logging

### MVP Features (Phase 1 - Critical)
1. ✅ **Help & Support Ticket System**
2. ✅ **Collaboration Dispute System**
3. ✅ **Message Reporting Tool**
4. ✅ **Admin Moderation Dashboard**
5. ✅ **Enforcement Tools** (warnings/suspension)

### Advanced Features (Phase 2+)
- Support abuse detection
- Trust & safety scoring
- Emergency escalation automation
- ThunziAI integration for risk detection

---

## 🏗️ System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interfaces                          │
├─────────────────────────────────────────────────────────────┤
│  Help Center  │  Dispute Form  │  Message Report  │ Tickets │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Support Routes  │  Dispute Routes  │  Moderation Routes    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
├─────────────────────────────────────────────────────────────┤
│  support_tickets  │  disputes  │  reports  │  violations    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Admin Dashboard                            │
├─────────────────────────────────────────────────────────────┤
│  Ticket Queue  │  Dispute Cases  │  Safety Escalations      │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema

### 1. Support Tickets Table

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

    -- References (optional)
    collaboration_id INTEGER REFERENCES collaborations(id),
    booking_id INTEGER REFERENCES bookings(id),
    payment_reference VARCHAR(100),
    message_thread_id INTEGER,

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
```

### 2. Support Ticket Messages Table

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
```

### 3. Support Ticket Attachments Table

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

### 4. Collaboration Disputes Table

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
```

### 5. Dispute Evidence Table

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

    -- Message Evidence
    message_id INTEGER,
    message_excerpt TEXT,

    -- System Evidence (auto-captured)
    system_data JSONB,  -- stores campaign agreement, milestones, payment records

    -- Metadata
    submitted_by INTEGER NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
```

### 6. Message Reports Table

```sql
CREATE TABLE message_reports (
    id SERIAL PRIMARY KEY,
    report_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "REPORT-2026-00001"

    -- Reporter & Reported
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    reported_user_id INTEGER NOT NULL REFERENCES users(id),

    -- Message Details
    conversation_id INTEGER NOT NULL,  -- references messaging system conversation
    message_id VARCHAR(100) NOT NULL,  -- message identifier from messaging service
    message_content TEXT,

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
    action_taken VARCHAR(100),  -- warning_issued, messaging_restricted, account_suspended, no_action
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
```

### 7. User Violations Table

```sql
CREATE TABLE user_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Violation Details
    violation_type VARCHAR(50) NOT NULL,  -- conduct, harassment, fraud, support_abuse, payment_dispute
    severity VARCHAR(20) NOT NULL,  -- minor, moderate, severe, critical
    description TEXT NOT NULL,

    -- Source
    source_type VARCHAR(50),  -- support_ticket, dispute, message_report, admin_action
    source_id INTEGER,  -- ID of source record

    -- Enforcement Action
    action_taken VARCHAR(100) NOT NULL,  -- warning, messaging_restricted, account_suspended, account_removed
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
```

### 8. Support Abuse Tracking Table

```sql
CREATE TABLE support_abuse_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Abuse Metrics
    false_reports_count INTEGER DEFAULT 0,
    duplicate_tickets_count INTEGER DEFAULT 0,
    spam_submissions_count INTEGER DEFAULT 0,
    bad_faith_disputes_count INTEGER DEFAULT 0,

    -- Tracking Period
    tracking_period_start DATE DEFAULT CURRENT_DATE,
    last_abuse_detected_at TIMESTAMP,

    -- Status
    is_restricted BOOLEAN DEFAULT FALSE,
    restriction_expires_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_abuse_user ON support_abuse_tracking(user_id);
CREATE UNIQUE INDEX idx_support_abuse_user_unique ON support_abuse_tracking(user_id);
```

### 9. Safety Escalations Table

```sql
CREATE TABLE safety_escalations (
    id SERIAL PRIMARY KEY,
    escalation_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "ESC-2026-00001"

    -- Source
    source_type VARCHAR(50) NOT NULL,  -- message_report, support_ticket, dispute, system_detection
    source_id INTEGER NOT NULL,

    -- Threat Assessment
    threat_level VARCHAR(20) NOT NULL,  -- low, medium, high, critical
    threat_category VARCHAR(50) NOT NULL,  -- violence, severe_harassment, hate_speech, scam, repeat_abuse

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
```

### 10. Admin Activity Log Table

```sql
CREATE TABLE admin_activity_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),

    -- Action Details
    action_type VARCHAR(50) NOT NULL,  -- ticket_response, dispute_resolved, violation_issued, user_suspended
    target_type VARCHAR(50),  -- ticket, dispute, report, user
    target_id INTEGER,

    -- Action Data
    action_data JSONB,  -- stores action details

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

### **Phase 1: MVP Foundation (Week 1-2)**

**Goal**: Launch critical support features to handle user issues

#### Week 1: Backend Foundation
- [ ] Create database migration for all tables
- [ ] Build Support Ticket models and routes
- [ ] Build Dispute models and routes
- [ ] Build Message Report models and routes
- [ ] Build User Violations models
- [ ] Create file upload handling for attachments/evidence
- [ ] Write ticket number generation utilities

#### Week 2: Frontend User Interfaces
- [ ] Help Center page (`/help-center`)
- [ ] Submit Ticket form with category selector
- [ ] My Tickets page (`/my-tickets`)
- [ ] Ticket Detail view with messaging thread
- [ ] Dispute submission form (collaboration-specific)
- [ ] Message report button integration in messaging UI
- [ ] Notifications for ticket updates

---

### **Phase 2: Admin Moderation Tools (Week 3-4)**

**Goal**: Empower admins to handle support requests efficiently

#### Week 3: Admin Dashboard Backend
- [ ] Admin ticket management routes
- [ ] Dispute review and mediation routes
- [ ] Message report review routes
- [ ] Violation issuance system
- [ ] Enforcement action endpoints (warn, suspend, restrict)
- [ ] Admin activity logging

#### Week 4: Admin Dashboard Frontend
- [ ] Admin moderation dashboard layout
- [ ] Ticket queue interface with filters
- [ ] Dispute case management UI
- [ ] Message report review interface
- [ ] User violation history viewer
- [ ] Enforcement action modals
- [ ] Safety escalation queue

---

### **Phase 3: Safety & Automation (Week 5-6)**

**Goal**: Automate threat detection and protect users

#### Week 5: Safety Systems
- [ ] Emergency escalation triggers
- [ ] Auto-escalation for severe reports
- [ ] Temporary messaging freeze on threats
- [ ] Off-platform warning detection in messages
- [ ] Support abuse detection system
- [ ] Repeat offender tracking

#### Week 6: Evidence & Investigation Tools
- [ ] Auto-capture system evidence for disputes
- [ ] Evidence viewer for admins
- [ ] Campaign agreement snapshot on dispute
- [ ] Message history export for investigations
- [ ] Payment record attachment to disputes
- [ ] Timeline reconstruction tools

---

### **Phase 4: User Experience & Polish (Week 7-8)**

**Goal**: Refine UX and add advanced features

#### Week 7: User Features
- [ ] Ticket status tracking
- [ ] Email notifications for ticket updates
- [ ] In-app notification system integration
- [ ] Dispute resolution acceptance flow
- [ ] Appeal submission for violations
- [ ] FAQ and self-service help articles

#### Week 8: Advanced Admin Tools
- [ ] Bulk ticket operations
- [ ] Ticket assignment and routing
- [ ] Response templates for common issues
- [ ] Dispute mediation workflow
- [ ] User trust score calculation
- [ ] Analytics dashboard (ticket metrics, resolution times)

---

### **Phase 5: Future Enhancements (Week 9+)**

**Goal**: Advanced intelligence and automation

- [ ] ThunziAI integration for scam detection
- [ ] Sentiment analysis on messages for harassment detection
- [ ] Auto-categorization of tickets using AI
- [ ] Predictive risk scoring for users
- [ ] Chatbot for basic support questions
- [ ] Multi-language support for international users

---

## 🔧 Feature Specifications

### 1. Help & Support Ticket System

#### User Flow
1. User clicks "Help & Support" in navigation
2. Lands on Help Center page with:
   - Submit New Ticket button
   - My Tickets list
   - FAQ section (optional)
3. Clicks "Submit New Ticket"
4. Fills form:
   - Category dropdown (required)
   - Subject (required)
   - Description (required, min 20 chars)
   - Related collaboration (optional, searchable dropdown)
   - Related booking (optional)
   - Payment reference (optional)
   - Attachments (optional, max 5 files, 10MB total)
5. Submits ticket → Receives ticket number
6. Redirected to ticket detail page
7. Can reply to ticket, upload more files
8. Receives notifications when admin responds
9. Can close ticket when resolved

#### Admin Flow
1. Admin views ticket queue in dashboard
2. Filters by status, category, priority
3. Assigns ticket to self or team member
4. Reviews ticket details and evidence
5. Requests more information if needed
6. Investigates issue
7. Responds with solution
8. Marks ticket as resolved
9. User confirms or reopens
10. Admin closes ticket

#### Technical Requirements
- **Backend**: `/api/support/tickets` routes (CRUD)
- **Frontend**: React components with react-hook-form validation
- **File Upload**: Multer/similar for attachment handling
- **Notifications**: Email + in-app for ticket updates
- **Search**: Full-text search on ticket content

---

### 2. Collaboration Dispute System

#### User Flow
1. Creator/Brand navigates to collaboration details
2. Clicks "Open Dispute" button (only if collaboration active/completed)
3. Fills dispute form:
   - Dispute type (deliverable, payment, timeline, scope)
   - Description (required)
   - Requested resolution (text field)
   - Evidence upload (screenshots, files, links)
4. System auto-captures:
   - Campaign agreement details
   - Milestone status
   - Payment records
   - Message history between parties
5. Submits dispute → Receives dispute number
6. Both parties notified
7. Admin reviews and mediates
8. Admin proposes resolution
9. Parties accept or negotiate
10. Dispute resolved and closed

#### Admin Mediation Flow
1. Admin reviews dispute case
2. Views all evidence (uploaded + auto-captured)
3. Reviews conversation history
4. Contacts both parties for clarification
5. Proposes resolution:
   - Full refund
   - Partial refund
   - Require revision/redelivery
   - Release milestone payment
   - No action (dismiss dispute)
6. Logs resolution decision
7. Applies outcome (refund, payment release, etc.)
8. Closes dispute

#### Technical Requirements
- **Backend**: `/api/disputes` routes
- **Evidence Auto-Capture**: Query collaboration, milestones, payments on dispute creation
- **Admin Actions**: Refund processing, milestone release override
- **Notifications**: Both parties notified at each stage

---

### 3. Message Reporting Tool

#### User Flow
1. User receives inappropriate message
2. Clicks "Report Message" icon/button in message thread
3. Fills report form:
   - Report category (harassment, hate speech, scam, spam, fraud, abusive)
   - Additional details (optional)
4. Submits report
5. System captures:
   - Message content
   - Conversation context (3 messages before/after)
   - Timestamp
   - Both user profiles
6. Confirmation shown: "Report submitted. Our team will review within 24 hours."
7. If emergency keywords detected → Auto-escalate
8. Admin reviews and takes action
9. Reporter notified of outcome (action taken/dismissed)

#### Emergency Auto-Escalation
**Trigger Keywords**:
- Threats of violence: "kill", "hurt", "attack", "bomb"
- Severe harassment: "rape", explicit threats
- Scam indicators: "send money outside", "bank transfer WhatsApp"
- Hate speech: racial slurs, targeted abuse

**Auto Actions**:
- Immediate flag to admin dashboard
- Temporary messaging freeze for reported user (optional)
- Priority notification to admin team

#### Admin Review Flow
1. Admin sees report in queue (sorted by priority)
2. Reviews message content and context
3. Checks reported user's history (previous violations)
4. Decides action:
   - Issue warning
   - Restrict messaging (temp or permanent)
   - Suspend account
   - Dismiss (false report)
5. Logs decision and notifies both parties
6. If false report → Increment reporter's abuse tracking

#### Technical Requirements
- **Backend**: `/api/reports/messages` routes
- **Integration**: Messaging service must expose report endpoint
- **Auto-Detection**: Keyword matching for emergency escalation
- **Admin Tools**: Message context viewer, user history

---

### 4. Admin Moderation Dashboard

#### Dashboard Sections

**A. Overview Panel**
- Open tickets count
- Active disputes count
- Pending message reports count
- Safety escalations count
- Average response time
- Resolution rate (last 7/30 days)

**B. Ticket Queue**
- Table view with columns:
  - Ticket Number
  - User
  - Category
  - Subject
  - Status
  - Priority
  - Created Date
  - Assigned To
- Filters: Status, Category, Priority, Date Range, Assigned To
- Bulk actions: Assign, Close, Archive
- Click row → Opens ticket detail modal

**C. Dispute Cases**
- Table view with columns:
  - Dispute Number
  - Collaboration
  - Raised By
  - Against
  - Type
  - Status
  - Created Date
- Filters: Status, Type, Date Range
- Click row → Opens dispute mediation interface

**D. Message Reports**
- Table view with columns:
  - Report Number
  - Reporter
  - Reported User
  - Category
  - Status
  - Emergency Flag
  - Created Date
- Filters: Status, Category, Emergency
- Quick actions: View Message, Take Action

**E. Safety Escalations**
- High-priority queue for emergency cases
- Red badge for critical threats
- Auto-flagged items appear here
- Quick enforcement actions

**F. User Violations Log**
- Search by user
- View violation history
- See active restrictions
- Appeal review

**G. Analytics**
- Ticket volume trends
- Resolution time metrics
- Top issue categories
- User satisfaction (if feedback added)

#### Technical Requirements
- **Backend**: `/api/admin/moderation/*` routes
- **Frontend**: Admin-only protected routes
- **Real-time Updates**: WebSocket for new tickets/reports
- **Export**: CSV export for reporting

---

### 5. Enforcement Tools

#### Enforcement Actions

**A. Issue Warning**
- Creates violation record with severity "minor"
- Sends email notification to user
- No account restrictions
- Logged for future reference

**B. Restrict Messaging**
- User cannot send new messages
- Can only reply to existing conversations
- Duration: 7 days, 30 days, or permanent
- Lifted automatically or manually by admin

**C. Suspend Account**
- User cannot login
- All active collaborations paused
- Duration: 7 days, 30 days, or permanent
- Email notification sent
- Appeal process available

**D. Remove Account**
- Permanent ban
- All content hidden
- Wallet balance processed (refunded if applicable)
- Cannot create new account with same email
- Requires senior admin approval

**E. Restrict Campaign Participation**
- Creator cannot apply to campaigns
- Brand cannot create campaigns/briefs
- Duration: 7 days, 30 days, or permanent

**F. Limit Support Submissions**
- For support abuse
- User can only submit 1 ticket per week
- Duration: 30 days

#### Admin Enforcement Interface

**Modal: "Take Action Against User"**
- User details displayed
- Violation history shown
- Action selector dropdown
- Duration selector (if applicable)
- Reason field (required)
- Warning preview (what user will see)
- Confirm button

**Tracking**:
- All actions logged in `user_violations` table
- Admin who issued action recorded
- Automatic expiry for time-based restrictions
- Email sent to user with appeal instructions

#### Technical Requirements
- **Backend**: `/api/admin/enforcement/` routes
- **Violation Model**: Tracks all enforcement actions
- **Cron Job**: Auto-expire time-based restrictions
- **Email Templates**: For each enforcement type

---

## 🌐 API Endpoints

### Support Tickets

```
POST   /api/support/tickets                    - Create ticket
GET    /api/support/tickets                    - List user's tickets
GET    /api/support/tickets/:id                - Get ticket details
POST   /api/support/tickets/:id/messages       - Reply to ticket
POST   /api/support/tickets/:id/attachments    - Upload attachment
PUT    /api/support/tickets/:id/close          - Close ticket
PUT    /api/support/tickets/:id/reopen         - Reopen ticket

Admin endpoints:
GET    /api/admin/support/tickets              - List all tickets (filtered)
PUT    /api/admin/support/tickets/:id/assign   - Assign ticket
PUT    /api/admin/support/tickets/:id/status   - Update status
POST   /api/admin/support/tickets/:id/respond  - Admin response
PUT    /api/admin/support/tickets/:id/resolve  - Mark resolved
```

### Disputes

```
POST   /api/disputes                           - Create dispute
GET    /api/disputes                           - List user's disputes
GET    /api/disputes/:id                       - Get dispute details
POST   /api/disputes/:id/evidence              - Upload evidence
PUT    /api/disputes/:id/accept-resolution     - Accept resolution

Admin endpoints:
GET    /api/admin/disputes                     - List all disputes
PUT    /api/admin/disputes/:id/assign          - Assign to mediator
POST   /api/admin/disputes/:id/propose         - Propose resolution
PUT    /api/admin/disputes/:id/resolve         - Apply resolution
GET    /api/admin/disputes/:id/evidence        - View all evidence
```

### Message Reports

```
POST   /api/reports/messages                   - Report message
GET    /api/reports/messages                   - List user's reports
GET    /api/reports/messages/:id               - Get report status

Admin endpoints:
GET    /api/admin/reports/messages             - List all reports
PUT    /api/admin/reports/messages/:id/review  - Mark under review
POST   /api/admin/reports/messages/:id/action  - Take action
PUT    /api/admin/reports/messages/:id/dismiss - Dismiss report
```

### Violations & Enforcement

```
GET    /api/users/me/violations                - User's violation history
POST   /api/users/me/violations/:id/appeal     - Appeal violation

Admin endpoints:
POST   /api/admin/enforcement/warn             - Issue warning
POST   /api/admin/enforcement/restrict         - Restrict messaging
POST   /api/admin/enforcement/suspend          - Suspend account
POST   /api/admin/enforcement/remove           - Remove account
GET    /api/admin/violations                   - List all violations
GET    /api/admin/violations/user/:id          - User violation history
PUT    /api/admin/violations/:id/reverse       - Reverse violation
```

### Safety Escalations

```
Admin endpoints:
GET    /api/admin/safety/escalations           - List escalations
GET    /api/admin/safety/escalations/:id       - Get escalation details
PUT    /api/admin/safety/escalations/:id/resolve - Resolve escalation
```

### Support Abuse

```
Admin endpoints:
GET    /api/admin/abuse/users                  - Users flagged for abuse
GET    /api/admin/abuse/users/:id              - User abuse metrics
POST   /api/admin/abuse/users/:id/restrict     - Restrict submissions
```

---

## 🎨 Frontend Components

### User-Facing Pages

**1. Help Center** (`/help-center`)
```jsx
<HelpCenter>
  <PageHeader title="Help & Support" />
  <QuickActions>
    <SubmitTicketButton />
    <FAQLink />
  </QuickActions>
  <MyTicketsList />
</HelpCenter>
```

**2. Submit Ticket** (`/help-center/submit`)
```jsx
<SubmitTicketForm>
  <CategorySelector options={ticketCategories} />
  <SubjectInput />
  <DescriptionTextarea minLength={20} />
  <CollaborationSelector optional />
  <BookingSelector optional />
  <PaymentReferenceInput optional />
  <FileUploader maxFiles={5} maxSize="10MB" />
  <SubmitButton />
</SubmitTicketForm>
```

**3. My Tickets** (`/my-tickets`)
```jsx
<MyTickets>
  <TicketFilters status={['open', 'resolved']} />
  <TicketList>
    {tickets.map(ticket => (
      <TicketCard
        ticketNumber={ticket.ticket_number}
        subject={ticket.subject}
        status={ticket.status}
        lastUpdate={ticket.updated_at}
        onClick={() => navigate(`/tickets/${ticket.id}`)}
      />
    ))}
  </TicketList>
</MyTickets>
```

**4. Ticket Detail** (`/tickets/:id`)
```jsx
<TicketDetail>
  <TicketHeader
    ticketNumber={ticket.ticket_number}
    status={ticket.status}
    category={ticket.category}
  />
  <MessageThread messages={ticketMessages} />
  <ReplyForm onSubmit={handleReply} />
  <AttachmentUploader />
  <CloseTicketButton />
</TicketDetail>
```

**5. Open Dispute** (`/collaborations/:id/dispute`)
```jsx
<DisputeForm collaboration={collaboration}>
  <DisputeTypeSelector />
  <DescriptionTextarea />
  <RequestedResolutionInput />
  <EvidenceUploader />
  <AutoCapturedEvidence>
    <CampaignAgreement />
    <MilestoneStatus />
    <PaymentRecords />
  </AutoCapturedEvidence>
  <SubmitDisputeButton />
</DisputeForm>
```

**6. Report Message** (Modal in messaging interface)
```jsx
<ReportMessageModal message={message}>
  <CategorySelector options={reportCategories} />
  <AdditionalDetailsTextarea optional />
  <SubmitReportButton />
</ReportMessageModal>
```

---

### Admin Dashboard Pages

**7. Admin Moderation Dashboard** (`/admin/moderation`)
```jsx
<ModerationDashboard>
  <OverviewPanel metrics={dashboardMetrics} />

  <TabNavigation>
    <Tab name="Tickets" count={openTicketsCount} />
    <Tab name="Disputes" count={activeDisputesCount} />
    <Tab name="Reports" count={pendingReportsCount} />
    <Tab name="Escalations" count={escalationsCount} />
  </TabNavigation>

  <TicketQueuePanel>
    <FilterBar />
    <TicketTable onRowClick={openTicketModal} />
  </TicketQueuePanel>
</ModerationDashboard>
```

**8. Ticket Detail Modal (Admin View)**
```jsx
<AdminTicketModal ticket={ticket}>
  <TicketInfo />
  <UserInfo user={ticket.user} />
  <MessageThread messages={ticketMessages} />
  <AdminReplyForm />
  <ActionButtons>
    <AssignButton />
    <RequestInfoButton />
    <ResolveButton />
    <CloseButton />
  </ActionButtons>
  <ViolationHistory user={ticket.user} />
</AdminTicketModal>
```

**9. Dispute Mediation Interface** (`/admin/disputes/:id`)
```jsx
<DisputeMediation dispute={dispute}>
  <DisputeOverview />
  <PartiesInfo creator={creator} brand={brand} />
  <EvidenceViewer evidence={dispute.evidence} />
  <SystemEvidencePanel>
    <CampaignSnapshot />
    <MessageHistory />
    <PaymentHistory />
  </SystemEvidencePanel>
  <MediationActions>
    <ProposeResolutionForm />
    <RefundButton />
    <MilestoneReleaseButton />
    <DismissButton />
  </MediationActions>
  <ResolutionLog />
</DisputeMediation>
```

**10. Message Report Review** (`/admin/reports/:id`)
```jsx
<MessageReportReview report={report}>
  <ReportInfo />
  <ReportedUserInfo user={report.reported_user} />
  <MessageContext
    message={report.message}
    contextBefore={3}
    contextAfter={3}
  />
  <ViolationHistory user={report.reported_user} />
  <ActionPanel>
    <IssueWarningButton />
    <RestrictMessagingButton />
    <SuspendAccountButton />
    <DismissReportButton />
  </ActionPanel>
</MessageReportReview>
```

**11. Enforcement Action Modal**
```jsx
<EnforcementActionModal user={user}>
  <UserSummary />
  <ViolationHistory violations={user.violations} />
  <ActionSelector options={enforcementActions} />
  <DurationSelector conditional />
  <ReasonTextarea required />
  <NotificationPreview />
  <ConfirmActionButton />
</EnforcementActionModal>
```

---

## 🔒 Security & Compliance

### Data Protection
- Encrypt sensitive evidence files at rest
- Redact personal information in admin logs
- Auto-delete resolved tickets after 2 years (GDPR compliance)
- User can request data export (GDPR right to access)

### Access Control
- JWT authentication for all endpoints
- Role-based access: `user`, `admin`, `moderator`
- Admins can only view tickets/disputes they're assigned to (unless super admin)
- Audit log all admin actions

### Rate Limiting
- Max 5 ticket submissions per day per user
- Max 2 disputes per collaboration
- Max 10 message reports per day per user
- IP-based rate limiting on submission endpoints

### Abuse Prevention
- Detect duplicate ticket submissions (same subject/description)
- Flag users with >5 false reports in 30 days
- Auto-restrict users with 3+ dismissed reports
- Captcha on ticket submission for high-frequency users

---

## 🧪 Testing Strategy

### Unit Tests
- Ticket creation and validation
- Dispute evidence auto-capture
- Enforcement action application
- Support abuse detection logic
- Email notification sending

### Integration Tests
- End-to-end ticket submission flow
- Dispute resolution workflow
- Message report → enforcement action
- Admin assignment and routing

### User Acceptance Testing
- Creator submits ticket for payment issue
- Brand opens dispute for missed deadline
- User reports harassing message
- Admin mediates dispute and applies refund
- User appeals account suspension

### Performance Tests
- 1000 concurrent ticket submissions
- Large file upload (evidence attachments)
- Admin dashboard load with 10,000+ tickets
- Search performance on ticket descriptions

---

## 📊 Success Metrics

### User Metrics
- Average ticket resolution time (target: <24 hours)
- User satisfaction score (post-resolution survey)
- Dispute resolution rate (target: >80%)
- False report rate (target: <10%)

### Admin Metrics
- Admin response time (target: <2 hours)
- Ticket backlog size (target: <50 open tickets)
- Escalation handling time (target: <1 hour for critical)

### Platform Health
- Support abuse incidents (target: <5% of users)
- User violations issued (track trend)
- Repeat offender rate
- Appeal success rate

---

## 🚀 Deployment Checklist

### Phase 1 Go-Live
- [ ] Database migration executed on production
- [ ] All API endpoints tested and documented
- [ ] Frontend components deployed
- [ ] Email templates configured
- [ ] Admin accounts created with moderator role
- [ ] Help Center page linked in navigation
- [ ] Announcement sent to all users
- [ ] Monitoring and alerting configured

### Post-Launch
- [ ] Monitor ticket volume and response times
- [ ] Collect admin feedback on dashboard UX
- [ ] Iterate on ticket categorization
- [ ] Add FAQ articles based on common tickets
- [ ] Train admin team on dispute mediation
- [ ] Review and optimize enforcement policies

---

## 📝 Implementation Notes

### Design Philosophy Compliance
- All components follow BantuBuzz design system
- Cards: `rounded-3xl`, `shadow-sm`, `hover:shadow-md`
- Buttons: `rounded-full`, `bg-primary`, `text-dark`
- Icons: `bg-primary/10 rounded-full`, `text-primary`
- NO gradients (solid colors only)

### Backend Patterns
- Blueprint registration: `/api/support`, `/api/disputes`, `/api/admin/moderation`
- JWT protection on all endpoints
- File uploads to `/var/www/bantubuzz/backend/uploads/support/`
- Email service for notifications

### Frontend Patterns
- Protected routes for user pages (require login)
- Admin-only routes (require `is_admin=true`)
- React Hook Form for all forms
- Toast notifications for actions
- Loading states and error handling

---

## 🎯 Next Steps

1. **Review this plan** with stakeholders
2. **Create database migration files** for Phase 1 tables
3. **Set up backend blueprints** for support, disputes, reports
4. **Build ticket submission form** as first user-facing feature
5. **Create admin moderation dashboard** layout
6. **Deploy Phase 1 MVP** within 2 weeks
7. **Iterate based on user feedback**

---

**Document Status**: Draft v1.0
**Next Review**: After Phase 1 completion
**Maintained By**: BantuBuzz Development Team
