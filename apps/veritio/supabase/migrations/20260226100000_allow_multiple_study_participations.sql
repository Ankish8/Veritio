-- Allow the same panel participant to have multiple participations for the same study
-- (e.g., retaking a study). Previously, the unique constraint prevented this and
-- the sync service would overwrite the first completion's data.

ALTER TABLE panel_study_participations
  DROP CONSTRAINT IF EXISTS unique_participation_per_study;
