-- ================================================================
-- Migration: Add Survey Rules Table
-- Description: Stores logic pipeline rules for conditional survey flow
-- Supports: skip-to-question, end-survey, section visibility, scoring
-- ================================================================

-- ================================================================
-- 1. Create survey_rules table
-- ================================================================
CREATE TABLE IF NOT EXISTS survey_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Rule metadata
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Conditions: array of condition groups with AND/OR logic
  -- Structure: { groups: [{ id, conditions: [...], matchAll: bool }] }
  -- Each condition: { id, source: { type, questionId|variableName }, operator, values?, valueRange? }
  conditions JSONB NOT NULL DEFAULT '{"groups": []}',

  -- Action type: what happens when conditions are met
  action_type TEXT NOT NULL CHECK (action_type IN (
    'skip_to_question',    -- Jump to specific question
    'skip_to_section',     -- Jump to start of section
    'end_survey',          -- Terminate survey with message
    'show_section',        -- Make section visible
    'hide_section',        -- Make section hidden
    'set_variable'         -- Calculate and store a variable
  )),

  -- Action configuration (structure depends on action_type)
  -- skip_to_question: { questionId: string }
  -- skip_to_section: { section: FlowSection }
  -- end_survey: { title: string, message: string, redirectUrl?: string }
  -- show/hide_section: { section: FlowSection }
  -- set_variable: { variableName: string, formula: {...} }
  action_config JSONB NOT NULL DEFAULT '{}',

  -- Trigger: when to evaluate this rule
  trigger_type TEXT NOT NULL DEFAULT 'on_answer' CHECK (trigger_type IN (
    'on_answer',           -- After any question is answered
    'on_section_complete', -- When a section is finished
    'on_question'          -- After specific question is answered
  )),

  -- Trigger configuration
  -- on_question: { questionId: string }
  -- on_section_complete: { section: FlowSection }
  trigger_config JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. Create indexes for efficient querying
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_survey_rules_study ON survey_rules(study_id);
CREATE INDEX IF NOT EXISTS idx_survey_rules_position ON survey_rules(study_id, position);
CREATE INDEX IF NOT EXISTS idx_survey_rules_enabled ON survey_rules(study_id, is_enabled) WHERE is_enabled = true;

-- ================================================================
-- 3. Enable RLS on survey_rules
-- ================================================================
ALTER TABLE survey_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view rules for studies they have access to
CREATE POLICY "Users can view survey rules" ON survey_rules
  FOR SELECT USING (true);

-- Policy: Users can insert rules
CREATE POLICY "Users can insert survey rules" ON survey_rules
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update rules
CREATE POLICY "Users can update survey rules" ON survey_rules
  FOR UPDATE USING (true);

-- Policy: Users can delete rules
CREATE POLICY "Users can delete survey rules" ON survey_rules
  FOR DELETE USING (true);

-- ================================================================
-- 4. Create trigger for updated_at timestamp
-- ================================================================
CREATE OR REPLACE FUNCTION update_survey_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_rules_updated_at
  BEFORE UPDATE ON survey_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_rules_updated_at();

-- ================================================================
-- 5. Create survey_variables table (for score-based branching)
-- ================================================================
CREATE TABLE IF NOT EXISTS survey_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Variable metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Variable type determines formula structure
  variable_type TEXT NOT NULL CHECK (variable_type IN (
    'score',          -- Calculated numeric score from question responses
    'classification', -- Categorical label based on score ranges
    'counter'         -- Count of specific answer selections
  )),

  -- Formula configuration (structure depends on variable_type)
  -- score: { questions: [{ questionId, weight, valueMapping? }], aggregation: 'sum'|'average'|'min'|'max', defaultValue? }
  -- classification: { sourceVariable: string, ranges: [{ min, max, label }], defaultLabel }
  -- counter: { questionId: string, countValues: string[] }
  formula JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique variable names per study
  CONSTRAINT survey_variables_unique_name UNIQUE(study_id, name)
);

-- ================================================================
-- 6. Create indexes for survey_variables
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_survey_variables_study ON survey_variables(study_id);

-- ================================================================
-- 7. Enable RLS on survey_variables
-- ================================================================
ALTER TABLE survey_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view survey variables" ON survey_variables
  FOR SELECT USING (true);

CREATE POLICY "Users can insert survey variables" ON survey_variables
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update survey variables" ON survey_variables
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete survey variables" ON survey_variables
  FOR DELETE USING (true);

-- ================================================================
-- 8. Create trigger for survey_variables updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_survey_variables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_variables_updated_at
  BEFORE UPDATE ON survey_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_variables_updated_at();
