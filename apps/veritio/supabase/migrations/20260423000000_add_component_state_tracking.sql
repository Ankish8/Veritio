-- New table for component state change events
CREATE TABLE prototype_test_component_state_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prototype_test_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES prototype_test_tasks(id) ON DELETE CASCADE,
  frame_id UUID REFERENCES prototype_test_frames(id),
  component_node_id TEXT NOT NULL,
  from_variant_id TEXT,
  to_variant_id TEXT NOT NULL,
  is_timed_change BOOLEAN DEFAULT false,
  sequence_number INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by task/session
CREATE INDEX idx_component_state_events_task ON prototype_test_component_state_events(task_id);
CREATE INDEX idx_component_state_events_session ON prototype_test_component_state_events(session_id);

-- Add component states snapshot to click events (for heatmap filtering)
ALTER TABLE prototype_test_click_events
  ADD COLUMN component_states JSONB;

-- Add interactive components settings to tasks
ALTER TABLE prototype_test_tasks
  ADD COLUMN enable_interactive_components BOOLEAN DEFAULT false,
  ADD COLUMN success_component_states JSONB;

-- Enable RLS
ALTER TABLE prototype_test_component_state_events ENABLE ROW LEVEL SECURITY;

-- RLS policy (same as other prototype_test tables)
-- Note: user_id is TEXT, auth.uid() returns UUID, so cast to text
CREATE POLICY "Users can access their study component state events"
  ON prototype_test_component_state_events
  FOR ALL USING (
    study_id IN (
      SELECT id FROM studies WHERE user_id = auth.uid()::text
    )
  );
