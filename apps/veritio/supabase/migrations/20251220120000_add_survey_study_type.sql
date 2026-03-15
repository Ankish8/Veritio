-- =============================================================================
-- Migration: Add Survey Study Type
-- Description: Adds survey as a new study type with dedicated response storage
-- =============================================================================

-- Add 'survey' to the study_type enum (if using enum, otherwise handled in app layer)
-- Note: PostgreSQL doesn't allow direct enum modification in some cases,
-- but since study_type is stored as text with check constraint, we just need
-- to ensure the application accepts the new value

-- Add 'survey' to the study_flow_questions section enum
-- This allows questions to be part of the 'survey' section
ALTER TABLE study_flow_questions
DROP CONSTRAINT IF EXISTS study_flow_questions_section_check;

ALTER TABLE study_flow_questions
ADD CONSTRAINT study_flow_questions_section_check
CHECK (section IN ('screening', 'pre_study', 'post_study', 'survey'));

-- Create dedicated survey_responses table
-- This stores participant responses to survey questions
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES study_flow_questions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  response_value JSONB NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one response per participant per question
  UNIQUE(participant_id, question_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_participant ON survey_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_study ON survey_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_question ON survey_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);

-- Add RLS policies for survey_responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users on their own studies
CREATE POLICY "Users can manage survey responses for their studies"
ON survey_responses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM studies s
    WHERE s.id = survey_responses.study_id
  )
);

-- Policy: Allow participants to insert their own responses
CREATE POLICY "Participants can insert their responses"
ON survey_responses
FOR INSERT
WITH CHECK (true);

-- Policy: Allow reading survey responses for study analysis
CREATE POLICY "Anyone can read survey responses"
ON survey_responses
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_survey_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS survey_responses_updated_at ON survey_responses;
CREATE TRIGGER survey_responses_updated_at
  BEFORE UPDATE ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_responses_updated_at();

-- Add comment for documentation
COMMENT ON TABLE survey_responses IS 'Stores participant responses to survey study questions';
COMMENT ON COLUMN survey_responses.response_value IS 'JSON containing the response value, structure depends on question type';
COMMENT ON COLUMN survey_responses.response_time_ms IS 'Time in milliseconds the participant spent on this question';
