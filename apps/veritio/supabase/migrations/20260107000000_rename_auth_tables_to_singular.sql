-- Rename Better Auth tables from plural to singular (Better Auth default)
-- Better Auth expects: user, session, account, verification

-- Drop RLS policies first (they reference old table names)
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Service role has full access to accounts" ON public.accounts;
DROP POLICY IF EXISTS "Service role has full access to verifications" ON public.verifications;

-- Rename tables
ALTER TABLE public.users RENAME TO "user";
ALTER TABLE public.sessions RENAME TO "session";
ALTER TABLE public.accounts RENAME TO "account";
ALTER TABLE public.verifications RENAME TO verification;

-- Recreate RLS policies with new table names
CREATE POLICY "Service role has full access to user" ON public."user"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to session" ON public.session
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to account" ON public.account
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to verification" ON public.verification
  FOR ALL USING (auth.role() = 'service_role');

-- Update comments
COMMENT ON TABLE public."user" IS 'Better Auth: User profiles and authentication data';
COMMENT ON TABLE public.session IS 'Better Auth: Active user sessions';
COMMENT ON TABLE public.account IS 'Better Auth: OAuth provider accounts and credentials';
COMMENT ON TABLE public.verification IS 'Better Auth: Email verification and password reset tokens';
