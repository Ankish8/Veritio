-- Add page_name column to prototype_test_frames
-- This stores the Figma page name for grouping frames in the UI

ALTER TABLE prototype_test_frames
ADD COLUMN IF NOT EXISTS page_name TEXT;

-- Add index for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_prototype_test_frames_page_name
  ON prototype_test_frames(prototype_id, page_name);

COMMENT ON COLUMN prototype_test_frames.page_name IS 'Figma page name containing this frame (for UI grouping)';
