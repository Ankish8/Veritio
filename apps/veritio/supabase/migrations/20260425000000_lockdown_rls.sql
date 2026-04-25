-- =============================================================================
-- Comprehensive RLS Lockdown — 2026-04-25
-- =============================================================================
-- Closes the systemic RLS misconfiguration where ~40+ public-schema tables
-- had policies granted to {public} role with USING (true), allowing the
-- public anon key to read/write/delete most of the database via PostgREST.
--
-- Strategy:
--   1. Drop every {public}-role policy across public.*
--   2. Enable RLS on every public-schema table (idempotent)
--   3. Create uniform "service_role_postgres_full_access" policy on every table
--   4. Add tightly scoped anon SELECT carve-outs for legitimately public data
--   5. Install Postgres triggers that broadcast realtime events via realtime.send()
--      (replaces postgres_changes subscriptions which break under RLS lockdown)
--
-- This migration is idempotent and safe to re-apply.
-- =============================================================================

-- ─── Step 1: drop all {public}-role policies across public.* ─────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND roles::text = '{public}'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ─── Step 2: enable RLS on every public-schema table ─────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- ─── Step 3: uniform "service_role_postgres_full_access" policy ──────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'service_role_postgres_full_access', r.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role, postgres USING (true) WITH CHECK (true)',
      'service_role_postgres_full_access', r.tablename
    );
  END LOOP;
END $$;

-- ─── Step 3.5: drop residual {anon}-role policies that bypass the lockdown ──
-- These were not caught by Step 1 (which only targets {public} role).
-- Each is dropped because the table is either dead code or accessed
-- exclusively via Motia (service_role).
DROP POLICY IF EXISTS "anon_insert_conversations" ON public.interview_conversations;
DROP POLICY IF EXISTS "anon_read_conversations" ON public.interview_conversations;
DROP POLICY IF EXISTS "anon_update_conversations" ON public.interview_conversations;
DROP POLICY IF EXISTS "anon_insert_messages" ON public.interview_messages;
DROP POLICY IF EXISTS "anon_read_messages" ON public.interview_messages;
DROP POLICY IF EXISTS "Anon can insert gaze data" ON public.live_website_gaze_data;
DROP POLICY IF EXISTS "Anon can select gaze data" ON public.live_website_gaze_data;
DROP POLICY IF EXISTS "Participants can insert card sort responses" ON public.card_sort_responses;
DROP POLICY IF EXISTS "Participants can insert flow responses" ON public.study_flow_responses;
DROP POLICY IF EXISTS "Participants can insert tree test responses" ON public.tree_test_responses;

-- ─── Step 4: scoped anon SELECT carve-outs ───────────────────────────────────
-- knowledge_articles: public help content
DROP POLICY IF EXISTS "anon_read_knowledge_articles" ON public.knowledge_articles;
CREATE POLICY "anon_read_knowledge_articles"
  ON public.knowledge_articles
  FOR SELECT TO anon
  USING (true);

-- recording_shares: token-gated public recording share links
DROP POLICY IF EXISTS "anon_read_active_share_codes" ON public.recording_shares;
CREATE POLICY "anon_read_active_share_codes"
  ON public.recording_shares
  FOR SELECT TO anon
  USING (
    share_code IS NOT NULL
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

-- prototype_test_frames / _prototypes / _tasks: anon read for ACTIVE studies only
DROP POLICY IF EXISTS "anon_read_active_study_prototype_frames" ON public.prototype_test_frames;
CREATE POLICY "anon_read_active_study_prototype_frames"
  ON public.prototype_test_frames
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.studies s
    WHERE s.id = prototype_test_frames.study_id AND s.status = 'active'
  ));

DROP POLICY IF EXISTS "anon_read_active_study_prototype_prototypes" ON public.prototype_test_prototypes;
CREATE POLICY "anon_read_active_study_prototype_prototypes"
  ON public.prototype_test_prototypes
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.studies s
    WHERE s.id = prototype_test_prototypes.study_id AND s.status = 'active'
  ));

DROP POLICY IF EXISTS "anon_read_active_study_prototype_tasks" ON public.prototype_test_tasks;
CREATE POLICY "anon_read_active_study_prototype_tasks"
  ON public.prototype_test_tasks
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.studies s
    WHERE s.id = prototype_test_tasks.study_id AND s.status = 'active'
  ));

-- ─── Step 5: realtime broadcast triggers ─────────────────────────────────────
-- Replaces postgres_changes subscriptions that depended on anon SELECT.
-- Broadcast fires from the DB on every mutation regardless of code path,
-- so we don't need to instrument every Motia step / API route.

-- Participants: per-study channel
CREATE OR REPLACE FUNCTION public.broadcast_participant_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  study_id_value uuid := COALESCE(NEW.study_id, OLD.study_id);
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'id', OLD.id,
      'study_id', OLD.study_id,
      'completed_at', OLD.completed_at,
      'status', OLD.status
    );
  ELSE
    payload := jsonb_build_object(
      'id', NEW.id,
      'study_id', NEW.study_id,
      'completed_at', NEW.completed_at,
      'old_completed_at', CASE WHEN TG_OP = 'UPDATE' THEN OLD.completed_at ELSE NULL END,
      'status', NEW.status,
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END
    );
  END IF;

  PERFORM realtime.send(
    payload,
    TG_OP,
    'participants:' || study_id_value::text,
    false
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS participants_broadcast_changes ON public.participants;
CREATE TRIGGER participants_broadcast_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_participant_change();

-- Study comments: per-study channel, embeds author info from user table
CREATE OR REPLACE FUNCTION public.broadcast_study_comment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  study_id_value uuid := COALESCE(NEW.study_id, OLD.study_id);
  author_record record;
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'id', OLD.id,
      'study_id', OLD.study_id
    );
  ELSE
    SELECT id, name, email, image INTO author_record
      FROM public."user" WHERE id = NEW.author_user_id;
    payload := to_jsonb(NEW) || jsonb_build_object(
      'author', CASE WHEN author_record.id IS NOT NULL THEN
        jsonb_build_object(
          'id', author_record.id,
          'name', author_record.name,
          'email', author_record.email,
          'image', author_record.image
        )
      ELSE NULL END
    );
  END IF;

  PERFORM realtime.send(
    payload,
    TG_OP,
    'study-comments:' || study_id_value::text,
    false
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS study_comments_broadcast_changes ON public.study_comments;
CREATE TRIGGER study_comments_broadcast_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.study_comments
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_study_comment_change();

-- Studies: per-organization dashboard channel
CREATE OR REPLACE FUNCTION public.broadcast_studies_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  org_id_value uuid := COALESCE(NEW.organization_id, OLD.organization_id);
BEGIN
  IF org_id_value IS NOT NULL THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', COALESCE(NEW.id, OLD.id),
        'event', TG_OP
      ),
      'dashboard_change',
      'dashboard:' || org_id_value::text,
      false
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS studies_broadcast_changes ON public.studies;
CREATE TRIGGER studies_broadcast_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.studies
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_studies_change();
