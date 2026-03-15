-- Better Auth: Core Authentication Tables
-- This migration adds the required tables for Better Auth authentication system

-- Users table - stores user profile information
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table - manages active user sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table - stores OAuth provider information and credentials
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verifications table - handles email verification and password reset tokens
CREATE TABLE IF NOT EXISTS public.verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON public.accounts(provider_id, account_id);
CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON public.verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON public.verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS (Row Level Security) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow service role full access (for Better Auth API)
CREATE POLICY "Service role has full access to users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to sessions" ON public.sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to accounts" ON public.accounts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to verifications" ON public.verifications
  FOR ALL USING (auth.role() = 'service_role');

-- Comment on tables
COMMENT ON TABLE public.users IS 'Better Auth: User profiles and authentication data';
COMMENT ON TABLE public.sessions IS 'Better Auth: Active user sessions';
COMMENT ON TABLE public.accounts IS 'Better Auth: OAuth provider accounts and credentials';
COMMENT ON TABLE public.verifications IS 'Better Auth: Email verification and password reset tokens';
