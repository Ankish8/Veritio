-- Eye tracking gaze data table for webcam-based eye tracking
-- Stores batched gaze coordinate data from WebGazer.js

CREATE TABLE IF NOT EXISTS live_website_gaze_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  task_id UUID,
  page_url TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  -- Each row is a batch of gaze points (flushed every 2 seconds)
  -- Format: [{x: number, y: number, t: number}] where t is ms since epoch
  gaze_points JSONB NOT NULL DEFAULT '[]',
  point_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for querying by study (most common access pattern)
CREATE INDEX idx_gaze_data_study_id ON live_website_gaze_data(study_id);

-- Index for querying by session (replay/timeline view)
CREATE INDEX idx_gaze_data_session_id ON live_website_gaze_data(session_id);

-- Index for querying by participant
CREATE INDEX idx_gaze_data_participant_id ON live_website_gaze_data(participant_id);

-- RLS: Allow service role full access, anon can insert (public snippet endpoint)
ALTER TABLE live_website_gaze_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on gaze data"
  ON live_website_gaze_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can insert gaze data"
  ON live_website_gaze_data
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can select gaze data"
  ON live_website_gaze_data
  FOR SELECT
  TO anon
  USING (true);
