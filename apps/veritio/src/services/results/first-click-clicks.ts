import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { normalizeDecimalToPercent } from '../../lib/analytics/coordinate-normalization'
import type { FirstClickEventData, FirstClickStats } from '../../types/analytics'

export interface FirstClickEventsFilters {
  taskId?: string
  participantId?: string
}

export interface FirstClickAOIData {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface FirstClickTask {
  id: string
  instruction: string | null
  position: number
  image: {
    id: string
    image_url: string | null
    width: number | null
    height: number | null
  } | null
  aois: FirstClickAOIData[]
}

export interface FirstClickEventsResponse {
  clicks: FirstClickEventData[]
  tasks: FirstClickTask[]
  stats: FirstClickStats
  taskInfo: {
    taskId: string
    instruction: string | null
    imageUrl: string | null
    imageWidth: number
    imageHeight: number
  } | null
}

export async function getFirstClickEvents(
  supabase: SupabaseClient<Database>,
  studyId: string,
  filters: FirstClickEventsFilters
): Promise<{ data: FirstClickEventsResponse | null; error: Error | null }> {
  try {
    let responseQuery = supabase
      .from('first_click_responses')
      .select('*')
      .eq('study_id', studyId)

    if (filters.taskId) {
      responseQuery = responseQuery.eq('task_id', filters.taskId)
    }
    if (filters.participantId) {
      responseQuery = responseQuery.eq('participant_id', filters.participantId)
    }

    const [tasksResult, responsesResult] = await Promise.all([
      supabase
        .from('first_click_tasks')
        .select(`
          id,
          instruction,
          position,
          image:first_click_images(id, image_url, width, height),
          aois:first_click_aois(id, name, x, y, width, height)
        `)
        .eq('study_id', studyId)
        .order('position'),
      responseQuery,
    ])

    if (tasksResult.error) {
      return { data: null, error: new Error(`Failed to fetch tasks: ${tasksResult.error.message}`) }
    }
    if (responsesResult.error) {
      return { data: null, error: new Error(`Failed to fetch responses: ${responsesResult.error.message}`) }
    }

    // Supabase returns 1:1 relations as arrays
    const transformedTasks: FirstClickTask[] = (tasksResult.data || []).map(task => ({
      id: task.id,
      instruction: task.instruction,
      position: task.position,
      image: Array.isArray(task.image) && task.image.length > 0
        ? task.image[0]
        : null,
      aois: (Array.isArray(task.aois) ? task.aois : []).map((aoi: any) => ({
        id: aoi.id,
        name: aoi.name,
        x: Number(aoi.x),
        y: Number(aoi.y),
        width: Number(aoi.width),
        height: Number(aoi.height),
      })),
    }))

    const responses = responsesResult.data || []

    const clicks: FirstClickEventData[] = responses
      .filter(r => r.click_x !== null && r.click_y !== null && !r.is_skipped)
      .map(response => {
        const { normalizedX, normalizedY } = normalizeDecimalToPercent(
          response.click_x!,
          response.click_y!
        )

        return {
          id: response.id,
          taskId: response.task_id,
          imageId: response.image_id,
          participantId: response.participant_id,
          x: response.click_x!,
          y: response.click_y!,
          normalizedX,
          normalizedY,
          timestamp: response.created_at || new Date().toISOString(),
          wasCorrect: response.is_correct ?? false,
          matchedAoiId: response.matched_aoi_id,
          timeToClickMs: response.time_to_click_ms,
          isSkipped: response.is_skipped ?? false,
        }
      })

    let taskInfo: FirstClickEventsResponse['taskInfo'] = null
    if (filters.taskId) {
      const selectedTask = transformedTasks.find(t => t.id === filters.taskId)
      if (selectedTask) {
        taskInfo = {
          taskId: selectedTask.id,
          instruction: selectedTask.instruction,
          imageUrl: selectedTask.image?.image_url || null,
          imageWidth: selectedTask.image?.width || 1920,
          imageHeight: selectedTask.image?.height || 1080,
        }
      }
    }

    return {
      data: {
        clicks,
        tasks: transformedTasks,
        stats: calculateFirstClickStats(responses),
        taskInfo,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch first-click events'),
    }
  }
}

function calculateFirstClickStats(responses: any[]): FirstClickStats {
  const validResponses = responses.filter(r => !r.is_skipped && r.click_x !== null)
  const correctResponses = validResponses.filter(r => r.is_correct)

  const times = validResponses
    .map(r => r.time_to_click_ms)
    .filter((t): t is number => t !== null && t > 0)
    .sort((a, b) => a - b)

  return {
    totalClicks: validResponses.length,
    successRate: validResponses.length > 0
      ? (correctResponses.length / validResponses.length) * 100
      : 0,
    uniqueParticipants: new Set(validResponses.map(r => r.participant_id)).size,
    avgTimeMs: times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : null,
    medianTimeMs: times.length > 0 ? times[Math.floor(times.length / 2)] : null,
    hits: correctResponses.length,
    misses: validResponses.length - correctResponses.length,
    skipped: responses.filter(r => r.is_skipped).length,
  }
}
