import type { SupabaseClient } from '@supabase/supabase-js'
import type { ServiceResult } from './types'
import type { BoxPlotStats, ConfidenceInterval } from '../../lib/algorithms/statistics'
import { wilsonScoreCI, calculateBoxPlotStats } from '../../lib/algorithms/statistics'
import { calculateTimePercentiles, calculateClickAccuracy, calculateSDD, calculateNNI, calculateMeanCenter, calculateDeviationalEllipse } from '../../lib/algorithms/spatial-statistics'
import { categorizeMisclicks } from '../../lib/algorithms/click-clustering'
import { cache, cacheKeys } from '../../lib/cache/memory-cache'

export interface FirstClickResultsResponse {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'first_click'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  tasks: any[]
  responses: any[]
  participants: any[]
  metrics: FirstClickMetrics
  flowQuestions: any[]
  flowResponses: any[]
  postTaskResponses: any[]
}

export interface FirstClickMetrics {
  totalParticipants: number
  completedParticipants: number
  abandonedParticipants: number
  overallSuccessRate: number
  overallSuccessCI?: { lowerBound: number; upperBound: number; level: number }
  averageCompletionTimeMs: number
  taskMetrics: TaskMetric[]
}

export interface TaskMetric {
  taskId: string
  instruction: string
  responseCount: number
  successRate: number
  skipRate: number
  avgTimeToClickMs: number
  medianTimeToClickMs: number
  aoiHits: { aoiId: string; aoiName: string; hitCount: number; hitPercent: number }[]
  successCount: number
  failCount: number
  skipCount: number
  failRate: number
  missCount: number
  missRate: number
  aoiAccuracyRate: number
  successCI: ConfidenceInterval
  timeBoxPlot: BoxPlotStats
  // Advanced analytics (optional — computed when sufficient data exists)
  timePercentiles?: { p50: number; p75: number; p90: number; p95: number }
  clickAccuracy?: { meanDistance: number; meanScore: number; effectiveTargetWidth: number }
  spatialStats?: {
    sdd: number
    nni: { ratio: number; pattern: 'clustered' | 'random' | 'dispersed'; pValue: number }
    meanCenter: { x: number; y: number }
    ellipse?: { semiMajor: number; semiMinor: number; rotation: number }
  }
  misclickCategories?: { nearMiss: number; wrongElement: number; lost: number; total: number }
}

export async function getFirstClickResults(
  supabase: SupabaseClient,
  studyId: string
): Promise<ServiceResult<FirstClickResultsResponse>> {
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

    const [tasksResult, responsesResult, participantsResult, flowQuestionsResult, flowResponsesResult, postTaskResponsesResult] = await Promise.all([
      supabase
        .from('first_click_tasks')
        .select(`
          *,
          image:first_click_images(*),
          aois:first_click_aois(*)
        `)
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('first_click_responses')
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
      supabase
        .from('first_click_post_task_responses')
        .select('*')
        .eq('study_id', studyId),
    ])

    if (tasksResult.error) throw tasksResult.error
    if (responsesResult.error) throw responsesResult.error
    if (participantsResult.error) throw participantsResult.error
    if (flowQuestionsResult.error) throw flowQuestionsResult.error
    if (flowResponsesResult.error) throw flowResponsesResult.error
    if (postTaskResponsesResult.error) throw postTaskResponsesResult.error

    const tasks = tasksResult.data || []
    const responses = responsesResult.data || []
    const participants = participantsResult.data || []
    const flowQuestions = flowQuestionsResult.data || []
    const flowResponses = flowResponsesResult.data || []
    const postTaskResponses = postTaskResponsesResult.data || []

    const cachedMetrics = cache.get<any>(cacheKeys.firstClickAnalytics(studyId))

    let metrics
    if (cachedMetrics && cachedMetrics.responseCount === responses.length) {
      metrics = cachedMetrics
    } else {
      metrics = calculateMetrics(tasks, responses, participants)
    }

    return {
      data: {
        study: study as FirstClickResultsResponse['study'],
        tasks,
        responses,
        participants,
        metrics,
        flowQuestions,
        flowResponses,
        postTaskResponses,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch results'),
    }
  }
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0
}

function avg(values: number[], fallback = 0): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : fallback
}

function computeSpatialStats(
  clickPoints: { x: number; y: number }[]
): TaskMetric['spatialStats'] {
  if (clickPoints.length < 3) return undefined

  const sddResult = calculateSDD(clickPoints)
  const nniResult = calculateNNI(clickPoints, 1.0)
  const center = calculateMeanCenter(clickPoints)
  const ellipseResult = clickPoints.length >= 5
    ? calculateDeviationalEllipse(clickPoints)
    : undefined

  return {
    sdd: sddResult.radius,
    nni: { ratio: nniResult.ratio, pattern: nniResult.pattern, pValue: nniResult.pValue },
    meanCenter: center,
    ellipse: ellipseResult
      ? { semiMajor: ellipseResult.semiMajor, semiMinor: ellipseResult.semiMinor, rotation: ellipseResult.rotation }
      : undefined,
  }
}

export function calculateMetrics(tasks: any[], responses: any[], participants: any[]): FirstClickMetrics {
  const completedCount = participants.filter(p => p.status === 'completed').length
  const abandonedCount = participants.filter(p => p.status === 'abandoned').length
  const correctClicks = responses.filter(r => r.is_correct && !r.is_skipped)

  const taskMetrics: TaskMetric[] = tasks.map(task => {
    const taskResponses = responses.filter(r => r.task_id === task.id)
    const successCount = taskResponses.filter(r => r.is_correct && !r.is_skipped).length
    const skipCount = taskResponses.filter(r => r.is_skipped).length
    const failCount = Math.max(0, taskResponses.length - successCount - skipCount)
    const nonSkippedCount = taskResponses.length - skipCount
    const missCount = taskResponses.filter(r => !r.is_skipped && !r.is_correct).length

    const taskTimes = taskResponses
      .filter(r => r.time_to_click_ms && !r.is_skipped)
      .map(r => r.time_to_click_ms)
      .sort((a: number, b: number) => a - b)

    const nonSkippedClicks = taskResponses
      .filter(r => !r.is_skipped && r.click_x != null && r.click_y != null)

    const clickPoints = nonSkippedClicks.map(r => ({ x: r.click_x as number, y: r.click_y as number }))

    const aois: any[] = task.aois || []
    const aoiHits = aois.map((aoi: any) => {
      const hitCount = taskResponses.filter(r => r.matched_aoi_id === aoi.id).length
      return {
        aoiId: aoi.id,
        aoiName: aoi.name,
        hitCount,
        hitPercent: pct(hitCount, taskResponses.length),
      }
    })

    const correctAoi = aois.find((a: any) => a.is_correct)
    const clickAccuracy = clickPoints.length >= 3 && correctAoi
      ? calculateClickAccuracy(clickPoints, {
          x: correctAoi.x + correctAoi.width / 2,
          y: correctAoi.y + correctAoi.height / 2,
        })
      : undefined

    const aoiBounds = aois.map((a: any) => ({
      id: a.id, x: a.x as number, y: a.y as number,
      width: a.width as number, height: a.height as number, isCorrect: !!a.is_correct,
    }))
    const misclickClicks = nonSkippedClicks.map(r => ({
      x: r.click_x as number, y: r.click_y as number,
      wasCorrect: !!r.is_correct, matchedAoiId: r.matched_aoi_id as string | null,
    }))
    const misclickCategories = misclickClicks.length > 0 && aoiBounds.length > 0
      ? categorizeMisclicks(misclickClicks, aoiBounds)
      : undefined

    return {
      taskId: task.id,
      instruction: task.instruction,
      responseCount: taskResponses.length,
      successCount,
      failCount,
      skipCount,
      successRate: pct(successCount, taskResponses.length),
      failRate: pct(failCount, taskResponses.length),
      skipRate: pct(skipCount, taskResponses.length),
      missCount,
      missRate: pct(missCount, nonSkippedCount),
      aoiAccuracyRate: pct(nonSkippedCount - missCount, nonSkippedCount),
      avgTimeToClickMs: avg(taskTimes),
      medianTimeToClickMs: taskTimes.length > 0 ? taskTimes[Math.floor(taskTimes.length / 2)] : 0,
      successCI: wilsonScoreCI(successCount, taskResponses.length),
      timeBoxPlot: calculateBoxPlotStats(taskTimes),
      aoiHits,
      timePercentiles: taskTimes.length >= 4 ? calculateTimePercentiles(taskTimes) : undefined,
      clickAccuracy,
      spatialStats: computeSpatialStats(clickPoints),
      misclickCategories,
    }
  })

  const allTimes = responses
    .filter(r => r.time_to_click_ms && !r.is_skipped)
    .map(r => r.time_to_click_ms)

  return {
    totalParticipants: participants.length,
    completedParticipants: completedCount,
    abandonedParticipants: abandonedCount,
    overallSuccessRate: pct(correctClicks.length, responses.length),
    overallSuccessCI: wilsonScoreCI(correctClicks.length, responses.length),
    averageCompletionTimeMs: avg(allTimes),
    taskMetrics,
  }
}
