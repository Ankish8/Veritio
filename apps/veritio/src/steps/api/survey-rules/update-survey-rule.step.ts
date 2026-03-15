import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { updateSurveyRule } from '../../../services/survey-rules-service';
import { conditionGroupSchema, actionTypeEnum, triggerTypeEnum, ruleResponseSchema } from './schemas';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  ruleId: z.string().uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  position: z.number().optional(),
  is_enabled: z.boolean().optional(),
  conditions: z.object({ groups: z.array(conditionGroupSchema) }).optional(),
  action_type: actionTypeEnum.optional(),
  action_config: z.any().optional(),
  trigger_type: triggerTypeEnum.optional(),
  trigger_config: z.any().optional(),
});

export const config = {
  name: 'UpdateSurveyRule',
  description: 'Update an existing logic rule',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/rules/:ruleId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: ruleResponseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-rule-updated'],
  flows: ['survey-rules'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);
  const body = bodySchema.parse(req.body);

  logger.info('Updating survey rule', {
    userId,
    studyId: params.studyId,
    ruleId: params.ruleId,
  });

  const supabase = getMotiaSupabaseClient();
  const { data: rule, error } = await updateSurveyRule(
    supabase,
    params.ruleId,
    params.studyId,
    body as any
  );

  if (error) {
    logger.error('Failed to update survey rule', {
      userId,
      studyId: params.studyId,
      ruleId: params.ruleId,
      error: error.message,
    });

    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: 'Rule not found' },
      };
    }

    return {
      status: 500,
      body: { error: error.message },
    };
  }

  logger.info('Survey rule updated successfully', {
    userId,
    studyId: params.studyId,
    ruleId: params.ruleId,
  });

  enqueue({
    topic: 'survey-rule-updated',
    data: {
      resourceType: 'survey-rule',
      action: 'update',
      userId,
      studyId: params.studyId,
      ruleId: params.ruleId,
    },
  });

  return {
    status: 200,
    body: rule,
  };
};
