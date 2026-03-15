-- Export System Migration
-- Adds export_jobs table for asynchronous export processing with batch tracking
-- Supports exports to various integrations (Google Sheets, Airtable, etc.) and formats (CSV, XLSX, JSON)
-- Date: 2026-02-15

-- =============================================================================
-- 1. Create export_jobs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id TEXT NOT NULL,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Job status: pending, processing, completed, failed, cancelled
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),

  -- Export configuration
  integration TEXT, -- 'google_sheets', 'airtable', 'notion', null for direct downloads
  format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'json', 'google_sheets', 'airtable')),

  -- Export options (flexible JSONB for format-specific settings)
  -- For CSV/XLSX: { includeMetadata: true, dateFormat: 'iso', ... }
  -- For Google Sheets: { sheetName: 'Responses', folderId: '...', ... }
  -- For Airtable: { baseId: '...', tableName: '...', ... }
  options JSONB DEFAULT '{}'::jsonb,

  -- Batch processing tracking
  total_participants INTEGER,
  processed_participants INTEGER DEFAULT 0,
  current_batch INTEGER DEFAULT 0,
  total_batches INTEGER DEFAULT 1,

  -- Cursor-based pagination tracking
  last_processed_cursor TEXT,

  -- Result storage
  resource_url TEXT, -- URL to exported resource (Google Sheet, Airtable base, download link)

  -- Error handling
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_study_id ON export_jobs(study_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at DESC);

-- Composite index for finding active jobs for a study
CREATE INDEX IF NOT EXISTS idx_export_jobs_study_status ON export_jobs(study_id, status)
  WHERE status IN ('pending', 'processing');

-- Composite index for user's recent jobs
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_created ON export_jobs(user_id, created_at DESC);

-- GIN index for querying options
CREATE INDEX IF NOT EXISTS idx_export_jobs_options ON export_jobs USING GIN (options);

-- =============================================================================
-- 3. Enable RLS on export_jobs
-- =============================================================================

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own export jobs
CREATE POLICY "Users can view their own export jobs"
  ON export_jobs
  FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Policy: Users can create export jobs for studies they own
CREATE POLICY "Users can create export jobs for their own studies"
  ON export_jobs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = export_jobs.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- Policy: Users can update their own export jobs (for cancellation)
CREATE POLICY "Users can update their own export jobs"
  ON export_jobs
  FOR UPDATE
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Policy: Users can delete their own export jobs
CREATE POLICY "Users can delete their own export jobs"
  ON export_jobs
  FOR DELETE
  USING (user_id = auth.uid()::TEXT);

-- Policy: Service role has full access (for background processing)
CREATE POLICY "Service role full access to export_jobs"
  ON export_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 4. Create trigger for updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER export_jobs_updated_at
  BEFORE UPDATE ON export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_export_jobs_updated_at();

-- =============================================================================
-- 5. Add helper function for progress calculation
-- =============================================================================

CREATE OR REPLACE FUNCTION get_export_job_progress(p_job_id UUID)
RETURNS TABLE (
  job_id UUID,
  status TEXT,
  progress_percentage INTEGER,
  processed INTEGER,
  total INTEGER,
  estimated_time_remaining_seconds INTEGER
) AS $$
DECLARE
  v_job RECORD;
  v_progress_pct INTEGER;
  v_elapsed_seconds INTEGER;
  v_est_remaining INTEGER;
BEGIN
  SELECT * INTO v_job
  FROM export_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate progress percentage
  IF v_job.total_participants > 0 THEN
    v_progress_pct := FLOOR((v_job.processed_participants::DECIMAL / v_job.total_participants::DECIMAL) * 100);
  ELSE
    v_progress_pct := 0;
  END IF;

  -- Calculate estimated time remaining (if job is processing)
  IF v_job.status = 'processing' AND v_job.started_at IS NOT NULL AND v_job.processed_participants > 0 THEN
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_job.started_at))::INTEGER;
    v_est_remaining := FLOOR(
      (v_elapsed_seconds::DECIMAL / v_job.processed_participants::DECIMAL)
      * (v_job.total_participants - v_job.processed_participants)
    );
  ELSE
    v_est_remaining := NULL;
  END IF;

  RETURN QUERY
  SELECT
    v_job.id,
    v_job.status,
    v_progress_pct,
    v_job.processed_participants,
    v_job.total_participants,
    v_est_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_export_job_progress(UUID) TO authenticated;

-- =============================================================================
-- 6. Comments for documentation
-- =============================================================================

COMMENT ON TABLE export_jobs IS 'Tracks asynchronous export jobs for study data to various integrations and formats';
COMMENT ON COLUMN export_jobs.status IS 'Job status: pending (queued), processing (in progress), completed (finished), failed (error occurred), cancelled (user cancelled)';
COMMENT ON COLUMN export_jobs.integration IS 'Target integration: google_sheets, airtable, notion, or null for direct downloads';
COMMENT ON COLUMN export_jobs.format IS 'Export format: csv, xlsx, json, google_sheets, airtable';
COMMENT ON COLUMN export_jobs.options IS 'Format-specific export options (includeMetadata, dateFormat, sheetName, etc.)';
COMMENT ON COLUMN export_jobs.total_participants IS 'Total number of participants to export';
COMMENT ON COLUMN export_jobs.processed_participants IS 'Number of participants processed so far (for progress tracking)';
COMMENT ON COLUMN export_jobs.current_batch IS 'Current batch number being processed (0-indexed)';
COMMENT ON COLUMN export_jobs.total_batches IS 'Total number of batches to process';
COMMENT ON COLUMN export_jobs.last_processed_cursor IS 'Cursor for pagination (participant ID or timestamp)';
COMMENT ON COLUMN export_jobs.resource_url IS 'URL to the exported resource (Google Sheet URL, download link, etc.)';
COMMENT ON COLUMN export_jobs.error_message IS 'Error message if job failed';
