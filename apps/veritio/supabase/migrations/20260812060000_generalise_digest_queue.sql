-- Let the digest queue carry more than responses.
--
-- It was response-only by construction: UNIQUE(study_id) with a single
-- responses_count column, and increment_study_digest_queue(study, user) with no
-- notion of what was being counted. Any second kind of daily-summarised event
-- would have needed a parallel mechanism.
--
-- NOTE ON NAMING: `responses_count` keeps its name rather than becoming
-- `event_count`. The rename was planned, but the column is read by
-- send-daily-digest.step.ts and asserted across its existing test suite, and
-- churning a passing, tested cron for a cosmetic rename buys nothing. The
-- column now means "events of this kind"; the comment below says so.

ALTER TABLE public.study_digest_queue
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'response';

COMMENT ON COLUMN public.study_digest_queue.responses_count IS
  'Count of queued events of this row''s `kind` (historically responses only).';

-- One row per (study, kind) rather than per study.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.study_digest_queue'::regclass
      AND contype = 'u'
      AND conname = 'study_digest_queue_study_id_key'
  ) THEN
    ALTER TABLE public.study_digest_queue DROP CONSTRAINT study_digest_queue_study_id_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.study_digest_queue'::regclass
      AND conname = 'study_digest_queue_study_kind_key'
  ) THEN
    ALTER TABLE public.study_digest_queue
      ADD CONSTRAINT study_digest_queue_study_kind_key UNIQUE (study_id, kind);
  END IF;
END
$$;

-- The old 2-arg function must be dropped, not overloaded: a 3-arg version with
-- a default alongside a 2-arg version makes every 2-arg call ambiguous and
-- Postgres refuses it. Dropping and recreating with a defaulted third parameter
-- keeps existing 2-arg callers (update-digest-queue.step.ts) working unchanged.
DROP FUNCTION IF EXISTS public.increment_study_digest_queue(uuid, text);
DROP FUNCTION IF EXISTS public.increment_study_digest_queue(uuid, text, text);

CREATE OR REPLACE FUNCTION public.increment_study_digest_queue(
  p_study_id uuid,
  p_user_id text,
  p_kind text DEFAULT 'response'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.study_digest_queue (study_id, user_id, kind, responses_count, responses_since, last_updated)
  VALUES (p_study_id, p_user_id, p_kind, 1, NOW(), NOW())
  ON CONFLICT (study_id, kind) DO UPDATE
    SET responses_count = public.study_digest_queue.responses_count + 1,
        user_id = COALESCE(EXCLUDED.user_id, public.study_digest_queue.user_id),
        last_updated = NOW();
$$;

REVOKE ALL ON FUNCTION public.increment_study_digest_queue(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_study_digest_queue(uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_study_digest_queue(uuid, text, text) TO service_role;
