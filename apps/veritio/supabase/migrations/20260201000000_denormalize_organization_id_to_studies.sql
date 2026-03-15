-- Phase 2: Denormalize organization_id onto studies
-- Reduces multi-join dashboard queries and enables faster org-scoped filters

-- Step 1: Add column (nullable to allow backfill)
ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Step 2: Backfill in batches (outside transaction is ideal; keep DO loop)
DO $$
DECLARE
  batch_size int := 1000;
  affected_rows int;
BEGIN
  LOOP
    WITH batch AS (
      SELECT s.id, p.organization_id
      FROM studies s
      INNER JOIN projects p ON s.project_id = p.id
      WHERE s.organization_id IS NULL
      LIMIT batch_size
    )
    UPDATE studies s SET organization_id = b.organization_id
    FROM batch b WHERE s.id = b.id;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    EXIT WHEN affected_rows = 0;
    RAISE NOTICE 'Backfilled % rows', affected_rows;
    PERFORM pg_sleep(0.5);
  END LOOP;
END $$;

-- Step 3: Enforce NOT NULL after backfill
ALTER TABLE studies
  ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add composite indexes for org-scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_org_created
  ON studies(organization_id, created_at DESC) WHERE is_archived = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_org_status
  ON studies(organization_id, status) WHERE is_archived = false;

-- Step 5: Sync trigger to keep denormalized column fresh
CREATE OR REPLACE FUNCTION sync_study_organization_id() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id) THEN
    SELECT organization_id INTO NEW.organization_id FROM projects WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS studies_sync_organization_id ON studies;

CREATE TRIGGER studies_sync_organization_id
  BEFORE INSERT OR UPDATE OF project_id ON studies
  FOR EACH ROW EXECUTE FUNCTION sync_study_organization_id();
