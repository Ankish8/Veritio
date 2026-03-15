import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
});

const bodySchema = z.object({
  ruleIds: z.array(z.string().uuid()).min(1),
  updates: z
    .object({
      is_enabled: z.boolean().optional(),
    })
    .optional(),
});

const responseSchema = z.object({
  success: z.boolean(),
  updated: z.number(),
});

export const config = {
  name: 'BulkUpdateSurveyRules',
  description: 'Bulk update or delete multiple logic rules',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/rules/bulk',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-rules-bulk-updated'],
  flows: ['survey-rules'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);
  const body = bodySchema.parse(req.body);

  logger.info('Bulk updating survey rules', {
    userId,
    studyId: params.studyId,
    ruleIds: body.ruleIds,
    updates: body.updates,
  });

  const supabase = getMotiaSupabaseClient();
  const { data: existingRules, error: fetchError } = await supabase
    .from('survey_rules')
    .select('id')
    .eq('study_id', params.studyId)
    .in('id', body.ruleIds);

  if (fetchError) {
    logger.error('Failed to fetch rules for bulk update', {
      userId,
      studyId: params.studyId,
      error: fetchError.message,
    });
    return {
      status: 500,
      body: { error: fetchError.message },
    };
  }

  const existingIds = new Set(existingRules?.map((r) => r.id) || []);
  const invalidIds = body.ruleIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    return {
      status: 400,
      body: { error: `Some rule IDs not found: ${invalidIds.join(', ')}` },
    };
  }

  const { error: updateError, count } = await supabase
    .from('survey_rules')
    .update({
      ...body.updates,
      updated_at: new Date().toISOString(),
    })
    .eq('study_id', params.studyId)
    .in('id', body.ruleIds);

  if (updateError) {
    logger.error('Failed to bulk update survey rules', {
      userId,
      studyId: params.studyId,
      error: updateError.message,
    });
    return {
      status: 500,
      body: { error: updateError.message },
    };
  }

  logger.info('Survey rules bulk updated successfully', {
    userId,
    studyId: params.studyId,
    count,
  });

  enqueue({
    topic: 'survey-rules-bulk-updated',
    data: {
      resourceType: 'survey-rule',
      action: 'bulk-update',
      userId,
      studyId: params.studyId,
      ruleIds: body.ruleIds,
    },
  });

  return {
    status: 200,
    body: { success: true, updated: count || body.ruleIds.length },
  };
};
