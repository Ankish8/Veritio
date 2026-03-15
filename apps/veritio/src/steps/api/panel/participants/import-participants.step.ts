import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService } from '../../../../services/panel/index'
import { importParticipantsSchema } from '../../../../lib/supabase/panel-types'

export const config = {
  name: 'ImportPanelParticipants',
  description: 'Bulk import panel participants',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/participants/import',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: importParticipantsSchema as any,
  }],
  enqueues: ['panel-participants-imported'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const body = importParticipantsSchema.parse(req.body || {})

  logger.info('Importing panel participants', {
    userId,
    count: body.participants.length,
    duplicateHandling: body.duplicate_handling
  })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelParticipantService(supabase)

  try {
    const result = await service.bulkImport(userId, organizationId, body.participants, {
      duplicateHandling: body.duplicate_handling,
      autoCreateTags: body.auto_create_tags,
      defaultTagId: body.default_tag_id,
    })

    logger.info('Panel participants imported successfully', {
      userId,
      created: result.created,
      updated: result.updated,
      failed: result.failed
    })

    enqueue({
      topic: 'panel-participants-imported',
      data: {
        resourceType: 'panel-participant',
        action: 'import',
        userId,
        created: result.created,
        updated: result.updated,
        failed: result.failed
      },
    }).catch(() => {})

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    logger.error('Failed to import panel participants', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to import participants' },
    }
  }
}
