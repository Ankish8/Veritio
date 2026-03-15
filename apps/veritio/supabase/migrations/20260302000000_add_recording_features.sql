-- Recording Features: Clips, Comments, Shares, Extended Events
-- Implements clip/highlight builder, collaboration comments, share links,
-- and extended event types for all player types (Tree Test, Card Sort, First Click, Survey)

-- ============================================================================
-- UPDATE RECORDING_EVENTS - Add new event types for all player types
-- ============================================================================

-- Drop existing constraint and add new one with extended event types
ALTER TABLE recording_events DROP CONSTRAINT IF EXISTS recording_events_event_type_check;

ALTER TABLE recording_events ADD CONSTRAINT recording_events_event_type_check CHECK (event_type IN (
  -- Existing events
  'click',
  'scroll',
  'navigation',
  'task_start',
  'task_end',
  'frame_change',
  'custom',
  -- Card Sort events
  'drag_start',
  'drag_over',
  'drop',
  'category_created',
  'category_renamed',
  'category_deleted',
  'card_moved',
  -- Tree Test events
  'node_expand',
  'node_collapse',
  'node_select',
  'path_reset',
  -- First Click events
  'first_click',
  'aoi_hit',
  -- Survey events
  'question_viewed',
  'question_answered',
  'section_entered',
  'section_completed'
));

COMMENT ON TABLE recording_events IS 'Timeline markers synced to recording. Extended for Tree Test, Card Sort, First Click, Survey events.';

-- ============================================================================
-- RECORDING_CLIPS TABLE - Clip/highlight references (no video extraction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS recording_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Clip timing (stored as references, not extracted video)
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Creator tracking
  created_by TEXT NOT NULL,  -- User ID from better-auth

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation
  CONSTRAINT valid_clip_range CHECK (end_ms > start_ms)
);

-- Indexes for clips
CREATE INDEX idx_recording_clips_recording ON recording_clips(recording_id);
CREATE INDEX idx_recording_clips_created_by ON recording_clips(created_by);
CREATE INDEX idx_recording_clips_time_range ON recording_clips(recording_id, start_ms, end_ms);

COMMENT ON TABLE recording_clips IS 'Clip/highlight markers stored as time references. No video extraction - playback uses time range.';
COMMENT ON COLUMN recording_clips.start_ms IS 'Clip start time in milliseconds from recording start';
COMMENT ON COLUMN recording_clips.end_ms IS 'Clip end time in milliseconds from recording start';

-- ============================================================================
-- RECORDING_COMMENTS TABLE - Timestamped and general comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS recording_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Optional clip association (for comments on clips)
  clip_id UUID REFERENCES recording_clips(id) ON DELETE CASCADE,

  -- Optional timestamp (null = general note, not null = timestamped comment)
  timestamp_ms INTEGER,

  -- Content
  content TEXT NOT NULL,

  -- Creator tracking
  created_by TEXT NOT NULL,  -- User ID from better-auth

  -- Soft delete for edit history
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX idx_recording_comments_recording ON recording_comments(recording_id);
CREATE INDEX idx_recording_comments_clip ON recording_comments(clip_id) WHERE clip_id IS NOT NULL;
CREATE INDEX idx_recording_comments_timestamp ON recording_comments(recording_id, timestamp_ms) WHERE timestamp_ms IS NOT NULL;
CREATE INDEX idx_recording_comments_created_by ON recording_comments(created_by);
CREATE INDEX idx_recording_comments_not_deleted ON recording_comments(recording_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE recording_comments IS 'Comments and annotations on recordings. timestamp_ms: null=general note, not null=timestamped.';
COMMENT ON COLUMN recording_comments.timestamp_ms IS 'Timestamp in ms from recording start. NULL for general notes.';
COMMENT ON COLUMN recording_comments.clip_id IS 'Optional link to a clip for clip-specific comments';

-- ============================================================================
-- RECORDING_SHARES TABLE - Share links with optional password protection
-- ============================================================================

CREATE TABLE IF NOT EXISTS recording_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Share link code (nanoid 16 chars)
  share_code TEXT NOT NULL UNIQUE,

  -- Access control
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'comment')),
  password_hash TEXT,  -- bcrypt hash, null = no password required

  -- Expiration
  expires_at TIMESTAMPTZ,  -- null = never expires

  -- Usage tracking
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Creator tracking
  created_by TEXT NOT NULL,  -- User ID from better-auth

  -- Soft delete
  revoked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for shares
CREATE INDEX idx_recording_shares_recording ON recording_shares(recording_id);
CREATE INDEX idx_recording_shares_code ON recording_shares(share_code);
-- Index for active (non-revoked) shares
-- Note: Cannot use "expires_at > NOW()" in index predicate as NOW() is not immutable
-- Application must filter expired shares at query time
CREATE INDEX idx_recording_shares_active ON recording_shares(recording_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_recording_shares_created_by ON recording_shares(created_by);

COMMENT ON TABLE recording_shares IS 'Share links for recordings with optional password protection and expiration';
COMMENT ON COLUMN recording_shares.share_code IS 'Unique 16-char nanoid for share URL: /share/recording/{share_code}';
COMMENT ON COLUMN recording_shares.password_hash IS 'bcrypt hash of password. NULL = no password required.';
COMMENT ON COLUMN recording_shares.access_level IS 'view = read only, comment = can add comments';
COMMENT ON COLUMN recording_shares.expires_at IS 'Link expiration. NULL = never expires. Default 30 days.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE recording_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_shares ENABLE ROW LEVEL SECURITY;

-- Recording Clips policies
CREATE POLICY "Study owners can manage clips" ON recording_clips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recordings r
      JOIN studies s ON s.id = r.study_id
      WHERE r.id = recording_clips.recording_id
    )
  );

-- Recording Comments policies
CREATE POLICY "Study owners can manage comments" ON recording_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recordings r
      JOIN studies s ON s.id = r.study_id
      WHERE r.id = recording_comments.recording_id
    )
  );

-- Allow public comment insertion via share link (handled in API layer)
CREATE POLICY "Allow comment insertion" ON recording_comments
  FOR INSERT WITH CHECK (true);

-- Recording Shares policies
CREATE POLICY "Study owners can manage shares" ON recording_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recordings r
      JOIN studies s ON s.id = r.study_id
      WHERE r.id = recording_shares.recording_id
    )
  );

-- Allow public read of share by code (for share link access)
CREATE POLICY "Anyone can read share by code" ON recording_shares
  FOR SELECT USING (
    share_code IS NOT NULL
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment share view count atomically
CREATE OR REPLACE FUNCTION increment_share_view_count(p_share_code TEXT)
RETURNS recording_shares AS $$
DECLARE
  v_share recording_shares%ROWTYPE;
BEGIN
  UPDATE recording_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW(),
    updated_at = NOW()
  WHERE share_code = p_share_code
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  RETURNING * INTO v_share;

  RETURN v_share;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_share_view_count IS 'Atomically increments view count and updates last_viewed_at for a share link';
