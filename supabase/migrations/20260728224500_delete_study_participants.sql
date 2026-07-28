BEGIN;

CREATE OR REPLACE FUNCTION public.delete_study_participants(
  p_study_id UUID,
  p_participant_ids UUID[]
)
RETURNS TABLE(deleted_participant_id UUID)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_participant_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(participant.id ORDER BY participant.id)
  INTO v_participant_ids
  FROM public.participants AS participant
  WHERE participant.study_id = p_study_id
    AND participant.id = ANY(p_participant_ids);

  IF COALESCE(CARDINALITY(v_participant_ids), 0) = 0 THEN
    RETURN;
  END IF;

  -- Generated insights can contain participant answers or quotations. They
  -- cannot be surgically edited, so remove them and let the researcher
  -- regenerate a report from the remaining participant set.
  DELETE FROM public.ai_insights_reports AS report
  WHERE report.study_id = p_study_id;

  -- Preserve the reusable panel profile, notes, tags, and demographics. Only
  -- remove this study's incentive and participation linkage.
  DELETE FROM public.panel_incentive_distributions AS incentive
  USING public.panel_study_participations AS participation
  WHERE incentive.participation_id = participation.id
    AND participation.study_id = p_study_id
    AND participation.participant_id = ANY(v_participant_ids);

  DELETE FROM public.panel_study_participations AS participation
  WHERE participation.study_id = p_study_id
    AND participation.participant_id = ANY(v_participant_ids);

  -- Recordings are partitioned and intentionally do not have a participant
  -- foreign key. Recording children and transcripts cascade from this delete.
  DELETE FROM public.recordings AS recording
  WHERE recording.study_id = p_study_id
    AND recording.participant_id = ANY(v_participant_ids);

  -- These legacy relationships use SET NULL or NO ACTION. Hard deletion means
  -- deleting their study-scoped data rather than leaving anonymous remnants.
  DELETE FROM public.link_analytics AS analytics
  WHERE analytics.study_id = p_study_id
    AND analytics.participant_id = ANY(v_participant_ids);

  DELETE FROM public.live_website_events AS event
  WHERE event.study_id = p_study_id
    AND event.participant_id = ANY(v_participant_ids);

  DELETE FROM public.live_website_gaze_data AS gaze
  WHERE gaze.study_id = p_study_id
    AND gaze.participant_id = ANY(v_participant_ids);

  DELETE FROM public.live_website_rrweb_sessions AS session
  WHERE session.study_id = p_study_id
    AND session.participant_id = ANY(v_participant_ids);

  DELETE FROM public.widget_sessions AS session
  WHERE session.study_id = p_study_id
    AND session.participant_id = ANY(v_participant_ids);

  -- All remaining participant-owned response, attempt, event, fingerprint,
  -- variant, follow-up, and analysis-flag rows use ON DELETE CASCADE.
  RETURN QUERY
  DELETE FROM public.participants AS participant
  WHERE participant.study_id = p_study_id
    AND participant.id = ANY(v_participant_ids)
  RETURNING participant.id;
END;
$$;

COMMENT ON FUNCTION public.delete_study_participants(UUID, UUID[]) IS
  'Permanently deletes study-scoped participant data while preserving reusable panel profiles.';

REVOKE ALL ON FUNCTION public.delete_study_participants(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_study_participants(UUID, UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.delete_study_participants(UUID, UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_study_participants(UUID, UUID[]) TO service_role;

COMMIT;
