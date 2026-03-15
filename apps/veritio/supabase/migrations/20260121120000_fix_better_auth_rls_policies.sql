-- Fix Better Auth RLS Policies
--
-- Problem: Better Auth uses direct PostgreSQL connections (pg library), not Supabase client.
-- The existing RLS policies check for `auth.role() = 'service_role'`, which only works
-- with Supabase client library using JWT tokens. Direct PostgreSQL connections use
-- database roles (e.g., 'postgres'), causing all queries to fail with "Tenant or user not found".
--
-- Solution: Enable RLS but grant full access to both service_role (Supabase client with
-- service key) and postgres (direct pg connections used by Better Auth). The anon key
-- is blocked from accessing these sensitive tables.

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role has full access to user" ON public."user";
DROP POLICY IF EXISTS "Service role has full access to session" ON public.session;
DROP POLICY IF EXISTS "Service role has full access to account" ON public.account;
DROP POLICY IF EXISTS "Service role has full access to verification" ON public.verification;
DROP POLICY IF EXISTS "Allow service_role and postgres full access to user" ON public."user";
DROP POLICY IF EXISTS "Allow service_role and postgres full access to session" ON public.session;
DROP POLICY IF EXISTS "Allow service_role and postgres full access to account" ON public.account;
DROP POLICY IF EXISTS "Allow service_role and postgres full access to verification" ON public.verification;

-- Enable RLS on Better Auth tables (blocks anon key by default)
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;

-- Grant service_role full access (for Supabase client with service key)
CREATE POLICY "Allow service_role and postgres full access to user"
  ON public."user"
  FOR ALL
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role and postgres full access to session"
  ON public.session
  FOR ALL
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role and postgres full access to account"
  ON public.account
  FOR ALL
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role and postgres full access to verification"
  ON public.verification
  FOR ALL
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

-- Comments explaining the RLS setup
COMMENT ON TABLE public."user" IS 'Better Auth: User profiles. RLS enabled - service_role and postgres have full access, anon blocked.';
COMMENT ON TABLE public.session IS 'Better Auth: Active sessions. RLS enabled - service_role and postgres have full access, anon blocked.';
COMMENT ON TABLE public.account IS 'Better Auth: OAuth accounts. RLS enabled - service_role and postgres have full access, anon blocked.';
COMMENT ON TABLE public.verification IS 'Better Auth: Verification tokens. RLS enabled - service_role and postgres have full access, anon blocked.';
