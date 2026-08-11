-- Education plans (see the /education marketing page).
--
-- Institutions buy a term, not a rolling subscription: access is sized to a
-- cohort and ends on a fixed date. Three things are needed for that.
--   1. Three edu_* plan values on organizations.plan.
--   2. An access_ends_at column: the end of the semester / academic year.
--      Deliberately NOT trial_ends_at — an education org is 'active', not
--      'trialing', and must never be told its "trial" has ended.
--   3. Both enforcement triggers taught the new tiers AND the term gate.
--      These functions hardcode per-plan limits in SQL; they MUST stay in sync
--      with PLAN_ENTITLEMENTS in src/lib/plans.ts.

-- ── 1. plan CHECK constraint ────────────────────────────────────────────────
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN (
    'starter', 'pro', 'team', 'legacy',
    'lifetime_tier1', 'lifetime_tier2', 'lifetime_team',
    'edu_classroom', 'edu_department', 'edu_campus'
  ));

COMMENT ON COLUMN organizations.plan IS
  'Pricing tier: starter | pro | team | legacy | lifetime_* | edu_*';

-- ── 2. fixed access term ────────────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS access_ends_at timestamptz;

COMMENT ON COLUMN organizations.access_ends_at IS
  'End of a fixed access term (education semester / academic year). NULL on rolling subscriptions.';

-- Drives the term-expiry sweep (WHERE access_ends_at < now()).
CREATE INDEX IF NOT EXISTS idx_orgs_access_term_expiry
  ON organizations (access_ends_at)
  WHERE access_ends_at IS NOT NULL;

-- ── 3a. seat-limit trigger ──────────────────────────────────────────────────
-- Education tiers are sized per cohort: base seats + extra_seats, Campus unlimited.
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
  org_access_ends_at timestamptz;
  seat_limit integer;
  current_members integer;
BEGIN
  IF NEW.joined_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plan,
         plan_status,
         trial_ends_at,
         access_ends_at,
         CASE plan
           WHEN 'starter' THEN 1
           WHEN 'pro' THEN 1
           WHEN 'team' THEN 3 + COALESCE(extra_seats, 0)
           WHEN 'legacy' THEN NULL
           WHEN 'lifetime_tier1' THEN 1
           WHEN 'lifetime_tier2' THEN 1
           WHEN 'lifetime_team' THEN 3
           WHEN 'edu_classroom' THEN 40 + COALESCE(extra_seats, 0)
           WHEN 'edu_department' THEN 200 + COALESCE(extra_seats, 0)
           WHEN 'edu_campus' THEN NULL
           ELSE 1
         END
    INTO org_plan, org_plan_status, org_trial_ends_at, org_access_ends_at, seat_limit
    FROM organizations
   WHERE id = NEW.organization_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- A fixed term outranks plan_status: the term ending closes the license.
  IF org_access_ends_at IS NOT NULL AND org_access_ends_at <= now() THEN
    RAISE EXCEPTION 'This access period has ended. Renew to add members.'
      USING ERRCODE = '23514';
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

-- ── 3b. active-study-limit trigger ──────────────────────────────────────────
-- Education tiers run unlimited concurrent studies (every student runs their own).
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
  org_access_ends_at timestamptz;
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
         access_ends_at,
         CASE plan
           WHEN 'starter' THEN 5
           WHEN 'pro' THEN NULL
           WHEN 'team' THEN NULL
           WHEN 'legacy' THEN NULL
           WHEN 'lifetime_tier1' THEN 5
           WHEN 'lifetime_tier2' THEN NULL
           WHEN 'lifetime_team' THEN NULL
           WHEN 'edu_classroom' THEN NULL
           WHEN 'edu_department' THEN NULL
           WHEN 'edu_campus' THEN NULL
           ELSE 5
         END
    INTO org_plan, org_plan_status, org_trial_ends_at, org_access_ends_at, active_limit
    FROM organizations
   WHERE id = NEW.organization_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF org_access_ends_at IS NOT NULL AND org_access_ends_at <= now() THEN
    RAISE EXCEPTION 'This access period has ended. Renew to launch studies.'
      USING ERRCODE = '23514';
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
