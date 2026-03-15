-- Create table for Composio tool execution audit log
CREATE TABLE composio_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  arguments JSONB,
  result JSONB,
  successful BOOLEAN,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX idx_composio_executions_user ON composio_tool_executions(user_id);
CREATE INDEX idx_composio_executions_tool ON composio_tool_executions(tool_name);
CREATE INDEX idx_composio_executions_executed_at ON composio_tool_executions(executed_at DESC);

-- RLS policies
ALTER TABLE composio_tool_executions ENABLE ROW LEVEL SECURITY;

-- Users can view their own executions
CREATE POLICY "Users can view own tool executions"
  ON composio_tool_executions
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Service role can insert executions (backend only)
CREATE POLICY "Service role can insert executions"
  ON composio_tool_executions
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE composio_tool_executions IS 'Audit log for Composio tool executions';
