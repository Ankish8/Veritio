CREATE TABLE live_website_rrweb_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  page_count INTEGER DEFAULT 0,
  event_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  chunks_uploaded INTEGER DEFAULT 0,
  chunk_paths JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'completed', 'failed')),
  viewport_width INTEGER,
  viewport_height INTEGER,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(study_id, session_id)
);

CREATE INDEX idx_lw_rrweb_study ON live_website_rrweb_sessions(study_id);
CREATE INDEX idx_lw_rrweb_participant ON live_website_rrweb_sessions(participant_id);

-- Storage bucket (created via Supabase dashboard, but documented here for reference)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('live-website-rrweb', 'live-website-rrweb', true);
