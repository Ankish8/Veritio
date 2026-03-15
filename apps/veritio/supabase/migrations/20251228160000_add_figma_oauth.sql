-- ================================================================
-- Migration: Add Figma OAuth Token Storage
-- Description: Stores Figma OAuth tokens per user for API access
-- ================================================================

-- ================================================================
-- 1. Figma Connections Table
-- Stores OAuth tokens per user (one Figma account per user)
-- ================================================================
CREATE TABLE IF NOT EXISTS figma_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  figma_user_id TEXT NOT NULL,
  figma_email TEXT,
  figma_handle TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_figma_connections_user
  ON figma_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_figma_connections_figma_user
  ON figma_connections(figma_user_id);

COMMENT ON TABLE figma_connections IS 'Stores Figma OAuth tokens per user';
COMMENT ON COLUMN figma_connections.user_id IS 'Our app user ID';
COMMENT ON COLUMN figma_connections.figma_user_id IS 'Figma user ID from OAuth response';
COMMENT ON COLUMN figma_connections.access_token IS 'Figma OAuth access token (encrypted in production)';
COMMENT ON COLUMN figma_connections.refresh_token IS 'Figma OAuth refresh token for token renewal';
COMMENT ON COLUMN figma_connections.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN figma_connections.scopes IS 'OAuth scopes granted';

-- ================================================================
-- 2. Enable Row Level Security
-- ================================================================
ALTER TABLE figma_connections ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 3. RLS Policies
-- ================================================================

-- Users can only view their own Figma connection
CREATE POLICY "Users can view their own Figma connection"
  ON figma_connections FOR SELECT
  USING (user_id = auth.uid()::text);

-- Users can insert their own Figma connection
CREATE POLICY "Users can insert their own Figma connection"
  ON figma_connections FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own Figma connection
CREATE POLICY "Users can update their own Figma connection"
  ON figma_connections FOR UPDATE
  USING (user_id = auth.uid()::text);

-- Users can delete their own Figma connection
CREATE POLICY "Users can delete their own Figma connection"
  ON figma_connections FOR DELETE
  USING (user_id = auth.uid()::text);

-- Service role can manage all connections (for token refresh)
CREATE POLICY "Service role can manage all Figma connections"
  ON figma_connections FOR ALL
  USING (true);

-- ================================================================
-- 4. Updated At Trigger
-- ================================================================
CREATE OR REPLACE FUNCTION update_figma_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_figma_connections_updated_at
  BEFORE UPDATE ON figma_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_figma_connections_updated_at();
