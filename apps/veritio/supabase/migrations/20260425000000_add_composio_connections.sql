-- Composio integration connections
-- Stores user-level OAuth connections for external tools (Google Sheets, Notion)
-- managed via Composio SDK

CREATE TABLE composio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  toolkit TEXT NOT NULL,              -- 'google_sheets', 'notion'
  composio_account_id TEXT,           -- Composio's connected_account ID
  account_display TEXT,               -- "user@gmail.com" or "My Workspace"
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, toolkit)
);

-- Index for fast lookup by user
CREATE INDEX idx_composio_connections_user_id ON composio_connections(user_id);

-- Enable RLS
ALTER TABLE composio_connections ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by Motia steps)
-- No user-facing RLS policies needed since all access goes through API steps
