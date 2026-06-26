-- Strict pricing-tier guardrails.
-- App-level checks give friendly upgrade messages; these database-side checks
-- prevent races and admin/legacy paths from exceeding the pricing limits.

-- Atomically complete a participant only if the study still has response capacity.
-- p_response_cap NULL means unlimited.
CREATE OR REPLACE FUNCTION complete_participant_if_under_response_cap(
  p_participant_id uuid,
  p_response_cap integer DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_study_id uuid;
  target_status text;
  current_metadata jsonb;
  completed_count integer;
BEGIN
  SELECT study_id
    INTO target_study_id
    FROM participants
   WHERE id = p_participant_id;

  IF target_study_id IS NULL THEN
    RETURN 'not_found';
  END IF;

  -- Serialize completions for the same study so the count and update are one
  -- logical operation under concurrency.
  PERFORM 1
    FROM studies
   WHERE id = target_study_id
   FOR UPDATE;

  SELECT status, COALESCE(metadata::jsonb, '{}'::jsonb)
    INTO target_status, current_metadata
    FROM participants
   WHERE id = p_participant_id
   FOR UPDATE;

  IF target_status = 'completed' THEN
    RETURN 'already_completed';
  END IF;

  IF p_response_cap IS NOT NULL AND p_response_cap >= 0 THEN
    SELECT COUNT(*)
      INTO completed_count
      FROM participants
     WHERE study_id = target_study_id
       AND status = 'completed';

    IF completed_count >= p_response_cap THEN
      RETURN 'response_limit_reached';
    END IF;
  END IF;

  UPDATE participants
     SET status = 'completed',
         completed_at = now(),
         metadata = CASE
           WHEN p_metadata IS NULL THEN metadata
           ELSE (current_metadata || p_metadata)::json
         END
   WHERE id = p_participant_id;

  RETURN 'completed';
END;
$$;

REVOKE ALL ON FUNCTION complete_participant_if_under_response_cap(uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_participant_if_under_response_cap(uuid, integer, jsonb) TO service_role;

-- Enforce paid-seat limits for direct member additions and invite acceptance.
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

DROP TRIGGER IF EXISTS organization_members_enforce_seat_limit ON organization_members;
CREATE TRIGGER organization_members_enforce_seat_limit
  BEFORE INSERT OR UPDATE OF joined_at, organization_id
  ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_organization_member_seat_limit();

-- Enforce Starter's five-active-study limit under concurrent launches.
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

DROP TRIGGER IF EXISTS studies_enforce_active_plan_limit ON studies;
CREATE TRIGGER studies_enforce_active_plan_limit
  BEFORE INSERT OR UPDATE OF status, organization_id
  ON studies
  FOR EACH ROW
  EXECUTE FUNCTION enforce_active_study_plan_limit();
