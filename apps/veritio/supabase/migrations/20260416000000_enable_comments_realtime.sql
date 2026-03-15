-- Enable Realtime for study_comments table
-- This allows postgres_changes subscriptions for INSERT/UPDATE/DELETE events
--
-- The frontend subscribes to realtime events filtered by study_id
-- to provide instant comment sync between collaborators.

ALTER PUBLICATION supabase_realtime ADD TABLE study_comments;
