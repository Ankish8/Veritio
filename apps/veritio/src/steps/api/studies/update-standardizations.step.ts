import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const standardizationSchema = z.object({
  standardizedName: z.string(),
  originalNames: z.array(z.string()),
  agreementScore: z.number(),
})

const bodySchema = z.object({
  standardizations: z.array(standardizationSchema),
})

const responseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
})

export const config = {
  name: 'UpdateStandardizations',
  description: 'Update category standardizations for a study',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/standardizations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['standardizations-updated'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams
  const { standardizations } = req.body as z.infer<typeof bodySchema>

  logger.info('Updating standardizations', { userId, studyId, count: standardizations.length })

  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found for standardizations update', { userId, studyId })
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  const { error: deleteError } = await supabase
    .from('category_standardizations')
    .delete()
    .eq('study_id', studyId)

  if (deleteError) {
    logger.error('Failed to delete existing standardizations', {
      userId,
      studyId,
      error: deleteError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to update standardizations' },
    }
  }

  if (standardizations.length > 0) {
    const insertData = standardizations.map(s => ({
      study_id: studyId,
      standardized_name: s.standardizedName,
      original_names: s.originalNames,
      agreement_score: s.agreementScore,
      created_by: userId,
    }))

    const { error: insertError } = await supabase
      .from('category_standardizations')
      .insert(insertData)

    if (insertError) {
      logger.error('Failed to insert standardizations', {
        userId,
        studyId,
        error: insertError.message,
      })
      return {
        status: 500,
        body: { error: 'Failed to save standardizations' },
      }
    }
  }

  logger.info('Standardizations updated successfully', {
    userId,
    studyId,
    count: standardizations.length,
  })

  enqueue({
    topic: 'standardizations-updated',
    data: {
      resourceType: 'standardization',
      resourceId: studyId,
      action: 'update',
      userId,
      studyId,
      count: standardizations.length,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      count: standardizations.length,
    },
  }
}
