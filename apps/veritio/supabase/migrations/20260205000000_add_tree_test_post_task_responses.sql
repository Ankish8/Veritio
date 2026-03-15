-- Create tree_test_post_task_responses table for storing participant answers to post-task questions
-- This is a normalized table (one row per question response) for better querying and analysis

CREATE TABLE IF NOT EXISTS tree_test_post_task_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_test_response_id UUID NOT NULL REFERENCES tree_test_responses(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_tree_test_post_task_responses_study ON tree_test_post_task_responses(study_id);
CREATE INDEX idx_tree_test_post_task_responses_participant ON tree_test_post_task_responses(participant_id);
CREATE INDEX idx_tree_test_post_task_responses_task ON tree_test_post_task_responses(task_id);
CREATE INDEX idx_tree_test_post_task_responses_response ON tree_test_post_task_responses(tree_test_response_id);
CREATE INDEX idx_tree_test_post_task_responses_question ON tree_test_post_task_responses(question_id);

-- Composite index for typical analysis queries (by study and task)
CREATE INDEX idx_tree_test_post_task_responses_study_task ON tree_test_post_task_responses(study_id, task_id);

-- RLS policies
ALTER TABLE tree_test_post_task_responses ENABLE ROW LEVEL SECURITY;

-- Allow participants to insert their own responses
CREATE POLICY "Participants can insert own responses" ON tree_test_post_task_responses
  FOR INSERT WITH CHECK (true);

-- Allow study owners to read responses (via study_id check)
CREATE POLICY "Study owners can read responses" ON tree_test_post_task_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = tree_test_post_task_responses.study_id
    )
  );

-- Add comment explaining the table
COMMENT ON TABLE tree_test_post_task_responses IS 'Stores participant responses to post-task questions in tree test studies. Each row represents one question response, linked to the main tree_test_responses record.';
COMMENT ON COLUMN tree_test_post_task_responses.question_id IS 'References the question id from tasks.post_task_questions JSONB array';
COMMENT ON COLUMN tree_test_post_task_responses.value IS 'The participant response value - can be string, number, boolean, or array depending on question type';
