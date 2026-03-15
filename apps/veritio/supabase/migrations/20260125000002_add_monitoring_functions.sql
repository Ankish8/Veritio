-- Phase 1: Monitoring Infrastructure Functions
-- Enables storage and query performance reporting

-- Enable pg_stat_statements for query performance metrics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- STORAGE METRICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_storage_metrics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_size_bytes', pg_database_size(current_database()),
    'recordings_size_bytes', pg_total_relation_size('recordings'),
    'yjs_documents_size_bytes', pg_total_relation_size('yjs_documents'),
    'chunk_etags_size_bytes', COALESCE(
      (SELECT SUM(pg_column_size(chunk_etags)) FROM recordings WHERE chunk_etags IS NOT NULL),
      0
    ),
    'largest_tables', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'table_name', table_name,
          'size_bytes', size_bytes
        )
        ORDER BY size_bytes DESC
      )
      FROM (
        SELECT
          schemaname || '.' || tablename AS table_name,
          pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
        LIMIT 10
      ) AS tables
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================================
-- QUERY PERFORMANCE METRICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_query_performance_metrics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'slow_queries', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'query', LEFT(query, 200),
          'avg_duration_ms', mean_exec_time,
          'call_count', calls
        )
        ORDER BY mean_exec_time DESC
      )
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      LIMIT 20
    ),
    'table_scan_stats', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'table_name', schemaname || '.' || relname,
          'seq_scan_count', seq_scan,
          'idx_scan_count', idx_scan,
          'ratio', CASE
            WHEN idx_scan > 0 THEN ROUND((seq_scan::numeric / idx_scan), 2)
            ELSE NULL
          END
        )
        ORDER BY seq_scan DESC
      )
      FROM pg_stat_user_tables
      WHERE seq_scan > 100
      LIMIT 15
    )
  ) INTO result;

  RETURN result;
END;
$$;
