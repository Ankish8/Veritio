-- Migration: Add Widget Analytics Support
-- Phase 2: Extend analytics infrastructure for widget-specific tracking
-- Date: 2026-01-08

-- ============================================================================
-- 1. Extend link_analytics event types for widget events
-- ============================================================================

-- Drop existing constraint
ALTER TABLE link_analytics DROP CONSTRAINT IF EXISTS valid_event_type;

-- Add new constraint with widget event types
ALTER TABLE link_analytics ADD CONSTRAINT valid_event_type
  CHECK (event_type IN (
    -- Existing participant events
    'view', 'start', 'complete', 'screenout', 'quota_full',
    -- New widget events (Phase 2)
    'widget_impression', 'widget_click', 'widget_dismiss'
  ));

COMMENT ON CONSTRAINT valid_event_type ON link_analytics IS
  'Valid event types including participant journey (view→start→complete) and widget interactions (impression→click/dismiss)';

-- ============================================================================
-- 2. Add widget_metadata JSONB column for widget-specific tracking
-- ============================================================================

ALTER TABLE link_analytics ADD COLUMN IF NOT EXISTS widget_metadata JSONB;

-- GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_link_analytics_widget_metadata
  ON link_analytics USING GIN (widget_metadata);

COMMENT ON COLUMN link_analytics.widget_metadata IS
  'Widget-specific metadata: trigger type/value, position, time on page, time visible, session ID, device fingerprint';

-- Example structure:
-- {
--   "triggerType": "time_delay",
--   "triggerValue": 5,
--   "position": "bottom-right",
--   "timeOnPageMs": 12500,
--   "timeVisibleMs": 3200,
--   "deviceFingerprint": "fp_abc123",
--   "sessionId": "sid_xyz789",
--   "alreadyParticipated": false
-- }

-- ============================================================================
-- 3. Create widget_sessions table for persistent session management
-- ============================================================================

CREATE TABLE IF NOT EXISTS widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Device/session identification
  device_fingerprint TEXT NOT NULL,
  session_id TEXT NOT NULL,

  -- Tracking state
  first_impression_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_impression_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  impression_count INTEGER DEFAULT 1 CHECK (impression_count >= 0),

  -- Interaction flags
  has_clicked BOOLEAN DEFAULT false NOT NULL,
  has_dismissed BOOLEAN DEFAULT false NOT NULL,
  has_participated BOOLEAN DEFAULT false NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,

  -- Metadata
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one session per device per study
  CONSTRAINT unique_device_study UNIQUE (study_id, device_fingerprint)
);

-- Indexes for performance
CREATE INDEX idx_widget_sessions_study_id ON widget_sessions(study_id);
CREATE INDEX idx_widget_sessions_fingerprint ON widget_sessions(device_fingerprint);
CREATE INDEX idx_widget_sessions_participant_id ON widget_sessions(participant_id)
  WHERE participant_id IS NOT NULL;
CREATE INDEX idx_widget_sessions_last_impression ON widget_sessions(last_impression_at);

-- ============================================================================
-- 4. Row Level Security (RLS) for widget_sessions
-- ============================================================================

ALTER TABLE widget_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Study owners can read sessions for their studies
CREATE POLICY "Users can read sessions for their studies"
  ON widget_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = widget_sessions.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- Policy: Public endpoint can insert new sessions (widget tracking)
CREATE POLICY "Anyone can insert widget sessions"
  ON widget_sessions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Public endpoint can update sessions (track clicks/dismissals)
CREATE POLICY "Anyone can update widget sessions"
  ON widget_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Study owners can delete sessions for their studies
CREATE POLICY "Users can delete sessions for their studies"
  ON widget_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = widget_sessions.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- ============================================================================
-- 5. Auto-update timestamp trigger for widget_sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_widget_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER widget_sessions_updated_at
  BEFORE UPDATE ON widget_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_sessions_updated_at();

-- ============================================================================
-- 6. Comments for documentation
-- ============================================================================

COMMENT ON TABLE widget_sessions IS
  'Persistent session tracking for widget interactions across page loads. Enables cross-device tracking via device fingerprinting.';

COMMENT ON COLUMN widget_sessions.device_fingerprint IS
  'Client-generated fingerprint (hash of UA, screen, timezone, etc.). Used for cross-session tracking.';

COMMENT ON COLUMN widget_sessions.session_id IS
  'Client-generated session ID. Changes per browser session for granular tracking.';

COMMENT ON COLUMN widget_sessions.impression_count IS
  'Total number of times widget has been shown to this device for this study.';

COMMENT ON COLUMN widget_sessions.has_clicked IS
  'Whether device has clicked widget CTA button (may not have completed study).';

COMMENT ON COLUMN widget_sessions.has_dismissed IS
  'Whether device has dismissed widget (X button or overlay click).';

COMMENT ON COLUMN widget_sessions.has_participated IS
  'Whether device has completed the study (linked via participant_id).';
