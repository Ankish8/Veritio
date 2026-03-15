import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { listSurveySections } from '../../../services/survey-sections-service';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
});

const sectionSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  parent_section: z.enum(['survey', 'pre_study', 'post_study']),
  is_visible: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const responseSchema = z.array(sectionSchema);

export const config = {
  name: 'ListSurveySections',
  description: 'List all custom sections for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/sections',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-sections-fetched'],
  flows: ['survey-sections'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);

  logger.info('Listing survey sections', { userId, studyId: params.studyId });

  const supabase = getMotiaSupabaseClient();
  const { data: sections, error } = await listSurveySections(supabase, params.studyId);

  if (error) {
    logger.error('Failed to list survey sections', {
      userId,
      studyId: params.studyId,
      error: error.message,
    });
    return {
      status: 500,
      body: { error: 'Failed to fetch sections' },
    };
  }

  logger.info('Survey sections listed successfully', {
    userId,
    studyId: params.studyId,
    count: sections?.length || 0,
  });

  enqueue({
    topic: 'survey-sections-fetched',
    data: {
      resourceType: 'survey-section',
      action: 'list',
      userId,
      studyId: params.studyId,
      metadata: { count: sections?.length || 0 },
    },
  });

  return {
    status: 200,
    body: sections || [],
  };
};
