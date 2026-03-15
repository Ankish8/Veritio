-- Migration: Add image_choice question type to study_flow_questions
-- Adds: image_choice - visual selection from images arranged in a grid layout

-- ============================================================================
-- UPDATE QUESTION_TYPE CHECK CONSTRAINT
-- ============================================================================

-- First, drop the existing constraint
ALTER TABLE study_flow_questions
DROP CONSTRAINT IF EXISTS study_flow_questions_question_type_check;

-- Add the new constraint with image_choice included
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
  -- Consolidated types
  'multiple_choice',    -- Unified selection: single, multi, or dropdown mode
  'image_choice',       -- Visual image selection in grid layout (single or multi-select)
  'opinion_scale',      -- Customizable scale (5-11 points, numbers/stars/emotions)
  'yes_no',             -- Binary choice with icons or emotions
  'slider'              -- Continuous numeric scale (e.g., 0-100 with configurable range)
));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN study_flow_questions.question_type IS
'Question type determines UI and response format. Types: multiple_choice (selection), image_choice (visual grid selection), opinion_scale (discrete scale), yes_no (binary), slider (continuous scale), nps (0-10), matrix (grid), ranking (reorder). Deprecated: radio, checkbox, dropdown, likert.';
