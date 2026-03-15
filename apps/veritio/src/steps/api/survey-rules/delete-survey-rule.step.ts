import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { deleteSurveyRule } from '../../../services/survey-rules-service';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  ruleId: z.string().uuid(),
});

export const config = {
  name: 'DeleteSurveyRule',
  description: 'Delete a logic rule',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/rules/:ruleId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-rule-deleted'],
  flows: ['survey-rules'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);

  logger.info('Deleting survey rule', {
    userId,
    studyId: params.studyId,
    ruleId: params.ruleId,
  });

  const supabase = getMotiaSupabaseClient();
  const { error } = await deleteSurveyRule(supabase, params.ruleId, params.studyId);

  if (error) {
    logger.error('Failed to delete survey rule', {
      userId,
      studyId: params.studyId,
      ruleId: params.ruleId,
      error: error.message,
    });
    return {
      status: 500,
      body: { error: error.message },
    };
  }

  logger.info('Survey rule deleted successfully', {
    userId,
    studyId: params.studyId,
    ruleId: params.ruleId,
  });

  enqueue({
    topic: 'survey-rule-deleted',
    data: {
      resourceType: 'survey-rule',
      action: 'delete',
      userId,
      studyId: params.studyId,
      ruleId: params.ruleId,
    },
  });

  return {
    status: 200,
    body: { success: true },
  };
};
