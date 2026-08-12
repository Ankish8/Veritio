-- =============================================================================
-- Study Comments v2 — schema for resolvable threads, reactions, read state
-- and in-app notifications.
--
-- Idempotent and safe to re-apply. Adds columns and tables only; touches no
-- existing rows.
-- =============================================================================

-- ─── study_comments: resolution, visibility, attachments, anchors ────────────

ALTER TABLE public.study_comments
  -- Resolution turns a chat log into a review tool: a thread can be closed out.
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by_user_id TEXT,

  -- Settles the visibility question BEFORE study_share_links.allow_comments
  -- (which exists but is inert) gets wired to the /share/[token] viewer.
  -- Everything written today is internal; nothing leaks when that ships.
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal',

  -- Descriptors for files uploaded through the existing signed-upload pipeline
  -- (storage 'attachment' asset type). Shape: [{ path, name, size, mimeType }].
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Anchor triplet: ship the schema now so anchored comments need no backfill.
  -- The vocabulary deliberately mirrors insight_evidence.evidence_type
  -- (20260417000000_add_research_repository.sql) rather than inventing a third
  -- anchor model in this codebase.
  ADD COLUMN IF NOT EXISTS anchor_type TEXT,
  ADD COLUMN IF NOT EXISTS anchor_id UUID,
  -- Point-in-time capture of what was anchored. Builder entities (cards, tasks,
  -- study_flow_questions) are HARD-deleted during normal editing, so a bare id
  -- reference would orphan the comment and lose all context. The snapshot is
  -- what keeps a resolved discussion readable after the thing it discussed is
  -- gone.
  ADD COLUMN IF NOT EXISTS anchor_snapshot JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_comments_visibility_check'
  ) THEN
    ALTER TABLE public.study_comments
      ADD CONSTRAINT study_comments_visibility_check
      CHECK (visibility IN ('internal', 'external'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_comments_anchor_pair_check'
  ) THEN
    -- An anchor is meaningless half-specified.
    ALTER TABLE public.study_comments
      ADD CONSTRAINT study_comments_anchor_pair_check
      CHECK ((anchor_type IS NULL) = (anchor_id IS NULL));
  END IF;
END
$$;

-- Unresolved-first ordering is the panel's default view.
CREATE INDEX IF NOT EXISTS idx_study_comments_unresolved
  ON public.study_comments (study_id, created_at DESC)
  WHERE is_deleted = FALSE AND resolved_at IS NULL;

-- "Comments on this element", once anchoring ships.
CREATE INDEX IF NOT EXISTS idx_study_comments_anchor
  ON public.study_comments (study_id, anchor_type, anchor_id)
  WHERE is_deleted = FALSE AND anchor_id IS NOT NULL;

-- ─── study_comment_reactions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.study_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.study_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One of each emoji per person per comment; toggling deletes the row.
  UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_study_comment_reactions_comment
  ON public.study_comment_reactions (comment_id);

-- ─── study_comment_reads ─────────────────────────────────────────────────────
-- Durable replacement for the per-tab useState unread counter, which reset on
-- every reload and could not drive a badge on the studies list.

CREATE TABLE IF NOT EXISTS public.study_comment_reads (
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (study_id, user_id)
);

-- ─── notifications ───────────────────────────────────────────────────────────
-- steps/events/send-notification.step.ts has always INSERTed into this table
-- and swallowed Postgres 42P01 ("relation does not exist"), logging
-- "Notifications table does not exist, skipping in-app notification".
--
-- BEHAVIOR CHANGE: creating it makes every existing emitter start persisting
-- rows — study-created, workspace-ready, retention-warning, recordings-deleted,
-- study-closed, duplication-failed, and the Composio trigger router. Their
-- titles and messages were reviewed and are human-readable, carry no raw ids,
-- and leak no internals. Nothing reads this table yet, so the only immediate
-- effect is that rows accumulate.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drives the unread badge and the notification list.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

-- ─── RLS: service-role only, matching 20260425000000_lockdown_rls.sql ────────
-- All access goes through the backend's service-role client; there are no
-- anon/authenticated carve-outs, because the browser has no Supabase user JWT
-- (the app authenticates with Better Auth).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'study_comment_reactions',
    'study_comment_reads',
    'notifications'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'service_role_postgres_full_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role, postgres USING (true) WITH CHECK (true)',
      'service_role_postgres_full_access', t
    );
  END LOOP;
END
$$;

-- Deliberately NOT granted to anon. The lockdown migration granted study_comments
-- to authenticated/anon before RLS made that moot; these tables start clean.
GRANT ALL ON public.study_comment_reactions TO service_role;
GRANT ALL ON public.study_comment_reads TO service_role;
GRANT ALL ON public.notifications TO service_role;

-- Keep study_comment_reads.updated_at fresh using the same shared trigger
-- function study_comments already uses (public.update_updated_at).
DROP TRIGGER IF EXISTS study_comment_reads_updated_at ON public.study_comment_reads;
CREATE TRIGGER study_comment_reads_updated_at
  BEFORE UPDATE ON public.study_comment_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
