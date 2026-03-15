-- Phase 3: Cleanup chunk_etags metadata after upload finalization

-- One-time cleanup of existing finalized recordings
CREATE OR REPLACE FUNCTION cleanup_finalized_recording_metadata()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE cleaned_count integer;
BEGIN
  WITH cleaned AS (
    UPDATE recordings
    SET
      chunk_etags = NULL,
      updated_at = NOW()
    WHERE status IN ('ready', 'completed')
      AND chunk_etags IS NOT NULL
      AND completed_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO cleaned_count FROM cleaned;

  RETURN cleaned_count;
END;
$$;

SELECT cleanup_finalized_recording_metadata();

-- Auto-cleanup trigger for future recordings
CREATE OR REPLACE FUNCTION auto_cleanup_chunk_etags()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('ready', 'completed') AND OLD.status NOT IN ('ready', 'completed') THEN
    NEW.chunk_etags = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recordings_auto_cleanup_chunk_etags ON recordings;

CREATE TRIGGER recordings_auto_cleanup_chunk_etags
  BEFORE UPDATE OF status ON recordings
  FOR EACH ROW
  WHEN (NEW.status IN ('ready', 'completed'))
  EXECUTE FUNCTION auto_cleanup_chunk_etags();
