import type { SupabaseClient } from '@supabase/supabase-js'
import type { ServiceResult } from './types'

import type { ExtendedFirstImpressionSettings } from '../../lib/supabase/study-flow-types'

export interface FirstImpressionResultsResponse {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'first_impression'
    status: 'draft' | 'active' | 'paused' | 'completed'
    share_code: string
    settings: ExtendedFirstImpressionSettings | null
    launched_at: string | null
    created_at: string
  }
  designs: FirstImpressionDesign[]
  sessions: FirstImpressionSession[]
  exposures: FirstImpressionExposure[]
  responses: FirstImpressionResponse[]
  participants: any[]
  metrics: FirstImpressionMetrics
  flowQuestions: any[]
  flowResponses: any[]
}

export interface FirstImpressionDesign {
  id: string
  study_id: string
  name: string | null
  position: number
  image_url: string | null
  original_filename: string | null
  source_type: 'upload' | 'figma'
  width: number | null
  height: number | null
  display_mode: 'fit' | 'fill' | 'actual' | 'hidpi'
  background_color: string
  weight: number
  is_practice: boolean
  questions: FirstImpressionDesignQuestion[]
  created_at: string
}

export interface FirstImpressionDesignQuestion {
  id: string
  // Database JSONB uses question_type / question_text; local interface used type / prompt
  // Support both for backward compatibility
  type?: string
  prompt?: string
  question_type?: string
  question_text?: string
  position: number
  required?: boolean
  is_required?: boolean
  options?: string[]
  config?: { options?: { label: string }[]; min?: number; max?: number; minLabel?: string; maxLabel?: string }
  minLabel?: string
  maxLabel?: string
  scaleMin?: number
  scaleMax?: number
}

export interface FirstImpressionSession {
  id: string
  study_id: string
  participant_id: string
  assignment_mode: 'random_single' | 'sequential_all'
  assigned_design_id: string | null
  design_sequence: string[]
  device_type: 'desktop' | 'tablet' | 'mobile' | null
  user_agent: string | null
  viewport_width: number | null
  viewport_height: number | null
  started_at: string
  completed_at: string | null
  total_time_ms: number | null
}

export interface FirstImpressionExposure {
  id: string
  session_id: string
  study_id: string
  participant_id: string
  design_id: string
  exposure_sequence: number
  configured_duration_ms: number
  actual_display_ms: number | null
  countdown_duration_ms: number | null
  exposure_started_at: string
  exposure_ended_at: string | null
  questions_started_at: string | null
  questions_completed_at: string | null
  viewport_width: number | null
  viewport_height: number | null
  image_rendered_width: number | null
  image_rendered_height: number | null
  used_mobile_image: boolean
}

export interface FirstImpressionResponse {
  id: string
  exposure_id: string
  session_id: string
  study_id: string
  participant_id: string
  design_id: string
  question_id: string
  response_value: any
  response_time_ms: number | null
  submitted_at: string | null
}

export interface FirstImpressionMetrics {
  totalParticipants: number
  completedParticipants: number
  abandonedParticipants: number
  overallCompletionRate: number
  averageSessionTimeMs: number
  designMetrics: DesignMetric[]
}

export interface DesignMetric {
  designId: string
  designName: string
  imageUrl: string | null
  isPractice: boolean
  exposureCount: number
  exposurePercentage: number
  avgExposureDurationMs: number
  avgQuestionTimeMs: number
  questionMetrics: QuestionMetric[]
}

export interface QuestionMetric {
  questionId: string
  prompt: string
  type: string
  responseCount: number
  responseRate: number
  // For rating/scale questions
  avgRating?: number
  minRating?: number
  maxRating?: number
  // For choice questions
  optionCounts?: { option: string; count: number; percentage: number }[]
  // For text questions
  sampleResponses?: string[]
}

export async function getFirstImpressionResults(
  supabase: SupabaseClient,
  studyId: string
): Promise<ServiceResult<FirstImpressionResultsResponse>> {
  try {
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, title, description, study_type, status, share_code, settings, launched_at, created_at')
      .eq('id', studyId)
      .single()

    if (studyError || !study) {
      return {
        data: null,
        error: new Error('Study not found'),
      }
    }

    const [
      designsResult,
      sessionsResult,
      exposuresResult,
      responsesResult,
      participantsResult,
      flowQuestionsResult,
      flowResponsesResult,
    ] = await Promise.all([
      supabase
        .from('first_impression_designs')
        .select('*')
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('first_impression_sessions')
        .select('*')
        .eq('study_id', studyId),
      supabase
        .from('first_impression_exposures')
        .select('*')
        .eq('study_id', studyId),
      supabase
        .from('first_impression_responses')
        .select('*')
        .eq('study_id', studyId),
      supabase
        .from('participants')
        .select('*')
        .eq('study_id', studyId)
        .order('started_at', { ascending: false }),
      supabase
        .from('study_flow_questions')
        .select('*')
        .eq('study_id', studyId)
        .order('section')
        .order('position'),
      supabase
        .from('study_flow_responses')
        .select('*')
        .eq('study_id', studyId),
    ])

    if (designsResult.error) throw designsResult.error
    if (sessionsResult.error) throw sessionsResult.error
    if (exposuresResult.error) throw exposuresResult.error
    if (responsesResult.error) throw responsesResult.error
    if (participantsResult.error) throw participantsResult.error
    if (flowQuestionsResult.error) throw flowQuestionsResult.error
    if (flowResponsesResult.error) throw flowResponsesResult.error

    const designs = (designsResult.data || []).map(d => ({
      ...d,
      questions: (d.questions || []) as unknown as FirstImpressionDesignQuestion[],
    })) as FirstImpressionDesign[]
    const sessions = (sessionsResult.data || []) as FirstImpressionSession[]
    const exposures = (exposuresResult.data || []) as FirstImpressionExposure[]
    const responses = (responsesResult.data || []) as FirstImpressionResponse[]
    const participants = participantsResult.data || []
    const flowQuestions = flowQuestionsResult.data || []
    const flowResponses = flowResponsesResult.data || []

    const metrics = calculateMetrics(designs, sessions, exposures, responses, participants)

    return {
      data: {
        study: study as FirstImpressionResultsResponse['study'],
        designs,
        sessions,
        exposures,
        responses,
        participants,
        metrics,
        flowQuestions,
        flowResponses,
      },
      error: null,
    }
  } catch (error) {
    const message = (error as any)?.message ?? 'Failed to fetch results'
    return {
      data: null,
      error: new Error(message),
    }
  }
}

export function calculateMetrics(
  designs: FirstImpressionDesign[],
  sessions: FirstImpressionSession[],
  exposures: FirstImpressionExposure[],
  responses: FirstImpressionResponse[],
  participants: any[]
): FirstImpressionMetrics {
  const completedParticipants = participants.filter(p => p.status === 'completed')
  const abandonedParticipants = participants.filter(p => p.status === 'abandoned')

  const completedSessions = sessions.filter(s => s.total_time_ms != null)
  const avgSessionTimeMs = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.total_time_ms || 0), 0) / completedSessions.length
    : 0

  const totalExposures = exposures.length
  const designMetrics: DesignMetric[] = designs.map(design => {
    const designExposures = exposures.filter(e => e.design_id === design.id)
    const designResponses = responses.filter(r => r.design_id === design.id)

    const exposuresWithDuration = designExposures.filter(e => e.actual_display_ms != null)
    const avgExposureDurationMs = exposuresWithDuration.length > 0
      ? exposuresWithDuration.reduce((sum, e) => sum + (e.actual_display_ms || 0), 0) / exposuresWithDuration.length
      : design.questions.length > 0 ? 5000 : 0 // Default to configured duration

    const responsesWithTime = designResponses.filter(r => r.response_time_ms != null)
    const avgQuestionTimeMs = responsesWithTime.length > 0
      ? responsesWithTime.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / responsesWithTime.length
      : 0

    // JSONB uses question_type/question_text; local interface uses type/prompt
    const questionMetrics: QuestionMetric[] = (design.questions || []).map(question => {
      const qType = question.question_type || question.type || ''
      const qPrompt = question.question_text || question.prompt || ''

      const questionResponses = designResponses.filter(r => r.question_id === question.id)
      const responseRate = designExposures.length > 0
        ? (questionResponses.length / designExposures.length) * 100
        : 0

      const metric: QuestionMetric = {
        questionId: question.id,
        prompt: qPrompt,
        type: qType,
        responseCount: questionResponses.length,
        responseRate,
      }

      if (qType === 'rating' || qType === 'scale' || qType === 'opinion_scale' || qType === 'nps' || qType === 'slider') {
        const numericValues = questionResponses
          .map(r => {
            const val = r.response_value
            return typeof val === 'number' ? val : (typeof val === 'object' && val?.value != null ? Number(val.value) : null)
          })
          .filter((v): v is number => v !== null && !isNaN(v))

        if (numericValues.length > 0) {
          metric.avgRating = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          metric.minRating = Math.min(...numericValues)
          metric.maxRating = Math.max(...numericValues)
        }
      } else if (qType === 'single_choice' || qType === 'multiple_choice' || qType === 'yes_no' || qType === 'image_choice') {
        const optionCounts: Record<string, number> = {}
        questionResponses.forEach(r => {
          const value = r.response_value
          if (Array.isArray(value)) {
            value.forEach(v => {
              const label = typeof v === 'string' ? v : (v?.label || v?.value || String(v))
              optionCounts[label] = (optionCounts[label] || 0) + 1
            })
          } else if (typeof value === 'string') {
            optionCounts[value] = (optionCounts[value] || 0) + 1
          } else if (typeof value === 'boolean') {
            optionCounts[value ? 'Yes' : 'No'] = (optionCounts[value ? 'Yes' : 'No'] || 0) + 1
          } else if (value?.value) {
            optionCounts[value.value] = (optionCounts[value.value] || 0) + 1
          }
        })

        const totalResponses = questionResponses.length
        metric.optionCounts = Object.entries(optionCounts)
          .map(([option, count]) => ({
            option,
            count,
            percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count)
      } else if (qType === 'short_text' || qType === 'long_text' || qType === 'single_line_text' || qType === 'multi_line_text') {
        metric.sampleResponses = questionResponses
          .slice(0, 5)
          .map(r => {
            const val = r.response_value
            return typeof val === 'string' ? val : (val?.value || JSON.stringify(val))
          })
      }

      return metric
    })

    return {
      designId: design.id,
      designName: design.name || `Design ${design.position + 1}`,
      imageUrl: design.image_url,
      isPractice: design.is_practice,
      exposureCount: designExposures.length,
      exposurePercentage: totalExposures > 0 ? (designExposures.length / totalExposures) * 100 : 0,
      avgExposureDurationMs,
      avgQuestionTimeMs,
      questionMetrics,
    }
  })

  return {
    totalParticipants: participants.length,
    completedParticipants: completedParticipants.length,
    abandonedParticipants: abandonedParticipants.length,
    overallCompletionRate: participants.length > 0
      ? (completedParticipants.length / participants.length) * 100
      : 0,
    averageSessionTimeMs: avgSessionTimeMs,
    designMetrics,
  }
}
