-- Close the public study-comment realtime channel.
--
-- `broadcast_study_comment_change` (added in 20260425000000_lockdown_rls.sql)
-- called:
--
--   realtime.send(payload, TG_OP, 'study-comments:' || study_id, false)
--
-- The 4th argument is `private`. With it false the channel is NOT RLS-gated, so
-- anyone holding the public anon key who knows or guesses a study UUID could
-- subscribe to `study-comments:<uuid>` and receive every comment body plus the
-- author's name and email — bypassing the getStudyPermission and plan
-- entitlement checks that the HTTP path enforces.
--
-- Flipping `private => true` is NOT a usable fix here: the browser Supabase
-- client is built from the anon key alone (src/lib/supabase/client.ts) because
-- the app authenticates with Better Auth, not Supabase Auth. There is no user
-- JWT for a realtime.messages RLS policy to evaluate — auth.uid() would be
-- NULL and every subscription would fail.
--
-- So comment realtime moves off Supabase broadcast entirely, onto the iii
-- stream RBAC listener that already mints short-lived per-user JWTs and is used
-- for assistant chat and live results. Until that lands, the panel falls back to
-- SWR revalidation. Losing a few seconds of latency is the right trade against
-- leaking private team discussion.

DROP TRIGGER IF EXISTS study_comments_broadcast_changes ON public.study_comments;
DROP FUNCTION IF EXISTS public.broadcast_study_comment_change();

-- 20260416000000_enable_comments_realtime.sql added study_comments to the
-- realtime publication for postgres_changes. That approach was superseded by
-- broadcast and is now unused — leaving it in the publication would keep
-- streaming row changes to any anon subscriber.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'study_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.study_comments;
  END IF;
END
$$;
