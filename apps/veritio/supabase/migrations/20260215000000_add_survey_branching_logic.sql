-- Add survey_branching_logic column to study_flow_questions
-- This stores inline branching logic for survey questions (skip-to-question, end-survey, etc.)

ALTER TABLE study_flow_questions
ADD COLUMN IF NOT EXISTS survey_branching_logic JSONB DEFAULT NULL;

COMMENT ON COLUMN study_flow_questions.survey_branching_logic
IS 'Inline branching logic for survey questions (skip-to-question, skip-to-section, end-survey, etc.)';
