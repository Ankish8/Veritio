import type { StepConfig } from 'motia'
import { studyCreatedSchema, type StudyCreatedEvent } from '../../lib/events/schemas'

function createDocumentName(studyId: string): string {
  return `study:${studyId}`
}
import type { EventHandlerContext } from '../../lib/motia/types'

const PREWARM_TIMEOUT_MS = 5000
const DEFAULT_YJS_INTERNAL_URL = 'http://localhost:4002'

function getInternalYjsUrl() {
  const rawUrl = process.env.YJS_SERVER_INTERNAL_URL || DEFAULT_YJS_INTERNAL_URL
  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
}

export const config = {
  name: 'PrewarmYjsDocument',
  description: 'Pre-warm Yjs documents when studies are created',
  triggers: [{
    type: 'queue',
    topic: 'study-created',
  }],
  enqueues: [],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (input: StudyCreatedEvent, { logger }: EventHandlerContext) => {
  let data: StudyCreatedEvent

  try {
    data = studyCreatedSchema.parse(input)
  } catch (error) {
    logger.warn('Invalid study-created payload for Yjs prewarm', { error })
    return
  }

  const docName = createDocumentName(data.studyId)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const apiKey = process.env.YJS_INTERNAL_API_KEY
  if (apiKey) {
    headers['x-internal-api-key'] = apiKey
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREWARM_TIMEOUT_MS)

  try {
    const response = await fetch(`${getInternalYjsUrl()}/prewarm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ docName }),
      signal: controller.signal,
    })

    if (!response.ok) {
      logger.warn('Yjs prewarm request failed', {
        docName,
        status: response.status,
      })
      return
    }

    logger.info('Yjs document prewarmed', { docName })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : ''
    if (errorName === 'AbortError') {
      logger.warn('Yjs prewarm request timed out', { docName, timeoutMs: PREWARM_TIMEOUT_MS })
      return
    }

    logger.warn('Yjs prewarm request error', { docName, error })
  } finally {
    clearTimeout(timeout)
  }
}
