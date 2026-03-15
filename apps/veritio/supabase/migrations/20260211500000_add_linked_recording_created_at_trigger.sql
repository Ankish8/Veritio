-- Phase 3: Ensure linked_recording_created_at is populated on partitioned recordings

DROP TRIGGER IF EXISTS set_linked_recording_created_at_recordings ON recordings;

CREATE TRIGGER set_linked_recording_created_at_recordings
  BEFORE INSERT OR UPDATE OF linked_recording_id ON recordings
  FOR EACH ROW EXECUTE FUNCTION set_linked_recording_created_at();
