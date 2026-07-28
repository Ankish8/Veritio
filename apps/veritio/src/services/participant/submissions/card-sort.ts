/**
 * Card Sort submission service.
 * Handles card sort response submissions from participants.
 */
import type { CardSortResponseInsert } from "@veritio/study-types";
import { toJson, toJsonNullable } from "../../../lib/supabase/json-utils";
import type { SubmissionResult } from "../types";
import {
  verifyParticipantSession,
  completeParticipantSubmission,
  type SupabaseClientType,
} from "./verification";
import {
  readCardSortSubmissionSettings,
  validateCardSortSubmission,
} from "../../../lib/card-sort/submission-validation";

// ============================================================================
// Types
// ============================================================================

export interface CardSortSubmissionInput {
  sessionToken: string;
  cardPlacements: Record<string, string>;
  categoryAssignments?: Record<string, string>;
  customCategories?: string[] | null;
  totalTimeMs?: number | null;
  demographicData?: Record<string, unknown> | null;
}

// ============================================================================
// Submission Handler
// ============================================================================

/**
 * Submit a card sort response.
 * Supports both share_code and custom url_slug.
 */
export async function submitCardSortResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: CardSortSubmissionInput,
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
  );

  if (error) {
    return { success: false, error };
  }

  const [
    { data: categories, error: categoriesError },
    { data: cards, error: cardsError },
    { data: studySettings, error: studySettingsError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, label, min_cards, max_cards")
      .eq("study_id", study.id),
    supabase.from("cards").select("id").eq("study_id", study.id),
    supabase.from("studies").select("settings").eq("id", study.id).single(),
  ]);

  if (categoriesError || cardsError || studySettingsError) {
    return { success: false, error: new Error("Failed to validate response") };
  }

  const submissionError = validateCardSortSubmission({
    settings: readCardSortSubmissionSettings(studySettings?.settings),
    cardIds: (cards ?? []).map((card) => card.id),
    categories: categories ?? [],
    cardPlacements: input.cardPlacements,
    categoryAssignments: input.categoryAssignments,
    customCategories: input.customCategories,
  });
  if (submissionError) {
    return {
      success: false,
      error: new Error(`Invalid card sort submission: ${submissionError}`),
    };
  }

  // Save card sort response
  const responseData: CardSortResponseInsert = {
    participant_id: participant.id,
    study_id: study.id,
    card_placements: toJson(input.cardPlacements),
    custom_categories: toJsonNullable(input.customCategories),
    total_time_ms: input.totalTimeMs || null,
  };

  const { error: responseError } = await supabase
    .from("card_sort_responses")
    .insert(responseData);

  if (responseError) {
    return { success: false, error: new Error("Failed to save response") };
  }

  // Store demographic data in participant metadata (same format as other study types)
  const completionError = await completeParticipantSubmission(
    supabase,
    participant.id,
    study.id,
    {
      metadata: input.demographicData
        ? { demographic_data: input.demographicData }
        : undefined,
      rollbackTables: ["card_sort_responses"],
    },
  );

  if (completionError) {
    return { success: false, error: completionError };
  }

  return {
    success: true,
    studyId: study.id,
    participantId: participant.id,
    error: null,
  };
}
