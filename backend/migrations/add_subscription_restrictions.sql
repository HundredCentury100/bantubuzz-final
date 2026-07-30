-- Migration: Add Subscription Plan Restrictions and New Plans
-- Date: 2026-04-14
-- Description: Updates subscription_plans table to support both brand and creator plans with comprehensive restrictions

-- ===========================================================================
-- STEP 1: Add new columns to subscription_plans table
-- ===========================================================================

-- Add user_type column to differentiate brand vs creator plans
ALTER TABLE subscription_plans
ADD COLUMN user_type VARCHAR(10) CHECK (user_type IN ('brand', 'creator')) DEFAULT 'brand';

-- Brand-specific restriction fields
ALTER TABLE subscription_plans
ADD COLUMN max_active_campaigns INTEGER DEFAULT 5,
ADD COLUMN max_active_collaborations INTEGER DEFAULT 10,
ADD COLUMN max_team_members INTEGER DEFAULT 1,
ADD COLUMN max_creator_lists INTEGER DEFAULT 3,
ADD COLUMN max_client_workspaces INTEGER DEFAULT 0,
ADD COLUMN service_fee_percentage NUMERIC(5, 2) DEFAULT 12.00;

-- Creator-specific restriction fields
ALTER TABLE subscription_plans
ADD COLUMN max_portfolio_items INTEGER DEFAULT 10,
ADD COLUMN commission_percentage NUMERIC(5, 2) DEFAULT 15.00,
ADD COLUMN has_verified_badge BOOLEAN DEFAULT FALSE,
ADD COLUMN search_placement_priority INTEGER DEFAULT 0,
ADD COLUMN can_message_brands_first BOOLEAN DEFAULT FALSE;

-- Common feature flags
ALTER TABLE subscription_plans
ADD COLUMN has_advanced_analytics BOOLEAN DEFAULT FALSE,
ADD COLUMN has_priority_listing BOOLEAN DEFAULT FALSE,
ADD COLUMN has_custom_branding BOOLEAN DEFAULT FALSE,
ADD COLUMN has_dedicated_support BOOLEAN DEFAULT FALSE,
ADD COLUMN has_api_access BOOLEAN DEFAULT FALSE;

-- ===========================================================================
-- STEP 2: Update existing plans with new restriction values
-- ===========================================================================

-- Update Free plan (for brands)
UPDATE subscription_plans
SET
    user_type = 'brand',
    max_active_campaigns = 5,
    max_active_collaborations = 10,
    max_team_members = 1,
    max_creator_lists = 3,
    max_client_workspaces = 0,
    service_fee_percentage = 12.00,
    has_advanced_analytics = FALSE,
    has_priority_listing = FALSE,
    has_custom_branding = FALSE,
    has_dedicated_support = FALSE,
    has_api_access = FALSE,
    platform_fee_percentage = 12.00
WHERE slug = 'free';

-- Update Pro plan (for brands) - $120/mo, $1200/yr
UPDATE subscription_plans
SET
    user_type = 'brand',
    price_monthly = 89.00,
    price_yearly = 890.00,
    max_active_campaigns = 50,
    max_active_collaborations = 100,
    max_team_members = 5,
    max_creator_lists = 50,
    max_client_workspaces = 3,
    service_fee_percentage = 6.00,
    has_advanced_analytics = TRUE,
    has_priority_listing = TRUE,
    has_custom_branding = FALSE,
    has_dedicated_support = FALSE,
    has_api_access = FALSE,
    platform_fee_percentage = 6.00,
    display_order = 3
WHERE slug = 'pro';

-- Update Premium plan (for brands) - $250/mo, $2500/yr
UPDATE subscription_plans
SET
    user_type = 'brand',
    price_monthly = 199.00,
    price_yearly = 1990.00,
    max_active_campaigns = 200,
    max_active_collaborations = 500,
    max_team_members = 20,
    max_creator_lists = 200,
    max_client_workspaces = 10,
    service_fee_percentage = 3.00,
    has_advanced_analytics = TRUE,
    has_priority_listing = TRUE,
    has_custom_branding = TRUE,
    has_dedicated_support = TRUE,
    has_api_access = TRUE,
    platform_fee_percentage = 3.00,
    display_order = 4
WHERE slug = 'premium';

-- ===========================================================================
-- STEP 3: Insert new brand plans
-- ===========================================================================

-- Insert Starter plan ($29/mo, $290/yr)
INSERT INTO subscription_plans (
    name, slug, description, user_type,
    price_monthly, price_yearly,
    max_packages, max_bookings_per_month,
    max_active_campaigns, max_active_collaborations,
    max_team_members, max_creator_lists, max_client_workspaces,
    service_fee_percentage, platform_fee_percentage,
    can_access_briefs, can_access_campaigns, can_create_custom_packages,
    priority_support, analytics_access, api_access,
    has_advanced_analytics, has_priority_listing, has_custom_branding,
    has_dedicated_support, has_api_access,
    featured_priority, badge_label, search_boost,
    is_active, is_default, display_order,
    created_at, updated_at
) VALUES (
    'Starter', 'starter', 'Perfect for small brands starting their influencer marketing journey',
    'brand',
    29.00, 290.00,
    10, 20,
    15, 30,
    2, 10, 1,
    8.00, 8.00,
    TRUE, TRUE, TRUE,
    FALSE, TRUE, FALSE,
    TRUE, FALSE, FALSE,
    FALSE, FALSE,
    1, NULL, 1.0,
    TRUE, FALSE, 2,
    NOW(), NOW()
);

-- Insert Agency plan ($399/mo, $3990/yr)
INSERT INTO subscription_plans (
    name, slug, description, user_type,
    price_monthly, price_yearly,
    max_packages, max_bookings_per_month,
    max_active_campaigns, max_active_collaborations,
    max_team_members, max_creator_lists, max_client_workspaces,
    service_fee_percentage, platform_fee_percentage,
    can_access_briefs, can_access_campaigns, can_create_custom_packages,
    priority_support, analytics_access, api_access,
    has_advanced_analytics, has_priority_listing, has_custom_branding,
    has_dedicated_support, has_api_access,
    featured_priority, badge_label, search_boost,
    is_active, is_default, display_order,
    created_at, updated_at
) VALUES (
    'Agency', 'agency', 'Enterprise solution for agencies managing multiple clients',
    'brand',
    399.00, 3990.00,
    999999, 999999,
    999999, 999999,
    999999, 999999, 999999,
    2.00, 2.00,
    TRUE, TRUE, TRUE,
    TRUE, TRUE, TRUE,
    TRUE, TRUE, TRUE,
    TRUE, TRUE,
    5, 'Agency Partner', 1.5,
    TRUE, FALSE, 5,
    NOW(), NOW()
);

-- ===========================================================================
-- STEP 4: Insert new creator plans
-- ===========================================================================

-- Insert Creator Free plan
INSERT INTO subscription_plans (
    name, slug, description, user_type,
    price_monthly, price_yearly,
    max_packages, max_bookings_per_month,
    max_portfolio_items, commission_percentage,
    has_verified_badge, search_placement_priority,
    can_message_brands_first,
    can_access_briefs, can_access_campaigns, can_create_custom_packages,
    priority_support, analytics_access, api_access,
    has_advanced_analytics, has_priority_listing,
    featured_priority, search_boost,
    is_active, is_default, display_order,
    created_at, updated_at
) VALUES (
    'Creator Free', 'creator-free', 'Start your creator journey on BantuBuzz',
    'creator',
    0.00, 0.00,
    3, 5,
    10, 15.00,
    FALSE, 0,
    FALSE,
    TRUE, TRUE, TRUE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE,
    0, 1.0,
    TRUE, TRUE, 1,
    NOW(), NOW()
);

-- Insert Rising plan ($9/mo, $90/yr)
INSERT INTO subscription_plans (
    name, slug, description, user_type,
    price_monthly, price_yearly,
    max_packages, max_bookings_per_month,
    max_portfolio_items, commission_percentage,
    has_verified_badge, search_placement_priority,
    can_message_brands_first,
    can_access_briefs, can_access_campaigns, can_create_custom_packages,
    priority_support, analytics_access, api_access,
    has_advanced_analytics, has_priority_listing,
    featured_priority, badge_label, search_boost,
    is_active, is_default, display_order,
    created_at, updated_at
) VALUES (
    'Rising', 'rising', 'Grow your creator business with enhanced features',
    'creator',
    9.00, 90.00,
    10, 20,
    50, 10.00,
    TRUE, 1,
    TRUE,
    TRUE, TRUE, TRUE,
    FALSE, TRUE, FALSE,
    TRUE, TRUE,
    2, 'Rising Star', 1.2,
    TRUE, FALSE, 2,
    NOW(), NOW()
);

-- Insert Creator Pro plan ($19/mo, $190/yr)
INSERT INTO subscription_plans (
    name, slug, description, user_type,
    price_monthly, price_yearly,
    max_packages, max_bookings_per_month,
    max_portfolio_items, commission_percentage,
    has_verified_badge, search_placement_priority,
    can_message_brands_first,
    can_access_briefs, can_access_campaigns, can_create_custom_packages,
    priority_support, analytics_access, api_access,
    has_advanced_analytics, has_priority_listing,
    featured_priority, badge_label, search_boost,
    is_active, is_default, display_order,
    created_at, updated_at
) VALUES (
    'Creator Pro', 'pro-creator', 'Maximum visibility and minimum fees for professional creators',
    'creator',
    19.00, 190.00,
    999999, 999999,
    999999, 7.00,
    TRUE, 2,
    TRUE,
    TRUE, TRUE, TRUE,
    TRUE, TRUE, TRUE,
    TRUE, TRUE,
    3, 'Creator Pro', 1.5,
    TRUE, FALSE, 3,
    NOW(), NOW()
);

-- ===========================================================================
-- STEP 5: Update display_order for existing Free plan
-- ===========================================================================

UPDATE subscription_plans
SET display_order = 1
WHERE slug = 'free';

-- ===========================================================================
-- Verification queries (run these to verify the migration)
-- ===========================================================================

-- View all brand plans
-- SELECT id, name, slug, user_type, price_monthly, price_yearly, service_fee_percentage, max_active_campaigns, display_order
-- FROM subscription_plans
-- WHERE user_type = 'brand'
-- ORDER BY display_order;

-- View all creator plans
-- SELECT id, name, slug, user_type, price_monthly, price_yearly, commission_percentage, max_portfolio_items, display_order
-- FROM subscription_plans
-- WHERE user_type = 'creator'
-- ORDER BY display_order;

-- ===========================================================================
-- ROLLBACK SCRIPT (if needed)
-- ===========================================================================

-- To rollback this migration, run:
-- DELETE FROM subscription_plans WHERE slug IN ('starter', 'agency', 'creator-free', 'rising', 'pro-creator');
-- ALTER TABLE subscription_plans DROP COLUMN user_type;
-- ALTER TABLE subscription_plans DROP COLUMN max_active_campaigns;
-- ALTER TABLE subscription_plans DROP COLUMN max_active_collaborations;
-- ALTER TABLE subscription_plans DROP COLUMN max_team_members;
-- ALTER TABLE subscription_plans DROP COLUMN max_creator_lists;
-- ALTER TABLE subscription_plans DROP COLUMN max_client_workspaces;
-- ALTER TABLE subscription_plans DROP COLUMN service_fee_percentage;
-- ALTER TABLE subscription_plans DROP COLUMN max_portfolio_items;
-- ALTER TABLE subscription_plans DROP COLUMN commission_percentage;
-- ALTER TABLE subscription_plans DROP COLUMN has_verified_badge;
-- ALTER TABLE subscription_plans DROP COLUMN search_placement_priority;
-- ALTER TABLE subscription_plans DROP COLUMN can_message_brands_first;
-- ALTER TABLE subscription_plans DROP COLUMN has_advanced_analytics;
-- ALTER TABLE subscription_plans DROP COLUMN has_priority_listing;
-- ALTER TABLE subscription_plans DROP COLUMN has_custom_branding;
-- ALTER TABLE subscription_plans DROP COLUMN has_dedicated_support;
-- ALTER TABLE subscription_plans DROP COLUMN has_api_access;
