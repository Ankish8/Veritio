import type { StepConfig } from 'motia'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import {
  isComposioConfigured,
  getComposioConnections,
  toolkitDisplayName,
} from '../../../../services/composio/index'
import type { ConnectionInfo } from '../../../../services/composio/types'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getUserId, Errors, Success } from './shared'

export const config = {
  name: 'ComposioConnectionStatus',
  description: 'Get Composio connection status for current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/status',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  if (!isComposioConfigured()) {
    return Success.ok({ configured: false, connections: [] })
  }

  const userId = getUserId(req)
  const supabase = getMotiaSupabaseClient()
  const { data: connections, error } = await getComposioConnections(supabase, userId)

  if (error) {
    logger.error('Failed to get connection status', { userId, error: error.message })
    return Errors.serverError('Failed to check connection status')
  }

  // Return DB data only — frontend enriches with toolkit metadata (logos, descriptions)
  // from the toolkits endpoint to avoid a slow Composio API call here.
  const connectionInfos: ConnectionInfo[] = connections.map((c) => ({
    toolkit: c.toolkit,
    name: toolkitDisplayName(c.toolkit),
    logo: null,
    description: null,
    connected: c.status === 'active',
    account: c.account_display || null,
    composioAccountId: c.composio_account_id || null,
    connectedAt: c.created_at || null,
  }))

  return Success.ok({ configured: true, connections: connectionInfos })
}
