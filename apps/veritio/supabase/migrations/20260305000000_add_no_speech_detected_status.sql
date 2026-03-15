-- Add 'no_speech_detected' status to transcripts table
--
-- Issue: Deepgram returns 200 OK with empty transcript when no speech is detected,
-- which gets marked as 'completed' with 0 words. This is confusing for users.
--
-- Solution: Add explicit status for this case to improve UX and clarity.

-- Update status check constraint to include 'no_speech_detected'
ALTER TABLE transcripts
DROP CONSTRAINT IF EXISTS transcripts_status_check;

ALTER TABLE transcripts
ADD CONSTRAINT transcripts_status_check CHECK (status IN (
  'pending',              -- Waiting to process
  'processing',           -- Currently processing
  'retrying',             -- Failed, scheduled for retry
  'completed',            -- Successfully completed with transcript
  'no_speech_detected',   -- Processed successfully but no speech found (0 words)
  'failed'                -- Permanently failed (max retries exceeded or non-retryable error)
));

-- Add helpful comment
COMMENT ON COLUMN transcripts.status IS
  'Transcript processing status:
   - pending: Queued for processing
   - processing: Currently being transcribed
   - retrying: Temporary failure, will retry
   - completed: Success with transcript (word_count > 0)
   - no_speech_detected: Success but no speech in audio (word_count = 0)
   - failed: Permanent failure after retries';
