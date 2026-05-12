-- Migration: Create campaign_invitations table
-- Purpose: Track invitations sent by brands to creators for campaigns
-- Date: 2026-04-22

CREATE TABLE IF NOT EXISTS campaign_invitations (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_type VARCHAR(20) NOT NULL CHECK (invitation_type IN ('apply', 'join')),
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    proposed_amount NUMERIC(10, 2),
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    response_message TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate invitations
    UNIQUE(campaign_id, creator_user_id)
);

-- Indexes for performance
CREATE INDEX idx_campaign_invitations_campaign ON campaign_invitations(campaign_id);
CREATE INDEX idx_campaign_invitations_creator ON campaign_invitations(creator_user_id);
CREATE INDEX idx_campaign_invitations_status ON campaign_invitations(status);
CREATE INDEX idx_campaign_invitations_type ON campaign_invitations(invitation_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_invitations_updated_at
    BEFORE UPDATE ON campaign_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_invitations_updated_at();

COMMENT ON TABLE campaign_invitations IS 'Stores invitations sent by brands to creators for campaigns';
COMMENT ON COLUMN campaign_invitations.invitation_type IS 'apply: Invite to submit application; join: Direct invitation with package/amount';
COMMENT ON COLUMN campaign_invitations.package_id IS 'Package ID for join invitations (optional for apply invitations)';
COMMENT ON COLUMN campaign_invitations.proposed_amount IS 'Custom amount proposed by brand for join invitations';
COMMENT ON COLUMN campaign_invitations.status IS 'pending: Awaiting response; accepted: Creator accepted; declined: Creator declined; expired: Invitation expired; cancelled: Brand cancelled';
