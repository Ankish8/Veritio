-- Migration: make the daily digest queue actually usable
--
-- 1. Reconcile the owner column with what the app writes (user_id). The
--    original migration created clerk_user_id; production was renamed
--    out-of-band, so this brings a from-scratch database in line.
-- 2. Add an atomic increment: the queue is written once per response, and a
--    read-modify-write from concurrent submissions loses counts.
-- 3. Lock the table down. It is background-job state (study ids + owner ids)
--    and nothing in the browser reads it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'study_digest_queue'
      AND column_name = 'clerk_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'study_digest_queue'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE study_digest_queue RENAME COLUMN clerk_user_id TO user_id;
  END IF;
END $$;

ALTER TABLE study_digest_queue ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE study_digest_queue ALTER COLUMN user_id DROP NOT NULL;

DROP INDEX IF EXISTS idx_study_digest_queue_user;
CREATE INDEX IF NOT EXISTS idx_study_digest_queue_user ON study_digest_queue(user_id);

-- Atomic accumulate. UNIQUE(study_id) makes the upsert the whole concurrency
-- story: one round trip, no lost increments.
CREATE OR REPLACE FUNCTION increment_study_digest_queue(p_study_id uuid, p_user_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO study_digest_queue (study_id, user_id, responses_count, responses_since, last_updated)
  VALUES (p_study_id, p_user_id, 1, NOW(), NOW())
  ON CONFLICT (study_id) DO UPDATE
    SET responses_count = study_digest_queue.responses_count + 1,
        last_updated = NOW(),
        user_id = COALESCE(study_digest_queue.user_id, EXCLUDED.user_id);
$$;

COMMENT ON FUNCTION increment_study_digest_queue(uuid, text) IS
  'Atomically accumulate one response into a study''s daily digest batch. Called by the CheckNotificationTriggers flow; the batch is drained and deleted by the SendDailyDigest cron.';

REVOKE ALL ON FUNCTION increment_study_digest_queue(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_study_digest_queue(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION increment_study_digest_queue(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_study_digest_queue(uuid, text) TO service_role;

-- RLS stays on with no policy: service_role bypasses it, everyone else is out.
DROP POLICY IF EXISTS "Allow all digest queue operations" ON study_digest_queue;
REVOKE ALL ON study_digest_queue FROM anon;
REVOKE ALL ON study_digest_queue FROM authenticated;
GRANT ALL ON study_digest_queue TO service_role;
