-- Add cancellation fields to collaborations table
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS cancelled_by_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add rating penalty fields to creator_profiles table
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS cancelled_collaborations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_penalty DECIMAL(3,2) DEFAULT 0.00;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_collaborations_cancelled
ON collaborations(cancelled_by_creator, cancelled_at);

CREATE INDEX IF NOT EXISTS idx_creator_cancellations
ON creator_profiles(cancelled_collaborations_count);
