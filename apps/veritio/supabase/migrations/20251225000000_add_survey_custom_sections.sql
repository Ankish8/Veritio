-- Migration: Add Survey Custom Sections
-- Purpose: Allow users to create named sections within the Survey Questionnaire
-- that can be used as skip targets for branching logic

-- Create the survey_custom_sections table
CREATE TABLE IF NOT EXISTS survey_custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  -- Parent section determines where this custom section lives
  -- Currently only 'survey' is supported, but designed for future extensibility
  parent_section TEXT NOT NULL DEFAULT 'survey' CHECK (parent_section IN ('survey', 'pre_study', 'post_study')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique section names within a study
  CONSTRAINT survey_custom_sections_unique_name UNIQUE(study_id, name)
);

-- Add index for efficient lookup by study
CREATE INDEX IF NOT EXISTS idx_survey_custom_sections_study_id
  ON survey_custom_sections(study_id);

-- Add index for position-based ordering
CREATE INDEX IF NOT EXISTS idx_survey_custom_sections_position
  ON survey_custom_sections(study_id, position);

-- Add custom_section_id to study_flow_questions to link questions to sections
ALTER TABLE study_flow_questions
ADD COLUMN IF NOT EXISTS custom_section_id UUID REFERENCES survey_custom_sections(id) ON DELETE SET NULL;

-- Add index for efficient lookup of questions by section
CREATE INDEX IF NOT EXISTS idx_study_flow_questions_custom_section
  ON study_flow_questions(custom_section_id);

-- Add score field to question options (stored in config JSON)
-- Note: This is handled in application code by updating the config JSON structure
-- No schema change needed since config is already JSONB

-- Enable RLS on the new table
ALTER TABLE survey_custom_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users
-- Note: Service role (used by backend) bypasses RLS
-- Study ownership is validated at the application layer
CREATE POLICY "Users can manage survey custom sections"
  ON survey_custom_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = survey_custom_sections.study_id
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_survey_custom_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_custom_sections_updated_at
  BEFORE UPDATE ON survey_custom_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_custom_sections_updated_at();

-- Comment for documentation
COMMENT ON TABLE survey_custom_sections IS 'Custom sections within the Survey Questionnaire that can be used as branching targets';
COMMENT ON COLUMN survey_custom_sections.parent_section IS 'The fixed section this custom section belongs to (survey, pre_study, post_study)';
COMMENT ON COLUMN survey_custom_sections.is_visible IS 'Whether this section is visible to participants (can be hidden via rules)';
COMMENT ON COLUMN study_flow_questions.custom_section_id IS 'Optional reference to a custom section this question belongs to';
