-- Migration: Add prototype_test to study_type constraint
-- Description: Adds 'prototype_test' to the studies.study_type check constraint

-- Drop the existing check constraint on study_type
ALTER TABLE studies
DROP CONSTRAINT IF EXISTS studies_study_type_check;

-- Add new constraint with prototype_test included
ALTER TABLE studies
ADD CONSTRAINT studies_study_type_check
CHECK (study_type IN ('card_sort', 'tree_test', 'survey', 'prototype_test'));

-- Update comment
COMMENT ON COLUMN studies.study_type IS 'Type of study: card_sort, tree_test, survey, or prototype_test';
