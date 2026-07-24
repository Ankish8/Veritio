/**
 * Survey completion service.
 * Handles final survey response persistence and participation completion.
 */
import type { Json } from '@veritio/study-types'
import type {
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
  ResponseValue,
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
  StudyFlowQuestion,
} from '@veritio/study-types/study-flow-types'
import { evaluateDisplayLogic } from '@veritio/prototype-test/stores/display-logic'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

export interface SurveyCompletionInput {
  sessionToken: string
  totalTimeMs?: number | null
  demographicData?: any | null
  responses?: Array<{
    study_id?: string
    participant_id?: string
    question_id: string
    response_value?: unknown
    response_time_ms?: number | null
  }>
}

export type CompletionQuestion = Pick<
  StudyFlowQuestion,
  'id' | 'section' | 'question_type' | 'config' | 'display_logic' | 'is_required' | 'custom_section_id'
>

export type StoredQuestionResponse = {
  question_id: string
  response_value: Json
}

type CompletionResponse = {
  questionId: string
  value: ResponseValue
  timestamp: number
}

export function getAllowSkipQuestions(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object') return false

  const root = settings as Record<string, any>
  return (
    root.studyFlow?.surveyQuestionnaire?.allowSkipQuestions === true ||
    root.surveyQuestionnaire?.allowSkipQuestions === true
  )
}

function isEmptyResponseValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object') {
    if ('optionIds' in value && Array.isArray((value as { optionIds: unknown[] }).optionIds)) {
      return (value as { optionIds: unknown[] }).optionIds.length === 0
    }
    if ('optionId' in value) {
      return !(value as { optionId?: unknown }).optionId
    }
  }
  return false
}

function isValidForQuestionType(question: CompletionQuestion, value: unknown): boolean {
  if (question.question_type === 'constant_sum') {
    const config = question.config as ConstantSumQuestionConfig
    const totalPoints = config.totalPoints ?? 100
    const allocation = value as ConstantSumResponseValue
    const currentTotal = Object.values(allocation).reduce((sum, v) => sum + (v || 0), 0)
    return currentTotal === totalPoints
  }

  if (question.question_type === 'semantic_differential') {
    const config = question.config as SemanticDifferentialQuestionConfig
    const scaleResponses = value as SemanticDifferentialResponseValue
    return config.scales.every((scale) => scaleResponses[scale.id] !== undefined)
  }

  return true
}

function buildCompletionResponseMap(storedResponses: StoredQuestionResponse[]): Map<string, CompletionResponse> {
  const responseMap = new Map<string, CompletionResponse>()
  for (const response of storedResponses) {
    responseMap.set(response.question_id, {
      questionId: response.question_id,
      value: response.response_value as ResponseValue,
      timestamp: Date.now(),
    })
  }
  return responseMap
}

function getVisibleSurveyQuestions(
  questions: CompletionQuestion[],
  responseMap: Map<string, CompletionResponse>
): CompletionQuestion[] {
  const surveyQuestions = questions.filter((question) => question.section === 'survey')
  return surveyQuestions.filter((question) =>
    evaluateDisplayLogic(
      question as StudyFlowQuestion,
      responseMap as any,
      questions as StudyFlowQuestion[]
    )
  )
}

function hasValidStoredResponse(
  question: CompletionQuestion,
  responseMap: Map<string, CompletionResponse>
): boolean {
  const response = responseMap.get(question.id)
  if (!response) return false
  if (isEmptyResponseValue(response.value)) return false
  return isValidForQuestionType(question, response.value)
}

export interface SurveyCompletionEvaluation {
  isComplete: boolean
  visibleQuestionCount: number
  missingRequiredQuestions: CompletionQuestion[]
  unansweredVisibleQuestions: CompletionQuestion[]
}

export interface SurveyCompletionMarkResult {
  completed: boolean
  alreadyCompleted: boolean
  evaluation: SurveyCompletionEvaluation
}

export function evaluateSurveyCompletion(
  questions: CompletionQuestion[],
  storedResponses: StoredQuestionResponse[],
  allowSkipQuestions: boolean,
  options: { requireAllVisibleQuestions?: boolean } = {}
): SurveyCompletionEvaluation {
  const responseMap = buildCompletionResponseMap(storedResponses)
  const visibleSurveyQuestions = getVisibleSurveyQuestions(questions, responseMap)
  const missingRequiredQuestions = allowSkipQuestions
    ? []
    : visibleSurveyQuestions.filter((question) => {
        if (question.is_required === false) return false
        return !hasValidStoredResponse(question, responseMap)
      })
  const unansweredVisibleQuestions = options.requireAllVisibleQuestions
    ? visibleSurveyQuestions.filter((question) => !hasValidStoredResponse(question, responseMap))
    : []

  return {
    isComplete: missingRequiredQuestions.length === 0 && unansweredVisibleQuestions.length === 0,
    visibleQuestionCount: visibleSurveyQuestions.length,
    missingRequiredQuestions,
    unansweredVisibleQuestions,
  }
}

async function fetchCompletionContext(supabase: SupabaseClientType, studyId: string) {
  const [studyResult, questionsResult] = await Promise.all([
    supabase
      .from('studies')
      .select('settings')
      .eq('id', studyId)
      .single(),
    supabase
      .from('study_flow_questions')
      .select('id, section, question_type, config, display_logic, is_required, custom_section_id')
      .eq('study_id', studyId)
      .order('section')
      .order('position'),
  ])

  if (studyResult.error) throw new Error(`Failed to load survey settings: ${studyResult.error.message}`)
  if (questionsResult.error) throw new Error(`Failed to load survey questions: ${questionsResult.error.message}`)

  return {
    allowSkipQuestions: getAllowSkipQuestions(studyResult.data?.settings),
    questions: (questionsResult.data || []) as unknown as CompletionQuestion[],
  }
}

async function upsertFinalResponses(
  supabase: SupabaseClientType,
  studyId: string,
  participantId: string,
  questions: CompletionQuestion[],
  responses: SurveyCompletionInput['responses']
): Promise<void> {
  if (!responses?.length) return

  const validQuestionIds = new Set(questions.map((question) => question.id))
  const responsesToUpsert = responses
    .filter((response) => validQuestionIds.has(response.question_id))
    .filter((response) => response.response_value !== undefined && response.response_value !== null)
    .map((response) => ({
      study_id: studyId,
      participant_id: participantId,
      question_id: response.question_id,
      response_value: response.response_value as Json,
      response_time_ms: response.response_time_ms ?? null,
    }))

  if (responsesToUpsert.length === 0) return

  const { error } = await supabase
    .from('study_flow_responses')
    .upsert(responsesToUpsert, {
      onConflict: 'participant_id,question_id',
      ignoreDuplicates: false,
    })

  if (error) {
    throw new Error(`Failed to save survey responses: ${error.message}`)
  }
}

async function fetchStoredResponses(
  supabase: SupabaseClientType,
  studyId: string,
  participantId: string
): Promise<StoredQuestionResponse[]> {
  const { data, error } = await supabase
    .from('study_flow_responses')
    .select('question_id, response_value')
    .eq('study_id', studyId)
    .eq('participant_id', participantId)

  if (error) {
    throw new Error(`Failed to verify saved survey responses: ${error.message}`)
  }

  return (data || []) as StoredQuestionResponse[]
}

async function mergeParticipantMetadata(
  supabase: SupabaseClientType,
  participantId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('participants')
    .select('metadata')
    .eq('id', participantId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to load participant metadata: ${fetchError.message}`)
  }

  const existingMetadata = (existing?.metadata as Record<string, unknown>) || {}
  const { error: updateError } = await supabase
    .from('participants')
    .update({ metadata: { ...existingMetadata, ...metadata } as Json })
    .eq('id', participantId)

  if (updateError) {
    throw new Error(`Failed to update participant metadata: ${updateError.message}`)
  }
}

function findMissingRequiredSurveyResponses(
  questions: CompletionQuestion[],
  storedResponses: StoredQuestionResponse[],
  allowSkipQuestions: boolean
): CompletionQuestion[] {
  return evaluateSurveyCompletion(
    questions,
    storedResponses,
    allowSkipQuestions
  ).missingRequiredQuestions
}

export async function markSurveyParticipantCompletedIfReady(
  supabase: SupabaseClientType,
  studyId: string,
  participantId: string,
  options: {
    requireAllVisibleQuestions?: boolean
    metadata?: Record<string, unknown>
    logger?: Parameters<typeof markParticipantCompleted>[3]
  } = {}
): Promise<SurveyCompletionMarkResult> {
  const { allowSkipQuestions, questions } = await fetchCompletionContext(supabase, studyId)
  const storedResponses = await fetchStoredResponses(supabase, studyId, participantId)
  const evaluation = evaluateSurveyCompletion(
    questions,
    storedResponses,
    allowSkipQuestions,
    { requireAllVisibleQuestions: options.requireAllVisibleQuestions }
  )

  if (!evaluation.isComplete || evaluation.visibleQuestionCount === 0) {
    return { completed: false, alreadyCompleted: false, evaluation }
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('status')
    .eq('id', participantId)
    .eq('study_id', studyId)
    .single()

  if (participantError || !participant) {
    throw new Error(`Failed to load participant completion status: ${participantError?.message || 'Participant not found'}`)
  }

  if (participant.status === 'completed') {
    if (options.metadata) {
      await mergeParticipantMetadata(supabase, participantId, options.metadata)
    }
    return { completed: false, alreadyCompleted: true, evaluation }
  }

  await markParticipantCompleted(supabase, participantId, options.metadata, options.logger, studyId)

  return { completed: true, alreadyCompleted: false, evaluation }
}

// ============================================================================
// Completion Handler
// ============================================================================

/**
 * Complete a survey study participation.
 * Final responses are accepted here too, so completion cannot outrun persistence.
 * Supports both share_code and custom url_slug.
 */
export async function completeSurveyParticipation(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: SurveyCompletionInput
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
    'survey',
    { allowCompleted: true }
  )

  if (error) {
    return { success: false, error }
  }

  if (participant.status === 'completed') {
    if (input.demographicData !== undefined) {
      await mergeParticipantMetadata(supabase, participant.id, {
        demographic_data: input.demographicData,
      })
    }
    return { success: true, studyId: study.id, participantId: participant.id, alreadyCompleted: true, error: null }
  }

  try {
    const { allowSkipQuestions, questions } = await fetchCompletionContext(supabase, study.id)

    await upsertFinalResponses(
      supabase,
      study.id,
      participant.id,
      questions,
      input.responses
    )

    const storedResponses = await fetchStoredResponses(supabase, study.id, participant.id)
    const missingRequiredResponses = findMissingRequiredSurveyResponses(
      questions,
      storedResponses,
      allowSkipQuestions
    )

    if (missingRequiredResponses.length > 0) {
      return {
        success: false,
        error: new Error('Missing required survey responses'),
      }
    }
  } catch (saveError) {
    return {
      success: false,
      error: saveError instanceof Error ? saveError : new Error('Failed to save survey responses'),
    }
  }

  await markParticipantCompleted(
    supabase,
    participant.id,
    { demographic_data: input.demographicData || null },
    undefined,
    study.id
  )

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
