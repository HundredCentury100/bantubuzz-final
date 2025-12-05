# BantuBuzz Platform - User Acceptance Testing (UAT) Documentation

**Version:** 1.0
**Date:** November 24, 2025
**Environment:** Production - http://173.212.245.22:8080
**Backend API:** http://173.212.245.22:8002

---

## Table of Contents
1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Accounts](#test-accounts)
4. [Feature Test Cases](#feature-test-cases)
   - [User Registration & Authentication](#1-user-registration--authentication)
   - [Creator Profile Management](#2-creator-profile-management)
   - [Package Management](#3-package-management)
   - [Brand Profile Management](#4-brand-profile-management)
   - [Campaign Management](#5-campaign-management)
   - [Creator Discovery & Browsing](#6-creator-discovery--browsing)
   - [Booking System](#7-booking-system)
   - [Payment Integration](#8-payment-integration)
   - [Messaging System](#9-messaging-system)
   - [Collaboration Management](#10-collaboration-management)
   - [Review & Rating System](#11-review--rating-system)
   - [Notifications](#12-notifications)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Known Limitations](#known-limitations)
7. [Bug Reporting](#bug-reporting)

---

## Overview

BantuBuzz is a two-sided marketplace platform connecting content creators with brands for collaborations and sponsored content. This document provides comprehensive test scenarios for User Acceptance Testing.

### Platform Architecture
- **Frontend:** React 18 + Vite (Port 8080)
- **Backend API:** Flask + SQLAlchemy (Port 8002)
- **Messaging Service:** Socket.IO (Port 3002)
- **Database:** PostgreSQL
- **Payment Gateway:** Paynow (Zimbabwe)

### User Types
1. **Creators** - Content creators who offer services through packages
2. **Brands** - Companies/businesses looking to collaborate with creators

---

## Test Environment Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Valid email address for testing
- Zimbabwean phone number for OTP verification
- Paynow account for payment testing (optional)

### Access URLs
- **Platform:** http://173.212.245.22:8080
- **API Documentation:** http://173.212.245.22:8002/api

---

## Test Accounts

### Pre-configured Test Accounts

#### Creator Account
```
Email: hundred@rapportech.africa
Password: [Contact Admin]
User Type: Creator
Status: Verified
```

#### Brand Account
```
Email: [To be created during testing]
Password: [User defined]
User Type: Brand
Status: Verified
```

**Note:** For comprehensive testing, create fresh accounts following the registration flows.

---

## Feature Test Cases

## 1. User Registration & Authentication

### 1.1 Creator Registration

**Test Case ID:** UAT-001
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to http://173.212.245.22:8080
2. Click "Get Started" or "Sign Up" button
3. Select "I'm a Creator" option
4. Fill in registration form:
   - Full Name: `Test Creator`
   - Email: `testcreator@example.com`
   - Phone: `+263771234567` (valid ZW number)
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
5. Click "Create Account"
6. Check email for OTP code
7. Enter OTP on verification page
8. Click "Verify"

#### Expected Results:
- ✓ Registration form validates all fields
- ✓ Email validation checks format
- ✓ Phone number accepts international format
- ✓ Password strength indicator shows
- ✓ OTP sent to email within 2 minutes
- ✓ OTP verification succeeds
- ✓ Redirected to creator profile setup page
- ✓ User status changes to "verified"

#### Negative Test Scenarios:
- ❌ Duplicate email shows error
- ❌ Weak password rejected
- ❌ Invalid phone format rejected
- ❌ Expired OTP (>10 minutes) rejected
- ❌ Wrong OTP shows error message

---

### 1.2 Brand Registration

**Test Case ID:** UAT-002
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to registration page
2. Select "I'm a Brand" option
3. Fill in registration form:
   - Company Name: `Test Brand Co`
   - Email: `testbrand@example.com`
   - Phone: `+263777654321`
   - Password: `BrandPass123!`
   - Confirm Password: `BrandPass123!`
4. Complete OTP verification
5. Proceed to brand profile setup

#### Expected Results:
- ✓ Brand-specific registration form displays
- ✓ Company name field available
- ✓ OTP verification process works
- ✓ Redirected to brand profile setup
- ✓ Account created with brand user type

---

### 1.3 User Login

**Test Case ID:** UAT-003
**Priority:** High
**Estimated Time:** 2 minutes

#### Test Steps:
1. Navigate to login page
2. Enter email: `testcreator@example.com`
3. Enter password: `TestPass123!`
4. Click "Login"

#### Expected Results:
- ✓ Valid credentials grant access
- ✓ JWT token stored in localStorage
- ✓ Redirected to appropriate dashboard (creator/brand)
- ✓ User session persists on page refresh
- ✓ "Remember me" option works (if available)

#### Negative Scenarios:
- ❌ Wrong password shows error
- ❌ Non-existent email shows error
- ❌ Unverified account prompts OTP verification

---

### 1.4 Password Reset

**Test Case ID:** UAT-004
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Click "Forgot Password" on login page
2. Enter registered email
3. Check email for reset link
4. Click reset link
5. Enter new password
6. Confirm new password
7. Submit password reset
8. Login with new password

#### Expected Results:
- ✓ Reset email sent within 2 minutes
- ✓ Reset link valid for 1 hour
- ✓ Password successfully updated
- ✓ Can login with new password
- ✓ Old password no longer works

---

## 2. Creator Profile Management

### 2.1 Complete Creator Profile

**Test Case ID:** UAT-005
**Priority:** High
**Estimated Time:** 10 minutes

#### Test Steps:
1. Login as creator
2. Navigate to Profile Setup/Edit
3. Fill in profile details:
   - Display Name: `Creative Chris`
   - Bio: `Professional content creator specializing in lifestyle and tech`
   - Location: `Harare, Zimbabwe`
   - Category: `Lifestyle`
   - Niches: `Fashion`, `Travel`, `Photography`
4. Add social media links:
   - Instagram: `@creativechris`
   - TikTok: `@creativechris`
   - YouTube: `Creative Chris Channel`
   - Facebook: `creativechris`
5. Add portfolio items:
   - Upload 3-5 sample images
   - Add descriptions
6. Set hourly rate: `$50`
7. Upload profile picture
8. Upload cover photo
9. Click "Save Profile"

#### Expected Results:
- ✓ All form fields save correctly
- ✓ Images upload successfully (max 5MB)
- ✓ Social media links validated
- ✓ Profile visible to brands after saving
- ✓ Profile completion percentage updates
- ✓ Profile appears in creator search results

#### Data Validation:
- Profile picture: JPG/PNG, max 5MB
- Cover photo: JPG/PNG, max 5MB
- Portfolio images: JPG/PNG, max 5MB each
- Bio: max 500 characters
- Social links: valid URL format

---

### 2.2 Edit Creator Profile

**Test Case ID:** UAT-006
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to Profile Edit page
2. Modify bio text
3. Change hourly rate
4. Add new portfolio item
5. Update social media link
6. Save changes
7. View public profile to verify changes

#### Expected Results:
- ✓ Changes reflected immediately
- ✓ Previous data not lost
- ✓ Updated profile visible to brands
- ✓ Image uploads work correctly

---

## 3. Package Management

### 3.1 Create Service Package

**Test Case ID:** UAT-007
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Login as creator
2. Navigate to "My Packages" or "Services"
3. Click "Create Package"
4. Fill in package details:
   - Package Name: `Instagram Sponsored Post`
   - Description: `One sponsored Instagram post with story mentions`
   - Price: `$100`
   - Duration: `3 days`
   - Deliverables:
     - `1 Instagram Feed Post`
     - `3 Instagram Stories`
     - `Post analytics report`
5. Upload package cover image
6. Set availability: `Available`
7. Click "Create Package"

#### Expected Results:
- ✓ Package created successfully
- ✓ Package appears in creator's package list
- ✓ Package visible to brands
- ✓ Package searchable/filterable
- ✓ Cover image displays correctly
- ✓ Price formatted properly

---

### 3.2 Create Multiple Package Tiers

**Test Case ID:** UAT-008
**Priority:** Medium
**Estimated Time:** 15 minutes

#### Test Steps:
1. Create Bronze Package:
   - Name: `Bronze - Single Post`
   - Price: `$50`
   - Deliverables: `1 post`
2. Create Silver Package:
   - Name: `Silver - Post + Stories`
   - Price: `$100`
   - Deliverables: `1 post + 3 stories`
3. Create Gold Package:
   - Name: `Gold - Full Campaign`
   - Price: `$250`
   - Deliverables: `3 posts + 10 stories + Reel`

#### Expected Results:
- ✓ All packages created successfully
- ✓ Packages display in order
- ✓ Price comparison visible
- ✓ Brands can view all tiers

---

### 3.3 Edit Package

**Test Case ID:** UAT-009
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to package list
2. Click "Edit" on existing package
3. Update price to `$120`
4. Add deliverable: `Content rights`
5. Change duration to `5 days`
6. Save changes

#### Expected Results:
- ✓ Changes saved successfully
- ✓ Updated details visible to brands
- ✓ Existing bookings not affected
- ✓ New bookings use updated price

---

### 3.4 Delete/Deactivate Package

**Test Case ID:** UAT-010
**Priority:** Low
**Estimated Time:** 3 minutes

#### Test Steps:
1. Select package to remove
2. Click "Delete" or "Deactivate"
3. Confirm action
4. Verify package no longer visible to brands

#### Expected Results:
- ✓ Package hidden from public view
- ✓ Active bookings continue normally
- ✓ Package can be reactivated later

---

## 4. Brand Profile Management

### 4.1 Complete Brand Profile

**Test Case ID:** UAT-011
**Priority:** High
**Estimated Time:** 10 minutes

#### Test Steps:
1. Login as brand
2. Navigate to Profile Setup/Edit
3. Fill in company details:
   - Company Name: `TechBrand Ltd`
   - Industry: `Technology`
   - Company Size: `50-100 employees`
   - Description: `Leading tech company in Zimbabwe`
   - Website: `https://techbrand.co.zw`
   - Location: `Harare, Zimbabwe`
4. Upload company logo
5. Upload cover image
6. Add social media profiles
7. Set contact information:
   - Contact Person: `John Doe`
   - Email: `partnerships@techbrand.co.zw`
   - Phone: `+263771234567`
8. Save profile

#### Expected Results:
- ✓ Profile saved successfully
- ✓ Logo displayed correctly
- ✓ Profile visible to creators
- ✓ Contact details validated
- ✓ Company appears professional

---

### 4.2 Edit Brand Profile

**Test Case ID:** UAT-012
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Edit company description
2. Update logo image
3. Change contact person
4. Add new social media link
5. Save changes

#### Expected Results:
- ✓ All changes reflected
- ✓ Previous campaigns not affected
- ✓ Updated info visible to creators

---

## 5. Campaign Management

### 5.1 Create New Campaign

**Test Case ID:** UAT-013
**Priority:** High
**Estimated Time:** 12 minutes

#### Test Steps:
1. Login as brand
2. Navigate to "Campaigns" section
3. Click "Create Campaign"
4. Fill in campaign details:
   - Campaign Name: `Summer Product Launch`
   - Description: `Promoting our new summer collection`
   - Category: `Fashion & Style`
   - Budget: `$2000`
   - Start Date: `[Next Week]`
   - End Date: `[+30 days]`
   - Target Audience:
     - Age: `18-35`
     - Gender: `All`
     - Location: `Zimbabwe`
   - Required Deliverables:
     - `5 Instagram posts`
     - `10 Instagram stories`
     - `2 TikTok videos`
   - Campaign Objectives: `Brand awareness, Product promotion`
5. Upload campaign brief document
6. Set campaign status: `Open for Applications`
7. Click "Create Campaign"

#### Expected Results:
- ✓ Campaign created successfully
- ✓ Campaign visible in brand dashboard
- ✓ Campaign appears in creator's browse campaigns
- ✓ Budget calculation correct
- ✓ Dates validated (end > start)
- ✓ File upload works (PDF, DOC)

---

### 5.2 Edit Campaign

**Test Case ID:** UAT-014
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Open existing campaign
2. Click "Edit Campaign"
3. Update budget to `$2500`
4. Extend end date by 7 days
5. Add deliverable: `1 YouTube video`
6. Save changes

#### Expected Results:
- ✓ Changes saved successfully
- ✓ Existing applications not affected
- ✓ Updated details visible to creators
- ✓ Notifications sent to applied creators

---

### 5.3 Manage Campaign Applications

**Test Case ID:** UAT-015
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Open campaign with applications
2. View list of applicants
3. Review creator profiles
4. Check creator's previous work
5. Accept one application
6. Reject one application with reason
7. Keep one application pending

#### Expected Results:
- ✓ All applications displayed
- ✓ Creator details accessible
- ✓ Accept/reject actions work
- ✓ Notifications sent to creators
- ✓ Status updates reflected
- ✓ Can view rejection reason

---

### 5.4 Close/Complete Campaign

**Test Case ID:** UAT-016
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to active campaign
2. Click "Mark as Complete"
3. Confirm completion
4. Verify campaign status changes

#### Expected Results:
- ✓ Campaign marked completed
- ✓ No longer accepts applications
- ✓ Visible in campaign history
- ✓ Associated collaborations continue

---

## 6. Creator Discovery & Browsing

### 6.1 Browse All Creators

**Test Case ID:** UAT-017
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Login as brand
2. Navigate to "Browse Creators" or "Find Creators"
3. View list of available creators
4. Scroll through results
5. Click on creator card to view profile

#### Expected Results:
- ✓ Creators displayed in grid/list view
- ✓ Profile pictures load correctly
- ✓ Basic info visible (name, category, rate)
- ✓ Can navigate to full profile
- ✓ Loading pagination works

---

### 6.2 Filter Creators

**Test Case ID:** UAT-018
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Apply filters:
   - Category: `Lifestyle`
   - Location: `Harare`
   - Price Range: `$50 - $150`
   - Platform: `Instagram`
2. Click "Apply Filters"
3. Verify filtered results
4. Clear filters
5. Apply different filter combination

#### Expected Results:
- ✓ Filters work correctly
- ✓ Results match filter criteria
- ✓ Clear filters resets view
- ✓ Multiple filters can be combined
- ✓ No results message displays appropriately

---

### 6.3 Search Creators

**Test Case ID:** UAT-019
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Use search bar
2. Search by: `Fashion`
3. View results
4. Search by creator name
5. Search by niche: `Travel`

#### Expected Results:
- ✓ Search returns relevant results
- ✓ Search by name works
- ✓ Search by keyword works
- ✓ Search by niche works
- ✓ Auto-suggestions appear (if implemented)

---

### 6.4 Save/Favorite Creators

**Test Case ID:** UAT-020
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Browse creators
2. Click "Save" or heart icon on 3 creators
3. Navigate to "Saved Creators"
4. View saved list
5. Remove one creator from saved list

#### Expected Results:
- ✓ Save action immediate
- ✓ Saved creators list accessible
- ✓ Can remove from saved list
- ✓ Saved status persists

---

### 6.5 View Creator Public Profile

**Test Case ID:** UAT-021
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Click on creator profile
2. View profile sections:
   - About/Bio
   - Portfolio
   - Services/Packages
   - Social Media Stats
   - Reviews/Ratings
   - Past Collaborations
3. Check social media links
4. View package details

#### Expected Results:
- ✓ Profile loads completely
- ✓ All sections visible
- ✓ Images display correctly
- ✓ Social links clickable
- ✓ Packages list displayed
- ✓ Reviews/ratings visible

---

## 7. Booking System

### 7.1 Book Creator Package

**Test Case ID:** UAT-022
**Priority:** High
**Estimated Time:** 10 minutes

#### Test Steps:
1. Login as brand
2. Browse creators
3. Select creator profile
4. View available packages
5. Click "Book Now" on desired package
6. Fill in booking details:
   - Start Date: `[Future date]`
   - Special Requirements: `Product shots needed`
   - Campaign Brief: `Summer campaign guidelines`
7. Review booking summary
8. Click "Proceed to Payment"
9. Complete payment (next test case)

#### Expected Results:
- ✓ Package details displayed correctly
- ✓ Booking form validates dates
- ✓ Total price calculated correctly
- ✓ Special requirements field accepts text
- ✓ Booking summary accurate
- ✓ Redirects to payment page

---

### 7.2 View Booking Details

**Test Case ID:** UAT-023
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to "My Bookings"
2. View list of all bookings
3. Click on specific booking
4. Review booking details:
   - Creator info
   - Package details
   - Payment status
   - Delivery status
   - Messages/communications
5. Download invoice (if available)

#### Expected Results:
- ✓ All bookings listed
- ✓ Status badges displayed (pending, active, completed)
- ✓ Booking details complete
- ✓ Payment info accurate
- ✓ Invoice downloadable

---

### 7.3 Cancel Booking

**Test Case ID:** UAT-024
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Open pending booking
2. Click "Cancel Booking"
3. Select cancellation reason
4. Add cancellation note
5. Confirm cancellation
6. Check refund status (if applicable)

#### Expected Results:
- ✓ Cancellation processed
- ✓ Creator notified
- ✓ Refund initiated (per policy)
- ✓ Status updated to "Cancelled"
- ✓ Cancellation reason recorded

---

### 7.4 Creator: Accept/Reject Booking

**Test Case ID:** UAT-025
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Login as creator
2. Navigate to "Bookings" or notifications
3. View new booking request
4. Review brand details
5. Review booking requirements
6. Click "Accept" or "Decline"
7. If declining, provide reason

#### Expected Results:
- ✓ Booking request notification received
- ✓ Brand details visible
- ✓ Accept/decline options available
- ✓ Brand notified of decision
- ✓ Booking status updated
- ✓ Collaboration created (if accepted)

---

## 8. Payment Integration

### 8.1 Complete Paynow Payment

**Test Case ID:** UAT-026
**Priority:** High
**Estimated Time:** 10 minutes

#### Test Steps:
1. Complete booking flow
2. Arrive at payment page
3. Review payment summary:
   - Package price
   - Platform fee
   - Total amount
4. Select Paynow payment method
5. Click "Pay with Paynow"
6. Complete Paynow flow:
   - Enter phone number
   - Confirm on mobile device
   - Enter PIN
7. Wait for payment confirmation
8. Return to BantuBuzz platform

#### Expected Results:
- ✓ Paynow integration loads
- ✓ Payment amount correct
- ✓ Payment successful
- ✓ Confirmation received
- ✓ Redirected back to platform
- ✓ Payment status updated to "Paid"
- ✓ Creator notified of payment
- ✓ Funds held in escrow

---

### 8.2 Payment Failure Handling

**Test Case ID:** UAT-027
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Initiate payment
2. Cancel Paynow payment
3. Return to platform
4. View payment status
5. Attempt retry payment

#### Expected Results:
- ✓ Failure detected
- ✓ Booking status remains "Pending Payment"
- ✓ Error message displayed
- ✓ Retry option available
- ✓ Booking not cancelled
- ✓ Can retry with different method

---

### 8.3 View Payment History

**Test Case ID:** UAT-028
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to "Payments" or "Transactions"
2. View payment history list
3. Filter by date range
4. Filter by status (completed, pending, failed)
5. Download payment receipt

#### Expected Results:
- ✓ All transactions listed
- ✓ Transaction details accurate
- ✓ Filters work correctly
- ✓ Receipts downloadable
- ✓ Balance/total displayed

---

### 8.4 Creator: Withdraw Earnings

**Test Case ID:** UAT-029
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Login as creator
2. Navigate to "Earnings" or "Wallet"
3. View available balance
4. Click "Withdraw Funds"
5. Enter withdrawal details:
   - Amount: `$100`
   - Paynow Phone: `+263771234567`
   - Confirm details
6. Submit withdrawal request
7. Check withdrawal status

#### Expected Results:
- ✓ Current balance displayed
- ✓ Withdrawal form validates
- ✓ Minimum withdrawal enforced ($10)
- ✓ Request submitted successfully
- ✓ Balance updated
- ✓ Withdrawal pending approval
- ✓ Notification received
- ✓ Transaction history updated

---

## 9. Messaging System

### 9.1 Send Direct Message

**Test Case ID:** UAT-030
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Login as brand
2. Navigate to creator profile
3. Click "Send Message"
4. Type message: `Hi, I'm interested in your Instagram package`
5. Click "Send"
6. Wait for message to appear in chat
7. Send follow-up message

#### Expected Results:
- ✓ Message composer opens
- ✓ Message sent successfully
- ✓ Message appears in chat immediately
- ✓ Timestamp displayed
- ✓ Read status indicated
- ✓ Creator receives notification

---

### 9.2 Receive and Reply to Message

**Test Case ID:** UAT-031
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Login as creator
2. View message notification
3. Navigate to Messages/Inbox
4. Open conversation
5. Read message from brand
6. Type reply: `Thanks for reaching out! Let's discuss the details.`
7. Send reply
8. Attach file/image (if supported)

#### Expected Results:
- ✓ Notification received
- ✓ Unread badge displayed
- ✓ Message thread loads
- ✓ Previous messages visible
- ✓ Reply sent successfully
- ✓ File attachment works
- ✓ Brand receives notification

---

### 9.3 Real-time Messaging

**Test Case ID:** UAT-032
**Priority:** High
**Estimated Time:** 10 minutes

#### Test Steps:
1. Open two browser windows
2. Login as brand in window 1
3. Login as creator in window 2
4. Brand sends message
5. Verify creator receives instantly (no refresh)
6. Creator replies
7. Verify brand receives instantly
8. Continue conversation

#### Expected Results:
- ✓ Messages appear without refresh
- ✓ Typing indicator shows (if implemented)
- ✓ Online status visible (if implemented)
- ✓ Messages delivered instantly
- ✓ No message loss
- ✓ Conversation synced across devices

---

### 9.4 View Message History

**Test Case ID:** UAT-033
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to Messages
2. View list of conversations
3. Identify unread conversations
4. Open old conversation
5. Scroll through message history
6. Search messages (if available)

#### Expected Results:
- ✓ All conversations listed
- ✓ Unread count accurate
- ✓ Last message preview visible
- ✓ Timestamps correct
- ✓ History loads completely
- ✓ Search works (if implemented)

---

### 9.5 Send Booking Message

**Test Case ID:** UAT-034
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. In booking context
2. Open booking details
3. Click "Message Creator/Brand"
4. Send booking-related message
5. Verify message linked to booking

#### Expected Results:
- ✓ Message sent from booking context
- ✓ Booking reference included
- ✓ Quick access to booking details
- ✓ Separate from general messages (or properly categorized)

---

## 10. Collaboration Management

### 10.1 View Active Collaborations

**Test Case ID:** UAT-035
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Login as brand or creator
2. Navigate to "Collaborations"
3. View list of active collaborations
4. Filter by status (in progress, pending, completed)
5. Click on collaboration for details

#### Expected Results:
- ✓ All collaborations listed
- ✓ Status badges displayed
- ✓ Basic info visible (partner, package, dates)
- ✓ Filters work correctly
- ✓ Details page loads

---

### 10.2 Update Collaboration Status

**Test Case ID:** UAT-036
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Open collaboration as creator
2. View deliverables list
3. Upload deliverable:
   - Click "Upload Deliverable"
   - Select file (image/video/document)
   - Add description
   - Submit
4. Mark deliverable as completed
5. Update collaboration status to "Awaiting Review"

#### Expected Results:
- ✓ Upload successful
- ✓ File stored correctly
- ✓ Brand notified
- ✓ Status updated
- ✓ Progress indicator updated

---

### 10.3 Brand Review Deliverables

**Test Case ID:** UAT-037
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Login as brand
2. Open collaboration with deliverables
3. View submitted work
4. Download deliverable files
5. Choose action:
   - **Option A:** Approve deliverable
   - **Option B:** Request revision with feedback
6. Submit review

#### Expected Results:
- ✓ Deliverables viewable/downloadable
- ✓ Approve option works
- ✓ Request revision works
- ✓ Feedback field available
- ✓ Creator notified of decision
- ✓ Status updated accordingly

---

### 10.4 Complete Collaboration

**Test Case ID:** UAT-038
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. All deliverables approved
2. Brand clicks "Mark as Complete"
3. Confirm completion
4. Payment released to creator
5. Review prompt appears

#### Expected Results:
- ✓ Collaboration marked completed
- ✓ Payment released from escrow
- ✓ Creator receives payment notification
- ✓ Review option presented
- ✓ Collaboration archived

---

### 10.5 Handle Collaboration Dispute

**Test Case ID:** UAT-039
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Open collaboration
2. Click "Report Issue" or "Raise Dispute"
3. Select issue type
4. Describe problem
5. Submit dispute
6. Check dispute status

#### Expected Results:
- ✓ Dispute form accessible
- ✓ Issue types listed
- ✓ Submission successful
- ✓ Admin notified
- ✓ Status shows "Under Review"
- ✓ Both parties notified

---

## 11. Review & Rating System

### 11.1 Submit Creator Review (Brand)

**Test Case ID:** UAT-040
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Complete collaboration
2. Navigate to "Leave Review" (from notification or collaboration page)
3. Rate creator on:
   - Overall: `5 stars`
   - Communication: `5 stars`
   - Quality: `5 stars`
   - Timeliness: `4 stars`
   - Professionalism: `5 stars`
4. Write review text:
   ```
   Excellent work! Creative Chris delivered high-quality content
   that exceeded our expectations. Professional and easy to work with.
   Would definitely collaborate again!
   ```
5. Add photos (optional)
6. Submit review

#### Expected Results:
- ✓ Rating stars interactive
- ✓ Text field validates (min/max length)
- ✓ Photo upload works
- ✓ Review submitted successfully
- ✓ Creator notified
- ✓ Review appears on creator profile
- ✓ Average rating updated

---

### 11.2 Submit Brand Review (Creator)

**Test Case ID:** UAT-041
**Priority:** High
**Estimated Time:** 8 minutes

#### Test Steps:
1. Complete collaboration
2. Navigate to review form
3. Rate brand on:
   - Overall: `5 stars`
   - Communication: `5 stars`
   - Payment: `5 stars`
   - Brief Clarity: `4 stars`
4. Write review:
   ```
   Great brand to work with! Clear communication and
   prompt payment. Would love to work together again.
   ```
5. Submit review

#### Expected Results:
- ✓ Review form displays
- ✓ Rating submitted
- ✓ Review text saved
- ✓ Brand notified
- ✓ Review visible on brand profile
- ✓ Reputation score updated

---

### 11.3 View Reviews

**Test Case ID:** UAT-042
**Priority:** Medium
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to creator/brand profile
2. Scroll to Reviews section
3. View list of reviews
4. Check review details:
   - Reviewer name
   - Rating
   - Date
   - Review text
   - Photos
5. Filter/sort reviews (if available)

#### Expected Results:
- ✓ All reviews displayed
- ✓ Average rating calculated correctly
- ✓ Review count accurate
- ✓ Most recent reviews first
- ✓ Photos display in reviews
- ✓ Pagination works (if many reviews)

---

### 11.4 Respond to Review

**Test Case ID:** UAT-043
**Priority:** Low
**Estimated Time:** 5 minutes

#### Test Steps:
1. View review on your profile
2. Click "Respond" or "Reply"
3. Write response:
   ```
   Thank you for the kind words! It was a pleasure
   working with you on this project.
   ```
4. Submit response
5. Verify response appears under review

#### Expected Results:
- ✓ Response option available
- ✓ Response saved
- ✓ Reviewer notified
- ✓ Response visible publicly
- ✓ Can edit response later

---

### 11.5 Report Inappropriate Review

**Test Case ID:** UAT-044
**Priority:** Low
**Estimated Time:** 3 minutes

#### Test Steps:
1. View inappropriate review
2. Click "Report" or flag icon
3. Select reason: `Inappropriate content`
4. Add details
5. Submit report

#### Expected Results:
- ✓ Report submitted
- ✓ Admin notified
- ✓ Review flagged for review
- ✓ Confirmation message shown

---

## 12. Notifications

### 12.1 Receive System Notifications

**Test Case ID:** UAT-045
**Priority:** High
**Estimated Time:** 5 minutes

#### Test Steps:
1. Trigger various notification events:
   - New booking
   - Payment received
   - Message received
   - Review submitted
   - Campaign application
2. Check notification bell icon
3. Click to view notifications
4. Click on notification to navigate

#### Expected Results:
- ✓ Notification badge displays count
- ✓ Notifications list shows all
- ✓ Unread notifications highlighted
- ✓ Clicking notification navigates correctly
- ✓ Notifications marked as read
- ✓ Timestamps displayed

---

### 12.2 Email Notifications

**Test Case ID:** UAT-046
**Priority:** Medium
**Estimated Time:** 10 minutes

#### Test Steps:
1. Trigger notification event
2. Check email inbox
3. Verify email received
4. Check email content:
   - Subject line
   - Body text
   - Action buttons/links
   - Unsubscribe link
5. Click email link to return to platform

#### Expected Results:
- ✓ Email received within 5 minutes
- ✓ Email properly formatted
- ✓ Content accurate
- ✓ Links work correctly
- ✓ Branding consistent
- ✓ Unsubscribe option available

---

### 12.3 Notification Preferences

**Test Case ID:** UAT-047
**Priority:** Low
**Estimated Time:** 5 minutes

#### Test Steps:
1. Navigate to Settings
2. Find Notification Preferences
3. Toggle notification types:
   - Email notifications
   - Push notifications
   - SMS notifications
   - In-app notifications
4. Select notification events:
   - New messages
   - Booking updates
   - Payment notifications
   - Review notifications
5. Save preferences

#### Expected Results:
- ✓ Preferences page accessible
- ✓ All options displayed
- ✓ Toggles work correctly
- ✓ Changes saved
- ✓ Notifications respect preferences

---

## API Endpoints Reference

### Authentication Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh-token
```

### User Endpoints

```
GET /api/users/me
PUT /api/users/me
GET /api/users/:id
DELETE /api/users/me
```

### Creator Endpoints

```
GET /api/creators
GET /api/creators/:id
PUT /api/creators/profile
POST /api/creators/portfolio
DELETE /api/creators/portfolio/:id
GET /api/creators/search
```

### Package Endpoints

```
GET /api/packages
GET /api/packages/:id
POST /api/packages
PUT /api/packages/:id
DELETE /api/packages/:id
GET /api/creators/:id/packages
```

### Brand Endpoints

```
GET /api/brands/:id
PUT /api/brands/profile
GET /api/brands/search
```

### Campaign Endpoints

```
GET /api/campaigns
GET /api/campaigns/:id
POST /api/campaigns
PUT /api/campaigns/:id
DELETE /api/campaigns/:id
POST /api/campaigns/:id/apply
GET /api/campaigns/:id/applications
PUT /api/campaigns/:id/applications/:applicationId
```

### Booking Endpoints

```
GET /api/bookings
GET /api/bookings/:id
POST /api/bookings
PUT /api/bookings/:id
DELETE /api/bookings/:id
PUT /api/bookings/:id/accept
PUT /api/bookings/:id/reject
PUT /api/bookings/:id/cancel
```

### Payment Endpoints

```
POST /api/payments/initiate
GET /api/payments/:id/status
POST /api/payments/paynow/callback
GET /api/payments/history
POST /api/payments/withdraw
```

### Messaging Endpoints

```
GET /api/messages/conversations
GET /api/messages/conversations/:id
POST /api/messages
PUT /api/messages/:id/read
DELETE /api/messages/:id
```

### Collaboration Endpoints

```
GET /api/collaborations
GET /api/collaborations/:id
PUT /api/collaborations/:id
POST /api/collaborations/:id/deliverables
PUT /api/collaborations/:id/deliverables/:deliverableId
PUT /api/collaborations/:id/complete
POST /api/collaborations/:id/dispute
```

### Review Endpoints

```
GET /api/reviews
GET /api/reviews/:userId
POST /api/reviews
PUT /api/reviews/:id
DELETE /api/reviews/:id
POST /api/reviews/:id/respond
POST /api/reviews/:id/report
```

### Notification Endpoints

```
GET /api/notifications
PUT /api/notifications/:id/read
PUT /api/notifications/read-all
DELETE /api/notifications/:id
GET /api/notifications/preferences
PUT /api/notifications/preferences
```

---

## Known Limitations

### Current Known Issues

1. **Image Upload Size**
   - Maximum file size: 5MB
   - Larger files will be rejected
   - Consider compressing images before upload

2. **Browser Compatibility**
   - Optimized for Chrome, Firefox, Safari, Edge
   - Internet Explorer not supported
   - Some features may not work on older browsers

3. **Payment Integration**
   - Paynow only supports Zimbabwean phone numbers
   - International payments not currently supported
   - Refunds may take 3-5 business days

4. **Real-time Messaging**
   - Requires stable internet connection
   - Messages may be delayed on slow connections
   - File size limit: 10MB per attachment

5. **Mobile Responsiveness**
   - Some admin features better on desktop
   - Complex forms may require scrolling on mobile
   - Image uploads recommended via desktop

6. **Search Functionality**
   - Search results limited to 100 items
   - Advanced filters may not combine perfectly
   - Some edge cases may return unexpected results

7. **Notifications**
   - Email delivery may take up to 5 minutes
   - Email may go to spam folder initially
   - Push notifications require browser permission

### Platform Constraints

- **Session Timeout:** 24 hours of inactivity
- **File Storage:** Per-user limit of 500MB
- **API Rate Limiting:** 100 requests per minute per user
- **Message History:** Limited to last 1000 messages per conversation
- **Portfolio Items:** Maximum 20 items per creator

---

## Bug Reporting

### How to Report Bugs

When you encounter an issue during UAT, please document:

1. **Bug ID:** UAT-BUG-[Number]
2. **Severity:** Critical / High / Medium / Low
3. **Test Case ID:** Which test case was being executed
4. **Steps to Reproduce:** Exact steps that caused the issue
5. **Expected Result:** What should have happened
6. **Actual Result:** What actually happened
7. **Screenshots/Videos:** Visual documentation of the issue
8. **Browser/Device:** Testing environment details
9. **User Account:** Which test account was used
10. **Timestamp:** When the issue occurred

### Bug Report Template

```markdown
**Bug ID:** UAT-BUG-001
**Severity:** High
**Test Case:** UAT-022 - Book Creator Package
**Date:** 2025-11-24 14:30

**Steps to Reproduce:**
1. Login as brand: testbrand@example.com
2. Navigate to creator profile
3. Click "Book Now" on Instagram Package
4. Fill in booking form
5. Click "Proceed to Payment"

**Expected Result:**
Should redirect to payment page with correct total amount

**Actual Result:**
Payment page shows $0.00 instead of $100.00

**Screenshots:**
[Attach screenshot]

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Device: Desktop
- User: Brand Test Account
```

### Severity Definitions

**Critical:**
- System crashes
- Data loss
- Security vulnerabilities
- Payment failures
- User cannot complete core flows

**High:**
- Major functionality broken
- Incorrect calculations
- Missing critical features
- Poor user experience in main flows

**Medium:**
- Minor functionality issues
- UI inconsistencies
- Performance issues
- Non-critical features not working

**Low:**
- Cosmetic issues
- Typos
- Minor UI improvements
- Enhancement suggestions

---

## Testing Checklist

### Pre-Test Setup
- [ ] Access to production environment confirmed
- [ ] Test accounts created (Creator & Brand)
- [ ] Valid email addresses accessible
- [ ] Phone numbers for OTP available
- [ ] Paynow test account ready (optional)
- [ ] Screen recording/screenshot tools ready

### Core User Flows (Must Test)
- [ ] Creator Registration & Profile Setup
- [ ] Brand Registration & Profile Setup
- [ ] Package Creation & Management
- [ ] Campaign Creation & Management
- [ ] Creator Discovery & Search
- [ ] Booking Flow (End-to-End)
- [ ] Payment Processing
- [ ] Messaging System
- [ ] Collaboration Workflow
- [ ] Review & Rating System

### Secondary Flows (Should Test)
- [ ] Password Reset
- [ ] Profile Editing
- [ ] Package Editing/Deletion
- [ ] Campaign Applications
- [ ] Booking Cancellation
- [ ] Payment History
- [ ] Notification System
- [ ] File Uploads
- [ ] Search & Filters

### Edge Cases (Nice to Test)
- [ ] Invalid input handling
- [ ] Network interruption scenarios
- [ ] Concurrent user actions
- [ ] Large file uploads
- [ ] Maximum character limits
- [ ] Special characters in inputs
- [ ] Multiple sessions same user

---

## Testing Timeline Suggestion

### Day 1 (4 hours)
- Authentication & Registration (Both user types)
- Profile Setup (Creator & Brand)
- Package Creation

### Day 2 (4 hours)
- Campaign Creation
- Creator Discovery & Search
- Booking Flow
- Payment Integration

### Day 3 (4 hours)
- Messaging System
- Collaboration Management
- Review System
- Notifications

### Day 4 (2 hours)
- Edge Cases
- Regression Testing
- Bug Documentation
- Final Report

---

## Success Criteria

The platform is considered ready for production when:

✓ **Authentication:** 100% of test cases pass
✓ **Core Flows:** 95% of test cases pass
✓ **Payment:** 100% of payment tests successful
✓ **Critical Bugs:** 0 critical bugs remaining
✓ **High Priority Bugs:** < 3 high priority bugs
✓ **Performance:** Page load times < 3 seconds
✓ **Mobile:** Key flows work on mobile devices
✓ **Security:** No security vulnerabilities identified

---

## Additional Resources

### Contact Information
- **Development Team:** [Contact Email]
- **Project Manager:** [Contact Email]
- **Technical Support:** [Contact Email]

### Documentation Links
- API Documentation: http://173.212.245.22:8002/api/docs
- User Guide: [To be created]
- FAQ: [To be created]

### Tools & Software
- **Screenshot Tool:** Windows Snipping Tool / macOS Screenshot
- **Screen Recording:** OBS Studio / Loom
- **Bug Tracking:** [Your bug tracking system]
- **Browser DevTools:** For checking console errors

---

## Test Report Template

After completing UAT, please provide a summary report:

### Executive Summary
- Total test cases executed: X
- Test cases passed: X
- Test cases failed: X
- Pass rate: X%
- Critical bugs found: X
- High priority bugs: X

### Test Coverage
- Feature X: [Status]
- Feature Y: [Status]
- etc.

### Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

### Sign-off
- Tester Name: _________________
- Date: _________________
- Status: APPROVED / REJECTED / CONDITIONAL

---

**End of UAT Documentation**

*For questions or clarifications, please contact the development team.*
