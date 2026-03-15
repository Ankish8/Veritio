-- Fix: Add component_state support to valid_success_criteria constraint
-- Issue: The constraint was missing component_state type, causing 500 errors when saving tasks with component state success criteria

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

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT valid_success_criteria ON prototype_test_tasks IS
  'Ensures that each success_criteria_type has its required JSON field: destination requires success_frame_ids, pathway requires success_pathway, component_state requires state_success_criteria';
