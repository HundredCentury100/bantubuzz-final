-- Campaign Cart System Migration
-- Purpose: Allow brands to add invitations/applications/packages to campaign without immediate payment
-- Then pay all at once, in batches, or individually

-- Create campaign_cart_items table
CREATE TABLE IF NOT EXISTS campaign_cart_items (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

    -- Item type: 'invitation', 'application', 'package'
    item_type VARCHAR(50) NOT NULL,

    -- References (only one will be populated based on item_type)
    invitation_id INTEGER REFERENCES campaign_invitations(id) ON DELETE CASCADE,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

    -- Pricing details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Payment status
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,

    -- Collaboration reference (created after payment)
    collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE SET NULL,

    -- Metadata
    notes TEXT,
    custom_deliverables JSONB, -- For package additions with custom requirements
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure uniqueness - can't add same item twice to cart
    CONSTRAINT unique_invitation_cart UNIQUE(campaign_id, item_type, invitation_id),
    CONSTRAINT unique_proposal_cart UNIQUE(campaign_id, item_type, proposal_id),
    CONSTRAINT unique_package_cart UNIQUE(campaign_id, item_type, package_id, creator_id),

    -- Check constraints
    CONSTRAINT valid_item_type CHECK (item_type IN ('invitation', 'application', 'package')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_cart_campaign ON campaign_cart_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_cart_brand ON campaign_cart_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaign_cart_creator ON campaign_cart_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_cart_payment_status ON campaign_cart_items(payment_status);
CREATE INDEX IF NOT EXISTS idx_campaign_cart_item_type ON campaign_cart_items(item_type);
CREATE INDEX IF NOT EXISTS idx_campaign_cart_paid_at ON campaign_cart_items(paid_at);

-- Add new status to campaign_invitations for unpaid invites
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS in_cart BOOLEAN DEFAULT FALSE;

-- Add new status to proposals for accepted but unpaid applications
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS accepted_pending_payment BOOLEAN DEFAULT FALSE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_in_cart ON campaign_invitations(in_cart);
CREATE INDEX IF NOT EXISTS idx_proposals_accepted_pending_payment ON proposals(accepted_pending_payment);

-- Comments for documentation
COMMENT ON TABLE campaign_cart_items IS 'Stores unpaid campaign additions (invitations, applications, packages) before payment';
COMMENT ON COLUMN campaign_cart_items.item_type IS 'Type of cart item: invitation (brand invites creator), application (creator applied, brand accepted), package (brand adds creator package)';
COMMENT ON COLUMN campaign_cart_items.payment_status IS 'Payment status: pending (not paid), paid (payment successful), failed (payment failed), refunded (payment refunded)';
COMMENT ON COLUMN campaign_cart_items.collaboration_id IS 'Set after payment - links to created collaboration';
