import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { deleteSurveySection } from '../../../services/survey-sections-service';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  sectionId: z.string().uuid(),
});

export const config = {
  name: 'DeleteSurveySection',
  description: 'Delete a custom section',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/sections/:sectionId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-section-deleted'],
  flows: ['survey-sections'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);

  logger.info('Deleting survey section', {
    userId,
    studyId: params.studyId,
    sectionId: params.sectionId,
  });

  const supabase = getMotiaSupabaseClient();
  const { error } = await deleteSurveySection(supabase, params.sectionId);

  if (error) {
    logger.error('Failed to delete survey section', {
      userId,
      studyId: params.studyId,
      sectionId: params.sectionId,
      error: error.message,
    });

    return {
      status: 500,
      body: { error: error.message },
    };
  }

  logger.info('Survey section deleted successfully', {
    userId,
    studyId: params.studyId,
    sectionId: params.sectionId,
  });

  enqueue({
    topic: 'survey-section-deleted',
    data: {
      resourceType: 'survey-section',
      action: 'delete',
      userId,
      studyId: params.studyId,
      sectionId: params.sectionId,
    },
  });

  return {
    status: 200,
    body: { success: true },
  };
};
