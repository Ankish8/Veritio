import type { StepConfig } from 'motia'
import { z } from 'zod'
import OpenAI from 'openai'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { validateRequest } from '../../../lib/api/validate-request'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUserAiOverrides } from '../../../services/user-ai-config-service'

const bodySchema = z.object({
  provider: z.enum(['openai', 'mercury']),
})

export const config = {
  name: 'ListAIModels',
  description: 'Fetch available models from an OpenAI-compatible provider using the user\'s stored API key',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/list-models',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

// Default provider base URLs (used when user has no custom base URL)
const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  openai: undefined, // OpenAI SDK default
  mercury: 'https://api.inceptionlabs.ai/v1',
}

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response
  const { provider } = validation.data

  const supabase = getMotiaSupabaseClient()
  const overrides = await getUserAiOverrides(supabase, userId)

  // Resolve which slot to use (useSameProvider redirects mercury to openai)
  const effectiveProvider = (provider === 'mercury' && overrides?.useSameProvider) ? 'openai' : provider
  const slot = overrides?.[effectiveProvider]

  // Only use the user's own API key — never fall back to platform keys for this endpoint
  const apiKey = slot?.apiKey
  const baseUrl = slot?.baseUrl || PROVIDER_BASE_URLS[effectiveProvider]

  if (!apiKey) {
    return {
      status: 200,
      body: { models: [], error: 'No API key configured for this provider. Save your API key first, then refresh models.' },
    }
  }

  try {
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = { apiKey, timeout: 15000 }
    if (baseUrl) clientOptions.baseURL = baseUrl

    const client = new OpenAI(clientOptions)
    const response = await client.models.list()

    const models: string[] = []
    for await (const model of response) {
      models.push(model.id)
    }

    models.sort((a, b) => a.localeCompare(b))

    logger.info('Listed AI models', { userId, provider, modelCount: models.length })
    return { status: 200, body: { models } }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Failed to list AI models', { userId, provider, error: errorMessage })
    return {
      status: 200,
      body: { models: [], error: 'Failed to fetch models. Please check your API key and base URL.' },
    }
  }
}
