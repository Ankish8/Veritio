import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { createChatCompletion } from '../../../services/assistant/openai'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUserAiOverrides } from '../../../services/user-ai-config-service'
import { getAdminAiConfigRaw } from '../../../services/admin-ai-config-service'

const bodySchema = z.object({
  mode: z.enum(['results', 'builder']),
  studyType: z.string(),
  activeTab: z.string().optional(),
  activeFlowSection: z.string().optional(),
  connectedToolkits: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
})

export const config = {
  name: 'AssistantSuggestions',
  description: 'Generate AI-powered suggestion questions for the assistant empty state',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/suggestions',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

const FLOW_SECTION_LABELS: Record<string, string> = {
  welcome: 'Welcome Message',
  agreement: 'Participant Agreement',
  screening: 'Screening Questions',
  identifier: 'Participant Identifier',
  pre_study: 'Pre-Study Questions',
  instructions: 'Activity Instructions',
  prototype_settings: 'Prototype Settings',
  post_study: 'Post-Study Questions',
  survey: 'Survey Questionnaire',
  thank_you: 'Thank You Message',
  closed: 'Closed Study Message',
}

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const body = bodySchema.parse(req.body)

  // Load per-user AI overrides and admin config
  const supabase = getMotiaSupabaseClient()
  const [userOverrides, adminConfigRaw] = await Promise.all([
    getUserAiOverrides(supabase, userId),
    getAdminAiConfigRaw(supabase),
  ])

  try {
    const prompt = buildPrompt(body)
    const response = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      { provider: 'openai', maxTokens: 2048, userOverrides: userOverrides ?? undefined, adminConfig: adminConfigRaw ?? undefined },
    )

    if (!response.content) {
      return { status: 200, body: { suggestions: [] } }
    }

    const parsed = parseResponse(response.content)
    return { status: 200, body: parsed }
  } catch (err) {
    logger.error('Failed to generate suggestions', { error: err })
    return { status: 200, body: { suggestions: [] } }
  }
}

function buildPrompt(context: z.infer<typeof bodySchema>): string {
  const { mode, studyType, activeTab, activeFlowSection, connectedToolkits, exclude } = context

  const studyTypeLabel = studyType.replace(/_/g, ' ')
  const hasIntegrations = connectedToolkits && connectedToolkits.length > 0

  // Build context description
  let ctx: string
  if (mode === 'builder') {
    const sectionLabel = activeFlowSection ? FLOW_SECTION_LABELS[activeFlowSection] : undefined
    if (activeTab === 'study-flow' && sectionLabel) {
      ctx = `building a ${studyTypeLabel} study, editing the "${sectionLabel}" section of the study flow`
    } else if (activeTab) {
      ctx = `building a ${studyTypeLabel} study, on the "${activeTab}" tab`
    } else {
      ctx = `building a ${studyTypeLabel} study`
    }
  } else {
    ctx = `analyzing results of a ${studyTypeLabel} study`
  }

  const integrationNote = hasIntegrations ? ` Connected integrations: ${connectedToolkits.join(', ')}.` : ''
  const excludeNote = exclude && exclude.length > 0 ? `\nDo NOT use any of these (already shown): ${exclude.join(' | ')}` : ''

  let prompt = `UX research platform. User is ${ctx}.${integrationNote}
Generate 5 varied, specific suggestion questions (<50 chars each). Be creative and unique.${excludeNote}`

  if (hasIntegrations) {
    prompt += `\nAlso generate 1 creative action suggestion per connected integration (<50 chars). Include the toolkit slug.`
    prompt += `\nReturn JSON: {"suggestions":["..."],"integrationSuggestions":[{"toolkit":"slug","label":"..."}]}`
  } else {
    prompt += `\nReturn JSON: {"suggestions":["...","...","...","...","..."]}`
  }

  return prompt
}

function parseResponse(content: string) {
  // Strip markdown code fences
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(jsonStr)

  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : []
  const integrationSuggestions = Array.isArray(parsed.integrationSuggestions) ? parsed.integrationSuggestions : undefined

  return { suggestions, ...(integrationSuggestions ? { integrationSuggestions } : {}) }
}
