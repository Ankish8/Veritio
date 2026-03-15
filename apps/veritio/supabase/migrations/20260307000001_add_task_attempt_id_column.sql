-- ================================================================
-- Migration: Add task_attempt_id to prototype_test_task_attempts
-- Description: Adds client-generated UUID column for linking recordings to task attempts
-- This allows per-task recording scope where each task gets its own recording
-- ================================================================

-- Add task_attempt_id column to prototype_test_task_attempts table
-- This is a client-generated UUID that links to recordings table
ALTER TABLE prototype_test_task_attempts
ADD COLUMN IF NOT EXISTS task_attempt_id TEXT NULL;

-- Create index for efficient lookups when querying by task_attempt_id
CREATE INDEX IF NOT EXISTS idx_task_attempts_task_attempt_id
ON prototype_test_task_attempts(task_attempt_id)
WHERE task_attempt_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN prototype_test_task_attempts.task_attempt_id IS 'Client-generated UUID for linking session recordings to specific task attempts (used for per-task recording scope)';
