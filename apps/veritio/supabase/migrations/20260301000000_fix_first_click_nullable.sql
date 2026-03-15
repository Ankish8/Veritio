-- Fix first_click_responses to allow null click coordinates for skipped tasks
-- The original schema had NOT NULL constraints but skipped tasks need null values

-- Remove NOT NULL constraints from click coordinates
ALTER TABLE first_click_responses
  ALTER COLUMN click_x DROP NOT NULL,
  ALTER COLUMN click_y DROP NOT NULL,
  ALTER COLUMN time_to_click_ms DROP NOT NULL;

-- Update the check constraints to allow null when is_skipped is true
ALTER TABLE first_click_responses
  DROP CONSTRAINT IF EXISTS first_click_responses_click_x_check,
  DROP CONSTRAINT IF EXISTS first_click_responses_click_y_check;

-- Add new check constraints that allow null for skipped tasks
ALTER TABLE first_click_responses
  ADD CONSTRAINT first_click_responses_click_x_check
    CHECK (is_skipped = true OR (click_x >= 0 AND click_x <= 1)),
  ADD CONSTRAINT first_click_responses_click_y_check
    CHECK (is_skipped = true OR (click_y >= 0 AND click_y <= 1));
