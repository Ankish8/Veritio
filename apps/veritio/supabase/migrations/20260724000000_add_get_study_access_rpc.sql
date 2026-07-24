-- get_study_access: collapse the serial study-permission chain
-- (studies → projects → project_members → organization_members) into a single
-- round-trip. Reproduces getStudyPermission/getProjectPermission semantics in
-- apps/veritio/src/services/permission-service.ts exactly:
--   * study or project missing            → {status: 'not_found'}
--   * legacy project (organization_id IS NULL): owner iff project.user_id = user
--   * explicit project_members row wins over the organization role
--   * organization_members role (joined_at NOT NULL) → source 'inherited'
--   * otherwise                            → {status: 'no_access'}
CREATE OR REPLACE FUNCTION get_study_access(p_study_id uuid, p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_study RECORD;
  v_project RECORD;
  v_pm RECORD;
  v_org_role text;
BEGIN
  SELECT id, project_id, user_id INTO v_study
  FROM studies WHERE id = p_study_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT id, organization_id, user_id INTO v_project
  FROM projects WHERE id = v_study.project_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Legacy personal project — only the original owner has access
  IF v_project.organization_id IS NULL THEN
    IF v_project.user_id = p_user_id THEN
      RETURN jsonb_build_object(
        'status', 'ok',
        'role', 'owner',
        'source', 'explicit',
        'organization_id', NULL,
        'project_id', v_project.id
      );
    END IF;
    RETURN jsonb_build_object('status', 'no_access');
  END IF;

  -- Explicit project membership wins
  SELECT role, source INTO v_pm
  FROM project_members
  WHERE project_id = v_project.id AND user_id = p_user_id
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'role', v_pm.role,
      'source', v_pm.source,
      'organization_id', v_project.organization_id,
      'project_id', v_project.id
    );
  END IF;

  -- Fall back to organization role
  SELECT role INTO v_org_role
  FROM organization_members
  WHERE organization_id = v_project.organization_id
    AND user_id = p_user_id
    AND joined_at IS NOT NULL
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'role', v_org_role,
      'source', 'inherited',
      'organization_id', v_project.organization_id,
      'project_id', v_project.id
    );
  END IF;

  RETURN jsonb_build_object('status', 'no_access');
END;
$$;

-- Backend-only helper: PostgREST exposes RPCs to every role that can execute
-- them, and this one takes an arbitrary user id — restrict to service_role.
REVOKE EXECUTE ON FUNCTION get_study_access(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_study_access(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION get_study_access(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION get_study_access(uuid, text) TO service_role;
