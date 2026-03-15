-- Research Repository Migration
-- Adds insights, evidence highlighting, study tags, and cross-study search infrastructure
-- Part of the research knowledge repository system for Veritio UX Research Platform

-- ============================================================================
-- INSIGHTS - Core research findings from studies
-- ============================================================================

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Optional for cross-study insights

  -- Core content
  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 500),
  description TEXT, -- Rich text (HTML) for detailed findings

  -- Categorization
  insight_type TEXT NOT NULL DEFAULT 'finding' CHECK (insight_type IN (
    'finding',           -- Key observation/discovery
    'recommendation',    -- Suggested action/improvement
    'pattern',           -- Recurring theme across responses
    'quote',             -- Notable participant quote
    'pain_point',        -- User struggle/friction point
    'opportunity',       -- Potential improvement area
    'hypothesis'         -- Unvalidated theory to explore
  )),

  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  published_at TIMESTAMPTZ,
  published_by_user_id TEXT,

  -- User-defined tags for organizing insights
  tags TEXT[] DEFAULT '{}',

  -- Creator & ownership
  created_by_user_id TEXT NOT NULL,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for insights
CREATE INDEX IF NOT EXISTS idx_insights_organization ON insights(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_study ON insights(study_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_project ON insights(project_id) WHERE is_deleted = FALSE AND project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(organization_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(study_id, insight_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_priority ON insights(study_id, priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_insights_published ON insights(organization_id, published_at DESC) WHERE status = 'published' AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_tags ON insights USING GIN(tags) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(study_id, created_at DESC) WHERE is_deleted = FALSE;

COMMENT ON TABLE insights IS 'Research insights synthesized from study evidence. Supports draft->review->published workflow.';
COMMENT ON COLUMN insights.description IS 'Rich text (HTML) description of the insight with formatting support';
COMMENT ON COLUMN insights.project_id IS 'Optional: set for cross-study insights that span multiple studies in a project';
COMMENT ON COLUMN insights.tags IS 'User-defined tags for organizing insights (e.g., ["navigation", "checkout", "mobile"])';
COMMENT ON COLUMN insights.insight_type IS 'Type: finding, recommendation, pattern, quote, pain_point, opportunity, hypothesis';


-- ============================================================================
-- INSIGHT EVIDENCE - Polymorphic evidence linking
-- ============================================================================

CREATE TABLE IF NOT EXISTS insight_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,

  -- Polymorphic reference (no FK constraint on evidence_id for flexibility)
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'card_sort_response',
    'tree_test_response',
    'survey_response',           -- study_flow_responses for survey studies
    'first_click_response',
    'first_impression_response',
    'prototype_test_response',   -- prototype_test_task_attempts
    'recording_clip'
  )),
  evidence_id UUID NOT NULL, -- References the actual response/clip

  -- Point-in-time snapshot for data integrity
  -- Captures the evidence state when linked (won't change if source is edited/deleted)
  snapshot JSONB NOT NULL DEFAULT '{}',

  -- Annotation explaining why this evidence matters
  annotation TEXT,

  -- For time-based evidence (recordings), capture the relevant segment
  start_time_ms INTEGER, -- Only for recording clips
  end_time_ms INTEGER,   -- Only for recording clips

  -- Ordering within insight
  position INTEGER DEFAULT 0 NOT NULL,

  -- Creator tracking
  created_by_user_id TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Validation: time range only for recording clips
  CONSTRAINT valid_evidence_time_range CHECK (
    (evidence_type != 'recording_clip' AND start_time_ms IS NULL AND end_time_ms IS NULL) OR
    (evidence_type = 'recording_clip' AND (start_time_ms IS NULL OR end_time_ms IS NULL OR end_time_ms > start_time_ms))
  ),

  -- Unique constraint: same evidence can only be linked once per insight
  CONSTRAINT unique_insight_evidence UNIQUE(insight_id, evidence_type, evidence_id)
);

-- Indexes for insight_evidence
CREATE INDEX IF NOT EXISTS idx_insight_evidence_insight ON insight_evidence(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_evidence_type ON insight_evidence(evidence_type, evidence_id);
CREATE INDEX IF NOT EXISTS idx_insight_evidence_position ON insight_evidence(insight_id, position);
CREATE INDEX IF NOT EXISTS idx_insight_evidence_created_by ON insight_evidence(created_by_user_id);

COMMENT ON TABLE insight_evidence IS 'Links evidence (responses, clips) to insights with point-in-time snapshots';
COMMENT ON COLUMN insight_evidence.evidence_type IS 'Polymorphic type: card_sort_response, tree_test_response, etc.';
COMMENT ON COLUMN insight_evidence.evidence_id IS 'UUID of the source record (no FK for flexibility across response types)';
COMMENT ON COLUMN insight_evidence.snapshot IS 'JSONB snapshot of evidence at link time for data integrity';
COMMENT ON COLUMN insight_evidence.annotation IS 'Researcher notes on why this evidence supports the insight';


-- ============================================================================
-- EVIDENCE HIGHLIGHTS - Study-scoped highlights for later linking
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Polymorphic reference (same pattern as insight_evidence)
  source_type TEXT NOT NULL CHECK (source_type IN (
    'card_sort_response',
    'tree_test_response',
    'survey_response',
    'first_click_response',
    'first_impression_response',
    'prototype_test_response',
    'recording_clip'
  )),
  source_id UUID NOT NULL, -- References the actual response/clip

  -- For recordings: optional time selection within the source
  start_time_ms INTEGER,
  end_time_ms INTEGER,

  -- Annotation
  note TEXT,

  -- Optional tagging (references response_tags.id)
  tag_ids UUID[] DEFAULT '{}',

  -- Snapshot for stability
  snapshot JSONB NOT NULL DEFAULT '{}',

  -- Creator tracking
  created_by_user_id TEXT NOT NULL,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Validation for time ranges
  CONSTRAINT valid_highlight_time_range CHECK (
    start_time_ms IS NULL OR end_time_ms IS NULL OR end_time_ms > start_time_ms
  )
);

-- Indexes for evidence_highlights
CREATE INDEX IF NOT EXISTS idx_evidence_highlights_study ON evidence_highlights(study_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_evidence_highlights_source ON evidence_highlights(source_type, source_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_evidence_highlights_created_by ON evidence_highlights(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_highlights_tags ON evidence_highlights USING GIN(tag_ids) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_evidence_highlights_created_at ON evidence_highlights(study_id, created_at DESC) WHERE is_deleted = FALSE;

COMMENT ON TABLE evidence_highlights IS 'Study-scoped highlights that can later be promoted to insight evidence';
COMMENT ON COLUMN evidence_highlights.tag_ids IS 'Array of response_tags.id for categorization';
COMMENT ON COLUMN evidence_highlights.note IS 'Quick annotation captured during review';


-- ============================================================================
-- INSIGHT COLLABORATORS - Track who worked on insights
-- ============================================================================

CREATE TABLE IF NOT EXISTS insight_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Role in the insight
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'contributor', 'reviewer')),

  -- When they were added
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  added_by_user_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_insight_collaborator UNIQUE(insight_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_insight_collaborators_insight ON insight_collaborators(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_collaborators_user ON insight_collaborators(user_id);

COMMENT ON TABLE insight_collaborators IS 'Tracks team members collaborating on insights';
COMMENT ON COLUMN insight_collaborators.role IS 'Role: owner (creator), contributor, or reviewer';


-- ============================================================================
-- STUDY TAGS - Organization-scoped metadata tags for studies
-- ============================================================================

CREATE TABLE IF NOT EXISTS study_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Tag metadata
  name VARCHAR(50) NOT NULL CHECK (length(name) >= 1),
  color VARCHAR(7) NOT NULL DEFAULT '#6b7280', -- hex color
  description TEXT,

  -- Tag grouping (for organizing tags in UI)
  tag_group TEXT NOT NULL DEFAULT 'custom' CHECK (tag_group IN (
    'product_area',  -- e.g., Mobile App, Web App, Dashboard
    'team',          -- e.g., Design, Product, Engineering
    'methodology',   -- e.g., Discovery, Validation, Iteration
    'status',        -- e.g., High Priority, In Review
    'custom'         -- User-defined
  )),

  -- Ordering within group
  position INTEGER DEFAULT 0,

  -- Creator tracking
  created_by_user_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: no duplicate tag names per organization
  CONSTRAINT unique_study_tag_name_per_org UNIQUE (organization_id, name)
);

-- Indexes for study_tags
CREATE INDEX IF NOT EXISTS idx_study_tags_org ON study_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_study_tags_org_group ON study_tags(organization_id, tag_group);
CREATE INDEX IF NOT EXISTS idx_study_tags_name ON study_tags(organization_id, name);

COMMENT ON TABLE study_tags IS 'Organization-scoped tags for classifying studies by metadata (product area, team, methodology, etc.)';
COMMENT ON COLUMN study_tags.tag_group IS 'Grouping category: product_area, team, methodology, status, or custom';
COMMENT ON COLUMN study_tags.color IS 'Hex color code for visual distinction (e.g., #22c55e)';


-- ============================================================================
-- STUDY TAG ASSIGNMENTS - Links studies to organization tags (many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS study_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES study_tags(id) ON DELETE CASCADE,

  -- Audit
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  assigned_by_user_id TEXT,

  -- Unique constraint: can't assign same tag to same study twice
  CONSTRAINT unique_study_tag_assignment UNIQUE (study_id, tag_id)
);

-- Indexes for study_tag_assignments
CREATE INDEX IF NOT EXISTS idx_study_tag_assignments_study ON study_tag_assignments(study_id);
CREATE INDEX IF NOT EXISTS idx_study_tag_assignments_tag ON study_tag_assignments(tag_id);

COMMENT ON TABLE study_tag_assignments IS 'Junction table linking studies to organization-scoped tags';


-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Insights with evidence counts
CREATE OR REPLACE VIEW insights_with_counts AS
SELECT
  i.*,
  COALESCE(e.evidence_count, 0) AS evidence_count,
  COALESCE(c.collaborator_count, 0) AS collaborator_count
FROM insights i
LEFT JOIN (
  SELECT insight_id, COUNT(*) as evidence_count
  FROM insight_evidence
  GROUP BY insight_id
) e ON i.id = e.insight_id
LEFT JOIN (
  SELECT insight_id, COUNT(*) as collaborator_count
  FROM insight_collaborators
  GROUP BY insight_id
) c ON i.id = c.insight_id
WHERE i.is_deleted = FALSE;

COMMENT ON VIEW insights_with_counts IS 'Insights with pre-computed evidence and collaborator counts';


-- View: Studies with tag information for search
CREATE OR REPLACE VIEW studies_with_tags AS
SELECT
  s.id,
  s.title,
  s.description,
  s.study_type,
  s.status,
  s.project_id,
  s.is_archived,
  s.created_at,
  s.updated_at,
  p.name AS project_name,
  p.organization_id,
  COALESCE(
    array_agg(
      jsonb_build_object('id', st.id, 'name', st.name, 'color', st.color, 'tag_group', st.tag_group)
    ) FILTER (WHERE st.id IS NOT NULL),
    '{}'
  ) AS tags
FROM studies s
JOIN projects p ON s.project_id = p.id
LEFT JOIN study_tag_assignments sta ON s.id = sta.study_id
LEFT JOIN study_tags st ON sta.tag_id = st.id
WHERE s.is_archived = FALSE
GROUP BY s.id, s.title, s.description, s.study_type, s.status, s.project_id, s.is_archived, s.created_at, s.updated_at, p.name, p.organization_id;

COMMENT ON VIEW studies_with_tags IS 'Studies with their associated tags for cross-study search';


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Permissive policies (app-layer handles permission checks via permission-service)
DROP POLICY IF EXISTS "insights_all" ON insights;
CREATE POLICY "insights_all" ON insights FOR ALL USING (true);

DROP POLICY IF EXISTS "insight_evidence_all" ON insight_evidence;
CREATE POLICY "insight_evidence_all" ON insight_evidence FOR ALL USING (true);

DROP POLICY IF EXISTS "evidence_highlights_all" ON evidence_highlights;
CREATE POLICY "evidence_highlights_all" ON evidence_highlights FOR ALL USING (true);

DROP POLICY IF EXISTS "insight_collaborators_all" ON insight_collaborators;
CREATE POLICY "insight_collaborators_all" ON insight_collaborators FOR ALL USING (true);

DROP POLICY IF EXISTS "study_tags_all" ON study_tags;
CREATE POLICY "study_tags_all" ON study_tags FOR ALL USING (true);

DROP POLICY IF EXISTS "study_tag_assignments_all" ON study_tag_assignments;
CREATE POLICY "study_tag_assignments_all" ON study_tag_assignments FOR ALL USING (true);


-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS insights_updated_at ON insights;
CREATE TRIGGER insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS insight_evidence_updated_at ON insight_evidence;
CREATE TRIGGER insight_evidence_updated_at
  BEFORE UPDATE ON insight_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS evidence_highlights_updated_at ON evidence_highlights;
CREATE TRIGGER evidence_highlights_updated_at
  BEFORE UPDATE ON evidence_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS insight_collaborators_updated_at ON insight_collaborators;
CREATE TRIGGER insight_collaborators_updated_at
  BEFORE UPDATE ON insight_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS study_tags_updated_at ON study_tags;
CREATE TRIGGER study_tags_updated_at
  BEFORE UPDATE ON study_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON insights TO authenticated, anon;
GRANT ALL ON insight_evidence TO authenticated, anon;
GRANT ALL ON evidence_highlights TO authenticated, anon;
GRANT ALL ON insight_collaborators TO authenticated, anon;
GRANT ALL ON study_tags TO authenticated, anon;
GRANT ALL ON study_tag_assignments TO authenticated, anon;
GRANT SELECT ON insights_with_counts TO authenticated, anon;
GRANT SELECT ON studies_with_tags TO authenticated, anon;
