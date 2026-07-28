-- Migration: repair the remaining plpgsql functions that fail at runtime
--
-- Found by sweeping every public plpgsql function with plpgsql_check (see
-- scripts/check-db-functions.ts). Postgres only validates a function body's
-- syntax at CREATE time, so these three shipped and then failed on every call.

-- 1. archive_old_recordings (42601: "INSERT has more expressions than target
--    columns"). recordings gained linked_recording_created_at for the composite
--    FK into the partitioned table; recordings_archived never did, so
--    `INSERT INTO recordings_archived SELECT *` had 31 values for 30 columns.
--    The weekly archive cron has therefore never archived anything
--    (recordings_archived is empty).
--
--    Mirror the column on the archive table and list columns explicitly, so a
--    future column added to only one of the two tables cannot silently shift
--    values into the wrong column.
ALTER TABLE recordings_archived
  ADD COLUMN IF NOT EXISTS linked_recording_created_at timestamptz;

COMMENT ON TABLE recordings_archived IS
  'Cold storage for soft-deleted recordings. Mirrors public.recordings column '
  'for column: a new column on recordings must be added here and to '
  'archive_old_recordings().';

-- 1b. Deleting a primary recording that has a linked webcam recording was
--     impossible: the self-FK is ON DELETE SET NULL, and the webcam_must_be_linked
--     CHECK forbids a webcam row with a NULL link, so the referential action
--     violated the check. That blocked the archive cron and every
--     ?permanent=true delete of a primary that had a webcam track.
--
--     A webcam recording has no meaning without its primary, so cascade instead.
ALTER TABLE recordings
  DROP CONSTRAINT IF EXISTS recordings_linked_recording_id_fkey;

ALTER TABLE recordings
  ADD CONSTRAINT recordings_linked_recording_id_fkey
  FOREIGN KEY (linked_recording_id, linked_recording_created_at)
  REFERENCES recordings (id, created_at)
  ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION archive_old_recordings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Include the linked webcam rows in the delete set. They would otherwise be
  -- removed by the FK cascade above without ever reaching the archive table.
  WITH doomed AS (
    SELECT id, created_at
      FROM recordings
     WHERE deleted_at < NOW() - INTERVAL '90 days'
  ),
  doomed_with_webcams AS (
    SELECT id, created_at FROM doomed
    UNION
    SELECT w.id, w.created_at
      FROM recordings w
      JOIN doomed d
        ON w.linked_recording_id = d.id
       AND w.linked_recording_created_at = d.created_at
  ),
  archived AS (
    DELETE FROM recordings r
     USING doomed_with_webcams t
     WHERE r.id = t.id
       AND r.created_at = t.created_at
    RETURNING
      r.id, r.study_id, r.participant_id, r.scope, r.task_attempt_id, r.storage_path,
      r.storage_provider, r.capture_mode, r.duration_ms, r.file_size_bytes, r.mime_type,
      r.resolution_width, r.resolution_height, r.status, r.status_message, r.upload_id,
      r.chunks_uploaded, r.total_chunks, r.chunk_etags, r.started_at, r.completed_at,
      r.created_at, r.updated_at, r.deleted_at, r.recording_type, r.linked_recording_id,
      r.transcription_language, r.question_response_id, r.total_storage_bytes,
      r.chunk_etags_size_bytes, r.linked_recording_created_at
  )
  INSERT INTO recordings_archived (
    id, study_id, participant_id, scope, task_attempt_id, storage_path,
    storage_provider, capture_mode, duration_ms, file_size_bytes, mime_type,
    resolution_width, resolution_height, status, status_message, upload_id,
    chunks_uploaded, total_chunks, chunk_etags, started_at, completed_at,
    created_at, updated_at, deleted_at, recording_type, linked_recording_id,
    transcription_language, question_response_id, total_storage_bytes,
    chunk_etags_size_bytes, linked_recording_created_at
  )
  SELECT
    id, study_id, participant_id, scope, task_attempt_id, storage_path,
    storage_provider, capture_mode, duration_ms, file_size_bytes, mime_type,
    resolution_width, resolution_height, status, status_message, upload_id,
    chunks_uploaded, total_chunks, chunk_etags, started_at, completed_at,
    created_at, updated_at, deleted_at, recording_type, linked_recording_id,
    transcription_language, question_response_id, total_storage_bytes,
    chunk_etags_size_bytes, linked_recording_created_at
  FROM archived;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_old_recordings()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_recordings()
  TO service_role;

-- 2. create_default_panel_tags (42P10: "no unique or exclusion constraint
--    matching the ON CONFLICT specification"). panel_tags moved from a per-user
--    to a per-organization model: the unique constraint is (organization_id,
--    name), organization_id is NOT NULL, and this function neither sets it nor
--    conflicts on it. It cannot succeed, and nothing calls it — the app seeds
--    panel tags directly. Drop it rather than invent an owner column for it.
DROP FUNCTION IF EXISTS create_default_panel_tags(text);

-- 3. get_recording_with_webcam (42804: "structure of query does not match
--    function result type"). It declares RETURNS TABLE(primary_recording
--    recordings, webcam_recording recordings) — two composites — but selects
--    `r.*, w.*`, which expands to the underlying columns. Never called: the
--    recordings API steps resolve linked_recording_id in TypeScript. Drop it
--    rather than keep a repaired-but-unused composite-returning RPC.
DROP FUNCTION IF EXISTS get_recording_with_webcam(uuid);
