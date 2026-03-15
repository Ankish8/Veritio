-- Add created_at column to participants table
-- This column is needed for Supabase aggregations and general auditability

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill created_at with started_at for existing rows (best approximation)
UPDATE participants
SET created_at = started_at
WHERE created_at IS NULL;

-- Make created_at NOT NULL now that we've backfilled
ALTER TABLE participants
ALTER COLUMN created_at SET NOT NULL;

-- Add index for common queries that order by created_at
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN participants.created_at IS 'Timestamp when the participant record was created (auto-populated)';
