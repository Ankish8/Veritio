import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { verifyLivePreviewToken } from '../../../lib/security/live-preview-token'
import { createLiveWebsiteProxyResponse } from '../../../services/live-website/proxy-service'

const querySchema = z.object({
  url: z.string().url().optional(),
  previewToken: z.string().min(1).optional(),
}).refine((value) => value.url || value.previewToken, {
  message: 'url or previewToken is required',
})

async function queryTokenMiddleware(req: any, _ctx: any, next: () => Promise<any>) {
  if (req.headers['authorization'] || req.headers['x-user-id']) {
    return next()
  }

  const token = req.queryParams?.token || req.query?.token
  if (token) {
    req.headers['authorization'] = `Bearer ${token}`
  }

  return next()
}

async function previewTokenOrAuthMiddleware(req: any, ctx: any, next: () => Promise<any>) {
  if (req.queryParams?.previewToken || req.query?.previewToken) {
    return next()
  }

  return queryTokenMiddleware(req, ctx, () => authMiddleware(req, ctx, next))
}

export const config = {
  name: 'ProxyWebsitePreview',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/live-website/proxy',
    middleware: [previewTokenOrAuthMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const validation = validateRequest(querySchema, req.queryParams, logger)
  if (!validation.success) return validation.response

  let url = validation.data.url
  if (validation.data.previewToken) {
    const payload = await verifyLivePreviewToken(validation.data.previewToken)
    if (!payload) {
      return { status: 401, body: { error: 'Invalid or expired preview token' } }
    }
    if (url && url !== payload.url) {
      return { status: 401, body: { error: 'Preview token URL mismatch' } }
    }
    url = payload.url
  }

  if (!url) {
    return { status: 400, body: { error: 'Missing url parameter' } }
  }

  return createLiveWebsiteProxyResponse(url)
}
