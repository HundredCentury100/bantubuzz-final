-- Create portfolio_items table for creators to showcase their work
CREATE TABLE IF NOT EXISTS portfolio_items (
    id SERIAL PRIMARY KEY,
    creator_profile_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE NOT NULL,

    -- Project details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    brand_name VARCHAR(100),  -- Client/brand they worked with

    -- Project metadata
    platform VARCHAR(50),  -- instagram, tiktok, youtube, etc.
    collaboration_type VARCHAR(100),  -- Sponsored Post, Product Review, Brand Ambassador, etc.
    campaign_objective VARCHAR(200),  -- Awareness, Engagement, Sales, etc.

    -- Media
    image_url VARCHAR(500),  -- Featured image for the project
    media_urls JSON DEFAULT '[]',  -- Array of additional images/videos
    post_url VARCHAR(500),  -- Link to the actual post/content

    -- Performance metrics
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    engagement_rate DECIMAL(5,4),  -- Calculated engagement rate for this project
    reach INTEGER,  -- Total people reached

    -- Results/impact
    result_description TEXT,  -- Description of the results achieved
    client_testimonial TEXT,  -- Quote from the client (if available)

    -- Project timeline
    project_date DATE,  -- When the project was completed

    -- Display settings
    is_featured BOOLEAN DEFAULT FALSE,  -- Show in featured section
    display_order INTEGER DEFAULT 0,  -- Order to display items
    is_visible BOOLEAN DEFAULT TRUE,  -- Creator can hide items

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT valid_engagement_rate CHECK (engagement_rate IS NULL OR (engagement_rate >= 0 AND engagement_rate <= 1))
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_portfolio_creator ON portfolio_items(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_visible ON portfolio_items(creator_profile_id, is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_featured ON portfolio_items(creator_profile_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_portfolio_platform ON portfolio_items(platform);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_portfolio_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_items_timestamp
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_items_updated_at();
