-- Phase 3: Partition recordings by month
-- Maintenance window required (table rewrite + FK rebind)

-- Step 0: Drop foreign keys that reference recordings (will recreate later)
ALTER TABLE IF EXISTS transcripts DROP CONSTRAINT IF EXISTS transcripts_recording_id_fkey;
ALTER TABLE IF EXISTS recording_events DROP CONSTRAINT IF EXISTS recording_events_recording_id_fkey;
ALTER TABLE IF EXISTS recording_clips DROP CONSTRAINT IF EXISTS recording_clips_recording_id_fkey;
ALTER TABLE IF EXISTS recording_comments DROP CONSTRAINT IF EXISTS recording_comments_recording_id_fkey;
ALTER TABLE IF EXISTS recording_shares DROP CONSTRAINT IF EXISTS recording_shares_recording_id_fkey;
ALTER TABLE IF EXISTS recording_annotations DROP CONSTRAINT IF EXISTS recording_annotations_recording_id_fkey;
ALTER TABLE IF EXISTS recording_track_configs DROP CONSTRAINT IF EXISTS recording_track_configs_recording_id_fkey;

-- Step 1: Rename existing table
ALTER TABLE recordings RENAME TO recordings_old;

-- Step 2: Drop incompatible constraints on old table (PK + self FK)
ALTER TABLE recordings_old DROP CONSTRAINT IF EXISTS recordings_linked_recording_id_fkey;
ALTER TABLE recordings_old DROP CONSTRAINT IF EXISTS recordings_pkey;

-- Step 3: Create partitioned table with same structure (constraints/indexes copied)
CREATE TABLE recordings (LIKE recordings_old INCLUDING ALL)
PARTITION BY RANGE (created_at);

-- Step 4: Add primary key that includes partition key
ALTER TABLE recordings
  ADD CONSTRAINT recordings_pkey PRIMARY KEY (id, created_at);

-- Step 5: Re-enable RLS and policies on new parent table
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Study owners can read recordings" ON recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = recordings.study_id
    )
  );

CREATE POLICY "Service role can update recordings" ON recordings
  FOR UPDATE USING (true);

CREATE POLICY "Service role can delete recordings" ON recordings
  FOR DELETE USING (true);

-- Step 6: Recreate self-referential FK to point at new table (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'recordings'
      AND column_name = 'linked_recording_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'recordings'
      AND column_name = 'linked_recording_created_at'
  ) THEN
    EXECUTE 'ALTER TABLE recordings ADD CONSTRAINT recordings_linked_recording_id_fkey FOREIGN KEY (linked_recording_id, linked_recording_created_at) REFERENCES recordings(id, created_at) ON DELETE SET NULL';
  END IF;
END $$;

-- Step 7: Create partitions (current + 2 future months) and default
DO $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  FOR i IN 0..2 LOOP
    start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::interval;
    end_date := start_date + interval '1 month';
    partition_name := format('recordings_%s', to_char(start_date, 'YYYY_MM'));

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF recordings FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS recordings_default
  PARTITION OF recordings DEFAULT;

-- Step 8: Migrate data in batches
DO $$
DECLARE
  batch_size int := 1000;
  offset_val int := 0;
  affected_rows int;
BEGIN
  LOOP
    WITH batch AS (
      SELECT * FROM recordings_old ORDER BY created_at LIMIT batch_size OFFSET offset_val
    )
    INSERT INTO recordings SELECT * FROM batch;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    EXIT WHEN affected_rows = 0;
    offset_val := offset_val + batch_size;
    RAISE NOTICE 'Migrated % rows (offset: %)', affected_rows, offset_val;
    PERFORM pg_sleep(0.2);
  END LOOP;
END $$;

-- Step 9: Recreate triggers (if functions exist)
DROP TRIGGER IF EXISTS recordings_update_storage_size ON recordings;
CREATE TRIGGER recordings_update_storage_size
  BEFORE INSERT OR UPDATE OF file_size_bytes, chunk_etags ON recordings
  FOR EACH ROW EXECUTE FUNCTION update_recording_storage_size();

DROP TRIGGER IF EXISTS recordings_auto_cleanup_chunk_etags ON recordings;
CREATE TRIGGER recordings_auto_cleanup_chunk_etags
  BEFORE UPDATE OF status ON recordings
  FOR EACH ROW
  WHEN (NEW.status IN ('ready', 'completed'))
  EXECUTE FUNCTION auto_cleanup_chunk_etags();

-- Step 10: Rebind foreign keys to the new recordings table (composite key)
ALTER TABLE IF EXISTS transcripts
  ADD CONSTRAINT transcripts_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

ALTER TABLE IF EXISTS recording_events
  ADD CONSTRAINT recording_events_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

ALTER TABLE IF EXISTS recording_clips
  ADD CONSTRAINT recording_clips_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

ALTER TABLE IF EXISTS recording_comments
  ADD CONSTRAINT recording_comments_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

ALTER TABLE IF EXISTS recording_shares
  ADD CONSTRAINT recording_shares_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

ALTER TABLE IF EXISTS recording_annotations
  ADD CONSTRAINT recording_annotations_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

ALTER TABLE IF EXISTS recording_track_configs
  ADD CONSTRAINT recording_track_configs_recording_id_fkey
  FOREIGN KEY (recording_id, recording_created_at)
  REFERENCES recordings(id, created_at) ON DELETE CASCADE;

-- Step 11: Keep recordings_old for validation period
-- DROP TABLE recordings_old; -- Run after verification window
