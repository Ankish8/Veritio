import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import {
  isComposioConfigured,
  executeAction,
  getComposioConnection,
  resolveToolkitSlug,
} from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { isAllowedTool } from '../../../../lib/composio/allowed-tools'
import { getUserId, Errors, Success } from './shared'

const bodySchema = z.object({
  toolkit: z.string().min(1),
  tool: z.string().min(1),
  params: z.record(z.unknown()).default({}),
})

export const config = {
  name: 'ComposioExecuteTool',
  description: 'Execute a Composio tool action',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/integrations/composio/tools/execute',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['composio-tool-executed'],
  flows: ['integrations'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  if (!isComposioConfigured()) {
    return Errors.notConfigured()
  }

  const userId = getUserId(req)
  const body = bodySchema.safeParse(req.body)

  if (!body.success) {
    return Errors.invalidBody(body.error.issues)
  }

  const { toolkit, tool, params } = body.data

  // SECURITY: Validate tool is in whitelist
  if (!isAllowedTool(tool)) {
    logger.warn('Attempted to execute non-whitelisted tool', { userId, toolkit, tool })
    return Errors.forbidden(`Tool "${tool}" is not in the allowed tools list`)
  }

  // Look up the user's connection for this toolkit
  const supabase = getMotiaSupabaseClient()
  const connection = await findActiveConnection(supabase, userId, toolkit)

  if (!connection) {
    return Errors.forbidden(`Not connected to ${toolkit}. Please connect first.`)
  }

  // Execute the tool
  logger.info('Executing tool', { userId, toolkit, tool })

  const { data, error } = await executeAction(
    userId,
    tool,
    params,
    connection.composio_account_id || undefined
  )

  // Audit log to database
  await (supabase as any)
    .from('composio_tool_executions')
    .insert({
      user_id: userId,
      tool_name: tool,
      arguments: params,
      result: data,
      successful: !error,
      error: error?.message || null,
    })
    .then(() => {}).catch((logError: Error) => {
      logger.error('Failed to log tool execution', { logError })
    })

  if (error) {
    logger.error('Tool execution failed', { userId, toolkit, tool, error: error.message })
    return Errors.serverError(error.message)
  }

  logger.info('Tool executed successfully', { userId, toolkit, tool })
  await enqueue({ topic: 'composio-tool-executed', data: { userId, toolkit, tool } }).catch(() => {})

  return Success.ok({ success: true, data })
}

/**
 * Find an active connection for the toolkit, trying both the provided slug and resolved slug
 */
async function findActiveConnection(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  userId: string,
  toolkit: string
) {
  const { data: connection } = await getComposioConnection(supabase, userId, toolkit)

  if (connection?.status === 'active') {
    return connection
  }

  // Try resolved slug (e.g. user passes 'google_sheets', DB has 'googlesheets')
  const resolvedSlug = resolveToolkitSlug(toolkit)
  if (resolvedSlug !== toolkit) {
    const { data: altConnection } = await getComposioConnection(supabase, userId, resolvedSlug)
    if (altConnection?.status === 'active') {
      return altConnection
    }
  }

  return null
}
