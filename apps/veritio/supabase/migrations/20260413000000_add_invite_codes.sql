-- Platform-level invite codes for gating sign-up
-- Separate from organization_invitations (which invite users to specific orgs)

CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by TEXT NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_codes_code_active ON invite_codes(code) WHERE is_active = true;
CREATE INDEX idx_invite_codes_active_expires ON invite_codes(is_active, expires_at);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON invite_codes
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE invite_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  signup_method TEXT NOT NULL CHECK (signup_method IN ('email', 'google')),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_code_usages_code ON invite_code_usages(invite_code_id);
CREATE INDEX idx_invite_code_usages_user ON invite_code_usages(user_id);

ALTER TABLE invite_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON invite_code_usages
  FOR ALL USING (true) WITH CHECK (true);
