-- Add post_task_questions column to tasks table for Tree Test studies
-- Stores an array of question objects for questions asked after each task completion

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS post_task_questions JSONB DEFAULT '[]';

-- Add comment explaining the structure
COMMENT ON COLUMN tasks.post_task_questions IS 'Array of post-task question objects with shape: { id, question_type, question_text, question_text_html, is_required, config, position }';
