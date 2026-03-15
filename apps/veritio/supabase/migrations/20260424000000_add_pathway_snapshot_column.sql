-- Add pathway snapshot column to prototype_test_task_attempts
-- This stores a frozen copy of the task's success_pathway at submission time,
-- so analysis displays the correct pathway labels even if the task is later edited.
ALTER TABLE prototype_test_task_attempts
ADD COLUMN IF NOT EXISTS success_pathway_snapshot JSONB NULL;
