-- Fix: Add component_state to valid_success_criteria constraint
-- The Zod schema and TypeScript types already support component_state,
-- but the database constraint was missing it, causing 500 errors on save.

-- Drop the old constraint
ALTER TABLE prototype_test_tasks
  DROP CONSTRAINT IF EXISTS valid_success_criteria;

-- Add updated constraint that includes component_state
ALTER TABLE prototype_test_tasks
  ADD CONSTRAINT valid_success_criteria CHECK (
    (success_criteria_type = 'destination' AND success_frame_ids IS NOT NULL) OR
    (success_criteria_type = 'pathway' AND success_pathway IS NOT NULL) OR
    (success_criteria_type = 'component_state' AND state_success_criteria IS NOT NULL) OR
    (success_criteria_type IS NULL)
  );
