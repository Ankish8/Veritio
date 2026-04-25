#!/usr/bin/env bash
# Probe every public-schema table via PostgREST with the anon key.
# Expect every non-carve-out table to return [] (RLS blocks anon).
# Carve-outs (knowledge_articles, recording_shares, prototype_test_*) may
# return data — confirms scoped policies still work.
#
# Usage:
#   ./scripts/probe-rls.sh                 # uses .env.local
#   SUPABASE_URL=... ANON_KEY=... ./scripts/probe-rls.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.local"

if [ -z "${SUPABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
if [ -z "${ANON_KEY:-}" ] && [ -f "$ENV_FILE" ]; then
  ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${ANON_KEY:-}" ]; then
  echo "ERROR: SUPABASE_URL or ANON_KEY not set" >&2
  exit 1
fi

# Carve-outs: tables that are EXPECTED to allow anon SELECT
declare -a CARVEOUTS=(
  "knowledge_articles"
  "recording_shares"
  "prototype_test_frames"
  "prototype_test_prototypes"
  "prototype_test_tasks"
)

# All tables we want to lock down — sealed = anon SELECT returns []
declare -a SEALED=(
  "account" "session" "user" "verification"
  "ai_followup_questions" "ai_followup_responses" "ai_insights_reports"
  "assistant_pending_events" "assistant_conversations" "assistant_messages" "assistant_rate_limits"
  "audit_log"
  "card_sort_responses" "cards" "categories" "category_standardizations"
  "composio_connections" "composio_tool_executions" "composio_triggers"
  "evidence_highlights" "export_jobs" "feature_flags" "figma_connections"
  "first_click_aois" "first_click_images" "first_click_post_task_responses"
  "first_click_responses" "first_click_tasks"
  "first_impression_designs" "first_impression_exposures" "first_impression_interaction_events"
  "first_impression_responses" "first_impression_sessions" "first_impression_word_groups"
  "folders" "insight_collaborators" "insight_evidence" "insights"
  "interview_analysis" "interview_conversations" "interview_messages" "interview_scripts"
  "invite_code_usages" "invite_codes"
  "link_analytics"
  "live_website_events" "live_website_gaze_data" "live_website_page_screenshots"
  "live_website_participant_variants" "live_website_post_task_responses" "live_website_responses"
  "live_website_rrweb_sessions" "live_website_semantic_labels" "live_website_task_variants"
  "live_website_tasks" "live_website_variants"
  "organization_invitations" "organization_members" "organizations"
  "panel_incentive_distributions" "panel_participant_notes" "panel_participant_tags"
  "panel_participants" "panel_segments" "panel_study_participations" "panel_tags"
  "panel_widget_configs"
  "participant_analysis_flags" "participant_fingerprints" "participant_variant_assignments"
  "participants" "participants_archived"
  "pca_analyses" "project_members" "projects"
  "prototype_test_click_events" "prototype_test_component_instances"
  "prototype_test_component_state_events" "prototype_test_component_variants"
  "prototype_test_navigation_events" "prototype_test_post_task_responses"
  "prototype_test_sessions" "prototype_test_task_attempts"
  "recording_annotations" "recording_clips" "recording_comments" "recording_events"
  "recording_track_configs"
  "recordings"
  "studies" "study_comments" "study_digest_queue" "study_flow_questions" "study_flow_responses"
  "study_incentive_configs" "study_question_notes" "study_section_notes" "study_segments"
  "study_share_links" "study_tag_assignments" "study_tags"
  "survey_custom_sections" "survey_responses" "survey_rules" "survey_variables"
  "tasks" "transcripts" "tree_nodes" "tree_test_post_task_responses" "tree_test_responses"
  "user_favorites" "user_preferences"
  "widget_impressions" "widget_sessions"
  "yjs_documents"
  "admin_ai_config" "ab_test_variants"
)

LEAKS=0
SEALED_OK=0

echo "=== Probing ${#SEALED[@]} sealed tables (expect '[]') ==="
for tbl in "${SEALED[@]}"; do
  body=$(curl -sS --max-time 10 \
    "${SUPABASE_URL}/rest/v1/${tbl}?limit=1&select=*" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}" || true)
  if [ "$body" = "[]" ]; then
    SEALED_OK=$((SEALED_OK + 1))
  elif echo "$body" | grep -q 'PGRST205\|Could not find the table'; then
    # PostgREST hides RLS-locked partition tables — this is fine
    SEALED_OK=$((SEALED_OK + 1))
  else
    echo "LEAK: $tbl → ${body:0:200}"
    LEAKS=$((LEAKS + 1))
  fi
done

echo
echo "=== Probing carve-outs (some may return data; that's OK if scoped) ==="
for tbl in "${CARVEOUTS[@]}"; do
  body=$(curl -sS --max-time 10 \
    "${SUPABASE_URL}/rest/v1/${tbl}?limit=1" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}" || true)
  echo "$tbl → ${body:0:150}"
done

echo
echo "=== Summary ==="
echo "Sealed OK: ${SEALED_OK}/${#SEALED[@]}"
echo "Leaks:    ${LEAKS}"
exit $([ "$LEAKS" -eq 0 ] && echo 0 || echo 1)
