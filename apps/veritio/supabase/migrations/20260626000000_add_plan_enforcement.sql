-- Pricing-tier enforcement: add plan / trial / seat columns to organizations.
-- Enforcement-first (no payments yet). The billing_* columns are the seam for
-- a later Polar.sh integration; they stay NULL until checkout/webhooks are wired.

-- 1. Plan + trial + seat columns
-- 'legacy' = grandfathered orgs created before pricing tiers existed (unlimited; never auto-assigned to new signups).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'team', 'legacy')),
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'trialing'
    CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS extra_seats integer NOT NULL DEFAULT 0
    CHECK (extra_seats >= 0),
  -- Polar.sh seam (populated only when payments are wired):
  ADD COLUMN IF NOT EXISTS billing_provider text,
  ADD COLUMN IF NOT EXISTS billing_customer_id text,
  ADD COLUMN IF NOT EXISTS billing_subscription_id text;

COMMENT ON COLUMN organizations.plan IS 'Pricing tier: starter | pro | team';
COMMENT ON COLUMN organizations.plan_status IS 'trialing | active | past_due | canceled';
COMMENT ON COLUMN organizations.trial_ends_at IS '7-day trial end; NULL when not trialing';
COMMENT ON COLUMN organizations.extra_seats IS 'Paid seats beyond the plan base allotment';

-- 2. Grandfather existing organizations: 'legacy' plan (unlimited), active status.
-- Existing customers signed up under "unlimited" — they must NOT be downgraded,
-- trialed, or locked. New signups default to 'starter'/'trialing' (set in the app).
UPDATE organizations
  SET plan = 'legacy',
      plan_status = 'active',
      trial_ends_at = NULL
  WHERE created_at < now();

-- 3. Index for the trial-expiry cron (WHERE plan_status='trialing' AND trial_ends_at < now()).
CREATE INDEX IF NOT EXISTS idx_orgs_trial_expiry
  ON organizations (trial_ends_at)
  WHERE plan_status = 'trialing';
