-- AI follow-up probing tables.
--
-- These tables were created directly in production and never had a migration,
-- so self-hosted installs silently got no follow-ups. This migration mirrors
-- the production schema exactly and is idempotent, so it is a no-op for the
-- existing columns and constraints on production. It also adds the study_id
-- indexes the results, export and insights reads filter on.

CREATE TABLE IF NOT EXISTS public.ai_followup_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  parent_question_id uuid NOT NULL REFERENCES public.study_flow_questions(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  trigger_reason text,
  position smallint NOT NULL CONSTRAINT ai_followup_questions_position_check CHECK (position = ANY (ARRAY[1, 2])),
  model_used text NOT NULL DEFAULT 'mercury-2',
  created_at timestamptz NOT NULL DEFAULT now(),
  followup_question_type text NOT NULL DEFAULT 'text',
  followup_question_config jsonb
);

CREATE TABLE IF NOT EXISTS public.ai_followup_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_question_id uuid NOT NULL REFERENCES public.ai_followup_questions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_followup_responses_followup_question_id_participant_id_key UNIQUE (followup_question_id, participant_id)
);

-- Per-participant lookup when counting probes already asked for a question.
CREATE INDEX IF NOT EXISTS idx_ai_followups_participant_parent
  ON public.ai_followup_questions (participant_id, parent_question_id);

-- Results, CSV export and insights page through each study by id.
CREATE INDEX IF NOT EXISTS idx_ai_followup_questions_study_id
  ON public.ai_followup_questions (study_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_followup_responses_study_id
  ON public.ai_followup_responses (study_id, id);

-- The backend uses the service role; nothing else reads these tables.
ALTER TABLE public.ai_followup_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_postgres_full_access ON public.ai_followup_questions;
CREATE POLICY service_role_postgres_full_access
  ON public.ai_followup_questions
  FOR ALL TO service_role, postgres USING (true) WITH CHECK (true);
GRANT ALL ON public.ai_followup_questions TO service_role;

ALTER TABLE public.ai_followup_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_postgres_full_access ON public.ai_followup_responses;
CREATE POLICY service_role_postgres_full_access
  ON public.ai_followup_responses
  FOR ALL TO service_role, postgres USING (true) WITH CHECK (true);
GRANT ALL ON public.ai_followup_responses TO service_role;
