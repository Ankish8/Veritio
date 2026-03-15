-- Migration: Repair retention backfill
-- Purpose: Run the full retention migration that may have partially failed

-- ============================================================================
-- PART 1: Add columns (idempotent with IF NOT EXISTS)
-- ============================================================================

ALTER TABLE studies
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE studies
ADD COLUMN IF NOT EXISTS retention_warning_sent_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE studies
ADD COLUMN IF NOT EXISTS recordings_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient retention cleanup queries
CREATE INDEX IF NOT EXISTS idx_studies_retention_cleanup
ON studies (last_response_at, last_opened_at)
WHERE recordings_deleted_at IS NULL
  AND status IN ('active', 'completed', 'paused');

-- ============================================================================
-- PART 2: Backfill last_response_at for existing studies
-- ============================================================================

-- Only updates rows where last_response_at is still NULL
UPDATE studies s
SET last_response_at = (
  SELECT MAX(p.completed_at)
  FROM participants p
  WHERE p.study_id = s.id
    AND p.status = 'completed'
)
WHERE s.last_response_at IS NULL;

-- Verify the trigger exists, create if missing
CREATE OR REPLACE FUNCTION update_study_last_response_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE studies
    SET last_response_at = NOW()
    WHERE id = NEW.study_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (DROP IF EXISTS, then CREATE)
DROP TRIGGER IF EXISTS trg_update_study_last_response_at ON participants;

CREATE TRIGGER trg_update_study_last_response_at
AFTER INSERT OR UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_study_last_response_at();
