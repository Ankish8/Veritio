-- Repair the Call Logs study's participant display mapping without rewriting
-- participant metadata. Names are already stored under this custom field ID.
DO $$
DECLARE
  target_study_id constant uuid := '37b58306-110a-4b99-892c-14b40c2e1a5d';
  custom_field_id constant text := '553d5fb6-77ba-4574-99e9-99ebcdad680c';
  desired_display_settings constant jsonb := jsonb_build_object(
    'primaryField', 'custom:' || custom_field_id,
    'secondaryField', 'none'
  );
BEGIN
  UPDATE public.studies AS study
  SET
    settings = jsonb_set(
      study.settings,
      '{studyFlow,participantIdentifier,displaySettings}',
      desired_display_settings,
      true
    ),
    updated_at = now()
  WHERE study.id = target_study_id
    AND study.settings #>> '{studyFlow,participantIdentifier,type}' = 'demographic_profile'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        COALESCE(
          study.settings #> '{studyFlow,participantIdentifier,demographicProfile,sections}',
          '[]'::jsonb
        )
      ) AS section_data
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(section_data -> 'fields', '[]'::jsonb)
      ) AS field_data
      WHERE field_data ->> 'id' = custom_field_id
        AND field_data ->> 'type' = 'custom'
        AND field_data ->> 'enabled' = 'true'
    )
    AND study.settings #> '{studyFlow,participantIdentifier,displaySettings}'
      IS DISTINCT FROM desired_display_settings;
END
$$;
