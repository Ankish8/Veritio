-- Migration: Add email notification settings and digest queue
-- Enables per-study email notification configuration and daily digest batching

-- Add email_notification_settings column to studies table
-- This stores per-study notification preferences as JSON
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS email_notification_settings JSONB DEFAULT NULL;

-- Add response_prevention_settings column to studies table
-- This stores per-study duplicate prevention preferences as JSON
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS response_prevention_settings JSONB DEFAULT NULL;

-- Create study_digest_queue table for daily digest aggregation
-- Accumulates response counts throughout the day, processed by cron at 9 AM
CREATE TABLE IF NOT EXISTS study_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,

  -- Aggregation data
  responses_count INTEGER NOT NULL DEFAULT 0,
  responses_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One queue entry per study
  UNIQUE(study_id)
);

-- Index for efficient cron job processing
CREATE INDEX idx_study_digest_queue_updated ON study_digest_queue(last_updated);
CREATE INDEX idx_study_digest_queue_user ON study_digest_queue(clerk_user_id);

-- Enable Row Level Security
ALTER TABLE study_digest_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations (queue is managed by API/cron)
DROP POLICY IF EXISTS "Allow all digest queue operations" ON study_digest_queue;
CREATE POLICY "Allow all digest queue operations"
  ON study_digest_queue FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON study_digest_queue TO authenticated;
GRANT ALL ON study_digest_queue TO anon;

-- Add comments for documentation
COMMENT ON TABLE study_digest_queue IS 'Accumulates response counts for daily digest emails. Processed and cleared by cron job at 9 AM.';
COMMENT ON COLUMN study_digest_queue.responses_count IS 'Number of responses received since last digest';
COMMENT ON COLUMN study_digest_queue.responses_since IS 'Timestamp of first response in this batch';
COMMENT ON COLUMN study_digest_queue.last_updated IS 'Timestamp of most recent response added to batch';

COMMENT ON COLUMN studies.email_notification_settings IS 'JSON config for email notifications: enabled, triggers (everyResponse, milestones, dailyDigest, onClose), maxEmailsPerHour, milestonesReached';
COMMENT ON COLUMN studies.response_prevention_settings IS 'JSON config for duplicate prevention: level (none/relaxed/moderate/strict), allowRetakeAfterDays';
