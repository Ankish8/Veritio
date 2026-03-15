-- Recording Annotations: Text labels, shapes, blur regions, and highlights
-- Implements NLE-style video annotations for UX research recordings

-- ============================================================================
-- RECORDING_ANNOTATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recording_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Timing
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,

  -- Annotation type
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('text', 'shape', 'blur', 'highlight')),

  -- Content (for text annotations)
  content TEXT,

  -- Style as JSONB (flexible for different annotation types)
  -- Contains: x, y, width, height, color, fontSize, fontFamily, etc.
  style JSONB NOT NULL DEFAULT '{}',

  -- Layer ordering (higher = on top)
  layer INTEGER NOT NULL DEFAULT 0,

  -- Creator tracking
  created_by TEXT NOT NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation
  CONSTRAINT valid_annotation_range CHECK (end_ms > start_ms)
);

-- Indexes
CREATE INDEX idx_recording_annotations_recording ON recording_annotations(recording_id);
CREATE INDEX idx_recording_annotations_time_range ON recording_annotations(recording_id, start_ms, end_ms);
CREATE INDEX idx_recording_annotations_type ON recording_annotations(recording_id, annotation_type);
CREATE INDEX idx_recording_annotations_created_by ON recording_annotations(created_by);
CREATE INDEX idx_recording_annotations_not_deleted ON recording_annotations(recording_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE recording_annotations IS 'Video annotations for recordings: text labels, shapes, blur regions, highlights';
COMMENT ON COLUMN recording_annotations.annotation_type IS 'Type: text (labels), shape (rectangle/circle/arrow), blur (privacy), highlight (emphasis)';
COMMENT ON COLUMN recording_annotations.style IS 'JSONB containing position (x,y as %), dimensions (width,height as %), colors, fonts, etc.';
COMMENT ON COLUMN recording_annotations.layer IS 'Z-order for overlapping annotations. Higher values appear on top.';

-- ============================================================================
-- RECORDING_TRACK_CONFIGS TABLE - User track layout preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS recording_track_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Track configurations as JSONB array
  -- Each track: { type, name, position, properties: { visible, audioEnabled, locked, height, color, showWaveform } }
  tracks JSONB NOT NULL DEFAULT '[]',

  -- Timeline preferences
  zoom_level REAL NOT NULL DEFAULT 1.0,
  scroll_position INTEGER NOT NULL DEFAULT 0,

  -- Layout preset for video tracks
  layout_preset TEXT NOT NULL DEFAULT 'pip-bottom-right' CHECK (layout_preset IN (
    'fullscreen', 'pip-top-left', 'pip-top-right', 'pip-bottom-left', 'pip-bottom-right',
    'side-by-side', 'screen-only', 'webcam-only'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user has one config per recording
  CONSTRAINT unique_user_recording_config UNIQUE (recording_id, user_id)
);

-- Indexes
CREATE INDEX idx_recording_track_configs_recording ON recording_track_configs(recording_id);
CREATE INDEX idx_recording_track_configs_user ON recording_track_configs(user_id);

COMMENT ON TABLE recording_track_configs IS 'Per-user track layout and timeline preferences for recordings';
COMMENT ON COLUMN recording_track_configs.tracks IS 'JSONB array of track configurations with visibility, audio, lock states';
COMMENT ON COLUMN recording_track_configs.layout_preset IS 'Video layout preset: PiP positions, side-by-side, or single video modes';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE recording_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_track_configs ENABLE ROW LEVEL SECURITY;

-- Recording Annotations policies
CREATE POLICY "Study owners can manage annotations" ON recording_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recordings r
      JOIN studies s ON s.id = r.study_id
      WHERE r.id = recording_annotations.recording_id
    )
  );

-- Recording Track Configs policies
CREATE POLICY "Users can manage their own track configs" ON recording_track_configs
  FOR ALL USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get annotations visible at a specific time
CREATE OR REPLACE FUNCTION get_annotations_at_time(
  p_recording_id UUID,
  p_time_ms INTEGER
)
RETURNS SETOF recording_annotations AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM recording_annotations
  WHERE recording_id = p_recording_id
    AND deleted_at IS NULL
    AND start_ms <= p_time_ms
    AND end_ms >= p_time_ms
  ORDER BY layer ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_annotations_at_time IS 'Returns all annotations visible at a specific time point, ordered by layer';

-- Function to get annotations in a time range
CREATE OR REPLACE FUNCTION get_annotations_in_range(
  p_recording_id UUID,
  p_start_ms INTEGER,
  p_end_ms INTEGER
)
RETURNS SETOF recording_annotations AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM recording_annotations
  WHERE recording_id = p_recording_id
    AND deleted_at IS NULL
    AND start_ms < p_end_ms
    AND end_ms > p_start_ms
  ORDER BY start_ms ASC, layer ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_annotations_in_range IS 'Returns all annotations that overlap with a time range';
