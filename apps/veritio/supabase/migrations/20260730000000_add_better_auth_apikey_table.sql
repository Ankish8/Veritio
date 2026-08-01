-- Better Auth: API key table, for MCP server (and future public API) credentials.
--
-- Why this exists: until now the only machine credential was a Better Auth
-- session token, which expires in 7 days, carries the user's full privileges,
-- and cannot be scoped or revoked individually. API keys can do all three.
--
-- Column naming: Better Auth's Postgres adapter uses the field names verbatim,
-- so these are quoted camelCase, matching the live `session` / `account` /
-- `verification` tables. Note that the *migrations* for those tables show
-- snake_case (20260103000000) because the camelCase rename was applied
-- out-of-band; the live database is the source of truth here.

CREATE TABLE IF NOT EXISTS public.apikey (
  id                    TEXT PRIMARY KEY,
  name                  TEXT,
  -- First few characters of the key, safe to display in a UI listing.
  start                 TEXT,
  prefix                TEXT,
  -- Hashed by Better Auth before storage; never the raw key.
  key                   TEXT NOT NULL,
  "userId"              TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  -- Quota: `remaining` refills by `refillAmount` every `refillInterval` ms.
  "refillInterval"      BIGINT,
  "refillAmount"        INTEGER,
  "lastRefillAt"        TIMESTAMPTZ,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  -- Per-key throttle. The MCP layer calls services in-process and so bypasses
  -- middlewares/rate-limit entirely; this is its replacement.
  "rateLimitEnabled"    BOOLEAN NOT NULL DEFAULT TRUE,
  "rateLimitTimeWindow" BIGINT,
  "rateLimitMax"        INTEGER,
  "requestCount"        INTEGER NOT NULL DEFAULT 0,
  remaining             INTEGER,
  "lastRequest"         TIMESTAMPTZ,
  "expiresAt"           TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- JSON string: { "studies": ["read","write"], "results": ["read"], ... }
  -- Read by the MCP scope layer via scopesFromPermissions().
  permissions           TEXT,
  metadata              TEXT
);

-- Key lookup happens on every single MCP request, so it must be an index hit.
CREATE UNIQUE INDEX IF NOT EXISTS idx_apikey_key ON public.apikey(key);
CREATE INDEX IF NOT EXISTS idx_apikey_user_id ON public.apikey("userId");
-- Supports the plugin's deleteAllExpiredApiKeys sweep.
CREATE INDEX IF NOT EXISTS idx_apikey_expires_at ON public.apikey("expiresAt")
  WHERE "expiresAt" IS NOT NULL;

ALTER TABLE public.apikey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role and postgres full access to apikey"
  ON public.apikey;
CREATE POLICY "Allow service_role and postgres full access to apikey"
  ON public.apikey
  FOR ALL
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.apikey IS
  'Better Auth: scoped API keys for the MCP server and public API. RLS enabled - service_role and postgres have full access, anon blocked.';
COMMENT ON COLUMN public.apikey.permissions IS
  'JSON object of scope grants, e.g. {"studies":["read","write"]}. Mapped to MCP scope strings by scopesFromPermissions().';
