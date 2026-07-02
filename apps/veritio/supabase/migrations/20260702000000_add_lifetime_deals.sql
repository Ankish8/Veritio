-- Lifetime deal (LTD) support.
-- 1. Allow the three one-time lifetime plan values on organizations.plan.
-- 2. Teach the seat + active-study enforcement triggers about the lifetime tiers
--    (these functions hardcode per-plan limits in SQL; they MUST stay in sync
--    with PLAN_ENTITLEMENTS in src/lib/plans.ts).
-- 3. Add redemption_codes for marketplace LTD tools (AppSumo/GrabLTD style codes).

-- ── 1. plan CHECK constraint ────────────────────────────────────────────────
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN (
    'starter', 'pro', 'team', 'legacy',
    'lifetime_tier1', 'lifetime_tier2', 'lifetime_team'
  ));

COMMENT ON COLUMN organizations.plan IS
  'Pricing tier: starter | pro | team | legacy | lifetime_tier1 | lifetime_tier2 | lifetime_team';

-- ── 2a. seat-limit trigger (add lifetime tiers) ─────────────────────────────
-- Lifetime Solo/Pro = 1 seat; Lifetime Team = 3 seats (no add-on seats sold for LTD).
CREATE OR REPLACE FUNCTION enforce_organization_member_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_plan text;
  org_plan_status text;
  org_trial_ends_at timestamptz;
  seat_limit integer;
  current_members integer;
BEGIN
  IF NEW.joined_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plan,
         plan_status,
         trial_ends_at,
         CASE plan
           WHEN 'starter' THEN 1
           WHEN 'pro' THEN 1
           WHEN 'team' THEN 3 + COALESCE(extra_seats, 0)
           WHEN 'legacy' THEN NULL
           WHEN 'lifetime_tier1' THEN 1
           WHEN 'lifetime_tier2' THEN 1
           WHEN 'lifetime_team' THEN 3
           ELSE 1
         END
    INTO org_plan, org_plan_status, org_trial_ends_at, seat_limit
    FROM organizations
   WHERE id = NEW.organization_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF org_plan <> 'legacy'
     AND NOT (
       org_plan_status = 'active'
       OR (org_plan_status = 'trialing' AND org_trial_ends_at > now())
     ) THEN
    RAISE EXCEPTION 'Your trial has ended. Subscribe to add members.'
      USING ERRCODE = '23514';
  END IF;

  IF seat_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO current_members
    FROM organization_members
   WHERE organization_id = NEW.organization_id
     AND joined_at IS NOT NULL
     AND id IS DISTINCT FROM NEW.id;

  IF current_members + 1 > seat_limit THEN
    RAISE EXCEPTION 'Seat limit reached for this organization'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION enforce_organization_member_seat_limit() FROM PUBLIC, anon, authenticated;

-- ── 2b. active-study-limit trigger (add lifetime tiers) ─────────────────────
-- Lifetime Solo = 5 active studies; Lifetime Pro/Team = unlimited.
CREATE OR REPLACE FUNCTION enforce_active_study_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_plan text;
  org_plan_status text;
  org_trial_ends_at timestamptz;
  active_limit integer;
  current_active integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND OLD.organization_id = NEW.organization_id THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT plan,
         plan_status,
         trial_ends_at,
         CASE plan
           WHEN 'starter' THEN 5
           WHEN 'pro' THEN NULL
           WHEN 'team' THEN NULL
           WHEN 'legacy' THEN NULL
           WHEN 'lifetime_tier1' THEN 5
           WHEN 'lifetime_tier2' THEN NULL
           WHEN 'lifetime_team' THEN NULL
           ELSE 5
         END
    INTO org_plan, org_plan_status, org_trial_ends_at, active_limit
    FROM organizations
   WHERE id = NEW.organization_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF org_plan <> 'legacy'
     AND NOT (
       org_plan_status = 'active'
       OR (org_plan_status = 'trialing' AND org_trial_ends_at > now())
     ) THEN
    RAISE EXCEPTION 'Your trial has ended. Subscribe to launch studies.'
      USING ERRCODE = '23514';
  END IF;

  IF active_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO current_active
    FROM studies
   WHERE organization_id = NEW.organization_id
     AND status = 'active'
     AND id IS DISTINCT FROM NEW.id;

  IF current_active + 1 > active_limit THEN
    RAISE EXCEPTION 'Active study limit reached for this organization'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION enforce_active_study_plan_limit() FROM PUBLIC, anon, authenticated;

-- ── 3. redemption_codes (marketplace LTD codes) ─────────────────────────────
-- One row per issued code. A code is consumed once (redeemed_at set atomically),
-- granting the target lifetime plan to the redeeming org.
CREATE TABLE IF NOT EXISTS redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('lifetime_tier1', 'lifetime_tier2', 'lifetime_team')),
  source text,                 -- marketplace tag: 'appsumo' | 'grabltd' | 'manual' ...
  batch text,                  -- optional grouping for a code drop
  note text,
  redeemed_by_org uuid REFERENCES organizations(id) ON DELETE SET NULL,
  redeemed_by_user uuid,       -- user id who redeemed (no FK: Better Auth users table)
  redeemed_at timestamptz,
  expires_at timestamptz,      -- optional redemption window; NULL = never expires
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE redemption_codes IS 'Lifetime deal codes issued to LTD marketplaces; redeemed once to grant a lifetime plan.';

CREATE INDEX IF NOT EXISTS idx_redemption_codes_unredeemed
  ON redemption_codes (code)
  WHERE redeemed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_redemption_codes_org
  ON redemption_codes (redeemed_by_org)
  WHERE redeemed_by_org IS NOT NULL;

-- Service-role only: no anon/authenticated policies (service_role bypasses RLS).
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
