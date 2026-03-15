import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import {
  analyzeParticipantEvents,
  classifyStudyPages,
  mergeResults,
} from '../../services/live-website/semantic-analysis-service'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid().optional(), // Optional: if omitted, processes ALL completed participants
})

export const config = {
  name: 'ProcessSemanticAnalysis',
  description: 'Generate AI semantic labels for live website test events',
  triggers: [{
    type: 'queue',
    topic: 'live-website-semantic-analysis-requested',
    input: inputSchema as any,
    infrastructure: {
      handler: { timeout: 300 }, // 5 min for full-study regeneration
      queue: { maxRetries: 2 },
    },
  }],
  enqueues: [],
  flows: ['results-analysis'], // v6: error/path/task event types + clean URLs
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger }: EventHandlerContext) => {
  let studyId: string
  let supabase: ReturnType<typeof getMotiaSupabaseClient>

  try {
    const parsed = inputSchema.parse(input)
    studyId = parsed.studyId
    const participantId = parsed.participantId
    supabase = getMotiaSupabaseClient()
    const startTime = Date.now()

    logger.info('Semantic analysis handler started', { studyId, participantId })

    // Determine which participants to process
    let participantIds: string[]

    if (participantId) {
      participantIds = [participantId]
    } else {
      const { data: participants, error: pErr } = await supabase
        .from('participants')
        .select('id')
        .eq('study_id', studyId)
        .eq('status', 'completed')

      if (pErr) {
        logger.error('Failed to fetch participants', { error: pErr.message })
        throw new Error(`Failed to fetch participants: ${pErr.message}`)
      }
      participantIds = (participants || []).map(p => p.id)
    }

    if (participantIds.length === 0) {
      logger.info('No participants to analyze', { studyId })
      // Mark as completed with empty results instead of leaving in processing
      await supabase
        .from('live_website_semantic_labels' as any)
        .upsert({
          study_id: studyId,
          status: 'completed',
          event_labels: {},
          intent_groups: {},
          page_labels: {},
          participants_analyzed: 0,
          error_message: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'study_id' })
      return
    }

    logger.info('Starting semantic analysis', { studyId, participantCount: participantIds.length })

    // Upsert row with processing status
    await supabase
      .from('live_website_semantic_labels' as any)
      .upsert({
        study_id: studyId,
        status: 'processing',
        ...(participantId ? {} : { event_labels: {}, intent_groups: {}, page_labels: {}, participants_analyzed: 0 }),
        error_message: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'study_id' })

    // Accumulate results across all participants
    let accumulated = {
      event_labels: {} as Record<string, string>,
      intent_groups: {} as Record<string, any[]>,
      page_labels: {} as Record<string, any>,
    }

    // For single-participant mode, load existing data first
    if (participantId) {
      const { data: existingRow } = await supabase
        .from('live_website_semantic_labels' as any)
        .select('event_labels, intent_groups, page_labels')
        .eq('study_id', studyId)
        .single()

      if (existingRow) {
        accumulated = {
          event_labels: ((existingRow as any).event_labels as Record<string, string>) || {},
          intent_groups: ((existingRow as any).intent_groups as Record<string, any[]>) || {},
          page_labels: ((existingRow as any).page_labels as Record<string, any>) || {},
        }
      }
    }

    let processedCount = 0

    for (const pid of participantIds) {
      try {
        logger.info('Analyzing participant', { participantId: pid })
        const result = await analyzeParticipantEvents(supabase, studyId, pid, logger)
        accumulated = mergeResults(accumulated, result)
        processedCount++

        logger.info('Processed participant', {
          studyId,
          participantId: pid,
          eventLabelsCount: Object.keys(result.event_labels).length,
          progress: `${processedCount}/${participantIds.length}`,
        })
      } catch (err) {
        logger.warn('Failed to analyze participant, skipping', {
          participantId: pid,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Classify pages
    let pageLabels: Record<string, any> | undefined
    const shouldClassifyPages = !participantId || processedCount === 1 || processedCount % 5 === 0
    if (shouldClassifyPages) {
      try {
        pageLabels = await classifyStudyPages(supabase, studyId, logger)
      } catch (err) {
        logger.warn('Page classification failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (pageLabels) {
      accumulated.page_labels = { ...accumulated.page_labels, ...pageLabels }
    }

    const generationTimeMs = Date.now() - startTime

    await supabase
      .from('live_website_semantic_labels' as any)
      .update({
        status: 'completed',
        event_labels: accumulated.event_labels,
        intent_groups: accumulated.intent_groups,
        page_labels: accumulated.page_labels,
        participants_analyzed: processedCount,
        generation_time_ms: generationTimeMs,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('study_id', studyId)

    logger.info('Semantic analysis completed', {
      studyId,
      processedCount,
      totalEventLabels: Object.keys(accumulated.event_labels).length,
      totalIntentGroups: Object.keys(accumulated.intent_groups).length,
      totalPageLabels: Object.keys(accumulated.page_labels).length,
      generationTimeMs,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Semantic analysis failed', { studyId: studyId!, error: errorMessage, stack: (error as Error)?.stack })

    try {
      await supabase!
        .from('live_website_semantic_labels' as any)
        .update({
          status: 'failed',
          error_message: errorMessage.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('study_id', studyId!)
    } catch (dbErr) {
      logger.error('Failed to write error status to DB', { dbErr: String(dbErr) })
    }
  }
}
