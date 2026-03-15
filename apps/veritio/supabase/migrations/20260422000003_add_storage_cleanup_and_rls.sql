-- Storage cleanup functions and RLS hardening for participant data

-- ============================================================================
-- STORAGE CLEANUP FUNCTIONS
-- ============================================================================

-- Function to identify orphaned storage objects
CREATE OR REPLACE FUNCTION get_orphaned_storage_objects()
RETURNS TABLE(id uuid, name text, created_at timestamptz, bucket_id text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    so.id,
    so.name,
    so.created_at,
    so.bucket_id
  FROM storage.objects so
  WHERE so.bucket_id = 'study-assets'
    -- Extract study_id from path (first segment)
    AND (storage.foldername(so.name))[1] <> 'avatars'
    AND NOT EXISTS (
      SELECT 1 FROM studies s
      WHERE s.id::text = (storage.foldername(so.name))[1]
    )
    -- Only files older than 30 days (grace period)
    AND so.created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Function to delete orphaned objects (called by cron)
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM storage.objects
    WHERE id IN (SELECT id FROM get_orphaned_storage_objects())
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- RLS HARDENING FOR PARTICIPANT DATA TABLES
-- ============================================================================

-- Study flow responses
DROP POLICY IF EXISTS "Allow all study_flow_responses operations" ON study_flow_responses;

CREATE POLICY "Participants can insert flow responses"
  ON study_flow_responses FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = study_flow_responses.participant_id
        AND p.study_id = study_flow_responses.study_id
        AND p.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

CREATE POLICY "Study owners can read flow responses"
  ON study_flow_responses FOR SELECT
  TO authenticated
  USING (
    study_id IN (
      SELECT s.id FROM studies s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN organization_members om
        ON p.organization_id = om.organization_id
        AND om.joined_at IS NOT NULL
      WHERE p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
         OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Service role full access"
  ON study_flow_responses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Card sort responses
DROP POLICY IF EXISTS "Allow all card_sort_response operations" ON card_sort_responses;

CREATE POLICY "Participants can insert card sort responses"
  ON card_sort_responses FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = card_sort_responses.participant_id
        AND p.study_id = card_sort_responses.study_id
        AND p.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

CREATE POLICY "Study owners can read card sort responses"
  ON card_sort_responses FOR SELECT
  TO authenticated
  USING (
    study_id IN (
      SELECT s.id FROM studies s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN organization_members om
        ON p.organization_id = om.organization_id
        AND om.joined_at IS NOT NULL
      WHERE p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
         OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Service role full access"
  ON card_sort_responses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tree test responses
DROP POLICY IF EXISTS "Allow all tree_test_response operations" ON tree_test_responses;

CREATE POLICY "Participants can insert tree test responses"
  ON tree_test_responses FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = tree_test_responses.participant_id
        AND p.study_id = tree_test_responses.study_id
        AND p.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

CREATE POLICY "Study owners can read tree test responses"
  ON tree_test_responses FOR SELECT
  TO authenticated
  USING (
    study_id IN (
      SELECT s.id FROM studies s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN organization_members om
        ON p.organization_id = om.organization_id
        AND om.joined_at IS NOT NULL
      WHERE p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
         OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Service role full access"
  ON tree_test_responses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Participants
DROP POLICY IF EXISTS "Allow all participant operations" ON participants;

CREATE POLICY "Participants can access their session"
  ON participants FOR SELECT
  TO authenticated, anon
  USING (
    session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

CREATE POLICY "Participants can update their session"
  ON participants FOR UPDATE
  TO authenticated, anon
  USING (
    session_token = current_setting('request.headers', true)::json->>'x-session-token'
  )
  WITH CHECK (
    session_token = current_setting('request.headers', true)::json->>'x-session-token'
  );

CREATE POLICY "Study owners can read participants"
  ON participants FOR SELECT
  TO authenticated
  USING (
    study_id IN (
      SELECT s.id FROM studies s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN organization_members om
        ON p.organization_id = om.organization_id
        AND om.joined_at IS NOT NULL
      WHERE p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
         OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Service role full access"
  ON participants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
