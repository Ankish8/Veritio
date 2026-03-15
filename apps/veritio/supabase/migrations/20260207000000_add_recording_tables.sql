-- Session Recording Tables
-- Implements storage for participant session recordings with transcription support
-- Used for think-aloud protocols and qualitative UX research

-- ============================================================================
-- RECORDINGS TABLE - Main recording metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

  -- Recording scope - determines if this is one recording per session or per task
  scope TEXT NOT NULL DEFAULT 'session' CHECK (scope IN ('session', 'task')),
  -- For per-task recordings, link to the specific task attempt
  task_attempt_id UUID REFERENCES prototype_test_task_attempts(id) ON DELETE SET NULL,

  -- Storage info (Cloudflare R2)
  storage_path TEXT NOT NULL,  -- Path: {studyId}/recordings/{participantId}/{recordingId}/
  storage_provider TEXT NOT NULL DEFAULT 'r2',

  -- Recording metadata
  capture_mode TEXT NOT NULL DEFAULT 'audio' CHECK (capture_mode IN ('audio', 'screen_audio', 'screen_audio_webcam')),
  duration_ms INTEGER,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'video/webm',
  resolution_width INTEGER,
  resolution_height INTEGER,

  -- Status tracking with state machine
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN (
    'uploading',        -- Chunks being uploaded
    'processing',       -- Upload complete, being finalized
    'ready',            -- Ready for playback
    'transcribing',     -- Transcription in progress
    'completed',        -- Fully processed with transcription
    'failed',           -- Processing failed
    'deleted'           -- Soft deleted (GDPR)
  )),
  status_message TEXT,

  -- Upload tracking for resumable multipart uploads
  upload_id TEXT,              -- R2 multipart upload ID
  chunks_uploaded INTEGER DEFAULT 0,
  total_chunks INTEGER,
  chunk_etags JSONB DEFAULT '[]'::jsonb,  -- Array of {partNumber, etag, size}

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ        -- Soft delete for GDPR compliance
);

-- Indexes for recordings
CREATE INDEX idx_recordings_study ON recordings(study_id);
CREATE INDEX idx_recordings_participant ON recordings(participant_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_study_status ON recordings(study_id, status);
CREATE INDEX idx_recordings_task_attempt ON recordings(task_attempt_id) WHERE task_attempt_id IS NOT NULL;
CREATE INDEX idx_recordings_not_deleted ON recordings(study_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recordings_study_participant ON recordings(study_id, participant_id);

-- ============================================================================
-- TRANSCRIPTS TABLE - Deepgram transcription results
-- ============================================================================

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Full text for search
  full_text TEXT,

  -- Segments with timestamps (JSONB array)
  -- Format: [{start: number (ms), end: number (ms), text: string, speaker?: string, confidence?: number}]
  segments JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  language TEXT DEFAULT 'en',
  provider TEXT DEFAULT 'deepgram',
  model TEXT,                   -- e.g., 'nova-2'
  confidence_avg REAL,
  word_count INTEGER,

  -- Processing info
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  error_message TEXT,
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transcripts
CREATE INDEX idx_transcripts_recording ON transcripts(recording_id);
CREATE INDEX idx_transcripts_status ON transcripts(status);
-- Full-text search index on transcript text
CREATE INDEX idx_transcripts_fulltext ON transcripts USING gin(to_tsvector('english', COALESCE(full_text, '')));

-- ============================================================================
-- RECORDING_EVENTS TABLE - Timeline markers synced to recording
-- ============================================================================

CREATE TABLE IF NOT EXISTS recording_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Event timing (milliseconds from recording start)
  timestamp_ms INTEGER NOT NULL,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'click',
    'scroll',
    'navigation',
    'task_start',
    'task_end',
    'frame_change',
    'custom'
  )),

  -- Event data (flexible JSONB for different event types)
  -- click: {x, y, element_tag, element_id, frame_id, was_hotspot}
  -- scroll: {x, y, delta_x, delta_y}
  -- navigation: {from_frame_id, to_frame_id, triggered_by}
  -- task_start/end: {task_id, task_title, outcome}
  -- frame_change: {from_frame_id, to_frame_id}
  data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recording_events
CREATE INDEX idx_recording_events_recording ON recording_events(recording_id);
CREATE INDEX idx_recording_events_type ON recording_events(recording_id, event_type);
CREATE INDEX idx_recording_events_timestamp ON recording_events(recording_id, timestamp_ms);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_events ENABLE ROW LEVEL SECURITY;

-- Recordings policies
CREATE POLICY "Participants can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Study owners can read recordings" ON recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = recordings.study_id
    )
  );

CREATE POLICY "Service role can update recordings" ON recordings
  FOR UPDATE USING (true);

CREATE POLICY "Service role can delete recordings" ON recordings
  FOR DELETE USING (true);

-- Transcripts policies
CREATE POLICY "Service role can manage transcripts" ON transcripts
  FOR ALL USING (true);

CREATE POLICY "Study owners can read transcripts" ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings r
      JOIN studies s ON s.id = r.study_id
      WHERE r.id = transcripts.recording_id
    )
  );

-- Recording events policies
CREATE POLICY "Participants can insert recording events" ON recording_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Study owners can read recording events" ON recording_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings r
      JOIN studies s ON s.id = r.study_id
      WHERE r.id = recording_events.recording_id
    )
  );

-- ============================================================================
-- HELPER FUNCTION FOR ATOMIC CHUNK CONFIRMATION
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_recording_chunk(
  p_recording_id UUID,
  p_session_token TEXT,
  p_chunk_number INTEGER,
  p_etag TEXT,
  p_chunk_size BIGINT
)
RETURNS TABLE (
  chunks_uploaded INTEGER,
  total_chunks INTEGER,
  is_complete BOOLEAN
) AS $$
DECLARE
  v_recording recordings%ROWTYPE;
  v_new_chunks_uploaded INTEGER;
BEGIN
  -- Lock and fetch recording, verifying session ownership
  SELECT r.* INTO v_recording
  FROM recordings r
  JOIN participants p ON p.id = r.participant_id
  WHERE r.id = p_recording_id
    AND p.session_token = p_session_token
    AND r.status = 'uploading'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recording not found or invalid session';
  END IF;

  -- Add chunk info to etags array and increment counter
  UPDATE recordings
  SET
    chunks_uploaded = recordings.chunks_uploaded + 1,
    chunk_etags = recordings.chunk_etags || jsonb_build_object(
      'PartNumber', p_chunk_number,
      'ETag', p_etag,
      'Size', p_chunk_size
    ),
    file_size_bytes = COALESCE(recordings.file_size_bytes, 0) + p_chunk_size,
    updated_at = NOW()
  WHERE id = p_recording_id
  RETURNING recordings.chunks_uploaded INTO v_new_chunks_uploaded;

  -- Return current state
  RETURN QUERY SELECT
    v_new_chunks_uploaded,
    v_recording.total_chunks,
    v_new_chunks_uploaded = v_recording.total_chunks;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STUDY SETTINGS UPDATE - Add recording settings column
-- ============================================================================

-- Add session_recording_settings JSONB column to studies table
-- Format: {enabled: boolean, captureMode: 'audio'|'screen_audio'|'screen_audio_webcam', recordingScope: 'session'|'task'}
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS session_recording_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN studies.session_recording_settings IS 'Recording configuration: {enabled, captureMode, recordingScope}';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE recordings IS 'Stores metadata for participant session recordings stored in Cloudflare R2';
COMMENT ON COLUMN recordings.scope IS 'Recording scope: session (one per participant) or task (one per task attempt)';
COMMENT ON COLUMN recordings.storage_path IS 'R2 object path: {studyId}/recordings/{participantId}/{recordingId}/';
COMMENT ON COLUMN recordings.upload_id IS 'R2 multipart upload ID for resumable uploads';
COMMENT ON COLUMN recordings.chunk_etags IS 'Array of chunk ETags for multipart upload completion';
COMMENT ON COLUMN recordings.deleted_at IS 'Soft delete timestamp for GDPR compliance';
COMMENT ON COLUMN recordings.capture_mode IS 'What was captured: audio only, screen+audio, or screen+audio+webcam';

COMMENT ON TABLE transcripts IS 'Stores Deepgram transcription results for recordings';
COMMENT ON COLUMN transcripts.segments IS 'Array of transcript segments: [{start, end, text, speaker?, confidence?}]';
COMMENT ON COLUMN transcripts.full_text IS 'Complete transcript text for full-text search';

COMMENT ON TABLE recording_events IS 'Timeline markers synced to recording for click, scroll, navigation, task events';
COMMENT ON COLUMN recording_events.timestamp_ms IS 'Milliseconds from recording start';
COMMENT ON COLUMN recording_events.data IS 'Event-specific data as JSONB';

COMMENT ON FUNCTION confirm_recording_chunk IS 'Atomically confirms a chunk upload with proper locking';
