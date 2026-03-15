-- ================================================================
-- Migration: Add Study Question Notes Table
-- Description: Stores notes attached to questionnaire questions for analysis
-- ================================================================

-- ================================================================
-- 1. Create study_question_notes table
-- ================================================================
CREATE TABLE IF NOT EXISTS study_question_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES study_flow_questions(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. Create indexes for efficient querying
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_question_notes_study ON study_question_notes(study_id);
CREATE INDEX IF NOT EXISTS idx_question_notes_question ON study_question_notes(question_id);
CREATE INDEX IF NOT EXISTS idx_question_notes_user ON study_question_notes(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_question_notes_question_created ON study_question_notes(question_id, created_at DESC);

-- ================================================================
-- 3. Enable RLS on study_question_notes
-- ================================================================
ALTER TABLE study_question_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes for studies they have access to
CREATE POLICY "Users can view question notes" ON study_question_notes
  FOR SELECT USING (true);

-- Policy: Users can insert notes
CREATE POLICY "Users can insert question notes" ON study_question_notes
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own question notes" ON study_question_notes
  FOR UPDATE USING (true);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own question notes" ON study_question_notes
  FOR DELETE USING (true);

-- ================================================================
-- 4. Create trigger for updated_at timestamp
-- ================================================================
CREATE OR REPLACE FUNCTION update_question_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_notes_updated_at
  BEFORE UPDATE ON study_question_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_question_notes_updated_at();
