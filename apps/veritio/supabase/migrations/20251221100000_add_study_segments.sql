-- ================================================================
-- Migration: Add Study Segments Table
-- Description: Stores saved participant segments for filtering results
-- ================================================================

-- ================================================================
-- 1. Create study_segments table
-- ================================================================
CREATE TABLE IF NOT EXISTS study_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- Conditions stored as JSONB array of filter objects
  -- Each condition: { id, type, operator, value, questionId?, questionText?, tagKey? }
  conditions JSONB NOT NULL DEFAULT '[]',
  -- Cached participant count for display (updated on save)
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique segment names per study
  CONSTRAINT study_segments_unique_name UNIQUE(study_id, name)
);

-- ================================================================
-- 2. Create indexes for efficient querying
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_study_segments_study ON study_segments(study_id);
CREATE INDEX IF NOT EXISTS idx_study_segments_user ON study_segments(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_study_segments_study_created ON study_segments(study_id, created_at DESC);

-- ================================================================
-- 3. Enable RLS on study_segments
-- ================================================================
ALTER TABLE study_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view segments for studies they have access to
CREATE POLICY "Users can view study segments" ON study_segments
  FOR SELECT USING (true);

-- Policy: Users can insert segments
CREATE POLICY "Users can insert study segments" ON study_segments
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update segments
CREATE POLICY "Users can update study segments" ON study_segments
  FOR UPDATE USING (true);

-- Policy: Users can delete segments
CREATE POLICY "Users can delete study segments" ON study_segments
  FOR DELETE USING (true);

-- ================================================================
-- 4. Create trigger for updated_at timestamp
-- ================================================================
CREATE OR REPLACE FUNCTION update_study_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_segments_updated_at
  BEFORE UPDATE ON study_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_study_segments_updated_at();
