-- ================================================================
-- Migration: Add audio response question support
-- Description: Adds question_response_id column to recordings table
-- for linking per-question audio recordings to study flow responses
-- ================================================================

-- Add question_response_id column to recordings table
-- This is a client-generated UUID that links to a specific question response
-- Used when scope='task' for audio_response question types
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS question_response_id TEXT NULL;

-- Create index for efficient lookups when querying by question_response_id
CREATE INDEX IF NOT EXISTS idx_recordings_question_response_id
ON recordings(question_response_id)
WHERE question_response_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN recordings.question_response_id IS 'Client-generated UUID for linking recordings to specific question responses (used for audio_response question type)';

-- Update the scope check to include 'question' as a valid scope
-- This allows us to distinguish between session, task, and question-level recordings
-- Note: We use ALTER TABLE with DROP/ADD CHECK instead of modifying in place
-- First drop the existing constraint if it exists, then add the new one

-- Check if constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'recordings' AND constraint_name LIKE '%scope%'
  ) THEN
    ALTER TABLE recordings DROP CONSTRAINT IF EXISTS recordings_scope_check;
  END IF;
END $$;

-- Add updated constraint with 'question' scope
ALTER TABLE recordings
ADD CONSTRAINT recordings_scope_check
CHECK (scope IN ('session', 'task', 'question'));

-- Add comment about the scope values
COMMENT ON COLUMN recordings.scope IS 'Recording scope: session (entire session), task (per prototype task), question (per audio_response question)';
