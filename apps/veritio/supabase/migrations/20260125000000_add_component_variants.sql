-- Component Variant Images Table
-- Stores pre-exported images of Figma component variants for visual differentiation in path steps
CREATE TABLE prototype_test_component_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  prototype_id UUID NOT NULL REFERENCES prototype_test_prototypes(id) ON DELETE CASCADE,

  -- Component identification
  component_set_id TEXT NOT NULL,           -- Parent component set node ID
  component_set_name TEXT NOT NULL,         -- Human-readable name (e.g., "Tab Bar")
  variant_id TEXT NOT NULL,                 -- Specific variant node ID
  variant_name TEXT NOT NULL,               -- e.g., "State=Active"
  variant_properties JSONB NOT NULL,        -- { State: "Active", Size: "Large" }

  -- Image data
  image_url TEXT NOT NULL,                  -- Figma CDN URL or uploaded image
  image_width INTEGER,                      -- Pixel dimensions
  image_height INTEGER,

  -- Metadata
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(prototype_id, variant_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_component_variants_prototype ON prototype_test_component_variants(prototype_id);
CREATE INDEX idx_component_variants_set ON prototype_test_component_variants(component_set_id);

-- Add overlay detection columns to frames table
ALTER TABLE prototype_test_frames
  ADD COLUMN is_overlay BOOLEAN DEFAULT false,
  ADD COLUMN overlay_type TEXT CHECK (overlay_type IN ('modal', 'sheet', 'popover', 'panel', 'toast'));

-- Add comment for documentation
COMMENT ON TABLE prototype_test_component_variants IS 'Stores Figma component variant images exported during prototype sync for visual differentiation in path builder';
COMMENT ON COLUMN prototype_test_frames.is_overlay IS 'Whether this frame represents an overlay (modal, sheet, etc.) that appears on top of other frames';
COMMENT ON COLUMN prototype_test_frames.overlay_type IS 'Type of overlay if is_overlay is true';

-- Enable RLS
ALTER TABLE prototype_test_component_variants ENABLE ROW LEVEL SECURITY;

-- RLS policy - users can access component variants for their studies
CREATE POLICY "Users can access their study component variants"
  ON prototype_test_component_variants
  FOR ALL USING (
    study_id IN (
      SELECT id FROM studies WHERE user_id = auth.uid()::text
    )
  );

-- Public read policy for participants (needed for player to show variant images)
CREATE POLICY "Participants can view component variants for active studies"
  ON prototype_test_component_variants
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM studies WHERE status = 'active'
    )
  );
