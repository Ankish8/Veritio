/**
 * Report generator — orchestrates LLM calls to produce the full insights report.
 * Makes 2-4 grouped LLM calls (overview → deep analysis → questionnaire → synthesis).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { createChatCompletion } from '../assistant/openai'
import { getStudySummary } from './data-summarizer'
import { getSectionGroups } from './section-definitions'
import { getPromptForGroup, buildSynthesisPrompt } from './prompts'
import type { ReportOutput, SectionOutput } from './chart-schema'
import { sectionOutputSchema } from './chart-schema'

type SupabaseClientType = SupabaseClient<Database>

interface GenerateParams {
  studyId: string
  studyType: string
  reportId: string
  segmentFilters?: unknown[]
  filteredParticipantIds?: Set<string>
  onProgress: (p: { percentage: number; section: string }) => void
  logger: { info: (msg: string, ctx?: Record<string, unknown>) => void; error: (msg: string, ctx?: Record<string, unknown>) => void }
}

interface GenerateResult {
  report: ReportOutput
  tokenUsage: { promptTokens: number; completionTokens: number }
  generationTimeMs: number
}

/**
 * Generate a full insights report by orchestrating LLM calls in grouped batches.
 */
export async function generateInsightsReport(
  supabase: SupabaseClientType,
  params: GenerateParams,
): Promise<GenerateResult> {
  const startTime = Date.now()
  const { studyId, studyType, onProgress, logger } = params

  const totalPromptTokens = 0
  const totalCompletionTokens = 0

  // Step 1: Fetch and compress study data
  onProgress({ percentage: 5, section: 'Preparing data...' })
  logger.info('Fetching study summary', { studyId, studyType })

  const summary = await getStudySummary(supabase, studyId, studyType, params.filteredParticipantIds)

  // Step 2: Get section groups for this study type
  const groups = getSectionGroups(studyType)
  const allSections: SectionOutput[] = []

  // Determine progress allocation per group
  const groupOrder = ['overview', 'deep_analysis', 'questionnaire', 'synthesis']
  const activeGroups = groupOrder.filter(g => {
    if (g === 'questionnaire') return summary.hasQuestionnaire
    if (g === 'synthesis') return true // always run synthesis
    return groups.has(g)
  })

  const progressPerGroup = 80 / activeGroups.length // 5% start + 80% groups + 15% finish
  let currentProgress = 5

  // Step 3: Process each group
  for (const groupName of activeGroups) {
    if (groupName === 'synthesis') {
      // Synthesis uses all previous sections
      currentProgress += progressPerGroup / 2
      onProgress({ percentage: Math.round(currentProgress), section: 'Writing executive summary...' })

      const synthesisPrompt = buildSynthesisPrompt(
        summary,
        allSections.map(s => ({ id: s.id, title: s.title, keyFindings: s.keyFindings })),
      )

      logger.info('Calling LLM for synthesis', { promptLength: synthesisPrompt.length })
      const executiveSummary = await callLLMForJSON<{ executiveSummary: string }>(
        synthesisPrompt,
        logger,
      )

      // Attach executive summary to the report (handled at the end)
      allSections.unshift({
        id: '_executive_summary',
        title: 'Executive Summary',
        narrative: executiveSummary.executiveSummary,
        keyFindings: [],
        charts: [],
      })

      currentProgress += progressPerGroup / 2
      continue
    }

    const sections = groups.get(groupName)
    if (!sections || sections.length === 0) continue

    // Skip questionnaire group if no questionnaire data
    if (groupName === 'questionnaire' && !summary.hasQuestionnaire) continue

    const sectionNames = sections.map(s => s.title).join(', ')
    onProgress({ percentage: Math.round(currentProgress), section: `Analyzing ${sectionNames}...` })
    logger.info('Processing group', { groupName, sections: sections.map(s => s.id) })

    const prompt = getPromptForGroup(groupName, summary, sections)
    logger.info('Calling LLM for group', { groupName, promptLength: prompt.length })
    const result = await callLLMForJSON<{ sections: SectionOutput[] }>(prompt, logger)

    // Validate and collect sections
    for (const section of result.sections) {
      try {
        const validated = sectionOutputSchema.parse(section)
        allSections.push(validated)
      } catch (parseError) {
        logger.error('Section validation failed, using raw', {
          sectionId: section.id,
          error: String(parseError),
        })
        // Use raw section even if validation fails (charts may have minor issues)
        allSections.push(section)
      }
    }

    currentProgress += progressPerGroup
  }

  // Step 4: Assemble final report
  onProgress({ percentage: 90, section: 'Assembling report...' })

  // Extract executive summary from the synthesis section
  const execSection = allSections.find(s => s.id === '_executive_summary')
  const contentSections = allSections.filter(s => s.id !== '_executive_summary')

  const report: ReportOutput = {
    executiveSummary: execSection?.narrative ?? 'No executive summary generated.',
    sections: contentSections,
  }

  onProgress({ percentage: 95, section: 'Finalizing...' })

  return {
    report,
    tokenUsage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
    generationTimeMs: Date.now() - startTime,
  }
}

// ---------------------------------------------------------------------------
// LLM helper — calls the model and parses JSON response
// ---------------------------------------------------------------------------

async function callLLMForJSON<T>(
  prompt: string,
  logger: { info: (msg: string, ctx?: Record<string, unknown>) => void; error: (msg: string, ctx?: Record<string, unknown>) => void },
  retries = 1,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const message = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        provider: 'openai',
        maxTokens: 16384,
        responseFormat: { type: 'json_object' },
        timeoutMs: 180000, // 3 min — large reports
      },
    )

    const content = message.content
    if (!content) {
      logger.error('LLM returned empty content', {
        attempt,
        refusal: (message as any).refusal,
        finishReason: (message as any).finish_reason,
        role: message.role,
        hasToolCalls: !!message.tool_calls?.length,
      })
      if (attempt < retries) continue
      throw new Error(`LLM returned empty response (refusal: ${(message as any).refusal || 'none'})`)
    }

    try {
      return JSON.parse(content) as T
    } catch (parseError) {
      logger.error('Failed to parse LLM JSON response', { content: content.slice(0, 500) })

      // Try to extract JSON from markdown code fences
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) {
        return JSON.parse(fenceMatch[1]) as T
      }

      if (attempt < retries) {
        logger.info('LLM returned invalid JSON, retrying', { attempt })
        continue
      }
      throw new Error(`LLM returned invalid JSON: ${String(parseError)}`)
    }
  }

  throw new Error('LLM call failed after retries')
}
