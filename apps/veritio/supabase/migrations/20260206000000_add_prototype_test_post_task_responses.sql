-- Create prototype_test_post_task_responses table for normalized storage of post-task question responses
-- This mirrors the tree_test_post_task_responses table for consistency across study types

CREATE TABLE IF NOT EXISTS prototype_test_post_task_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_attempt_id UUID NOT NULL REFERENCES prototype_test_task_attempts(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES prototype_test_sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_prototype_test_post_task_responses_study ON prototype_test_post_task_responses(study_id);
CREATE INDEX idx_prototype_test_post_task_responses_participant ON prototype_test_post_task_responses(participant_id);
CREATE INDEX idx_prototype_test_post_task_responses_task ON prototype_test_post_task_responses(task_id);
CREATE INDEX idx_prototype_test_post_task_responses_attempt ON prototype_test_post_task_responses(task_attempt_id);
CREATE INDEX idx_prototype_test_post_task_responses_session ON prototype_test_post_task_responses(session_id);
CREATE INDEX idx_prototype_test_post_task_responses_question ON prototype_test_post_task_responses(question_id);

-- Composite index for typical analysis queries (by study and task)
CREATE INDEX idx_prototype_test_post_task_responses_study_task ON prototype_test_post_task_responses(study_id, task_id);

-- RLS policies
ALTER TABLE prototype_test_post_task_responses ENABLE ROW LEVEL SECURITY;

-- Allow participants to insert their own responses
CREATE POLICY "Participants can insert own responses" ON prototype_test_post_task_responses
  FOR INSERT WITH CHECK (true);

-- Allow study owners to read responses
CREATE POLICY "Study owners can read responses" ON prototype_test_post_task_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = prototype_test_post_task_responses.study_id
    )
  );

-- Add comment explaining the table
COMMENT ON TABLE prototype_test_post_task_responses IS 'Normalized storage for participant responses to post-task questions in prototype test studies. Each row represents one question response, linked to the task attempt record.';
COMMENT ON COLUMN prototype_test_post_task_responses.question_id IS 'References the question id from tasks.post_task_questions JSONB array';
COMMENT ON COLUMN prototype_test_post_task_responses.value IS 'The participant response value - can be string, number, boolean, or array depending on question type';

-- Note: The existing post_task_responses JSONB column on prototype_test_task_attempts is kept for backwards compatibility
-- New responses will be written to both locations during a transition period
