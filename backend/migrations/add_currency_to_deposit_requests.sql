-- Migration: Add missing columns to deposit_requests table
-- Date: 2026-04-07
-- Description: Adds all missing columns to match DepositRequest model

-- Add currency column
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add deposit reference column
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS deposit_reference VARCHAR(100);

-- Add Paynow-specific columns
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS paynow_redirect_url VARCHAR(255);
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS paynow_payment_reference VARCHAR(100);

-- Add transaction linkage column
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS transaction_id INTEGER;

-- Add timestamp columns
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW();
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update existing rows with unique deposit_reference
UPDATE deposit_requests
SET deposit_reference = CONCAT('DEP', id, '-', LEFT(MD5(RANDOM()::text), 8))
WHERE deposit_reference IS NULL;

-- Make deposit_reference NOT NULL
ALTER TABLE deposit_requests ALTER COLUMN deposit_reference SET NOT NULL;

-- Add foreign key constraint for transaction_id
ALTER TABLE deposit_requests ADD CONSTRAINT fk_deposit_transaction
FOREIGN KEY (transaction_id) REFERENCES wallet_transactions(id);

-- This migration has been applied to production on 2026-04-07
