-- Add description field to study_flow_questions
-- This allows researchers to add optional notes/helper text to questions
-- that will be displayed to participants below the question title

ALTER TABLE study_flow_questions
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN study_flow_questions.description IS 'Optional helper text/notes shown to participants below the question title';
