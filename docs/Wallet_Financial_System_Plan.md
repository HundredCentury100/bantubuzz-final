# BantuBuzz Wallet & Financial System - Implementation Plan

**Document Version:** 1.0
**Date:** November 24, 2025
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Fiverr's Financial Model Analysis](#fiverrs-financial-model-analysis)
3. [BantuBuzz Financial Flow Design](#bantubuzz-financial-flow-design)
4. [Money States & Lifecycle](#money-states--lifecycle)
5. [Database Schema](#database-schema)
6. [Wallet System](#wallet-system)
7. [Financial Dashboard UI](#financial-dashboard-ui)
8. [Withdrawal System](#withdrawal-system)
9. [Implementation Plan](#implementation-plan)
10. [Security & Compliance](#security--compliance)

---

## 1. Overview

### Purpose
Implement a secure escrow-based wallet system where creator earnings are held for 30 days before becoming available for withdrawal. This protects both brands and creators while ensuring platform sustainability.

### Goals
- **Secure Transactions:** Hold funds in escrow until work is verified
- **Fraud Protection:** 30-day clearance prevents chargebacks and disputes
- **Financial Transparency:** Clear visibility of pending, available, and withdrawn funds
- **Creator Confidence:** Predictable earnings timeline
- **Platform Sustainability:** Calculate and collect platform fees automatically

### Key Principles
1. **Brand pays upfront** → Money held in escrow
2. **Creator delivers work** → Brand reviews
3. **Brand marks complete** → Money credited to creator wallet (pending)
4. **30-day clearance period** → Money becomes available
5. **Creator withdraws** → Money transferred to bank account

---

## 2. Fiverr's Financial Model Analysis

### How Fiverr Handles Money

#### **Payment Flow:**

```
Brand Payment → Fiverr Escrow → Order Completion → Creator Earnings (Pending)
                                                           ↓
                                                    30-Day Clearance
                                                           ↓
                                                  Available Balance → Withdrawal
```

#### **Key Features:**

1. **Escrow System**
   - All payments held by platform
   - Released only after successful delivery
   - Protects both parties

2. **Safety Clearance Period**
   - 14-30 days depending on seller level
   - New sellers: 30 days
   - Top sellers: 14 days
   - Prevents chargebacks and fraud

3. **Balance Types**
   - **Pending Clearance:** Money earned but not yet available
   - **Available for Withdrawal:** Cleared funds ready to withdraw
   - **Withdrawn:** Already transferred to bank

4. **Withdrawal Rules**
   - Minimum withdrawal: $5-$10
   - Withdrawal methods: PayPal, Bank Transfer, Payoneer
   - Processing time: 1-5 business days
   - Fees may apply based on method

5. **Revenue Calculation**
   - Platform takes 20% fee (Fiverr's rate)
   - Creator receives 80%
   - Fees deducted automatically before crediting

6. **Financial Dashboard**
   - Clear breakdown of all earnings
   - Transaction history
   - Expected clearance dates
   - Withdrawal history

---

## 3. BantuBuzz Financial Flow Design

### Complete Money Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     BRAND PAYMENT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. BRAND BOOKS PACKAGE ($100)
   ↓
   Paynow Payment Gateway
   ↓
2. PAYMENT HELD IN ESCROW ($100)
   Status: "Pending Delivery"
   ↓
3. CREATOR DELIVERS WORK
   ↓
4. BRAND REVIEWS & MARKS COMPLETE
   ↓
5. PLATFORM FEE DEDUCTED (15% = $15)
   Creator Earning: $85
   Platform Fee: $15
   ↓
6. CREDITED TO CREATOR WALLET
   Status: "Pending Clearance"
   Available Date: [Date + 30 days]
   ↓
7. 30-DAY CLEARANCE PERIOD
   Day 1-29: Money locked
   Progress bar showing days remaining
   ↓
8. CLEARANCE COMPLETE (Day 30)
   Status: "Available for Withdrawal"
   Can now withdraw
   ↓
9. CREATOR REQUESTS WITHDRAWAL
   Minimum: $10
   ↓
10. WITHDRAWAL PROCESSED
    Paynow transfer to creator's number
    Status: "Withdrawn"
    Processing: 1-3 business days
```

### Money States

#### **For Each Transaction:**

| State | Description | Duration | Creator Action |
|-------|-------------|----------|----------------|
| **Escrowed** | Brand paid, held by platform | Until delivery accepted | Deliver work |
| **Pending Clearance** | Credited but locked | 30 days | Wait for clearance |
| **Available** | Cleared, ready to withdraw | Until withdrawn | Can withdraw |
| **Withdrawn** | Transferred to bank | Permanent | View history |

---

## 4. Money States & Lifecycle

### State 1: ESCROWED (Brand Payment)

**Trigger:** Brand completes payment for booking

**Characteristics:**
- Money held by BantuBuzz
- Not yet credited to creator
- Waiting for work delivery
- Can be refunded if collaboration cancelled

**Database Status:** `payment_status = 'escrowed'`

**Display to Creator:**
```
Expected Earnings: $85.00
Status: Awaiting Delivery
Action Required: Complete and deliver your work
```

---

### State 2: PENDING CLEARANCE

**Trigger:** Brand marks collaboration as complete

**Characteristics:**
- Platform fee deducted (e.g., 15%)
- Credited to creator wallet
- Locked for 30 days
- Visible in pending balance
- Each transaction has own clearance date

**Database Status:** `transaction_status = 'pending_clearance'`

**Display to Creator:**
```
┌─────────────────────────────────────────────┐
│ Pending Clearance: $85.00                   │
│                                             │
│ Collaboration: Instagram Campaign           │
│ Brand: TechBrand Ltd                        │
│ Completed: Nov 24, 2025                    │
│                                             │
│ Available for withdrawal in:                │
│ ━━━━━━━━━━━━━━░░░░░░░░░░░░ 12 days        │
│                                             │
│ Available on: Dec 24, 2025                 │
└─────────────────────────────────────────────┘
```

---

### State 3: AVAILABLE FOR WITHDRAWAL

**Trigger:** 30 days elapsed since clearance start

**Characteristics:**
- Fully cleared
- Can be withdrawn anytime
- No restrictions
- Accumulates with other cleared funds

**Database Status:** `transaction_status = 'available'`

**Display to Creator:**
```
Available Balance: $285.00

Ready to withdraw
[Withdraw Funds]
```

---

### State 4: WITHDRAWAL PENDING

**Trigger:** Creator requests withdrawal

**Characteristics:**
- Withdrawal request submitted
- Processing by payment gateway
- Typically 1-3 business days
- Cannot be cancelled once submitted

**Database Status:** `withdrawal_status = 'processing'`

**Display to Creator:**
```
Withdrawal Pending: $200.00
Requested: Nov 24, 2025
Method: Paynow (+263771234567)
Estimated arrival: Nov 26, 2025

Processing...
```

---

### State 5: WITHDRAWN

**Trigger:** Payment gateway confirms transfer

**Characteristics:**
- Money transferred to creator's account
- Transaction complete
- Permanent record
- Receipt available

**Database Status:** `withdrawal_status = 'completed'`

**Display to Creator:**
```
✓ Withdrawal Completed

Amount: $200.00
Date: Nov 25, 2025
Method: Paynow
Reference: PNW-123456789

[Download Receipt]
```

---

## 5. Database Schema

### 5.1 Wallet Table

```sql
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,

    -- Balance breakdown
    pending_clearance DECIMAL(10,2) DEFAULT 0.00, -- Money in 30-day hold
    available_balance DECIMAL(10,2) DEFAULT 0.00, -- Money ready to withdraw
    withdrawn_total DECIMAL(10,2) DEFAULT 0.00,   -- Lifetime withdrawals
    total_earned DECIMAL(10,2) DEFAULT 0.00,      -- Lifetime earnings (before fees)

    -- Metadata
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT positive_pending CHECK (pending_clearance >= 0),
    CONSTRAINT positive_available CHECK (available_balance >= 0),
    CONSTRAINT positive_withdrawn CHECK (withdrawn_total >= 0)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
```

---

### 5.2 Transactions Table

```sql
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,

    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- 'earning', 'withdrawal', 'refund', 'fee', 'bonus'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Status tracking
    status VARCHAR(20) NOT NULL, -- 'escrowed', 'pending_clearance', 'available', 'withdrawn', 'failed'

    -- Clearance tracking
    clearance_required BOOLEAN DEFAULT TRUE,
    clearance_days INTEGER DEFAULT 30,
    completed_at TIMESTAMP, -- When collaboration marked complete
    available_at TIMESTAMP, -- When money becomes available (completed_at + 30 days)
    cleared_at TIMESTAMP,   -- When actually cleared

    -- Related entities
    collaboration_id INTEGER REFERENCES collaborations(id),
    booking_id INTEGER REFERENCES bookings(id),
    payment_id INTEGER REFERENCES payments(id),
    withdrawal_id INTEGER REFERENCES withdrawals(id),

    -- Financial breakdown
    gross_amount DECIMAL(10,2), -- Before fees
    platform_fee DECIMAL(10,2), -- Fee charged
    platform_fee_percentage DECIMAL(5,2), -- Fee % at time of transaction
    net_amount DECIMAL(10,2),   -- After fees (amount field)

    -- Description
    description TEXT,
    metadata JSONB, -- Additional data (brand name, package name, etc.)

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_available_at ON wallet_transactions(available_at);
CREATE INDEX idx_wallet_transactions_collaboration_id ON wallet_transactions(collaboration_id);
```

---

### 5.3 Withdrawals Table

```sql
CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,

    -- Withdrawal details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Payment method
    withdrawal_method VARCHAR(20) NOT NULL, -- 'paynow', 'bank_transfer', 'mobile_money'
    payment_details JSONB NOT NULL, -- Phone number, account details, etc.

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'

    -- Processing
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,

    -- External reference
    payment_reference VARCHAR(255), -- Paynow poll URL or transaction ID
    payment_gateway_response JSONB,

    -- Failure handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Fees
    withdrawal_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2), -- Amount - fee

    -- Notes
    notes TEXT,
    admin_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawals_wallet_id ON withdrawals(wallet_id);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_requested_at ON withdrawals(requested_at);
```

---

### 5.4 Platform Fees Table

```sql
CREATE TABLE platform_fees (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES wallet_transactions(id) NOT NULL,

    -- Fee details
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_percentage DECIMAL(5,2) NOT NULL,
    fee_type VARCHAR(20) NOT NULL, -- 'collaboration', 'booking', 'premium_feature'

    -- Related entities
    collaboration_id INTEGER REFERENCES collaborations(id),
    booking_id INTEGER REFERENCES bookings(id),
    creator_id INTEGER REFERENCES creator_profiles(id) NOT NULL,

    -- Accounting
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accounting_month VARCHAR(7), -- YYYY-MM for reporting

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_fees_transaction_id ON platform_fees(transaction_id);
CREATE INDEX idx_platform_fees_creator_id ON platform_fees(creator_id);
CREATE INDEX idx_platform_fees_accounting_month ON platform_fees(accounting_month);
```

---

### 5.5 Withdrawal Methods Table

```sql
CREATE TABLE withdrawal_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,

    -- Method details
    method_type VARCHAR(20) NOT NULL, -- 'paynow', 'bank_transfer', 'mobile_money'
    method_name VARCHAR(100), -- User-friendly name: "My Ecocash", "Main Bank"

    -- Payment details (encrypted)
    payment_details JSONB NOT NULL,
    -- For Paynow: { "phone": "+263771234567", "method": "ecocash" }
    -- For Bank: { "bank_name": "CBZ", "account_number": "XXXXX", "account_name": "John Doe" }

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Verification
    verified_at TIMESTAMP,
    verification_code VARCHAR(10),
    verification_expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawal_methods_user_id ON withdrawal_methods(user_id);
```

---

### 5.6 Update Existing Tables

```sql
-- Update collaborations table
ALTER TABLE collaborations ADD COLUMN payment_released BOOLEAN DEFAULT FALSE;
ALTER TABLE collaborations ADD COLUMN payment_released_at TIMESTAMP;
ALTER TABLE collaborations ADD COLUMN escrow_amount DECIMAL(10,2);

-- Update bookings table
ALTER TABLE bookings ADD COLUMN escrow_status VARCHAR(20) DEFAULT 'pending';
-- Values: 'pending', 'escrowed', 'released', 'refunded'
ALTER TABLE bookings ADD COLUMN escrowed_at TIMESTAMP;

-- Update payments table (if not already there)
ALTER TABLE payments ADD COLUMN escrow_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN held_amount DECIMAL(10,2);
```

---

## 6. Wallet System

### 6.1 Wallet Balance Calculation

**Real-time Balance Calculation:**

```python
def calculate_wallet_balances(user_id):
    """
    Calculate all wallet balances for a user
    """
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    # Get all transactions
    transactions = WalletTransaction.query.filter_by(
        user_id=user_id
    ).all()

    # Calculate pending clearance
    pending_clearance = db.session.query(
        func.sum(WalletTransaction.amount)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.status == 'pending_clearance',
        WalletTransaction.available_at > datetime.now()
    ).scalar() or 0.00

    # Calculate available balance
    available_balance = db.session.query(
        func.sum(WalletTransaction.amount)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.status == 'available'
    ).scalar() or 0.00

    # Calculate total withdrawn
    withdrawn_total = db.session.query(
        func.sum(Withdrawal.amount)
    ).filter(
        Withdrawal.user_id == user_id,
        Withdrawal.status == 'completed'
    ).scalar() or 0.00

    # Calculate total earned (lifetime, before fees)
    total_earned = db.session.query(
        func.sum(WalletTransaction.gross_amount)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'earning'
    ).scalar() or 0.00

    # Update wallet
    wallet.pending_clearance = pending_clearance
    wallet.available_balance = available_balance
    wallet.withdrawn_total = withdrawn_total
    wallet.total_earned = total_earned
    wallet.updated_at = datetime.now()

    db.session.commit()

    return wallet
```

---

### 6.2 Money Flow Functions

#### **Function 1: Create Escrow on Booking**

```python
def create_booking_escrow(booking_id):
    """
    When brand completes payment, create escrow record
    """
    booking = Booking.query.get(booking_id)
    payment = Payment.query.filter_by(booking_id=booking_id).first()

    if payment.status != 'completed':
        raise ValueError("Payment not completed")

    # Update booking
    booking.escrow_status = 'escrowed'
    booking.escrowed_at = datetime.now()

    # Update payment
    payment.escrow_status = 'escrowed'
    payment.held_amount = payment.amount

    db.session.commit()

    # Notify creator
    send_notification(
        booking.creator_id,
        f"Payment of ${payment.amount} escrowed for your booking. "
        f"Complete the work to receive your earnings."
    )

    return booking
```

#### **Function 2: Release Escrow to Creator Wallet**

```python
def release_escrow_to_wallet(collaboration_id):
    """
    When brand marks collaboration complete, release money to creator wallet
    with 30-day clearance period
    """
    collaboration = Collaboration.query.get(collaboration_id)
    booking = collaboration.booking
    payment = Payment.query.filter_by(booking_id=booking.id).first()
    creator = collaboration.creator

    if collaboration.status != 'completed':
        raise ValueError("Collaboration not completed")

    if booking.escrow_status != 'escrowed':
        raise ValueError("Payment not in escrow")

    # Calculate amounts
    gross_amount = payment.amount
    platform_fee_percentage = get_creator_platform_fee(creator.id)  # Based on tier
    platform_fee = gross_amount * (platform_fee_percentage / 100)
    net_amount = gross_amount - platform_fee

    # Get or create wallet
    wallet = Wallet.query.filter_by(user_id=creator.user_id).first()
    if not wallet:
        wallet = Wallet(user_id=creator.user_id)
        db.session.add(wallet)
        db.session.flush()

    # Create wallet transaction
    completed_at = datetime.now()
    available_at = completed_at + timedelta(days=30)

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=creator.user_id,
        transaction_type='earning',
        amount=net_amount,
        status='pending_clearance',
        clearance_required=True,
        clearance_days=30,
        completed_at=completed_at,
        available_at=available_at,
        collaboration_id=collaboration.id,
        booking_id=booking.id,
        payment_id=payment.id,
        gross_amount=gross_amount,
        platform_fee=platform_fee,
        platform_fee_percentage=platform_fee_percentage,
        net_amount=net_amount,
        description=f"Earnings from {booking.package.name} for {collaboration.brand.company_name}",
        metadata={
            'brand_name': collaboration.brand.company_name,
            'package_name': booking.package.name,
            'booking_id': booking.id
        }
    )
    db.session.add(transaction)

    # Record platform fee
    fee_record = PlatformFee(
        transaction_id=transaction.id,
        fee_amount=platform_fee,
        fee_percentage=platform_fee_percentage,
        fee_type='collaboration',
        collaboration_id=collaboration.id,
        booking_id=booking.id,
        creator_id=creator.id,
        accounting_month=completed_at.strftime('%Y-%m')
    )
    db.session.add(fee_record)

    # Update collaboration
    collaboration.payment_released = True
    collaboration.payment_released_at = completed_at
    collaboration.escrow_amount = gross_amount

    # Update booking
    booking.escrow_status = 'released'

    # Update payment
    payment.escrow_status = 'released'

    # Update wallet balances
    wallet.pending_clearance += net_amount
    wallet.total_earned += gross_amount
    wallet.updated_at = datetime.now()

    db.session.commit()

    # Notify creator
    send_notification(
        creator.user_id,
        f"🎉 ${net_amount:.2f} credited to your wallet! "
        f"Available for withdrawal on {available_at.strftime('%b %d, %Y')}"
    )

    return transaction
```

#### **Function 3: Clear Pending Transactions (Scheduled Job)**

```python
def clear_pending_transactions():
    """
    Scheduled job that runs daily to clear transactions that have passed 30 days
    """
    now = datetime.now()

    # Find all transactions ready to clear
    ready_transactions = WalletTransaction.query.filter(
        WalletTransaction.status == 'pending_clearance',
        WalletTransaction.available_at <= now,
        WalletTransaction.cleared_at.is_(None)
    ).all()

    for transaction in ready_transactions:
        # Update transaction status
        transaction.status = 'available'
        transaction.cleared_at = now

        # Update wallet balances
        wallet = transaction.wallet
        wallet.pending_clearance -= transaction.amount
        wallet.available_balance += transaction.amount
        wallet.updated_at = now

        # Notify creator
        send_notification(
            transaction.user_id,
            f"💰 ${transaction.amount:.2f} is now available for withdrawal!"
        )

    db.session.commit()

    return len(ready_transactions)
```

#### **Function 4: Create Withdrawal Request**

```python
def create_withdrawal_request(user_id, amount, withdrawal_method_id):
    """
    Creator requests to withdraw available funds
    """
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    # Validate amount
    if amount < 10:  # Minimum withdrawal
        raise ValueError("Minimum withdrawal amount is $10")

    if amount > wallet.available_balance:
        raise ValueError("Insufficient available balance")

    # Get withdrawal method
    withdrawal_method = WithdrawalMethod.query.get(withdrawal_method_id)
    if not withdrawal_method or withdrawal_method.user_id != user_id:
        raise ValueError("Invalid withdrawal method")

    if not withdrawal_method.is_verified:
        raise ValueError("Withdrawal method not verified")

    # Calculate fees (if any)
    withdrawal_fee = 0.00  # Could be percentage or flat fee
    net_amount = amount - withdrawal_fee

    # Create withdrawal record
    withdrawal = Withdrawal(
        wallet_id=wallet.id,
        user_id=user_id,
        amount=amount,
        withdrawal_method=withdrawal_method.method_type,
        payment_details=withdrawal_method.payment_details,
        status='pending',
        requested_at=datetime.now(),
        withdrawal_fee=withdrawal_fee,
        net_amount=net_amount
    )
    db.session.add(withdrawal)
    db.session.flush()

    # Create wallet transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type='withdrawal',
        amount=-amount,  # Negative for withdrawal
        status='withdrawn',
        withdrawal_id=withdrawal.id,
        clearance_required=False,
        description=f"Withdrawal to {withdrawal_method.method_name or withdrawal_method.method_type}",
        metadata={
            'withdrawal_method': withdrawal_method.method_type,
            'fee': withdrawal_fee
        }
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance -= amount
    wallet.updated_at = datetime.now()

    db.session.commit()

    # Process withdrawal with payment gateway
    process_withdrawal_payment(withdrawal.id)

    return withdrawal
```

#### **Function 5: Process Withdrawal Payment**

```python
def process_withdrawal_payment(withdrawal_id):
    """
    Process withdrawal through Paynow
    """
    withdrawal = Withdrawal.query.get(withdrawal_id)

    if withdrawal.status != 'pending':
        raise ValueError("Withdrawal already processed")

    withdrawal.status = 'processing'
    withdrawal.processed_at = datetime.now()
    db.session.commit()

    try:
        # Initialize Paynow
        paynow = Paynow(
            integration_id=PAYNOW_INTEGRATION_ID,
            integration_key=PAYNOW_INTEGRATION_KEY,
            return_url=None,
            result_url=f"{BASE_URL}/api/payments/paynow/withdrawal-callback"
        )

        # Get payment details
        payment_details = withdrawal.payment_details
        phone = payment_details.get('phone')

        # Create payment
        payment = paynow.create_payment(
            f"Withdrawal-{withdrawal.id}",
            f"withdrawal_{withdrawal.id}@bantubuzz.com"
        )
        payment.add("Withdrawal", withdrawal.net_amount)

        # Send money
        response = paynow.send_mobile(
            payment,
            phone,
            'ecocash'  # or from payment_details
        )

        if response.success:
            # Save reference
            withdrawal.payment_reference = response.poll_url
            withdrawal.payment_gateway_response = {
                'poll_url': response.poll_url,
                'status': response.status,
                'hash': response.hash
            }
            db.session.commit()

            # Check status
            check_withdrawal_status(withdrawal.id)
        else:
            # Payment failed
            withdrawal.status = 'failed'
            withdrawal.failed_at = datetime.now()
            withdrawal.failure_reason = response.errors
            db.session.commit()

            # Refund to wallet
            refund_failed_withdrawal(withdrawal.id)

    except Exception as e:
        # Handle error
        withdrawal.status = 'failed'
        withdrawal.failed_at = datetime.now()
        withdrawal.failure_reason = str(e)
        db.session.commit()

        # Refund to wallet
        refund_failed_withdrawal(withdrawal.id)
```

---

## 7. Financial Dashboard UI

### 7.1 Creator Earnings Dashboard

```
┌───────────────────────────────────────────────────────────────────┐
│                    💰 Earnings Overview                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Available      │  │  Pending        │  │  Total Earned   │ │
│  │  $285.00        │  │  $450.00        │  │  $1,850.00      │ │
│  │  [Withdraw]     │  │  Clearing...    │  │  All time       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  Pending Clearance                                   View All >  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📦 Instagram Campaign - TechBrand Ltd               $85.00      │
│      Completed: Nov 24, 2025                                     │
│      Available in: ━━━━━━━━━━━━━━░░░░░░░░░░ 12 days            │
│      Available on: Dec 24, 2025                                  │
│      Platform fee (15%): -$15.00                                 │
│                                                                   │
│  📦 YouTube Review - FashionCo                      $150.00      │
│      Completed: Nov 20, 2025                                     │
│      Available in: ━━━━━━━━━━━━━━━━━━░░░░ 8 days              │
│      Available on: Dec 20, 2025                                  │
│      Platform fee (15%): -$25.00                                 │
│                                                                   │
│  📦 TikTok Series - BeautyBrand                     $215.00      │
│      Completed: Nov 15, 2025                                     │
│      Available in: ━━━━━━━━━━━━━━━━━━━━━░ 3 days              │
│      Available on: Dec 15, 2025                                  │
│      Platform fee (12%): -$29.14    [Rising Star Discount]      │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  Expected Earnings (Active Projects)                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📦 Product Launch Campaign - TechStartup           $120.00      │
│      Status: In Progress                                         │
│      Expected: Deliver by Dec 5, 2025                           │
│      Will be available: ~Jan 4, 2026                            │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  Recent Withdrawals                                  View All >  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✓ Nov 20, 2025  -  $200.00  -  Paynow (+263771234567)         │
│  ✓ Nov 10, 2025  -  $150.00  -  Paynow (+263771234567)         │
│  ✓ Oct 28, 2025  -  $300.00  -  Paynow (+263771234567)         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 7.2 Financial Breakdown Section

```
┌───────────────────────────────────────────────────────────────────┐
│  💵 Financial Breakdown                                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  This Month (November 2025)                                       │
│                                                                   │
│  Gross Earnings:                               $650.00            │
│  Platform Fees (15%):                          -$97.50            │
│  Net Earnings:                                 $552.50            │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  Lifetime Stats                                                   │
│                                                                   │
│  Total Earned (Gross):                         $1,850.00         │
│  Total Platform Fees:                          -$277.50          │
│  Total Net Earnings:                           $1,572.50         │
│  Total Withdrawn:                              $800.00           │
│  Currently in Wallet:                          $735.00           │
│                                                                   │
│  Average Platform Fee:                         15%               │
│  [Reduce fees by advancing tiers! Learn More]                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 7.3 Transaction History

```
┌───────────────────────────────────────────────────────────────────┐
│  📊 Transaction History                          🔍 [Filter] [Export]│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Date         Type      Description              Amount   Status  │
│  ──────────────────────────────────────────────────────────────  │
│  Nov 24      Earning   Instagram Campaign       +$85.00  Pending │
│  Nov 20      Earning   YouTube Review           +$150.00 Pending │
│  Nov 20      Withdraw  Paynow withdrawal        -$200.00 Complete│
│  Nov 15      Earning   TikTok Series            +$215.00 Pending │
│  Nov 10      Withdraw  Paynow withdrawal        -$150.00 Complete│
│  Nov 8       Earning   Brand Collab             +$95.00  Available│
│  Oct 30      Earning   Sponsored Post           +$75.00  Available│
│  Oct 28      Withdraw  Paynow withdrawal        -$300.00 Complete│
│                                                                   │
│  [Load More]                                     Page 1 of 5      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 8. Withdrawal System

### 8.1 Withdrawal Page UI

```
┌───────────────────────────────────────────────────────────────────┐
│  💸 Withdraw Funds                                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Available Balance: $285.00                                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Withdrawal Amount                                          │ │
│  │  ┌──────────────────────────────────────────┐              │ │
│  │  │ $ 200.00                                  │              │ │
│  │  └──────────────────────────────────────────┘              │ │
│  │  Minimum: $10.00  •  Maximum: $285.00                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Withdrawal Method                                          │ │
│  │                                                             │ │
│  │  ⦿ Paynow - +263771234567 (Ecocash) [Default]             │ │
│  │  ○ Bank Transfer - CBZ Bank (...4567)                      │ │
│  │                                                             │ │
│  │  [+ Add New Withdrawal Method]                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Summary:                                                         │
│  ─────────────────────────────────────────────────────────────   │
│  Withdrawal Amount:                            $200.00           │
│  Withdrawal Fee:                               $0.00             │
│  You will receive:                             $200.00           │
│                                                                   │
│  Processing Time: 1-3 business days                              │
│                                                                   │
│  [ Cancel ]                      [Withdraw $200.00]              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 8.2 Withdrawal Confirmation Modal

```
┌─────────────────────────────────────────────────────────┐
│  Confirm Withdrawal                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  You're about to withdraw:                             │
│                                                         │
│  Amount:         $200.00                               │
│  Method:         Paynow                                │
│  Phone:          +263771234567                         │
│  Expected:       Nov 26, 2025                          │
│                                                         │
│  ⚠️ Important:                                         │
│  • Withdrawals cannot be cancelled once submitted     │
│  • Processing takes 1-3 business days                 │
│  • You'll receive a confirmation notification         │
│                                                         │
│  [ Go Back ]              [ Confirm Withdrawal ]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Withdrawal Success

```
┌─────────────────────────────────────────────────────────┐
│              ✓ Withdrawal Request Submitted             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              [Animated Success Icon]                    │
│                                                         │
│  Your withdrawal of $200.00 has been submitted         │
│  and is being processed.                               │
│                                                         │
│  Expected arrival: Nov 26, 2025                        │
│  Method: Paynow (+263771234567)                        │
│  Reference: WD-123456                                  │
│                                                         │
│  We'll notify you once the transfer is complete.       │
│                                                         │
│  [ Download Receipt ]    [ View Transaction History ]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Plan

### Phase 1: Database & Backend Core (Week 1-2)

#### Week 1: Database Setup
- [ ] Create `wallets` table migration
- [ ] Create `wallet_transactions` table migration
- [ ] Create `withdrawals` table migration
- [ ] Create `platform_fees` table migration
- [ ] Create `withdrawal_methods` table migration
- [ ] Update `collaborations` table
- [ ] Update `bookings` table
- [ ] Update `payments` table
- [ ] Run migrations locally
- [ ] Seed test data
- [ ] Run migrations on production

#### Week 2: Core Wallet Logic
- [ ] Create Wallet model
- [ ] Create WalletTransaction model
- [ ] Create Withdrawal model
- [ ] Create PlatformFee model
- [ ] Create WithdrawalMethod model
- [ ] Implement `create_booking_escrow()` function
- [ ] Implement `release_escrow_to_wallet()` function
- [ ] Implement `calculate_wallet_balances()` function
- [ ] Create background job for clearance checking
- [ ] Test escrow flow end-to-end

### Phase 2: Wallet API Endpoints (Week 3)

#### Creator Endpoints:
- [ ] GET `/api/wallet/balance` - Get wallet overview
- [ ] GET `/api/wallet/transactions` - Transaction history
- [ ] GET `/api/wallet/pending-clearance` - Pending transactions with progress
- [ ] GET `/api/wallet/available` - Available balance details
- [ ] GET `/api/wallet/statistics` - Lifetime earnings stats
- [ ] POST `/api/wallet/withdraw` - Request withdrawal
- [ ] GET `/api/wallet/withdrawals` - Withdrawal history
- [ ] GET `/api/wallet/withdrawals/:id` - Withdrawal details
- [ ] POST `/api/wallet/withdrawal-methods` - Add withdrawal method
- [ ] GET `/api/wallet/withdrawal-methods` - List methods
- [ ] PUT `/api/wallet/withdrawal-methods/:id/verify` - Verify method
- [ ] DELETE `/api/wallet/withdrawal-methods/:id` - Remove method

#### Admin Endpoints:
- [ ] GET `/api/admin/wallets` - List all wallets
- [ ] GET `/api/admin/wallets/:id` - Wallet details
- [ ] GET `/api/admin/withdrawals/pending` - Pending withdrawals
- [ ] PUT `/api/admin/withdrawals/:id/approve` - Manual approval
- [ ] PUT `/api/admin/withdrawals/:id/reject` - Reject withdrawal
- [ ] GET `/api/admin/platform-fees` - Fee collection reports
- [ ] GET `/api/admin/financial-reports` - Monthly reports

### Phase 3: Withdrawal Processing (Week 3-4)

- [ ] Integrate Paynow send money API
- [ ] Implement `process_withdrawal_payment()` function
- [ ] Implement `check_withdrawal_status()` function
- [ ] Implement withdrawal callback handler
- [ ] Implement withdrawal retry logic
- [ ] Implement `refund_failed_withdrawal()` function
- [ ] Create withdrawal status checker job
- [ ] Test withdrawal flow completely
- [ ] Handle edge cases (failed payments, refunds)

### Phase 4: Scheduled Jobs (Week 4)

- [ ] Daily job: Clear pending transactions (check 30-day period)
- [ ] Hourly job: Check withdrawal statuses
- [ ] Daily job: Update wallet balances
- [ ] Weekly job: Send pending clearance reminders
- [ ] Monthly job: Generate financial reports
- [ ] Set up job monitoring and alerts
- [ ] Test all scheduled jobs

### Phase 5: Frontend - Earnings Dashboard (Week 5)

#### Components:
- [ ] `WalletOverview.jsx` - Balance cards
- [ ] `PendingClearance.jsx` - Transactions clearing with progress bars
- [ ] `TransactionHistory.jsx` - Full transaction list
- [ ] `FinancialBreakdown.jsx` - Earnings vs fees breakdown
- [ ] `WithdrawButton.jsx` - Quick withdraw action
- [ ] `ClearanceProgress.jsx` - Progress bar component for 30-day countdown

#### Pages:
- [ ] Update `CreatorDashboard.jsx` - Add wallet summary
- [ ] Create `Earnings.jsx` - Full earnings page
- [ ] Create `TransactionDetail.jsx` - Individual transaction view
- [ ] Update Navigation - Add "Earnings" menu item

### Phase 6: Frontend - Withdrawal Flow (Week 5-6)

#### Components:
- [ ] `WithdrawalForm.jsx` - Withdrawal amount input
- [ ] `WithdrawalMethodSelector.jsx` - Choose method
- [ ] `WithdrawalMethodForm.jsx` - Add new method
- [ ] `WithdrawalConfirmation.jsx` - Confirmation modal
- [ ] `WithdrawalSuccess.jsx` - Success message
- [ ] `WithdrawalStatus.jsx` - Track withdrawal progress

#### Pages:
- [ ] Create `Withdraw.jsx` - Main withdrawal page
- [ ] Create `WithdrawalMethods.jsx` - Manage methods
- [ ] Create `WithdrawalHistory.jsx` - Past withdrawals

### Phase 7: Admin Dashboard (Week 6)

- [ ] Financial overview dashboard
- [ ] Pending withdrawals management
- [ ] Platform fees analytics
- [ ] Monthly revenue reports
- [ ] Creator earnings leaderboard
- [ ] Withdrawal approval interface
- [ ] Refund management tools

### Phase 8: Notifications & Emails (Week 7)

#### Email Templates:
- [ ] Payment received (escrowed)
- [ ] Earnings credited (pending clearance)
- [ ] Money cleared (available for withdrawal)
- [ ] Withdrawal requested (confirmation)
- [ ] Withdrawal completed (receipt)
- [ ] Withdrawal failed (error notification)
- [ ] Weekly clearance reminder

#### In-App Notifications:
- [ ] Real-time notifications for all money events
- [ ] Push notifications (if enabled)
- [ ] Notification center integration

### Phase 9: Integration with Collaboration Flow (Week 7)

- [ ] Update collaboration completion endpoint to trigger escrow release
- [ ] Add payment status to collaboration details
- [ ] Update booking flow to show escrow status
- [ ] Add financial summary to collaboration pages
- [ ] Update brand flow to show payment held in escrow

### Phase 10: Testing & Security (Week 8)

#### Testing:
- [ ] Unit tests for all wallet functions
- [ ] Integration tests for money flow
- [ ] E2E tests for withdrawal process
- [ ] Test 30-day clearance job
- [ ] Test edge cases (cancellations, refunds, disputes)
- [ ] Load testing for financial calculations
- [ ] Security audit

#### Security:
- [ ] Encrypt sensitive payment data
- [ ] Implement withdrawal limits
- [ ] Add withdrawal verification (2FA optional)
- [ ] Rate limiting on withdrawal attempts
- [ ] Fraud detection patterns
- [ ] Audit logging for all financial operations

### Phase 11: Documentation & Launch (Week 8-9)

- [ ] Creator guide: "How Earnings Work"
- [ ] Creator guide: "Withdrawing Your Money"
- [ ] Brand guide: "Payment & Escrow"
- [ ] FAQ about 30-day clearance
- [ ] Video tutorials
- [ ] API documentation
- [ ] Admin documentation
- [ ] Launch announcement
- [ ] Monitor system performance

---

## 10. Security & Compliance

### 10.1 Security Measures

**Data Protection:**
- Encrypt withdrawal method details (AES-256)
- Mask sensitive information in UI
- Secure API endpoints with JWT
- Log all financial operations
- Two-factor authentication for large withdrawals

**Fraud Prevention:**
- Velocity checks (max withdrawals per day)
- Anomaly detection (unusual withdrawal patterns)
- Manual review for large amounts (>$1000)
- IP tracking and geolocation checks
- Account verification requirements

**Access Control:**
- Creators can only access their own wallet
- Admins have read-only access (except manual actions)
- Role-based permissions for financial operations
- Audit trail for all admin actions

### 10.2 Financial Compliance

**Record Keeping:**
- 7-year retention of all transactions
- Monthly financial statements
- Tax reporting capabilities
- Export to accounting software (CSV, QuickBooks)

**Regulations:**
- Comply with Zimbabwe financial regulations
- Anti-money laundering (AML) checks
- Know Your Customer (KYC) verification
- Report suspicious activity

**Dispute Resolution:**
- Escrow protection for both parties
- Clear refund policies
- Dispute escalation process
- Legal documentation

### 10.3 Error Handling

**Failed Withdrawals:**
- Automatic refund to wallet
- Clear error messaging
- Retry mechanism
- Support ticket creation

**System Failures:**
- Transaction rollback on errors
- Balance consistency checks
- Automated reconciliation
- Manual intervention tools

---

## 11. Key Metrics to Track

### Financial Health:
- Total money in escrow
- Total pending clearance
- Total available for withdrawal
- Total withdrawn
- Average clearance time
- Withdrawal success rate

### Creator Metrics:
- Average earnings per creator
- Earnings distribution by tier
- Withdrawal frequency
- Average withdrawal amount
- Time to first earning

### Platform Metrics:
- Total platform fees collected
- Monthly recurring revenue
- Fee collection rate by tier
- Refund rate
- Dispute rate

---

## 12. Future Enhancements

### Phase 2 Features (6-12 months):

1. **Instant Withdrawal**
   - Premium feature for Elite/Pro creators
   - Skip 30-day clearance for a fee
   - Limited to certain amount per month

2. **Multiple Currencies**
   - Support USD, ZWL, ZAR
   - Auto currency conversion
   - Multi-currency wallets

3. **Scheduled Withdrawals**
   - Auto-withdraw on schedule (weekly, monthly)
   - Set minimum balance threshold
   - Smart withdrawal timing

4. **Savings Goals**
   - Set earning goals
   - Track progress
   - Milestone celebrations

5. **Tax Tools**
   - Automatic tax calculation
   - 1099 generation (if applicable)
   - Tax document downloads
   - Quarterly tax estimates

6. **Investment Options**
   - Keep earnings in platform
   - Earn interest on balance
   - Platform investment opportunities

7. **Advance Payment**
   - Get paid faster (loans against pending clearance)
   - Fee for early access
   - Risk assessment

---

## Questions for Discussion

1. **Clearance Period:** Is 30 days too long? Should we offer:
   - New Creators: 30 days
   - Rising Star: 21 days
   - Established: 14 days
   - Elite: 7 days
   - Pro: 3 days or instant?

2. **Minimum Withdrawal:** Is $10 the right minimum?

3. **Withdrawal Fees:** Should we charge withdrawal fees? If yes, how much?

4. **Withdrawal Methods:** Which to prioritize?
   - Paynow (mobile money)
   - Bank transfer
   - PayPal (future)
   - Cryptocurrency (future)

5. **Instant Withdrawal:** Should this be a premium feature? How much to charge?

6. **Dispute Handling:** If brand disputes after 30 days, can we reverse payment?

7. **Failed Payments:** Max retry attempts before manual review?

8. **Currency:** Start with USD only or support ZWL from day 1?

9. **Tax Withholding:** Do we need to withhold taxes automatically?

10. **Savings Feature:** Should we offer interest on wallet balance?

---

## Next Steps

1. **Review & Approve** this financial plan
2. **Finalize clearance periods** by tier
3. **Design detailed UI mockups** for earnings pages
4. **Set up Paynow payout integration** (test account)
5. **Coordinate with accounting** for financial reporting
6. **Begin Phase 1** (Database setup)

---

**Document Owner:** Development Team
**Stakeholders:** Product, Finance, Legal, Compliance
**Last Updated:** November 24, 2025
**Next Review:** After Phase 1 completion

---

## Appendix A: Example Calculations

### Example 1: Rising Star Creator Earning

```
Brand books package: $100.00
Platform held in escrow: $100.00

[Creator delivers work]

[Brand marks complete on Nov 24, 2025]

Gross Amount: $100.00
Platform Fee (12% - Rising Star): -$12.00
Net Amount: $85.00

Credited to wallet: $85.00 (pending clearance)
Available Date: Dec 24, 2025 (30 days later)

[30 days pass]

Status changed to "Available": $85.00
Creator can now withdraw
```

### Example 2: Multiple Earnings Timeline

```
Nov 1:  Complete Job A - $100 → Available Dec 1
Nov 10: Complete Job B - $150 → Available Dec 10
Nov 20: Complete Job C - $200 → Available Dec 20

On Nov 25:
- Pending Clearance: $450
  - Job A: $100 (6 days left)
  - Job B: $150 (15 days left)
  - Job C: $200 (25 days left)

On Dec 2:
- Available: $100 (Job A cleared)
- Pending: $350 (Jobs B & C)

On Dec 15:
- Available: $250 (Jobs A & B cleared)
- Pending: $200 (Job C)

On Dec 21:
- Available: $450 (All cleared)
- Can withdraw up to $450
```

### Example 3: Withdrawal Process

```
Creator has Available Balance: $285.00

[Requests withdrawal: $200.00]

Nov 24, 2025 3:00 PM:
- Withdrawal requested
- Status: Pending
- Available Balance: $85.00 (remaining)

Nov 24, 2025 3:05 PM:
- Paynow initiated
- Status: Processing

Nov 25, 2025 10:00 AM:
- Paynow confirms transfer
- Status: Completed
- Money in creator's Ecocash

[Creator receives notification]
✓ Withdrawal of $200.00 completed!
```

---

**End of Document**
