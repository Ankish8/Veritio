-- Add completion_method column to live_website_responses
-- Tracks HOW a task was completed: auto URL match, auto path match (direct/indirect), self-reported, skip, abandon, timeout
ALTER TABLE live_website_responses
  ADD COLUMN IF NOT EXISTS completion_method TEXT;

-- Add CHECK constraint for valid values
ALTER TABLE live_website_responses
  ADD CONSTRAINT valid_completion_method
  CHECK (completion_method IS NULL OR completion_method IN ('auto_url', 'auto_url_direct', 'auto_url_indirect', 'auto_path', 'auto_path_direct', 'auto_path_indirect', 'self_reported', 'skip', 'abandon', 'timeout'));
