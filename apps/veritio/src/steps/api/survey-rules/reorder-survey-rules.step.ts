import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { reorderSurveyRules } from '../../../services/survey-rules-service';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
});

const bodySchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export const config = {
  name: 'ReorderSurveyRules',
  description: 'Reorder logic rules for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/rules/reorder',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-rules-reordered'],
  flows: ['survey-rules'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);
  const body = bodySchema.parse(req.body);

  logger.info('Reordering survey rules', {
    userId,
    studyId: params.studyId,
    count: body.orderedIds.length,
  });

  const supabase = getMotiaSupabaseClient();
  const { error } = await reorderSurveyRules(supabase, params.studyId, body.orderedIds);

  if (error) {
    logger.error('Failed to reorder survey rules', {
      userId,
      studyId: params.studyId,
      error: error.message,
    });
    return {
      status: 500,
      body: { error: error.message },
    };
  }

  logger.info('Survey rules reordered successfully', {
    userId,
    studyId: params.studyId,
  });

  enqueue({
    topic: 'survey-rules-reordered',
    data: {
      resourceType: 'survey-rule',
      action: 'reorder',
      userId,
      studyId: params.studyId,
    },
  });

  return {
    status: 200,
    body: { success: true },
  };
};
