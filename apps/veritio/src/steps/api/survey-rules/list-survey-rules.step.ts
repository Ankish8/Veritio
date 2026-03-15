import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { listSurveyRules } from '../../../services/survey-rules-service';
import { ruleResponseSchema } from './schemas';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
});

export const config = {
  name: 'ListSurveyRules',
  description: 'List all logic rules for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/rules',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: z.array(ruleResponseSchema) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-rules-fetched'],
  flows: ['survey-rules'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);

  logger.info('Listing survey rules', { userId, studyId: params.studyId });

  const supabase = getMotiaSupabaseClient();
  const { data: rules, error } = await listSurveyRules(supabase, params.studyId);

  if (error) {
    logger.error('Failed to list survey rules', {
      userId,
      studyId: params.studyId,
      error: error.message,
    });
    return {
      status: 500,
      body: { error: 'Failed to fetch rules' },
    };
  }

  logger.info('Survey rules listed successfully', {
    userId,
    studyId: params.studyId,
    count: rules?.length || 0,
  });

  enqueue({
    topic: 'survey-rules-fetched',
    data: {
      resourceType: 'survey-rule',
      action: 'list',
      userId,
      studyId: params.studyId,
      metadata: { count: rules?.length || 0 },
    },
  });

  return {
    status: 200,
    body: rules || [],
  };
};
