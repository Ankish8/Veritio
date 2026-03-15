-- Update study_type constraint to include live_website_test
DO $$ BEGIN
  ALTER TABLE studies DROP CONSTRAINT IF EXISTS studies_study_type_check;
  ALTER TABLE studies ADD CONSTRAINT studies_study_type_check
    CHECK (study_type IN ('card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test'));
END $$;

COMMENT ON COLUMN studies.study_type IS 'Type of study: card_sort, tree_test, survey, prototype_test, first_click, first_impression, or live_website_test';

-- Live Website Test tables
-- Tasks table
CREATE TABLE live_website_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  target_url TEXT NOT NULL,
  success_url TEXT,
  success_criteria_type TEXT NOT NULL DEFAULT 'self_reported'
    CHECK (success_criteria_type IN ('self_reported', 'url_match')),
  time_limit_seconds INTEGER,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Responses table
-- recording_id has no FK constraint because recordings is a partitioned table
-- with composite PK (id, created_at)
CREATE TABLE live_website_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES live_website_tasks(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'abandoned', 'timed_out', 'skipped')),
  self_reported_success BOOLEAN,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  recording_id UUID,
  seq_rating INTEGER CHECK (seq_rating >= 1 AND seq_rating <= 7),
  open_ended_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events table (for JS snippet mode)
CREATE TABLE live_website_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id),
  session_id TEXT NOT NULL,
  task_id UUID REFERENCES live_website_tasks(id),
  event_type TEXT NOT NULL,
  element_selector TEXT,
  coordinates JSONB,
  viewport_size JSONB,
  page_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lwt_study ON live_website_tasks(study_id);
CREATE INDEX idx_lwr_study ON live_website_responses(study_id);
CREATE INDEX idx_lwr_participant ON live_website_responses(participant_id);
CREATE INDEX idx_lwe_study ON live_website_events(study_id);
CREATE INDEX idx_lwe_session ON live_website_events(session_id);
CREATE INDEX idx_lwe_task ON live_website_events(task_id);

-- RLS
ALTER TABLE live_website_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_website_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_website_events ENABLE ROW LEVEL SECURITY;
