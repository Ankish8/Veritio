-- Performance: index studies.settings->snippetId for Live Website Test ingest
--
-- Live Website Tests look up the study by its snippetId, which is stored only
-- inside the studies.settings JSONB (studies.settings->'snippetId'); there is no
-- top-level snippet_id column. Nine snippet/live-website step handlers issue
--   SELECT id FROM studies WHERE (settings -> 'snippetId') = '"<id>"'::jsonb LIMIT 1
-- as the SOLE study lookup (the participant only knows snippetId from the proxy
-- URL, so there is no study_id to fall back on). See:
--   src/steps/api/live-website/{ingest-events,ingest-gaze,serve-snippet}.step.ts
--   src/steps/api/snippet/{upload-rrweb-chunk,upload-screenshot,upload-snapshot,
--                          submit-snippet-response,get-snippet-tasks,verify-snippet}.step.ts
-- ingest-events / ingest-gaze / upload-rrweb-chunk fire repeatedly per participant
-- session (continuous event/gaze streaming + chunked recording upload), so without
-- a supporting index each call sequentially scans the entire multi-tenant studies
-- table. This is the highest-frequency read on the Live Website Test path.
--
-- A GIN index on settings would NOT serve the `->` equality; this must be a B-tree
-- expression index on (settings -> 'snippetId') to match the operator PostgREST
-- emits. The partial predicate keeps the index tiny (only LWT studies carry a
-- snippetId key).
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block. This file
-- must be applied outside a transaction, e.g. via scripts/apply-migration-safely.ts,
-- matching the other CONCURRENTLY index migrations in this directory
-- (20260125000000_add_quick_win_indexes.sql, 20260421000000_add_phase3_performance_indexes.sql,
-- 20260422000002_add_performance_indexes_phase4.sql).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_settings_snippet_id
  ON studies ((settings -> 'snippetId'))
  WHERE settings ? 'snippetId';
