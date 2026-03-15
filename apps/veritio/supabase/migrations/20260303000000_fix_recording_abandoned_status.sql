-- Fix: Add 'abandoned' status to recordings CHECK constraint
--
-- Issue: Code uses 'abandoned' status in two places:
--   - src/steps/cron/cleanup-stale-recordings.step.ts
--   - src/steps/api/recordings/finalize-beacon.step.ts
-- But the original CHECK constraint didn't include it, causing database errors.
--
-- The 'abandoned' status is used for recordings that:
--   - Were stuck in 'uploading' state for >1 hour
--   - Had chunks uploaded but were never finalized
--   - Need cleanup by the cron job

-- Drop the existing constraint
ALTER TABLE recordings
DROP CONSTRAINT IF EXISTS recordings_status_check;

-- Add the constraint back with 'abandoned' included
ALTER TABLE recordings
ADD CONSTRAINT recordings_status_check CHECK (status IN (
  'uploading',        -- Chunks being uploaded
  'processing',       -- Upload complete, being finalized
  'ready',            -- Ready for playback
  'transcribing',     -- Transcription in progress
  'completed',        -- Fully processed with transcription
  'failed',           -- Processing failed
  'deleted',          -- Soft deleted (GDPR)
  'abandoned'         -- Upload started but never completed (stale)
));

-- Add index for abandoned status to optimize cleanup cron query
CREATE INDEX IF NOT EXISTS idx_recordings_abandoned
ON recordings(status, created_at)
WHERE status = 'abandoned';

-- Add comment explaining the status flow
COMMENT ON COLUMN recordings.status IS
  'Recording status: uploading → processing → ready → transcribing → completed.
   Can transition to failed at any stage.
   Can be marked as abandoned by cleanup cron if stuck in uploading >1 hour.
   Can be soft-deleted (deleted status) for GDPR compliance.';
