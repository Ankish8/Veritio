-- Add url_path success criteria type and success_path column for live website tasks
ALTER TABLE live_website_tasks ADD COLUMN IF NOT EXISTS success_path JSONB;

ALTER TABLE live_website_tasks DROP CONSTRAINT IF EXISTS live_website_tasks_success_criteria_type_check;
ALTER TABLE live_website_tasks ADD CONSTRAINT live_website_tasks_success_criteria_type_check
  CHECK (success_criteria_type IN ('self_reported', 'url_match', 'url_path'));
