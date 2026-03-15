-- Migration: Add new question types to study_flow_questions
-- Adds: multiple_choice, opinion_scale, yes_no
-- These new types consolidate and improve upon the deprecated radio, checkbox, likert types

-- ============================================================================
-- UPDATE QUESTION_TYPE CHECK CONSTRAINT
-- ============================================================================

-- First, drop the existing constraint
ALTER TABLE study_flow_questions
DROP CONSTRAINT IF EXISTS study_flow_questions_question_type_check;

-- Add the new constraint with all question types (old + new)
ALTER TABLE study_flow_questions
ADD CONSTRAINT study_flow_questions_question_type_check
CHECK (question_type IN (
  -- Original types
  'single_line_text',   -- Short text input
  'multi_line_text',    -- Long text/textarea
  'radio',              -- Single select from options (DEPRECATED - use multiple_choice)
  'dropdown',           -- Single select dropdown (DEPRECATED - use multiple_choice with mode: 'dropdown')
  'checkbox',           -- Multi-select checkboxes (DEPRECATED - use multiple_choice)
  'likert',             -- 5 or 7 point scale (DEPRECATED - use opinion_scale)
  'nps',                -- Net Promoter Score (0-10)
  'matrix',             -- Grid of rows x columns
  'ranking',            -- Drag to reorder items
  -- New consolidated types
  'multiple_choice',    -- Unified selection: single, multi, or dropdown mode
  'opinion_scale',      -- Customizable scale (5-11 points, numbers/stars/emotions)
  'yes_no'              -- Binary choice with icons or emotions
));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN study_flow_questions.question_type IS
'Question type determines UI and response format. New types: multiple_choice (replaces radio/checkbox/dropdown), opinion_scale (replaces likert), yes_no (binary choice). Old types kept for backwards compatibility.';
