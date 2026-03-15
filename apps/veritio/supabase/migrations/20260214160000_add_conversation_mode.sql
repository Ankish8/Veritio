-- Add mode column to assistant_conversations to separate builder vs results chats
ALTER TABLE assistant_conversations
  ADD COLUMN mode text NOT NULL DEFAULT 'results'
  CHECK (mode IN ('results', 'builder'));

-- Index for efficient filtering by user + study + mode
CREATE INDEX idx_assistant_conversations_mode
  ON assistant_conversations (user_id, study_id, mode);
