-- Migration: Phase 0 Builder Improvements
-- Adds support for state-based success criteria and custom labels

-- Add state success criteria column for "Reach Component State" type
-- Structure: { states: [{ componentNodeId, variantId, variantName }], logic: 'AND' | 'OR' }
-- Note: success_component_states already exists for "destination + capture state" mode
-- This new column supports the dedicated "component_state" success criteria type
ALTER TABLE prototype_test_tasks
  ADD COLUMN IF NOT EXISTS state_success_criteria JSONB;

-- Add custom label support for component state events
-- Allows researchers to assign meaningful names like "Tab: Settings" or "Toggle: On"
ALTER TABLE prototype_test_component_state_events
  ADD COLUMN IF NOT EXISTS custom_label TEXT;

-- Comment on new columns for documentation
COMMENT ON COLUMN prototype_test_tasks.state_success_criteria IS
  'State-based success criteria config: { states: ComponentStateSuccessCriteria[], logic: AND|OR }';

COMMENT ON COLUMN prototype_test_component_state_events.custom_label IS
  'Optional user-defined label for this component state (e.g., "Tab: Settings")';
