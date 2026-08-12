-- Atomic roll-up for high-frequency notifications.
--
-- Without this, a 100-response study puts 100 rows in the inbox and people
-- learn to ignore it — the exact failure mode this whole feature is trying to
-- avoid. Events sharing a `group_key` collapse into a single row carrying a
-- count.
--
-- Done in SQL rather than read-then-write in the step because concurrent
-- responses are the normal case: two submissions landing together would both
-- see "no existing row" and one insert would fail on the unique index. A single
-- INSERT ... ON CONFLICT is atomic and needs no retry logic.
--
-- The conflict target repeats the partial index's predicate
-- (`WHERE group_key IS NOT NULL`) so Postgres can infer idx_notifications_group_key.

CREATE OR REPLACE FUNCTION public.upsert_grouped_notification(
  p_user_id text,
  p_type text,
  p_category text,
  p_title text,
  p_message text,
  p_group_key text,
  p_study_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (id uuid, count integer, was_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
  v_inserted boolean;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, category, title, message, group_key, study_id, metadata, read, created_at
  )
  VALUES (
    p_user_id, p_type, p_category, p_title, p_message, p_group_key, p_study_id,
    p_metadata || jsonb_build_object('count', 1), false, NOW()
  )
  ON CONFLICT (user_id, group_key) WHERE group_key IS NOT NULL
  DO UPDATE SET
    -- Latest wording wins, so the row can say "12 new responses" not "2".
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    metadata = public.notifications.metadata
               || EXCLUDED.metadata
               || jsonb_build_object(
                    'count',
                    COALESCE((public.notifications.metadata->>'count')::int, 1) + 1
                  ),
    -- New activity in a group the user already read makes it unread again;
    -- otherwise a burst after a glance would never be surfaced.
    read = false,
    -- Bumped so an active group sorts to the top of the inbox.
    created_at = NOW()
  RETURNING public.notifications.id,
            COALESCE((public.notifications.metadata->>'count')::int, 1),
            (xmax = 0)
  INTO v_id, v_count, v_inserted;

  RETURN QUERY SELECT v_id, v_count, v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_grouped_notification(text, text, text, text, text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_grouped_notification(text, text, text, text, text, text, uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_grouped_notification(text, text, text, text, text, text, uuid, jsonb) TO service_role;
