import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SurveyCustomSection,
  SurveyCustomSectionInsert,
  SurveyCustomSectionUpdate,
} from '../lib/supabase/study-flow-types';
import { reorderItems } from '../lib/supabase/reorder-helper';

export async function listSurveySections(
  supabase: SupabaseClient,
  studyId: string
): Promise<{ data: SurveyCustomSection[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_custom_sections')
    .select('*')
    .eq('study_id', studyId)
    .order('position', { ascending: true });

  return { data: data as SurveyCustomSection[] | null, error };
}

export async function getSurveySection(
  supabase: SupabaseClient,
  sectionId: string
): Promise<{ data: SurveyCustomSection | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_custom_sections')
    .select('*')
    .eq('id', sectionId)
    .single();

  return { data: data as SurveyCustomSection | null, error };
}

export async function createSurveySection(
  supabase: SupabaseClient,
  studyId: string,
  input: Omit<SurveyCustomSectionInsert, 'study_id'>
): Promise<{ data: SurveyCustomSection | null; error: Error | null }> {
  // Get the next position if not provided
  let position = input.position;
  if (position === undefined) {
    const { data: existing } = await supabase
      .from('survey_custom_sections')
      .select('position')
      .eq('study_id', studyId)
      .order('position', { ascending: false })
      .limit(1);

    position = existing && existing.length > 0 ? existing[0].position + 1 : 0;
  }

  const { data, error } = await supabase
    .from('survey_custom_sections')
    .insert({
      study_id: studyId,
      name: input.name,
      description: input.description ?? null,
      position,
      parent_section: input.parent_section ?? 'survey',
      is_visible: input.is_visible ?? true,
    })
    .select()
    .single();

  return { data: data as SurveyCustomSection | null, error };
}

export async function updateSurveySection(
  supabase: SupabaseClient,
  sectionId: string,
  updates: SurveyCustomSectionUpdate
): Promise<{ data: SurveyCustomSection | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_custom_sections')
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.position !== undefined && { position: updates.position }),
      ...(updates.is_visible !== undefined && { is_visible: updates.is_visible }),
    })
    .eq('id', sectionId)
    .select()
    .single();

  return { data: data as SurveyCustomSection | null, error };
}

export async function deleteSurveySection(
  supabase: SupabaseClient,
  sectionId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('survey_custom_sections')
    .delete()
    .eq('id', sectionId);

  return { error };
}

export async function reorderSurveySections(
  supabase: SupabaseClient,
  studyId: string,
  orderedSectionIds: string[]
): Promise<{ error: Error | null }> {
  return reorderItems(supabase, 'survey_custom_sections', orderedSectionIds, 'study_id', studyId);
}

export async function moveQuestionToSection(
  supabase: SupabaseClient,
  questionId: string,
  sectionId: string | null
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('study_flow_questions')
    .update({ custom_section_id: sectionId })
    .eq('id', questionId);

  return { error };
}

export async function getQuestionsInSection(
  supabase: SupabaseClient,
  sectionId: string
): Promise<{ data: { id: string; question_text: string; position: number }[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('study_flow_questions')
    .select('id, question_text, position')
    .eq('custom_section_id', sectionId)
    .order('position', { ascending: true });

  return { data, error };
}
