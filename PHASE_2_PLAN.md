# Phase 2: Core Platform Features - Implementation Plan

## Overview
Phase 2 builds on the authentication system from Phase 1 and implements the core marketplace features: profiles, packages, search, bookings, and payments.

---

## Phase 2 Goals

### Main Features
1. **Profile Management**
   - Creator profiles with portfolio, social stats, bio
   - Brand profiles with company info and verification
   - Profile editing and image uploads
   - Social media integration

2. **Package System**
   - Creators create service packages
   - Package types: post, story, video, sponsored content
   - Pricing and deliverable management
   - Package visibility controls

3. **Discovery & Search**
   - Browse all creators
   - Search by name, niche, platform
   - Filter by follower count, price range, engagement
   - Sort options (popular, recent, price)

4. **Booking System**
   - Brands book creator packages
   - Booking workflow (pending → accepted → completed)
   - Direct payment via Paynow
   - Booking history and status tracking

5. **Payment Integration**
   - Paynow Zimbabwe payment gateway
   - Direct payments (NO escrow)
   - Payment confirmation
   - Transaction history

---

## Current Status (Phase 1 Complete)

### ✅ Completed
- [x] Backend setup with Flask
- [x] Database models (all 10 models)
- [x] User authentication (JWT)
- [x] Dual registration (Creator/Brand)
- [x] OTP email verification
- [x] Login/logout functionality
- [x] Frontend setup with React
- [x] Routing and navigation
- [x] Auth pages and flow

### 📊 Database Schema (Already Created)
All models exist and are migrated:
- User
- CreatorProfile (with social stats fields)
- BrandProfile (with company info)
- Package (with pricing and deliverables)
- Campaign
- Booking (with status workflow)
- Message
- Notification
- SavedCreator
- Analytics
- OTP

---

## Phase 2 Implementation Plan

### **Part 1: Profile Management** (Highest Priority)

#### 1.1 Creator Profile Management
**Backend Tasks**:
- ✅ Routes already exist in `backend/app/routes/creators.py`
- Verify update profile endpoint works
- Add image upload handling (profile picture, portfolio)
- Implement social media stats validation

**Frontend Tasks**:
- Create Creator Profile Edit page
- Build profile form with all fields:
  - Display name
  - Bio (textarea)
  - Profile picture upload
  - Portfolio images (multiple)
  - Social media links (Instagram, TikTok, YouTube, Twitter)
  - Follower counts
  - Engagement rates
  - Niches/categories (checkboxes)
- Create Creator Public Profile view
- Add profile completion progress indicator

#### 1.2 Brand Profile Management
**Backend Tasks**:
- ✅ Routes already exist in `backend/app/routes/brands.py`
- Verify update profile endpoint works
- Add company logo upload

**Frontend Tasks**:
- Create Brand Profile Edit page
- Build profile form:
  - Company name
  - Industry
  - Description
  - Website
  - Logo upload
- Create Brand Public Profile view

---

### **Part 2: Package Management System**

#### 2.1 Creator Package Creation
**Backend Tasks**:
- ✅ Routes already exist in `backend/app/routes/packages.py`
- Verify CRUD operations work
- Add package validation
- Implement package status (active/inactive)

**Frontend Tasks**:
- Create Package Management page (Creator dashboard)
- Build package creation form:
  - Title
  - Description
  - Type (Post, Story, Video, Sponsored Content)
  - Platform (Instagram, TikTok, YouTube, Twitter)
  - Price
  - Deliverables (list)
  - Delivery time (days)
- Package list view with edit/delete
- Package preview card

#### 2.2 Package Display
**Frontend Tasks**:
- Create Packages browse page
- Package grid/list view
- Package detail page with full info
- "Book Now" button
- Creator info on package page

---

### **Part 3: Discovery & Search**

#### 3.1 Creator Discovery
**Backend Tasks**:
- ✅ Routes exist in `backend/app/routes/creators.py`
- Implement search query parameters
- Add filtering logic:
  - By niche/category
  - By platform
  - By follower range
  - By price range
- Add sorting options
- Pagination

**Frontend Tasks**:
- Create Browse Creators page
- Search bar with instant search
- Filter sidebar:
  - Niche checkboxes
  - Platform select
  - Follower range slider
  - Price range slider
- Creator card grid
- Sort dropdown (Popular, Recent, Price)
- Pagination controls

#### 3.2 Package Discovery
**Frontend Tasks**:
- Create Browse Packages page
- Similar filters as creator browse
- Package card grid
- Direct booking from browse page

---

### **Part 4: Booking System**

#### 4.1 Booking Creation
**Backend Tasks**:
- ✅ Routes exist in `backend/app/routes/bookings.py`
- Verify booking creation endpoint
- Add booking validation
- Implement booking status workflow
- Send notifications on booking events

**Frontend Tasks**:
- Create Booking Form modal/page
- Booking details:
  - Package info display
  - Campaign requirements (textarea)
  - Special requests
  - Confirm price
- Payment method selection (Paynow)
- Booking confirmation page

#### 4.2 Booking Management
**Backend Tasks**:
- Creator accept/decline endpoints
- Creator mark as completed
- Brand mark as completed
- Status update notifications

**Frontend Tasks**:
- Creator: Booking requests view
- Creator: Accept/Decline buttons
- Creator: Mark as completed
- Brand: Booking history
- Brand: Track booking status
- Booking detail page
- Status timeline visual

---

### **Part 5: Payment Integration (Paynow)**

#### 5.1 Paynow Setup
**Backend Tasks**:
- ✅ Paynow service exists in `backend/app/services/payment_service.py`
- Get Paynow credentials (Integration ID, Integration Key)
- Configure Paynow in `.env`
- Implement payment initiation
- Implement payment verification/callback
- Update booking status after payment

**Frontend Tasks**:
- Payment button on booking form
- Redirect to Paynow
- Handle payment callback
- Show payment success/failure
- Payment receipt display

#### 5.2 Transaction History
**Backend Tasks**:
- Track all payments in database
- Get payment history endpoint

**Frontend Tasks**:
- Transaction history page
- Filter by date range
- Export transactions

---

## Implementation Order (Priority)

### Week 1: Profiles
1. Creator profile editing (backend + frontend)
2. Brand profile editing (backend + frontend)
3. Public profile views
4. Image upload functionality

### Week 2: Packages
1. Package creation/editing (backend + frontend)
2. Package management dashboard
3. Package browse page
4. Package detail page

### Week 3: Discovery
1. Creator search and filters
2. Package search and filters
3. Sort and pagination
4. Saved creators feature

### Week 4: Bookings
1. Booking creation flow
2. Booking management (accept/decline)
3. Booking status tracking
4. Booking history

### Week 5: Payments
1. Paynow integration
2. Payment flow
3. Payment confirmation
4. Transaction history

---

## Technical Requirements

### Backend
- Image upload handling (use `werkzeug` for file uploads)
- File storage (local or AWS S3)
- Paynow SDK integration
- Webhook endpoints for payment callbacks
- Email notifications for bookings

### Frontend
- File upload components
- Image preview
- Rich text editor for descriptions
- Form validation
- Loading states for all actions
- Error handling
- Success messages/toasts

### Environment Variables Needed
```env
# Paynow
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_RETURN_URL=http://localhost:5173/payment/callback
PAYNOW_RESULT_URL=http://localhost:5000/api/payments/callback

# File Upload
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216  # 16MB
ALLOWED_EXTENSIONS=png,jpg,jpeg,gif
```

---

## API Endpoints to Verify/Implement

### Creators
- [x] GET /api/creators - List all creators
- [x] GET /api/creators/:id - Get creator profile
- [x] PUT /api/creators/profile - Update own profile
- [ ] POST /api/creators/profile/image - Upload profile image
- [ ] POST /api/creators/portfolio - Upload portfolio images
- [ ] GET /api/creators/search - Search creators

### Packages
- [x] GET /api/packages - List all packages
- [x] GET /api/packages/:id - Get package details
- [x] POST /api/packages - Create package (creator only)
- [x] PUT /api/packages/:id - Update package
- [x] DELETE /api/packages/:id - Delete package
- [ ] GET /api/packages/search - Search packages

### Bookings
- [x] GET /api/bookings - Get user's bookings
- [x] GET /api/bookings/:id - Get booking details
- [x] POST /api/bookings - Create booking
- [x] PUT /api/bookings/:id/accept - Accept booking (creator)
- [x] PUT /api/bookings/:id/decline - Decline booking (creator)
- [x] PUT /api/bookings/:id/complete - Mark complete
- [ ] PUT /api/bookings/:id/cancel - Cancel booking

### Payments
- [ ] POST /api/payments/initiate - Initiate Paynow payment
- [ ] POST /api/payments/callback - Paynow webhook
- [ ] GET /api/payments/verify/:id - Verify payment status
- [ ] GET /api/payments/history - Get payment history

### Brands
- [x] GET /api/brands - List all brands
- [x] GET /api/brands/:id - Get brand profile
- [x] PUT /api/brands/profile - Update own profile
- [ ] POST /api/brands/profile/logo - Upload logo

---

## Testing Checklist

### Profile Management
- [ ] Creator can update profile with all fields
- [ ] Creator can upload profile picture
- [ ] Creator can add portfolio images
- [ ] Brand can update company info
- [ ] Brand can upload logo
- [ ] Public profiles display correctly

### Package System
- [ ] Creator can create packages
- [ ] Creator can edit packages
- [ ] Creator can delete packages
- [ ] Packages display on browse page
- [ ] Package details show correctly

### Search & Discovery
- [ ] Search creators by name works
- [ ] Filter by niche works
- [ ] Filter by follower count works
- [ ] Filter by price range works
- [ ] Sort options work
- [ ] Pagination works

### Booking System
- [ ] Brand can book a package
- [ ] Creator receives booking notification
- [ ] Creator can accept booking
- [ ] Creator can decline booking
- [ ] Booking status updates correctly
- [ ] Both parties can see booking history

### Payment Integration
- [ ] Payment initiates correctly
- [ ] Redirect to Paynow works
- [ ] Payment callback updates booking
- [ ] Payment confirmation shows
- [ ] Transaction history displays

---

## Next Immediate Steps

1. **Verify Backend Routes Work**
   - Test all existing API endpoints
   - Check if they return correct data
   - Fix any errors

2. **Start with Creator Profile Editing**
   - Frontend: Create profile edit page
   - Test profile update
   - Add image upload

3. **Then Package Creation**
   - Frontend: Create package form
   - Test package creation
   - Build package list

4. **Then Discovery**
   - Build browse pages
   - Add search/filter
   - Test with seed data

---

## Questions Before Starting

1. **Paynow Credentials**: Do you have Paynow Integration ID and Key?
2. **File Storage**: Local storage or AWS S3 for images?
3. **Image Sizes**: What are max file sizes for uploads?
4. **Categories/Niches**: What categories should creators choose from?
5. **Platforms**: Just Instagram, TikTok, YouTube, Twitter? Or more?

---

## Success Metrics for Phase 2

- [ ] 10+ creators with complete profiles
- [ ] 20+ packages created
- [ ] Search returns relevant results
- [ ] 5+ successful bookings
- [ ] 5+ successful payments via Paynow

---

**Ready to start Phase 2?** Let me know and I'll begin with creator profile management!

**Status**: Phase 1 ✅ Complete | Phase 2 📋 Ready to Start
**Date**: 2025-11-11
