-- Migration: Add yjs_documents table for Yjs real-time collaboration
-- This table stores Yjs document state for real-time collaborative editing

-- Create the yjs_documents table
CREATE TABLE IF NOT EXISTS yjs_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_name TEXT UNIQUE NOT NULL,           -- Format: "study:{studyId}"
  state BYTEA NOT NULL DEFAULT '\x'::bytea, -- Binary Yjs state (encoded updates)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment for documentation
COMMENT ON TABLE yjs_documents IS 'Stores Yjs CRDT document state for real-time collaborative editing';
COMMENT ON COLUMN yjs_documents.doc_name IS 'Document identifier in format "study:{studyId}"';
COMMENT ON COLUMN yjs_documents.state IS 'Binary-encoded Yjs document state (all updates merged)';

-- Index for fast lookups by doc_name
CREATE INDEX IF NOT EXISTS idx_yjs_documents_doc_name ON yjs_documents(doc_name);

-- Index for finding stale documents (cleanup)
CREATE INDEX IF NOT EXISTS idx_yjs_documents_updated_at ON yjs_documents(updated_at);

-- Enable RLS
ALTER TABLE yjs_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access (y-websocket server uses service role key)
-- Frontend never accesses this table directly - it goes through WebSocket
CREATE POLICY "Service role only" ON yjs_documents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_yjs_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_yjs_documents_timestamp
  BEFORE UPDATE ON yjs_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_yjs_documents_updated_at();

-- Function to clean up orphaned documents (studies that no longer exist)
-- This can be called periodically via a cron job
CREATE OR REPLACE FUNCTION cleanup_orphaned_yjs_documents()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM yjs_documents yd
    WHERE NOT EXISTS (
      SELECT 1 FROM studies s
      WHERE yd.doc_name = 'study:' || s.id::text
    )
    AND yd.doc_name LIKE 'study:%'
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
