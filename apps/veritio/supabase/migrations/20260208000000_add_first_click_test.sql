-- First-Click Testing Study Type
-- This migration adds support for first-click testing, which captures where participants
-- click first on static images to measure intuitive understanding of UI layouts.

-- Tasks table (each task has one image and instruction)
CREATE TABLE IF NOT EXISTS first_click_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  post_task_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for study_id lookups
CREATE INDEX IF NOT EXISTS idx_first_click_tasks_study_id ON first_click_tasks(study_id);

-- Images associated with tasks (uploaded or imported from Figma)
CREATE TABLE IF NOT EXISTS first_click_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES first_click_tasks(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  original_filename TEXT,
  width INTEGER,
  height INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'figma')),
  figma_file_key TEXT,
  figma_node_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_first_click_images_task_id ON first_click_images(task_id);
CREATE INDEX IF NOT EXISTS idx_first_click_images_study_id ON first_click_images(study_id);

-- Areas of Interest (AOIs) - correct click regions (rectangles only)
-- All coordinates are stored as 0-1 decimal values relative to image dimensions
CREATE TABLE IF NOT EXISTS first_click_aois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES first_click_images(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES first_click_tasks(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  x DECIMAL(10,6) NOT NULL CHECK (x >= 0 AND x <= 1),
  y DECIMAL(10,6) NOT NULL CHECK (y >= 0 AND y <= 1),
  width DECIMAL(10,6) NOT NULL CHECK (width > 0 AND width <= 1),
  height DECIMAL(10,6) NOT NULL CHECK (height > 0 AND height <= 1),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_first_click_aois_image_id ON first_click_aois(image_id);
CREATE INDEX IF NOT EXISTS idx_first_click_aois_task_id ON first_click_aois(task_id);
CREATE INDEX IF NOT EXISTS idx_first_click_aois_study_id ON first_click_aois(study_id);

-- Click responses (participant clicks)
-- Stores where participants clicked, timing, and whether it was correct
CREATE TABLE IF NOT EXISTS first_click_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES first_click_tasks(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES first_click_images(id),
  click_x DECIMAL(10,6) NOT NULL CHECK (click_x >= 0 AND click_x <= 1),
  click_y DECIMAL(10,6) NOT NULL CHECK (click_y >= 0 AND click_y <= 1),
  time_to_click_ms INTEGER,
  is_correct BOOLEAN,
  matched_aoi_id UUID REFERENCES first_click_aois(id),
  is_skipped BOOLEAN DEFAULT false,
  viewport_width INTEGER,
  viewport_height INTEGER,
  image_rendered_width INTEGER,
  image_rendered_height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_first_click_responses_participant_id ON first_click_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_first_click_responses_task_id ON first_click_responses(task_id);
CREATE INDEX IF NOT EXISTS idx_first_click_responses_study_id ON first_click_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_first_click_responses_image_id ON first_click_responses(image_id);
CREATE INDEX IF NOT EXISTS idx_first_click_responses_matched_aoi_id ON first_click_responses(matched_aoi_id);

-- Post-task question answers
CREATE TABLE IF NOT EXISTS first_click_post_task_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES first_click_responses(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES first_click_tasks(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_first_click_post_task_responses_response_id ON first_click_post_task_responses(response_id);
CREATE INDEX IF NOT EXISTS idx_first_click_post_task_responses_study_id ON first_click_post_task_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_first_click_post_task_responses_participant_id ON first_click_post_task_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_first_click_post_task_responses_task_id ON first_click_post_task_responses(task_id);

-- Update studies table to support first_click study type
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'studies_study_type_check'
  ) THEN
    ALTER TABLE studies DROP CONSTRAINT studies_study_type_check;
  END IF;

  -- Add the new constraint with first_click included
  ALTER TABLE studies ADD CONSTRAINT studies_study_type_check
    CHECK (study_type IN ('card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click'));
END $$;

-- Add RLS policies for first_click tables
-- Tasks
ALTER TABLE first_click_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study owners can manage tasks" ON first_click_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_click_tasks.study_id
    )
  );

-- Images
ALTER TABLE first_click_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study owners can manage images" ON first_click_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_click_images.study_id
    )
  );

-- AOIs
ALTER TABLE first_click_aois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study owners can manage AOIs" ON first_click_aois
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_click_aois.study_id
    )
  );

-- Responses
ALTER TABLE first_click_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study owners can read responses" ON first_click_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_click_responses.study_id
    )
  );

CREATE POLICY "Participants can insert responses" ON first_click_responses
  FOR INSERT WITH CHECK (true);

-- Post-task responses
ALTER TABLE first_click_post_task_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study owners can read post-task responses" ON first_click_post_task_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = first_click_post_task_responses.study_id
    )
  );

CREATE POLICY "Participants can insert post-task responses" ON first_click_post_task_responses
  FOR INSERT WITH CHECK (true);
