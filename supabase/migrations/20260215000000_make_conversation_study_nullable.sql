-- Make study_id nullable on assistant_conversations to support create mode
-- (conversations that start before a study exists)
ALTER TABLE assistant_conversations ALTER COLUMN study_id DROP NOT NULL;

-- Update the mode check constraint to include 'create'
ALTER TABLE assistant_conversations DROP CONSTRAINT IF EXISTS assistant_conversations_mode_check;
ALTER TABLE assistant_conversations ADD CONSTRAINT assistant_conversations_mode_check
  CHECK (mode IN ('results', 'builder', 'dashboard', 'projects', 'create'));

-- Index for create-mode conversations (where study_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_create_mode
  ON assistant_conversations (user_id, mode, updated_at DESC)
  WHERE study_id IS NULL;
