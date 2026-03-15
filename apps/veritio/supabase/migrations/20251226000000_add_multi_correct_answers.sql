-- Add correct_node_ids column for multi-select correct answers in Tree Test tasks
-- Stores an array of tree node UUIDs that represent correct destinations

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS correct_node_ids JSONB DEFAULT '[]';

-- Migrate existing single correct_node_id to array format
UPDATE tasks
SET correct_node_ids = CASE
  WHEN correct_node_id IS NOT NULL THEN jsonb_build_array(correct_node_id)
  ELSE '[]'::jsonb
END
WHERE correct_node_ids = '[]' OR correct_node_ids IS NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN tasks.correct_node_ids IS 'Array of correct node UUIDs for tree test tasks. Multiple leaf nodes can be marked as correct destinations.';
