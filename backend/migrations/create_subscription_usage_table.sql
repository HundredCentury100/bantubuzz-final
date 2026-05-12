-- Migration: Create subscription_usage table
-- Date: 2026-04-20
-- Purpose: Track monthly usage for subscription restrictions

CREATE TABLE IF NOT EXISTS subscription_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL,  -- First day of the month (e.g., 2026-04-01)

    -- Creator monthly counters
    proposals_sent INTEGER DEFAULT 0 NOT NULL,
    bookings_received INTEGER DEFAULT 0 NOT NULL,

    -- Brand monthly counters
    campaigns_created INTEGER DEFAULT 0 NOT NULL,
    collaborations_initiated INTEGER DEFAULT 0 NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Unique constraint: one record per user per month
    UNIQUE(user_id, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_month ON subscription_usage(user_id, month);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_month ON subscription_usage(month);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_usage_updated_at ON subscription_usage;
CREATE TRIGGER trigger_update_subscription_usage_updated_at
    BEFORE UPDATE ON subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_usage_updated_at();

-- Add helpful comments
COMMENT ON TABLE subscription_usage IS 'Tracks monthly usage counters for subscription plan restrictions';
COMMENT ON COLUMN subscription_usage.month IS 'First day of the month (YYYY-MM-01)';
COMMENT ON COLUMN subscription_usage.proposals_sent IS 'Number of collaboration proposals sent this month (creators only)';
COMMENT ON COLUMN subscription_usage.bookings_received IS 'Number of bookings received this month (creators only)';
COMMENT ON COLUMN subscription_usage.campaigns_created IS 'Number of campaigns created this month (brands only)';
COMMENT ON COLUMN subscription_usage.collaborations_initiated IS 'Number of collaborations initiated this month (brands only)';
