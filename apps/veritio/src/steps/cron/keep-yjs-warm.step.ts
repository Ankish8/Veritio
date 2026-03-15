import type { StepConfig } from 'motia'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'KeepYjsWarm',
  description: 'Ping Yjs server to prevent Railway cold starts',
  triggers: [{ type: 'cron', expression: '0 */5 * * * * *' }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {

  try {
    const yjsServerUrl =
      process.env.YJS_SERVER_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_YJS_SERVER_URL?.replace('wss://', 'https://').replace('ws://', 'http://') ||
      'http://localhost:4002'

    const healthUrl = `${yjsServerUrl}/health`

    logger.info('[KeepYjsWarm] Pinging Yjs server', { url: healthUrl })

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Veritio-KeepAlive',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (response.ok) {
      const data = (await response.json()) as {
        status: string
        activeDocuments?: number
        totalConnections?: number
      }
      logger.info('[KeepYjsWarm] Yjs server is warm', {
        status: data.status,
        activeDocuments: data.activeDocuments,
        totalConnections: data.totalConnections,
      })
    } else {
      logger.error('[KeepYjsWarm] Yjs server health check failed', {
        status: response.status,
        statusText: response.statusText,
      })
    }
  } catch (error) {
    logger.error('[KeepYjsWarm] Failed to ping Yjs server', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
