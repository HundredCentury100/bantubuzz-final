-- Migration: Add brand wallet and collaboration response fields
-- Date: 2026-04-01
-- Description: Adds fields for brand wallet tracking and creator collaboration responses

-- Add brand wallet fields to wallets table
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'creator',
ADD COLUMN IF NOT EXISTS total_deposited NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0.00;

-- Add collaboration response tracking fields to collaborations table
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS creator_response_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS creator_decline_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT FALSE;

-- Create deposit_requests table for brand wallet deposits
CREATE TABLE IF NOT EXISTS deposit_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'paynow' or 'bank_transfer'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'completed', 'rejected'
    proof_of_payment TEXT, -- URL/path to proof of payment image
    paynow_poll_url TEXT, -- Paynow poll URL for status checking
    admin_notes TEXT, -- Admin notes for verification
    verified_by INTEGER REFERENCES users(id), -- Admin who verified
    verified_at TIMESTAMP, -- When it was verified
    wallet_transaction_id INTEGER REFERENCES wallet_transactions(id), -- Linked transaction after completion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_created_at ON deposit_requests(created_at DESC);

-- Update wallet_transactions to support more transaction types (if needed)
-- The transaction_type enum may need to be expanded, but this is already handled in the model

-- Add comments for documentation
COMMENT ON COLUMN wallets.user_type IS 'Type of user: creator or brand';
COMMENT ON COLUMN wallets.total_deposited IS 'Total amount deposited by brand (brands only)';
COMMENT ON COLUMN wallets.total_spent IS 'Total amount spent by brand on collaborations (brands only)';
COMMENT ON COLUMN collaborations.creator_response_at IS 'Timestamp when creator accepted or declined';
COMMENT ON COLUMN collaborations.creator_decline_reason IS 'Reason provided by creator for declining';
COMMENT ON COLUMN collaborations.refund_processed IS 'Flag to prevent double refunds';
COMMENT ON TABLE deposit_requests IS 'Tracks brand wallet deposit requests via Paynow or Bank Transfer';
