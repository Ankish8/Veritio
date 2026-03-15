-- =============================================================================
-- Migration: Fix Study Type Constraint
-- Description: Adds 'survey' to the studies.study_type check constraint
-- =============================================================================

-- Drop the existing check constraint on study_type
ALTER TABLE studies
DROP CONSTRAINT IF EXISTS studies_study_type_check;

-- Add updated check constraint that includes 'survey'
ALTER TABLE studies
ADD CONSTRAINT studies_study_type_check
CHECK (study_type IN ('card_sort', 'tree_test', 'survey'));

-- Add comment for documentation
COMMENT ON COLUMN studies.study_type IS 'Type of study: card_sort, tree_test, or survey';
