-- AI Insights Reports table
-- Stores AI-generated analysis reports with chart configs and narrative findings

CREATE TABLE IF NOT EXISTS ai_insights_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  report_data JSONB,
  response_count_at_generation INT NOT NULL DEFAULT 0,
  segment_filters JSONB DEFAULT '[]',
  file_path TEXT,
  progress JSONB DEFAULT '{"percentage":0,"currentSection":""}',
  error_message TEXT,
  model_used TEXT,
  token_usage JSONB,
  generation_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_reports_study
  ON ai_insights_reports(study_id);

CREATE INDEX IF NOT EXISTS idx_insights_reports_study_status
  ON ai_insights_reports(study_id, status);
