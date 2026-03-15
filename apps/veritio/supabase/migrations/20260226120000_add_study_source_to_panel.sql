-- Add 'study' source to panel_participants and panel_participant_tags CHECK constraints
-- This allows the sync-study-to-panel step to insert participants with source = 'study'

-- panel_participants: drop and re-add the source CHECK constraint with 'study'
-- PostgreSQL auto-names inline CHECK constraints as {table}_{column}_check
ALTER TABLE panel_participants DROP CONSTRAINT IF EXISTS panel_participants_source_check;
ALTER TABLE panel_participants ADD CONSTRAINT panel_participants_source_check
  CHECK (source IN ('widget', 'import', 'manual', 'link', 'email', 'study'));

-- panel_participant_tags: drop and re-add the source CHECK constraint with 'study'
ALTER TABLE panel_participant_tags DROP CONSTRAINT IF EXISTS panel_participant_tags_source_check;
ALTER TABLE panel_participant_tags ADD CONSTRAINT panel_participant_tags_source_check
  CHECK (source IN ('widget', 'import', 'manual', 'link', 'auto', 'study'));
