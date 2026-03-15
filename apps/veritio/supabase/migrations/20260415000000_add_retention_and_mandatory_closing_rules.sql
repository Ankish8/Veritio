-- Migration: Add retention tracking and mandatory closing rules
-- Purpose:
--   1. Track last_response_at for activity-based retention
--   2. Add retention status tracking columns
--   3. Enforce mandatory closing rules with strict defaults

-- ============================================================================
-- PART 1: Activity Tracking for Retention
-- ============================================================================

-- Track when the last participant completed a response
-- This is updated via trigger when a participant status changes to 'completed'
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ DEFAULT NULL;

-- Track retention warning notifications
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS retention_warning_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Track when recordings were deleted (study data preserved, just recordings gone)
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS recordings_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient retention cleanup queries
-- Find studies where recordings haven't been deleted and are potentially stale
CREATE INDEX IF NOT EXISTS idx_studies_retention_cleanup
ON studies (last_response_at, last_opened_at)
WHERE recordings_deleted_at IS NULL
  AND status IN ('active', 'completed', 'paused');

-- Add comments explaining the columns
COMMENT ON COLUMN studies.last_response_at IS 'Timestamp of the last completed participant response (updated via trigger)';
COMMENT ON COLUMN studies.retention_warning_sent_at IS 'Timestamp when retention warning email was sent';
COMMENT ON COLUMN studies.recordings_deleted_at IS 'Timestamp when recordings were auto-deleted (study data preserved)';

-- ============================================================================
-- PART 2: Trigger to Update last_response_at
-- ============================================================================

-- Function to update study's last_response_at when a participant completes
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

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS trg_update_study_last_response_at ON participants;

CREATE TRIGGER trg_update_study_last_response_at
AFTER INSERT OR UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_study_last_response_at();

-- ============================================================================
-- PART 3: Backfill last_response_at for existing studies
-- ============================================================================

-- Set last_response_at to the most recent completed participant's completed_at
UPDATE studies s
SET last_response_at = (
  SELECT MAX(p.completed_at)
  FROM participants p
  WHERE p.study_id = s.id
    AND p.status = 'completed'
)
WHERE s.last_response_at IS NULL;

-- ============================================================================
-- PART 4: Constants for Retention Policy (documented in comments)
-- ============================================================================

-- Retention Policy Constants:
-- - INACTIVE_NO_RESPONSE_DAYS: 30 days (no new participants)
-- - INACTIVE_NOT_VIEWED_DAYS: 15 days (researcher hasn't opened study)
-- - RECORDING_RETENTION_DAYS: 90 days (after becoming inactive)
-- - WARNING_DAYS_BEFORE_DELETE: 7 days (email warning before deletion)
--
-- Closing Rule Defaults:
-- - MAX_PARTICIPANTS_DEFAULT: 100
-- - MAX_CLOSE_DATE_DAYS: 30 (maximum days from launch)
-- - CLOSING_RULE_TYPE_DEFAULT: 'both' (mandatory)

-- ============================================================================
-- PART 5: Note on closing_rule enforcement
-- ============================================================================

-- The closing_rule column already exists with DEFAULT '{"type": "none"}'
-- We're NOT changing the database default to preserve existing studies
-- Instead, the application layer will:
--   1. Enforce 'both' type for new studies
--   2. Validate maxParticipants <= 100
--   3. Validate closeDate <= 30 days from now
--
-- This allows existing studies to keep their settings while new studies
-- get the strict defaults enforced at the application layer.
