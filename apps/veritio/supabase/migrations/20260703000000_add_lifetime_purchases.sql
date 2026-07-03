-- Payment-first lifetime deal purchases.
-- A buyer can pay BEFORE having an account, so every successful one-time LTD
-- payment is recorded here durably (written by the order.paid webhook and,
-- belt-and-braces, findable by checkout id). The row carries the buyer email +
-- a single-use redemption code so the purchase can always be claimed:
--   1. auto-grant when a verified account with the same email creates its workspace
--   2. the emailed /redeem?code=... link (works with any account)
CREATE TABLE IF NOT EXISTS lifetime_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,                    -- buyer email (stored lowercased)
  plan text NOT NULL CHECK (plan IN ('lifetime_tier1', 'lifetime_tier2', 'lifetime_team')),
  polar_checkout_id text UNIQUE,          -- idempotency key across webhook + confirm
  polar_order_id text UNIQUE,             -- idempotency for order.* redeliveries
  amount integer,                         -- minor units, as reported by Polar
  currency text,
  source text,                            -- 'direct-ltd' | marketplace tag
  status text NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'granted', 'refunded')),
  redemption_code text,                   -- single-use claim code (mirrors redemption_codes)
  granted_org uuid REFERENCES organizations(id) ON DELETE SET NULL,
  granted_user text,                      -- Better Auth user id (no FK: auth-managed table)
  granted_at timestamptz,
  email_sent_at timestamptz,              -- fulfillment email sent (atomic claim guard)
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lifetime_purchases IS
  'Durable record of one-time lifetime-deal payments (may predate the buyer account). Claimed by verified email match or redemption code.';

-- Claim lookup: oldest unclaimed purchase for an email.
CREATE INDEX IF NOT EXISTS idx_lifetime_purchases_unclaimed_email
  ON lifetime_purchases (lower(email), created_at)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_lifetime_purchases_code
  ON lifetime_purchases (redemption_code)
  WHERE redemption_code IS NOT NULL;

-- Service-role only: no anon/authenticated policies (service_role bypasses RLS).
ALTER TABLE lifetime_purchases ENABLE ROW LEVEL SECURITY;
