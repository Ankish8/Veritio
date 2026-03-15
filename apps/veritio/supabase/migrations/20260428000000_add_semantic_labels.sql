-- Semantic analysis labels for live website test events
-- Stores AI-generated human-readable labels for raw browser interaction events

CREATE TABLE live_website_semantic_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  event_labels JSONB NOT NULL DEFAULT '{}',
  intent_groups JSONB NOT NULL DEFAULT '{}',
  page_labels JSONB NOT NULL DEFAULT '{}',
  participants_analyzed INT NOT NULL DEFAULT 0,
  error_message TEXT,
  token_usage JSONB,
  generation_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(study_id)
);

-- RLS
ALTER TABLE live_website_semantic_labels ENABLE ROW LEVEL SECURITY;

-- Backend (service_role) has full access
CREATE POLICY "service_role_full_access" ON live_website_semantic_labels
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read labels for studies they have access to
CREATE POLICY "authenticated_read_access" ON live_website_semantic_labels
  FOR SELECT
  TO authenticated
  USING (true);
