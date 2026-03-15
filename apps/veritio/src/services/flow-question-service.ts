import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, StudyFlowQuestionRow, StudyFlowQuestionInsert } from '@veritio/study-types'
import type { FlowQuestionSection } from './types'
import { toJson } from '../lib/supabase/json-utils'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'

type SupabaseClientType = SupabaseClient<Database>
type FlowSection = FlowQuestionSection

export function invalidateFlowQuestionsCache(studyId: string, section?: FlowSection): void {
  if (section) {
    cache.delete(cacheKeys.flowQuestions(studyId, section))
  }
  cache.delete(cacheKeys.flowQuestions(studyId))
  cache.delete(cacheKeys.flowQuestions(studyId, 'screening'))
  cache.delete(cacheKeys.flowQuestions(studyId, 'pre_study'))
  cache.delete(cacheKeys.flowQuestions(studyId, 'post_study'))
  cache.delete(cacheKeys.flowQuestions(studyId, 'survey'))
}

export async function listFlowQuestions(
  supabase: SupabaseClientType,
  studyId: string,
  section?: FlowSection,
  userId?: string
): Promise<{ data: StudyFlowQuestionRow[] | null; error: Error | null }> {
  const cacheKey = cacheKeys.flowQuestions(studyId, section)
  const cached = cache.get<StudyFlowQuestionRow[]>(cacheKey)
  if (cached) {
    return { data: cached, error: null }
  }

  const selectFields = 'id,study_id,section,position,question_type,question_text,question_text_html,description,is_required,config,display_logic,branching_logic,survey_branching_logic,custom_section_id,created_at,updated_at'
  let query = supabase
    .from('study_flow_questions')
    .select(userId ? `${selectFields},studies!inner(id)` : selectFields)
    .eq('study_id', studyId)
    .order('position', { ascending: true })

  if (section) {
    query = query.eq('section', section)
  }

  if (userId) {
    query = query.eq('studies.user_id', userId)
  }

  const { data: questions, error } = await query

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const cleanQuestions = ((questions || []) as unknown as Record<string, unknown>[]).map((q) => {
    const { studies: _studies, ...qData } = q
    return qData
  }) as StudyFlowQuestionRow[]

  cache.set(cacheKey, cleanQuestions, cacheTTL.medium)

  return { data: cleanQuestions, error: null }
}

export async function getFlowQuestion(
  supabase: SupabaseClientType,
  questionId: string,
  studyId: string
): Promise<{ data: StudyFlowQuestionRow | null; error: Error | null }> {
  const { data: question, error } = await supabase
    .from('study_flow_questions')
    .select('*')
    .eq('id', questionId)
    .eq('study_id', studyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Question not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: question, error: null }
}

export async function createFlowQuestion(
  supabase: SupabaseClientType,
  studyId: string,
  input: {
    section: FlowSection
    question_type: string
    question_text: string
    question_text_html?: string | null
    description?: string | null
    is_required?: boolean
    config?: Record<string, unknown>
    display_logic?: Record<string, unknown> | null
    branching_logic?: Record<string, unknown> | null
    survey_branching_logic?: Record<string, unknown> | null
    custom_section_id?: string | null
    position?: number
  }
): Promise<{ data: StudyFlowQuestionRow | null; error: Error | null }> {
  let finalPosition = input.position
  if (finalPosition === undefined) {
    const { data: existingQuestions } = await supabase
      .from('study_flow_questions')
      .select('position')
      .eq('study_id', studyId)
      .eq('section', input.section)
      .order('position', { ascending: false })
      .limit(1)

    finalPosition = existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].position + 1
      : 0
  }

  const insertData: StudyFlowQuestionInsert = {
    study_id: studyId,
    section: input.section,
    position: finalPosition,
    question_type: input.question_type as StudyFlowQuestionInsert['question_type'],
    question_text: input.question_text.trim(),
    question_text_html: input.question_text_html || null,
    description: input.description || null,
    is_required: input.is_required ?? true,
    config: toJson(input.config ?? {}),
    display_logic: toJson(input.display_logic ?? null),
    branching_logic: toJson(input.branching_logic ?? null),
    custom_section_id: input.custom_section_id ?? null,
  }

  // survey_branching_logic may not be in generated DB types yet
  if (input.survey_branching_logic !== undefined) {
    ;(insertData as any).survey_branching_logic = toJson(input.survey_branching_logic ?? null)
  }

  const { data: question, error } = await supabase
    .from('study_flow_questions')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  invalidateFlowQuestionsCache(studyId, input.section)

  return { data: question, error: null }
}

export async function updateFlowQuestion(
  supabase: SupabaseClientType,
  questionId: string,
  studyId: string,
  input: {
    section?: FlowSection
    question_type?: string
    question_text?: string
    question_text_html?: string | null
    description?: string | null
    is_required?: boolean
    config?: Record<string, unknown>
    display_logic?: Record<string, unknown> | null
    branching_logic?: Record<string, unknown> | null
    survey_branching_logic?: Record<string, unknown> | null
    custom_section_id?: string | null
    position?: number
  }
): Promise<{ data: StudyFlowQuestionRow | null; error: Error | null }> {
  const updates: Partial<StudyFlowQuestionRow> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (input.section !== undefined) updates.section = input.section
  if (input.question_type !== undefined) updates.question_type = input.question_type as StudyFlowQuestionRow['question_type']
  if (input.question_text !== undefined) updates.question_text = input.question_text.trim()
  if (input.question_text_html !== undefined) updates.question_text_html = input.question_text_html
  if (input.description !== undefined) updates.description = input.description
  if (input.is_required !== undefined) updates.is_required = input.is_required
  if (input.config !== undefined) updates.config = toJson(input.config)
  if (input.display_logic !== undefined) updates.display_logic = toJson(input.display_logic)
  if (input.branching_logic !== undefined) updates.branching_logic = toJson(input.branching_logic)
  if (input.survey_branching_logic !== undefined) (updates as any).survey_branching_logic = toJson(input.survey_branching_logic)
  if (input.custom_section_id !== undefined) (updates as any).custom_section_id = input.custom_section_id
  if (input.position !== undefined) updates.position = input.position

  const { data: question, error } = await supabase
    .from('study_flow_questions')
    .update(updates)
    .eq('id', questionId)
    .eq('study_id', studyId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Question not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  invalidateFlowQuestionsCache(studyId)

  return { data: question, error: null }
}

export async function deleteFlowQuestion(
  supabase: SupabaseClientType,
  questionId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('study_flow_questions')
    .delete()
    .eq('id', questionId)
    .eq('study_id', studyId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  invalidateFlowQuestionsCache(studyId)

  return { success: true, error: null }
}

export async function bulkUpdateFlowQuestions(
  supabase: SupabaseClientType,
  studyId: string,
  questions: Array<{
    id: string
    section: FlowSection
    position: number
    question_type: string
    question_text: string
    question_text_html?: string | null
    description?: string | null
    is_required?: boolean
    config?: Record<string, unknown>
    display_logic?: Record<string, unknown> | null
    branching_logic?: Record<string, unknown> | null
    survey_branching_logic?: Record<string, unknown> | null
    custom_section_id?: string | null
  }>,
  section?: FlowSection
): Promise<{ data: StudyFlowQuestionRow[] | null; error: Error | null }> {
  const { data: existingQuestions } = await supabase
    .from('study_flow_questions')
    .select('id')
    .eq('study_id', studyId)

  const existingIds = new Set((existingQuestions || []).map((q) => q.id))
  const newIds = new Set(questions.map((q) => q.id))

  const idsToDelete = [...existingIds].filter((id) => !newIds.has(id))
  if (idsToDelete.length > 0) {
    await supabase
      .from('study_flow_questions')
      .delete()
      .in('id', idsToDelete)
      .eq('study_id', studyId)
  }

  if (questions.length === 0) {
    invalidateFlowQuestionsCache(studyId)
    return { data: [], error: null }
  }

  const upsertData = questions.map((q) => ({
    id: q.id,
    study_id: studyId,
    section: q.section,
    position: q.position,
    question_type: q.question_type as StudyFlowQuestionInsert['question_type'],
    question_text: q.question_text,
    question_text_html: q.question_text_html ?? null,
    description: q.description ?? null,
    is_required: q.is_required ?? true,
    config: toJson(q.config ?? {}),
    display_logic: toJson(q.display_logic ?? null),
    branching_logic: toJson(q.branching_logic ?? null),
    survey_branching_logic: toJson(q.survey_branching_logic ?? null),
    custom_section_id: q.custom_section_id ?? null,
  }))

  const { error: upsertError } = await supabase
    .from('study_flow_questions')
    .upsert(upsertData, { onConflict: 'id', ignoreDuplicates: false })
    .select()

  if (upsertError) {
    return { data: null, error: new Error(upsertError.message) }
  }

  let query = supabase
    .from('study_flow_questions')
    .select('id,study_id,section,position,question_type,question_text,question_text_html,description,is_required,config,display_logic,branching_logic,custom_section_id,created_at,updated_at')
    .eq('study_id', studyId)
    .order('position', { ascending: true })

  if (section) {
    query = query.eq('section', section)
  }

  const { data: updatedQuestions, error } = await query

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  invalidateFlowQuestionsCache(studyId)

  return { data: updatedQuestions, error: null }
}
