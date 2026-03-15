-- ================================================================
-- Migration: Add Prototype Test Tables
-- Description: Creates all tables needed for prototype testing study type
-- Supports: Figma prototype import, tasks, sessions, click/navigation tracking
-- ================================================================

-- ================================================================
-- 1. Prototype Test Prototypes Table
-- Stores Figma prototype info per study (1:1 with study)
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_prototypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  figma_url TEXT NOT NULL,
  figma_file_key TEXT NOT NULL,
  figma_node_id TEXT,
  name TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  frame_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(study_id)
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_prototypes_study
  ON prototype_test_prototypes(study_id);

COMMENT ON TABLE prototype_test_prototypes IS 'Stores Figma prototype information for each prototype test study';
COMMENT ON COLUMN prototype_test_prototypes.figma_url IS 'Full Figma prototype share URL';
COMMENT ON COLUMN prototype_test_prototypes.figma_file_key IS 'Extracted file key from Figma URL';
COMMENT ON COLUMN prototype_test_prototypes.figma_node_id IS 'Starting node ID from Figma URL (optional)';
COMMENT ON COLUMN prototype_test_prototypes.sync_status IS 'pending | syncing | completed | failed';

-- ================================================================
-- 2. Prototype Test Frames Table
-- Cached Figma frames with metadata and thumbnails
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prototype_id UUID NOT NULL REFERENCES prototype_test_prototypes(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  figma_node_id TEXT NOT NULL,
  name TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prototype_id, figma_node_id)
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_frames_prototype
  ON prototype_test_frames(prototype_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_frames_study
  ON prototype_test_frames(study_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_frames_node
  ON prototype_test_frames(figma_node_id);

COMMENT ON TABLE prototype_test_frames IS 'Cached Figma frame metadata and thumbnails';
COMMENT ON COLUMN prototype_test_frames.figma_node_id IS 'Figma node ID (e.g., "1:2")';
COMMENT ON COLUMN prototype_test_frames.thumbnail_url IS 'Cached screenshot URL from Supabase storage';

-- ================================================================
-- 3. Prototype Test Tasks Table
-- Tasks for prototype testing (similar to tree_test tasks)
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instruction TEXT,
  start_frame_id UUID REFERENCES prototype_test_frames(id) ON DELETE SET NULL,
  success_criteria_type TEXT NOT NULL DEFAULT 'destination',
  success_frame_ids JSONB DEFAULT '[]',
  success_pathway JSONB,
  time_limit_ms INTEGER,
  post_task_questions JSONB DEFAULT '[]',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_success_criteria CHECK (
    (success_criteria_type = 'destination' AND success_frame_ids IS NOT NULL) OR
    (success_criteria_type = 'pathway' AND success_pathway IS NOT NULL) OR
    (success_criteria_type IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_tasks_study
  ON prototype_test_tasks(study_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_tasks_position
  ON prototype_test_tasks(study_id, position);

COMMENT ON TABLE prototype_test_tasks IS 'Tasks for prototype testing with success criteria';
COMMENT ON COLUMN prototype_test_tasks.success_criteria_type IS 'destination | pathway';
COMMENT ON COLUMN prototype_test_tasks.success_frame_ids IS 'Array of valid destination frame IDs (for destination type)';
COMMENT ON COLUMN prototype_test_tasks.success_pathway IS 'Object with frames array and strict boolean (for pathway type)';
COMMENT ON COLUMN prototype_test_tasks.post_task_questions IS 'PostTaskQuestion[] - questions after task completion';

-- ================================================================
-- 4. Prototype Test Sessions Table
-- Tracks participant sessions (high-level session data)
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_time_ms INTEGER,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_id)
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_sessions_study
  ON prototype_test_sessions(study_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_sessions_participant
  ON prototype_test_sessions(participant_id);

COMMENT ON TABLE prototype_test_sessions IS 'Participant sessions for prototype testing';
COMMENT ON COLUMN prototype_test_sessions.device_info IS 'JSON with browser, os, screen dimensions';

-- ================================================================
-- 5. Prototype Test Task Attempts Table
-- Per-task results for each participant
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_task_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prototype_test_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES prototype_test_tasks(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  path_taken JSONB DEFAULT '[]',
  is_direct BOOLEAN,
  total_time_ms INTEGER,
  time_to_first_click_ms INTEGER,
  click_count INTEGER DEFAULT 0,
  misclick_count INTEGER DEFAULT 0,
  backtrack_count INTEGER DEFAULT 0,
  post_task_responses JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_id, task_id),
  CONSTRAINT valid_outcome CHECK (outcome IN ('success', 'failure', 'abandoned', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_task_attempts_session
  ON prototype_test_task_attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_task_attempts_study
  ON prototype_test_task_attempts(study_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_task_attempts_task
  ON prototype_test_task_attempts(task_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_task_attempts_participant
  ON prototype_test_task_attempts(participant_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_task_attempts_outcome
  ON prototype_test_task_attempts(outcome);

COMMENT ON TABLE prototype_test_task_attempts IS 'Per-task results for each participant';
COMMENT ON COLUMN prototype_test_task_attempts.outcome IS 'success | failure | abandoned | skipped';
COMMENT ON COLUMN prototype_test_task_attempts.path_taken IS 'Array of frame IDs in order visited';
COMMENT ON COLUMN prototype_test_task_attempts.is_direct IS 'True if participant took the most direct path';

-- ================================================================
-- 6. Prototype Test Click Events Table
-- High-volume click tracking for detailed analytics
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prototype_test_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES prototype_test_tasks(id) ON DELETE CASCADE,
  frame_id UUID NOT NULL REFERENCES prototype_test_frames(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  viewport_x INTEGER,
  viewport_y INTEGER,
  was_hotspot BOOLEAN DEFAULT false,
  hotspot_id TEXT,
  triggered_transition BOOLEAN DEFAULT false,
  time_since_frame_load_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_click_events_session
  ON prototype_test_click_events(session_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_click_events_study
  ON prototype_test_click_events(study_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_click_events_task
  ON prototype_test_click_events(task_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_click_events_frame
  ON prototype_test_click_events(frame_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_click_events_timestamp
  ON prototype_test_click_events(timestamp);

COMMENT ON TABLE prototype_test_click_events IS 'High-volume click tracking for heatmaps and analytics';
COMMENT ON COLUMN prototype_test_click_events.x IS 'Click X coordinate relative to frame';
COMMENT ON COLUMN prototype_test_click_events.y IS 'Click Y coordinate relative to frame';
COMMENT ON COLUMN prototype_test_click_events.was_hotspot IS 'True if click was on an interactive element';
COMMENT ON COLUMN prototype_test_click_events.triggered_transition IS 'True if click caused screen change';

-- ================================================================
-- 7. Prototype Test Navigation Events Table
-- Tracks screen transitions
-- ================================================================
CREATE TABLE IF NOT EXISTS prototype_test_navigation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prototype_test_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES prototype_test_tasks(id) ON DELETE CASCADE,
  from_frame_id UUID REFERENCES prototype_test_frames(id) ON DELETE SET NULL,
  to_frame_id UUID NOT NULL REFERENCES prototype_test_frames(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  click_event_id UUID REFERENCES prototype_test_click_events(id) ON DELETE SET NULL,
  time_on_from_frame_ms INTEGER,
  sequence_number INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_triggered_by CHECK (triggered_by IN ('click', 'back_button', 'task_start', 'timeout'))
);

CREATE INDEX IF NOT EXISTS idx_prototype_test_navigation_events_session
  ON prototype_test_navigation_events(session_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_navigation_events_task
  ON prototype_test_navigation_events(task_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_navigation_events_from
  ON prototype_test_navigation_events(from_frame_id);

CREATE INDEX IF NOT EXISTS idx_prototype_test_navigation_events_to
  ON prototype_test_navigation_events(to_frame_id);

COMMENT ON TABLE prototype_test_navigation_events IS 'Screen transition tracking for path analysis';
COMMENT ON COLUMN prototype_test_navigation_events.triggered_by IS 'click | back_button | task_start | timeout';
COMMENT ON COLUMN prototype_test_navigation_events.sequence_number IS 'Order of navigation within task attempt';

-- ================================================================
-- 8. Enable Row Level Security (RLS)
-- ================================================================
ALTER TABLE prototype_test_prototypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_test_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_test_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_test_task_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_test_click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prototype_test_navigation_events ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 9. RLS Policies for Authenticated Access
-- ================================================================

-- Prototypes: Access via study ownership
CREATE POLICY "Users can manage their prototype test prototypes"
  ON prototype_test_prototypes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_prototypes.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- Frames: Access via study ownership
CREATE POLICY "Users can manage their prototype test frames"
  ON prototype_test_frames FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_frames.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- Tasks: Access via study ownership
CREATE POLICY "Users can manage their prototype test tasks"
  ON prototype_test_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_tasks.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- Sessions: Read access for study owners, write for service role
CREATE POLICY "Users can view their prototype test sessions"
  ON prototype_test_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_sessions.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- Task Attempts: Read access for study owners
CREATE POLICY "Users can view their prototype test task attempts"
  ON prototype_test_task_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_task_attempts.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- Click Events: Read access for study owners
CREATE POLICY "Users can view their prototype test click events"
  ON prototype_test_click_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_click_events.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- Navigation Events: Read access for study owners
CREATE POLICY "Users can view their prototype test navigation events"
  ON prototype_test_navigation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id = prototype_test_navigation_events.study_id
      AND s.user_id = auth.uid()::text
    )
  );

-- ================================================================
-- 10. Service Role Policies for Participant Submissions
-- ================================================================

-- Allow service role to insert sessions (for participant creation)
CREATE POLICY "Service role can insert prototype test sessions"
  ON prototype_test_sessions FOR INSERT
  WITH CHECK (true);

-- Allow service role to insert task attempts
CREATE POLICY "Service role can insert prototype test task attempts"
  ON prototype_test_task_attempts FOR INSERT
  WITH CHECK (true);

-- Allow service role to insert click events
CREATE POLICY "Service role can insert prototype test click events"
  ON prototype_test_click_events FOR INSERT
  WITH CHECK (true);

-- Allow service role to insert navigation events
CREATE POLICY "Service role can insert prototype test navigation events"
  ON prototype_test_navigation_events FOR INSERT
  WITH CHECK (true);

-- Allow service role to update sessions (for completion)
CREATE POLICY "Service role can update prototype test sessions"
  ON prototype_test_sessions FOR UPDATE
  USING (true);
