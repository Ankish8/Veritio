-- Migration: Add source_app column for multi-app data isolation
-- This allows the main Veritio platform and PrototypeTesting.ai to share
-- the same database while keeping their data separate

-- Add source_app column to studies table
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'veritio' NOT NULL;

-- Add source_app column to participants table
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'veritio' NOT NULL;

-- Add source_app column to projects table (optional, for future use)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'veritio' NOT NULL;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_studies_source_app ON studies(source_app);
CREATE INDEX IF NOT EXISTS idx_participants_source_app ON participants(source_app);
CREATE INDEX IF NOT EXISTS idx_projects_source_app ON projects(source_app);

-- Update existing data to have source_app = 'veritio'
UPDATE studies SET source_app = 'veritio' WHERE source_app IS NULL;
UPDATE participants SET source_app = 'veritio' WHERE source_app IS NULL;
UPDATE projects SET source_app = 'veritio' WHERE source_app IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN studies.source_app IS 'Identifies which app created this study: veritio or prototype_testing_ai';
COMMENT ON COLUMN participants.source_app IS 'Identifies which app this participant belongs to: veritio or prototype_testing_ai';
COMMENT ON COLUMN projects.source_app IS 'Identifies which app created this project: veritio or prototype_testing_ai';
