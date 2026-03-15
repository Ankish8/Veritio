-- Veritio AI Assistant tables
-- Conversations, messages, and rate limiting for the AI assistant feature.

-- 1. assistant_conversations
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_study
  ON assistant_conversations(study_id, user_id);

-- 2. assistant_messages
CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT,
  tool_calls JSONB,
  tool_call_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation
  ON assistant_messages(conversation_id, created_at);

-- 3. assistant_rate_limits
CREATE TABLE IF NOT EXISTS assistant_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  window_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, window_date)
);

-- 4. RLS policies
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_rate_limits ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only access their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select their own conversations' AND tablename = 'assistant_conversations') THEN
    CREATE POLICY "Users can select their own conversations" ON assistant_conversations
      FOR SELECT USING (user_id = (auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own conversations' AND tablename = 'assistant_conversations') THEN
    CREATE POLICY "Users can insert their own conversations" ON assistant_conversations
      FOR INSERT WITH CHECK (user_id = (auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own conversations' AND tablename = 'assistant_conversations') THEN
    CREATE POLICY "Users can update their own conversations" ON assistant_conversations
      FOR UPDATE USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own conversations' AND tablename = 'assistant_conversations') THEN
    CREATE POLICY "Users can delete their own conversations" ON assistant_conversations
      FOR DELETE USING (user_id = (auth.uid())::text);
  END IF;
END $$;

-- Messages: users can access messages in their own conversations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select messages in their own conversations' AND tablename = 'assistant_messages') THEN
    CREATE POLICY "Users can select messages in their own conversations" ON assistant_messages
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM assistant_conversations WHERE id = assistant_messages.conversation_id AND user_id = (auth.uid())::text)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert messages in their own conversations' AND tablename = 'assistant_messages') THEN
    CREATE POLICY "Users can insert messages in their own conversations" ON assistant_messages
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM assistant_conversations WHERE id = assistant_messages.conversation_id AND user_id = (auth.uid())::text)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update messages in their own conversations' AND tablename = 'assistant_messages') THEN
    CREATE POLICY "Users can update messages in their own conversations" ON assistant_messages
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM assistant_conversations WHERE id = assistant_messages.conversation_id AND user_id = (auth.uid())::text)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete messages in their own conversations' AND tablename = 'assistant_messages') THEN
    CREATE POLICY "Users can delete messages in their own conversations" ON assistant_messages
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM assistant_conversations WHERE id = assistant_messages.conversation_id AND user_id = (auth.uid())::text)
      );
  END IF;
END $$;

-- Rate limits: users can only access their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select their own rate limits' AND tablename = 'assistant_rate_limits') THEN
    CREATE POLICY "Users can select their own rate limits" ON assistant_rate_limits
      FOR SELECT USING (user_id = (auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own rate limits' AND tablename = 'assistant_rate_limits') THEN
    CREATE POLICY "Users can insert their own rate limits" ON assistant_rate_limits
      FOR INSERT WITH CHECK (user_id = (auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own rate limits' AND tablename = 'assistant_rate_limits') THEN
    CREATE POLICY "Users can update their own rate limits" ON assistant_rate_limits
      FOR UPDATE USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
  END IF;
END $$;

-- 5. Atomic upsert function for rate limiting
CREATE OR REPLACE FUNCTION increment_message_count(p_user_id text, p_window_date date)
RETURNS integer
LANGUAGE sql
AS $$
  INSERT INTO assistant_rate_limits (user_id, window_date, message_count)
  VALUES (p_user_id, p_window_date, 1)
  ON CONFLICT (user_id, window_date)
  DO UPDATE SET message_count = assistant_rate_limits.message_count + 1
  RETURNING message_count;
$$;
