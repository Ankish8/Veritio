-- Add retry tracking fields to transcripts table
--
-- Purpose: Enable exponential backoff retry logic for transient Deepgram failures.
-- Retries are appropriate for network errors, timeouts, rate limits, but not for
-- validation errors (invalid audio format, no speech detected, etc.)

-- Add retry tracking columns
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Add cost tracking column (for monitoring)
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS estimated_cost_usd DECIMAL(10, 4);

-- Update status check to include 'retrying'
ALTER TABLE transcripts
DROP CONSTRAINT IF EXISTS transcripts_status_check;

ALTER TABLE transcripts
ADD CONSTRAINT transcripts_status_check CHECK (status IN (
  'pending',      -- Waiting to process
  'processing',   -- Currently processing
  'retrying',     -- Failed, scheduled for retry
  'completed',    -- Successfully completed
  'failed'        -- Permanently failed (max retries exceeded or non-retryable error)
));

-- Index for finding transcripts ready to retry (used by retry cron if needed)
CREATE INDEX IF NOT EXISTS idx_transcripts_retry_ready
ON transcripts(next_retry_at)
WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Comment documenting retry strategy
COMMENT ON COLUMN transcripts.retry_count IS
  'Number of retry attempts for failed transcriptions. Max 3 retries with exponential backoff: 30s, 2m, 5m.';

COMMENT ON COLUMN transcripts.next_retry_at IS
  'Timestamp when next retry should be attempted. NULL if not scheduled for retry.';

COMMENT ON COLUMN transcripts.estimated_cost_usd IS
  'Estimated Deepgram API cost based on recording duration and model used.';
