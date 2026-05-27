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

type CompletionQuestion = Pick<
  StudyFlowQuestion,
  'id' | 'section' | 'question_type' | 'config' | 'display_logic' | 'is_required' | 'custom_section_id'
>

type StoredQuestionResponse = {
  question_id: string
  response_value: Json
}

type CompletionResponse = {
  questionId: string
  value: ResponseValue
  timestamp: number
}

function getAllowSkipQuestions(settings: unknown): boolean {
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

function findMissingRequiredSurveyResponses(
  questions: CompletionQuestion[],
  storedResponses: StoredQuestionResponse[],
  allowSkipQuestions: boolean
): CompletionQuestion[] {
  if (allowSkipQuestions) return []

  const responseMap = new Map<string, CompletionResponse>()
  for (const response of storedResponses) {
    responseMap.set(response.question_id, {
      questionId: response.question_id,
      value: response.response_value as ResponseValue,
      timestamp: Date.now(),
    })
  }

  const surveyQuestions = questions.filter((question) => question.section === 'survey')
  const visibleRequiredQuestions = surveyQuestions.filter((question) => {
    if (question.is_required === false) return false
    return evaluateDisplayLogic(
      question as StudyFlowQuestion,
      responseMap as any,
      questions as StudyFlowQuestion[]
    )
  })

  return visibleRequiredQuestions.filter((question) => {
    const response = responseMap.get(question.id)
    if (!response) return true
    if (isEmptyResponseValue(response.value)) return true
    return !isValidForQuestionType(question, response.value)
  })
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
    'survey'
  )

  if (error) {
    return { success: false, error }
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

  await markParticipantCompleted(supabase, participant.id, {
    demographic_data: input.demographicData || null,
  })

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
