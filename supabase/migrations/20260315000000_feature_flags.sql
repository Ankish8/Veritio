-- Feature flags table for gating features (e.g., AI Interview)
-- Managed via the admin panel at /admin/feature-flags

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'global',
  scope_ids TEXT[] DEFAULT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;

-- Enable Row Level Security
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read feature flags
CREATE POLICY "Authenticated users can read feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can insert, update, or delete feature flags
CREATE POLICY "Service role has full access to feature flags"
  ON feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed: AI Interview feature flag (disabled by default)
INSERT INTO feature_flags (key, name, description, enabled, scope)
VALUES ('ai_interview', 'AI Interview', 'AI-moderated research interviews study type', false, 'global')
ON CONFLICT (key) DO NOTHING;
