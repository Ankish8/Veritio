-- Veritio UX Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create a function to generate nanoid-like codes
CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 10)
RETURNS text AS $$
DECLARE
  id text := '';
  i int := 0;
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  alphaLen int := length(alphabet);
BEGIN
  WHILE i < size LOOP
    id := id || substr(alphabet, floor(random() * alphaLen + 1)::int, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studies table (polymorphic for card_sort and tree_test)
CREATE TABLE IF NOT EXISTS studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,

  -- Core fields
  study_type TEXT NOT NULL CHECK (study_type IN ('card_sort', 'tree_test')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),

  -- Sharing
  share_code TEXT UNIQUE DEFAULT nanoid(10),

  -- Settings (type-specific JSON)
  settings JSONB DEFAULT '{}',

  -- Welcome/Thank you messages
  welcome_message TEXT,
  thank_you_message TEXT,

  -- Timestamps
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table (for card sorting studies)
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (for closed/hybrid card sorting)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tree nodes table (for tree testing studies)
CREATE TABLE IF NOT EXISTS tree_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  path LTREE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (for tree testing studies)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  correct_node_id UUID REFERENCES tree_nodes(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE DEFAULT nanoid(32),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Card sort responses table
CREATE TABLE IF NOT EXISTS card_sort_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Final card placements: { cardId: categoryId/categoryLabel }
  card_placements JSONB NOT NULL,

  -- For open sort: participant-created categories
  custom_categories JSONB,

  -- Timing
  total_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tree test responses table (one per task)
CREATE TABLE IF NOT EXISTS tree_test_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Path taken: array of node IDs in order visited
  path_taken UUID[] NOT NULL DEFAULT '{}',

  -- Final selection
  selected_node_id UUID REFERENCES tree_nodes(id),
  is_correct BOOLEAN,
  is_direct BOOLEAN,

  -- Metrics
  time_to_first_click_ms INTEGER,
  total_time_ms INTEGER,
  backtrack_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_clerk_user ON projects(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_studies_project ON studies(project_id);
CREATE INDEX IF NOT EXISTS idx_studies_clerk_user ON studies(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_studies_share_code ON studies(share_code);
CREATE INDEX IF NOT EXISTS idx_studies_status ON studies(status);
CREATE INDEX IF NOT EXISTS idx_cards_study ON cards(study_id);
CREATE INDEX IF NOT EXISTS idx_categories_study ON categories(study_id);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_study ON tree_nodes(study_id);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_parent ON tree_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_path ON tree_nodes USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_tasks_study ON tasks(study_id);
CREATE INDEX IF NOT EXISTS idx_participants_study ON participants(study_id);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_token);
CREATE INDEX IF NOT EXISTS idx_card_sort_responses_participant ON card_sort_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_card_sort_responses_study ON card_sort_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_tree_test_responses_participant ON tree_test_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_tree_test_responses_study ON tree_test_responses(study_id);
CREATE INDEX IF NOT EXISTS idx_tree_test_responses_task ON tree_test_responses(task_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS studies_updated_at ON studies;
CREATE TRIGGER studies_updated_at
  BEFORE UPDATE ON studies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) - Enable for all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_sort_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_test_responses ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can add stricter policies later)
-- These policies allow the service role to perform all operations

-- Projects policies
DROP POLICY IF EXISTS "Allow all project operations" ON projects;
CREATE POLICY "Allow all project operations" ON projects FOR ALL USING (true);

-- Studies policies
DROP POLICY IF EXISTS "Allow all study operations" ON studies;
CREATE POLICY "Allow all study operations" ON studies FOR ALL USING (true);

-- Cards policies
DROP POLICY IF EXISTS "Allow all card operations" ON cards;
CREATE POLICY "Allow all card operations" ON cards FOR ALL USING (true);

-- Categories policies
DROP POLICY IF EXISTS "Allow all category operations" ON categories;
CREATE POLICY "Allow all category operations" ON categories FOR ALL USING (true);

-- Tree nodes policies
DROP POLICY IF EXISTS "Allow all tree_node operations" ON tree_nodes;
CREATE POLICY "Allow all tree_node operations" ON tree_nodes FOR ALL USING (true);

-- Tasks policies
DROP POLICY IF EXISTS "Allow all task operations" ON tasks;
CREATE POLICY "Allow all task operations" ON tasks FOR ALL USING (true);

-- Participants policies
DROP POLICY IF EXISTS "Allow all participant operations" ON participants;
CREATE POLICY "Allow all participant operations" ON participants FOR ALL USING (true);

-- Card sort responses policies
DROP POLICY IF EXISTS "Allow all card_sort_response operations" ON card_sort_responses;
CREATE POLICY "Allow all card_sort_response operations" ON card_sort_responses FOR ALL USING (true);

-- Tree test responses policies
DROP POLICY IF EXISTS "Allow all tree_test_response operations" ON tree_test_responses;
CREATE POLICY "Allow all tree_test_response operations" ON tree_test_responses FOR ALL USING (true);

-- Grant permissions to authenticated and anon roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
