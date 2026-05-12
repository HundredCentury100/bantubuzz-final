-- Migration: Create campaign_payments and campaign_payment_items tables
-- Purpose: Enable flexible payment options for campaigns (full, batch, individual)
-- Date: 2026-04-22

-- Table 1: Campaign Payments (Parent table for payment batches)
CREATE TABLE IF NOT EXISTS campaign_payments (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    brand_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('full_campaign', 'batch', 'individual')),
    total_amount NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) DEFAULT 0,
    net_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'paynow',
    payment_reference VARCHAR(100),
    paynow_poll_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    failed_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Campaign Payment Items (Individual collaborations in a payment)
CREATE TABLE IF NOT EXISTS campaign_payment_items (
    id SERIAL PRIMARY KEY,
    campaign_payment_id INTEGER NOT NULL REFERENCES campaign_payments(id) ON DELETE CASCADE,
    collaboration_id INTEGER NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) DEFAULT 0,
    net_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure each collaboration is only paid once per payment batch
    UNIQUE(campaign_payment_id, collaboration_id)
);

-- Add payment_status column to collaborations table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'collaborations' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed'));
    END IF;
END $$;

-- Add payment_id column to collaborations table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'collaborations' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN payment_id INTEGER REFERENCES campaign_payments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_payments_campaign ON campaign_payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_brand ON campaign_payments(brand_user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_status ON campaign_payments(status);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_type ON campaign_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_campaign_payments_reference ON campaign_payments(payment_reference);

CREATE INDEX IF NOT EXISTS idx_payment_items_payment ON campaign_payment_items(campaign_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_collaboration ON campaign_payment_items(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_creator ON campaign_payment_items(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_status ON campaign_payment_items(status);

CREATE INDEX IF NOT EXISTS idx_collaborations_payment_status ON collaborations(payment_status);
CREATE INDEX IF NOT EXISTS idx_collaborations_payment_id ON collaborations(payment_id);

-- Trigger to update campaign_payments updated_at
CREATE OR REPLACE FUNCTION update_campaign_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_payments_updated_at
    BEFORE UPDATE ON campaign_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_payments_updated_at();

-- Trigger to update campaign_payment_items updated_at
CREATE OR REPLACE FUNCTION update_campaign_payment_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_payment_items_updated_at
    BEFORE UPDATE ON campaign_payment_items
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_payment_items_updated_at();

-- Comments for documentation
COMMENT ON TABLE campaign_payments IS 'Stores campaign payment batches (full campaign, batch, or individual payments)';
COMMENT ON COLUMN campaign_payments.payment_type IS 'full_campaign: Pay all collaborations; batch: Pay selected collaborations; individual: Pay one collaboration';
COMMENT ON COLUMN campaign_payments.status IS 'pending: Awaiting payment; processing: PayNow processing; completed: Payment successful; failed: Payment failed; cancelled: Payment cancelled';

COMMENT ON TABLE campaign_payment_items IS 'Individual collaboration payments within a campaign payment batch';
COMMENT ON COLUMN campaign_payment_items.status IS 'pending: Not yet paid; paid: Successfully paid; failed: Payment failed';
