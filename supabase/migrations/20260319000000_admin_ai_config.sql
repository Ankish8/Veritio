-- Admin-managed AI configuration (singleton row)
-- Stores platform-wide default AI provider settings and per-provider rate limits.
CREATE TABLE IF NOT EXISTS admin_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider A: "AI for Building & Analysis" (maps to 'openai' LLMProvider)
  openai_api_key TEXT DEFAULT NULL,
  openai_base_url TEXT DEFAULT NULL,
  openai_model TEXT DEFAULT NULL,
  openai_daily_limit INTEGER NOT NULL DEFAULT 5,

  -- Provider B: "AI for Writing & Knowledge" (maps to 'mercury' LLMProvider)
  mercury_api_key TEXT DEFAULT NULL,
  mercury_base_url TEXT DEFAULT NULL,
  mercury_model TEXT DEFAULT NULL,
  mercury_daily_limit INTEGER NOT NULL DEFAULT 10,

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT DEFAULT NULL
);

-- RLS: only service_role can access (admin endpoints use service role client)
ALTER TABLE admin_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to admin_ai_config"
  ON admin_ai_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed the singleton row with defaults
INSERT INTO admin_ai_config (openai_daily_limit, mercury_daily_limit)
VALUES (5, 10)
ON CONFLICT DO NOTHING;
