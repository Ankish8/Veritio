-- Component Instance Positions Table
-- Stores the positions of component instances within frames for accurate compositing
-- When a component variant changes, we can overlay the variant image at this position

CREATE TABLE prototype_test_component_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  prototype_id UUID NOT NULL REFERENCES prototype_test_prototypes(id) ON DELETE CASCADE,

  -- Instance identification
  instance_id TEXT NOT NULL,              -- Figma INSTANCE node ID (e.g., "359:12289")
  frame_node_id TEXT NOT NULL,            -- Parent frame's Figma node ID
  component_id TEXT NOT NULL,             -- Component this is an instance of (componentId from Figma)
  component_set_id TEXT,                  -- Parent component set ID (for linking to variants)

  -- Position relative to frame (calculated from absoluteBoundingBox)
  relative_x REAL NOT NULL,               -- X offset from frame origin
  relative_y REAL NOT NULL,               -- Y offset from frame origin
  width REAL NOT NULL,                    -- Instance width
  height REAL NOT NULL,                   -- Instance height

  -- Frame dimensions (for scaling calculations)
  frame_width REAL,                       -- Parent frame width
  frame_height REAL,                      -- Parent frame height

  -- Metadata
  instance_name TEXT,                     -- Human-readable name from Figma
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(prototype_id, instance_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_component_instances_prototype ON prototype_test_component_instances(prototype_id);
CREATE INDEX idx_component_instances_frame ON prototype_test_component_instances(frame_node_id);
CREATE INDEX idx_component_instances_component ON prototype_test_component_instances(component_id);
CREATE INDEX idx_component_instances_component_set ON prototype_test_component_instances(component_set_id);

-- Comments for documentation
COMMENT ON TABLE prototype_test_component_instances IS 'Stores positions of component instances within frames for accurate visual compositing';
COMMENT ON COLUMN prototype_test_component_instances.instance_id IS 'Figma INSTANCE node ID - this is what NEW_STATE events reference';
COMMENT ON COLUMN prototype_test_component_instances.component_id IS 'The component this is an instance of - links to component definitions';
COMMENT ON COLUMN prototype_test_component_instances.relative_x IS 'X position relative to parent frame top-left corner';
COMMENT ON COLUMN prototype_test_component_instances.relative_y IS 'Y position relative to parent frame top-left corner';

-- Enable RLS
ALTER TABLE prototype_test_component_instances ENABLE ROW LEVEL SECURITY;

-- RLS policy - users can access component instances for their studies
CREATE POLICY "Users can access their study component instances"
  ON prototype_test_component_instances
  FOR ALL USING (
    study_id IN (
      SELECT id FROM studies WHERE user_id = auth.uid()::text
    )
  );

-- Public read policy for participants (needed for player)
CREATE POLICY "Participants can view component instances for active studies"
  ON prototype_test_component_instances
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM studies WHERE status = 'active'
    )
  );
