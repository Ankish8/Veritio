import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { createSurveyRule } from '../../../services/survey-rules-service';
import { conditionGroupSchema, actionTypeEnum, triggerTypeEnum, ruleResponseSchema } from './schemas';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  position: z.number().optional(),
  is_enabled: z.boolean().optional(),
  conditions: z.object({ groups: z.array(conditionGroupSchema) }).optional(),
  action_type: actionTypeEnum,
  action_config: z.any(),
  trigger_type: triggerTypeEnum.optional(),
  trigger_config: z.any().optional(),
});

export const config = {
  name: 'CreateSurveyRule',
  description: 'Create a new logic rule for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/rules',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: ruleResponseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-rule-created'],
  flows: ['survey-rules'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);
  const body = bodySchema.parse(req.body);

  logger.info('Creating survey rule', { userId, studyId: params.studyId, name: body.name });

  const supabase = getMotiaSupabaseClient();
  const { data: rule, error } = await createSurveyRule(supabase, params.studyId, body as any);

  if (error) {
    logger.error('Failed to create survey rule', {
      userId,
      studyId: params.studyId,
      error: error.message,
    });
    return {
      status: 500,
      body: { error: error.message },
    };
  }

  logger.info('Survey rule created successfully', {
    userId,
    studyId: params.studyId,
    ruleId: rule?.id,
  });

  enqueue({
    topic: 'survey-rule-created',
    data: {
      resourceType: 'survey-rule',
      action: 'create',
      userId,
      studyId: params.studyId,
      ruleId: rule?.id,
    },
  });

  return {
    status: 201,
    body: rule,
  };
};
