-- Add post-task responses table for live website tests
-- The submission service (services/participant/submissions/live-website.ts) writes to this table
-- but it was missing from the original migration.

CREATE TABLE IF NOT EXISTS live_website_post_task_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES live_website_responses(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES live_website_tasks(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lwptr_study ON live_website_post_task_responses(study_id);
CREATE INDEX idx_lwptr_response ON live_website_post_task_responses(response_id);
CREATE INDEX idx_lwptr_participant ON live_website_post_task_responses(participant_id);

ALTER TABLE live_website_post_task_responses ENABLE ROW LEVEL SECURITY;
