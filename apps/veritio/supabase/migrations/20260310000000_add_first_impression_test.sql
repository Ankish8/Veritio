-- First Impression Test Study Type
-- This migration adds support for first impression testing, which shows participants
-- a design for a brief configurable duration (5-20 seconds) to capture their immediate impressions.
-- Supports A/B testing with weighted random assignment, per-design questions, and detailed timing.

-- ============================================================================
-- 1. Update study_type constraint to include first_impression
-- ============================================================================
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'studies_study_type_check'
  ) THEN
    ALTER TABLE studies DROP CONSTRAINT studies_study_type_check;
  END IF;

  -- Add the new constraint with first_impression included
  ALTER TABLE studies ADD CONSTRAINT studies_study_type_check
    CHECK (study_type IN ('card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression'));
END $$;

COMMENT ON COLUMN studies.study_type IS
  'Type of study: card_sort, tree_test, survey, prototype_test, first_click, or first_impression';

-- ============================================================================
-- 2. First Impression Designs Table
-- Stores design variants for each first impression test study (up to 10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_impression_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Design identification
  name TEXT,                             -- Custom name (null = auto-generate A, B, C...)
  position INTEGER NOT NULL DEFAULT 0,   -- Order in the list

  -- Image source (uploaded or from Figma)
  image_url TEXT,                        -- URL to the image in storage (null until uploaded)
  original_filename TEXT,                -- Original file name for reference
  source_type TEXT NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'figma')),
  figma_file_key TEXT,                   -- If imported from Figma
  figma_node_id TEXT,                    -- If imported from Figma

  -- Image dimensions (original)
  width INTEGER,
  height INTEGER,

  -- Mobile-optimized version (auto-generated on upload)
  mobile_image_url TEXT,                 -- Smaller version for mobile devices
  mobile_width INTEGER,
  mobile_height INTEGER,

  -- Display settings
  display_mode TEXT NOT NULL DEFAULT 'fit' CHECK (display_mode IN ('fit', 'fill', 'actual', 'hidpi')),
  background_color TEXT DEFAULT '#ffffff',

  -- A/B testing weight (0-100, weights are relative across all designs)
  weight INTEGER NOT NULL DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),

  -- Practice design (excluded from analysis, shown first)
  is_practice BOOLEAN NOT NULL DEFAULT false,

  -- Per-design questions stored inline (same pattern as first_click post_task_questions)
  questions JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for first_impression_designs
CREATE INDEX IF NOT EXISTS idx_first_impression_designs_study_id
  ON first_impression_designs(study_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_designs_position
  ON first_impression_designs(study_id, position);

COMMENT ON TABLE first_impression_designs IS
  'Design variants for first impression tests. Supports up to 10 designs per study with weighted random assignment.';
COMMENT ON COLUMN first_impression_designs.display_mode IS
  'fit = contain within viewport, fill = cover viewport, actual = 100% scale, hidpi = 2x scale for retina';
COMMENT ON COLUMN first_impression_designs.weight IS
  'Weight for random assignment (0-100). Higher = more likely to be shown. Weights are relative to total.';
COMMENT ON COLUMN first_impression_designs.is_practice IS
  'Practice designs are shown first and excluded from analysis results';
COMMENT ON COLUMN first_impression_designs.mobile_image_url IS
  'Optimized smaller image for mobile devices (auto-generated on upload)';
COMMENT ON COLUMN first_impression_designs.questions IS
  'Array of question objects: [{id, type, text, options, required, position}]';

-- ============================================================================
-- 3. First Impression Sessions Table
-- Tracks which design variant(s) each participant is assigned
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_impression_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

  -- Assignment mode outcome
  assignment_mode TEXT NOT NULL CHECK (assignment_mode IN ('random_single', 'sequential_all')),

  -- For random_single: which design was assigned
  assigned_design_id UUID REFERENCES first_impression_designs(id) ON DELETE SET NULL,

  -- For sequential_all: order of designs shown (JSON array of design IDs in order)
  design_sequence JSONB DEFAULT '[]',

  -- Device and context info
  device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Session timing
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_time_ms INTEGER,

  -- Each participant has one session per study
  UNIQUE(study_id, participant_id)
);

-- Indexes for first_impression_sessions
CREATE INDEX IF NOT EXISTS idx_first_impression_sessions_study_id
  ON first_impression_sessions(study_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_sessions_participant_id
  ON first_impression_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_sessions_design_id
  ON first_impression_sessions(assigned_design_id);

COMMENT ON TABLE first_impression_sessions IS
  'Tracks participant sessions and design variant assignment for first impression tests';
COMMENT ON COLUMN first_impression_sessions.assignment_mode IS
  'random_single = participant sees one weighted-random design, sequential_all = participant sees all designs in order';
COMMENT ON COLUMN first_impression_sessions.design_sequence IS
  'For sequential_all mode: ordered array of design IDs shown to participant';

-- ============================================================================
-- 4. First Impression Exposures Table
-- Records each individual design exposure event with precise timing
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_impression_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES first_impression_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES first_impression_designs(id) ON DELETE CASCADE,

  -- Exposure order (1st, 2nd, 3rd design shown)
  exposure_sequence INTEGER NOT NULL DEFAULT 1,

  -- Configured duration from settings
  configured_duration_ms INTEGER NOT NULL,

  -- Actual timing (for precision analysis)
  actual_display_ms INTEGER,
  countdown_duration_ms INTEGER DEFAULT 0,

  -- Precise timestamps
  countdown_started_at TIMESTAMPTZ,
  exposure_started_at TIMESTAMPTZ NOT NULL,
  exposure_ended_at TIMESTAMPTZ,
  questions_started_at TIMESTAMPTZ,
  questions_completed_at TIMESTAMPTZ,

  -- Viewport info at exposure time
  viewport_width INTEGER,
  viewport_height INTEGER,
  image_rendered_width INTEGER,
  image_rendered_height INTEGER,
  used_mobile_image BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Each design shown once per session
  UNIQUE(session_id, design_id)
);

-- Indexes for first_impression_exposures
CREATE INDEX IF NOT EXISTS idx_first_impression_exposures_session_id
  ON first_impression_exposures(session_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_exposures_study_id
  ON first_impression_exposures(study_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_exposures_participant_id
  ON first_impression_exposures(participant_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_exposures_design_id
  ON first_impression_exposures(design_id);

COMMENT ON TABLE first_impression_exposures IS
  'Records each individual design exposure event with timing and viewport details';
COMMENT ON COLUMN first_impression_exposures.actual_display_ms IS
  'Actual time the design was visible (may differ from configured duration due to rendering)';
COMMENT ON COLUMN first_impression_exposures.used_mobile_image IS
  'Whether the mobile-optimized image was served to this participant';

-- ============================================================================
-- 5. First Impression Responses Table
-- Question responses linked to specific design exposures with timing
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_impression_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id UUID NOT NULL REFERENCES first_impression_exposures(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES first_impression_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES first_impression_designs(id) ON DELETE CASCADE,

  -- Question identification (matches question.id in design's questions JSONB)
  question_id TEXT NOT NULL,

  -- Response value (flexible JSON matching study_flow_responses pattern)
  response_value JSONB NOT NULL,

  -- Detailed timing metrics
  response_time_ms INTEGER,                     -- Total time to answer
  time_to_first_interaction_ms INTEGER,         -- Time until first keystroke/click
  time_to_completion_ms INTEGER,                -- Time from first interaction to submit

  -- Timestamps
  question_shown_at TIMESTAMPTZ,
  first_interaction_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Each question answered once per exposure
  UNIQUE(exposure_id, question_id)
);

-- Indexes for first_impression_responses
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_exposure_id
  ON first_impression_responses(exposure_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_session_id
  ON first_impression_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_study_id
  ON first_impression_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_participant_id
  ON first_impression_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_design_id
  ON first_impression_responses(design_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_question_id
  ON first_impression_responses(question_id);

-- Full-text search on text responses
CREATE INDEX IF NOT EXISTS idx_first_impression_responses_text_search
  ON first_impression_responses USING gin(to_tsvector('english', response_value::text));

COMMENT ON TABLE first_impression_responses IS
  'Stores question responses for each design exposure with detailed timing metrics';
COMMENT ON COLUMN first_impression_responses.time_to_first_interaction_ms IS
  'Milliseconds from question display until participant starts interacting';

-- ============================================================================
-- 6. First Impression Interaction Events Table
-- High-fidelity interaction logging for timing analysis (focus/blur, keystrokes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_impression_interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id UUID NOT NULL REFERENCES first_impression_exposures(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES first_impression_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

  -- Event context
  phase TEXT NOT NULL CHECK (phase IN ('countdown', 'exposure', 'questions')),
  question_id TEXT,                      -- Only for questions phase

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'countdown_start',     -- Countdown animation started
    'countdown_end',       -- Countdown completed
    'exposure_start',      -- Design appeared on screen
    'exposure_end',        -- Design hidden (duration elapsed)
    'focus',               -- Browser/tab gained focus
    'blur',                -- Browser/tab lost focus
    'visibility_visible',  -- Page became visible
    'visibility_hidden',   -- Page became hidden
    'question_enter',      -- Question became active/focused
    'question_leave',      -- Question lost focus
    'input_start',         -- Started typing/selecting
    'input_change',        -- Input value changed
    'input_complete',      -- Finished input (blur/submit)
    'selection_change',    -- Radio/checkbox selection changed
    'keystroke',           -- Key pressed (count only, no content)
    'submit'               -- Question/page submitted
  )),

  -- Event timing
  timestamp_ms INTEGER NOT NULL,          -- Milliseconds from session start
  event_timestamp TIMESTAMPTZ NOT NULL,   -- Absolute timestamp

  -- Event-specific data (no PII)
  event_data JSONB DEFAULT '{}',
  -- Examples:
  -- countdown_start/end: {}
  -- exposure_start/end: { designId }
  -- focus/blur: {}
  -- question_enter/leave: { questionId, questionType }
  -- input_start/change: { questionId, inputType, valueLength }
  -- selection_change: { questionId, optionIndex, selected }
  -- keystroke: { questionId, keyCount (accumulated, no actual keys) }
  -- submit: { questionId }

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for high-volume event table
CREATE INDEX IF NOT EXISTS idx_first_impression_events_exposure_id
  ON first_impression_interaction_events(exposure_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_events_session_id
  ON first_impression_interaction_events(session_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_events_study_id
  ON first_impression_interaction_events(study_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_events_type
  ON first_impression_interaction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_first_impression_events_timestamp
  ON first_impression_interaction_events(exposure_id, timestamp_ms);

COMMENT ON TABLE first_impression_interaction_events IS
  'High-fidelity interaction logging for timing analysis including focus/blur, keystrokes, and selections';
COMMENT ON COLUMN first_impression_interaction_events.timestamp_ms IS
  'Milliseconds from session start for precise timing analysis';
COMMENT ON COLUMN first_impression_interaction_events.phase IS
  'countdown = during countdown, exposure = during design display, questions = during question answering';

-- ============================================================================
-- 7. Word Groupings Table (for word cloud analysis)
-- Researcher-defined groupings of similar words
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_impression_word_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  design_id UUID REFERENCES first_impression_designs(id) ON DELETE CASCADE,
  question_id TEXT,                      -- Which question this grouping applies to

  group_name TEXT NOT NULL,              -- Display name for the group
  words TEXT[] NOT NULL,                 -- Array of words in this group

  created_by TEXT,                       -- User ID who created the grouping
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique grouping per study/design/question combo
  UNIQUE(study_id, design_id, question_id, group_name)
);

CREATE INDEX IF NOT EXISTS idx_first_impression_word_groups_study_id
  ON first_impression_word_groups(study_id);
CREATE INDEX IF NOT EXISTS idx_first_impression_word_groups_design_id
  ON first_impression_word_groups(design_id);

COMMENT ON TABLE first_impression_word_groups IS
  'Researcher-defined word groupings for word cloud analysis (e.g., grouping "clear" and "clean" together)';

-- ============================================================================
-- 8. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE first_impression_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_impression_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_impression_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_impression_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_impression_interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_impression_word_groups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS Policies - Designs (Study Owner Access + Public Read for Active)
-- ============================================================================
CREATE POLICY "Study owners can manage first impression designs"
  ON first_impression_designs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_impression_designs.study_id
    )
  );

-- ============================================================================
-- 10. RLS Policies - Sessions
-- ============================================================================
CREATE POLICY "Study owners can view first impression sessions"
  ON first_impression_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_impression_sessions.study_id
    )
  );

CREATE POLICY "Participants can insert first impression sessions"
  ON first_impression_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can update their own sessions"
  ON first_impression_sessions FOR UPDATE
  USING (true);

-- ============================================================================
-- 11. RLS Policies - Exposures
-- ============================================================================
CREATE POLICY "Study owners can view first impression exposures"
  ON first_impression_exposures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_impression_exposures.study_id
    )
  );

CREATE POLICY "Participants can insert first impression exposures"
  ON first_impression_exposures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can update their own exposures"
  ON first_impression_exposures FOR UPDATE
  USING (true);

-- ============================================================================
-- 12. RLS Policies - Responses
-- ============================================================================
CREATE POLICY "Study owners can view first impression responses"
  ON first_impression_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_impression_responses.study_id
    )
  );

CREATE POLICY "Participants can insert first impression responses"
  ON first_impression_responses FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 13. RLS Policies - Interaction Events
-- ============================================================================
CREATE POLICY "Study owners can view interaction events"
  ON first_impression_interaction_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_impression_interaction_events.study_id
    )
  );

CREATE POLICY "Participants can insert interaction events"
  ON first_impression_interaction_events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 14. RLS Policies - Word Groups
-- ============================================================================
CREATE POLICY "Study owners can manage word groups"
  ON first_impression_word_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_impression_word_groups.study_id
    )
  );

-- ============================================================================
-- 15. Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS first_impression_designs_updated_at ON first_impression_designs;
CREATE TRIGGER first_impression_designs_updated_at
  BEFORE UPDATE ON first_impression_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS first_impression_word_groups_updated_at ON first_impression_word_groups;
CREATE TRIGGER first_impression_word_groups_updated_at
  BEFORE UPDATE ON first_impression_word_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
