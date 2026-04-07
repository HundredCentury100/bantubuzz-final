-- Migration: Add currency column to deposit_requests table
-- Date: 2026-04-07
-- Description: Adds currency column to support multi-currency deposits

ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- This migration has been applied to production on 2026-04-07
