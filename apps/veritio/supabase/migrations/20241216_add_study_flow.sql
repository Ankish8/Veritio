-- Study Flow System Migration
-- Adds tables for questionnaires, screening, and participant flow management

-- ============================================================================
-- STUDY FLOW QUESTIONS TABLE
-- Stores questions for screening, pre-study, and post-study questionnaires
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_flow_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Section placement: which part of the study flow this question belongs to
  section TEXT NOT NULL CHECK (section IN ('screening', 'pre_study', 'post_study')),
  position INTEGER NOT NULL DEFAULT 0,

  -- Question type determines the UI and response format
  question_type TEXT NOT NULL CHECK (question_type IN (
    'single_line_text',   -- Short text input
    'multi_line_text',    -- Long text/textarea
    'radio',              -- Single select from options
    'dropdown',           -- Single select dropdown
    'checkbox',           -- Multi-select checkboxes
    'likert',             -- 5 or 7 point scale
    'nps',                -- Net Promoter Score (0-10)
    'matrix',             -- Grid of rows x columns
    'ranking'             -- Drag to reorder items
  )),

  -- Question content
  question_text TEXT NOT NULL,
  question_text_html TEXT,  -- Rich text version for rendering
  is_required BOOLEAN DEFAULT false,

  -- Type-specific configuration stored as JSON
  -- See study-flow-types.ts for the shape of each config type
  config JSONB DEFAULT '{}',

  -- Display logic: conditions to show/hide this question based on previous answers
  -- Shape: { action: 'show'|'hide', conditions: [...], matchAll: boolean }
  display_logic JSONB DEFAULT NULL,

  -- Branching logic: for screening questions, determines flow after answer
  -- Shape: { rules: [{ optionId, target: 'next'|'reject'|'go_to_study' }], defaultTarget }
  branching_logic JSONB DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STUDY FLOW RESPONSES TABLE
-- Stores participant answers to study flow questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_flow_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES study_flow_questions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Response value - flexible JSON to accommodate all question types:
  -- text: "answer string"
  -- radio/dropdown: { "optionId": "uuid" }
  -- checkbox: ["optionId1", "optionId2"]
  -- likert/nps: { "value": 5 }
  -- matrix: { "rowId1": "columnId", "rowId2": "columnId" }
  -- ranking: ["itemId1", "itemId2", "itemId3"] (ordered)
  response_value JSONB NOT NULL,

  -- Time spent on this question in milliseconds
  response_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each participant can only answer each question once
  UNIQUE(participant_id, question_id)
);

-- ============================================================================
-- EXTEND PARTICIPANTS TABLE
-- Add fields for participant identification and screening
-- ============================================================================
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  identifier_type TEXT CHECK (identifier_type IN ('anonymous', 'email', 'custom'));

ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  identifier_value TEXT;

ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  screening_result TEXT CHECK (screening_result IN ('passed', 'rejected'));

ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  rejected_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sfq_study ON study_flow_questions(study_id);
CREATE INDEX IF NOT EXISTS idx_sfq_section ON study_flow_questions(section);
CREATE INDEX IF NOT EXISTS idx_sfq_study_section ON study_flow_questions(study_id, section);
CREATE INDEX IF NOT EXISTS idx_sfq_position ON study_flow_questions(study_id, section, position);

CREATE INDEX IF NOT EXISTS idx_sfr_participant ON study_flow_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_sfr_question ON study_flow_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_sfr_study ON study_flow_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_sfr_study_participant ON study_flow_responses(study_id, participant_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE study_flow_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_flow_responses ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matching existing pattern - can be tightened later)
DROP POLICY IF EXISTS "Allow all study_flow_questions operations" ON study_flow_questions;
CREATE POLICY "Allow all study_flow_questions operations"
  ON study_flow_questions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all study_flow_responses operations" ON study_flow_responses;
CREATE POLICY "Allow all study_flow_responses operations"
  ON study_flow_responses FOR ALL USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS study_flow_questions_updated_at ON study_flow_questions;
CREATE TRIGGER study_flow_questions_updated_at
  BEFORE UPDATE ON study_flow_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON study_flow_questions TO authenticated;
GRANT ALL ON study_flow_questions TO anon;
GRANT ALL ON study_flow_responses TO authenticated;
GRANT ALL ON study_flow_responses TO anon;
