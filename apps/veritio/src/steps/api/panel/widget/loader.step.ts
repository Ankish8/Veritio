import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelWidgetService } from '../../../../services/panel/index'
import { generateLoaderScript } from './loader/index'

const paramsSchema = z.object({
  embedCodeId: z.string().min(8).max(20),
})

export const config = {
  name: 'WidgetLoaderScript',
  description: 'Serves the JavaScript loader script for the panel widget',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/widget/:embedCodeId/loader.js',
    middleware: [],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const parseResult = paramsSchema.safeParse(req.pathParams)

  if (!parseResult.success) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/javascript' },
      body: '/* Invalid widget ID */',
    }
  }

  const { embedCodeId } = parseResult.data
  logger.info('Serving widget loader script', { embedCodeId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelWidgetService(supabase)

  try {
    const publicConfig = await service.getPublicConfig(embedCodeId)

    if (!publicConfig) {
      logger.warn('Widget config not found or disabled', { embedCodeId })
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=60',
        },
        body: '/* Widget not found or disabled */',
      }
    }

    const host = req.headers['host'] || process.env.NEXT_PUBLIC_APP_URL || 'localhost:4000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const apiBase = `${protocol}://${host}`

    // Use share_code (not UUID) because participant page looks up by share_code/url_slug
    let studyUrl = ''
    if (publicConfig.activeStudyShareCode) {
      const frontendHost = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:4001'
      studyUrl = `${frontendHost}/s/${publicConfig.activeStudyShareCode}`
    }

    const loaderScript = generateLoaderScript({
      embedCodeId,
      apiBase,
      studyUrl,
      config: publicConfig.config,
      branding: publicConfig.branding,
    })

    logger.info('Widget loader script served', { embedCodeId, hasStudy: !!studyUrl })

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: loaderScript,
    }
  } catch (error) {
    logger.error('Failed to serve widget loader', {
      embedCodeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' },
      body: '/* Error loading widget configuration */',
    }
  }
}
