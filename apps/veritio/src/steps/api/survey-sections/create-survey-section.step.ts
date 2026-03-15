import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { createSurveySection } from '../../../services/survey-sections-service';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  description: z.string().optional(),
  position: z.number().optional(),
  parent_section: z.enum(['survey', 'pre_study', 'post_study']).optional(),
  is_visible: z.boolean().optional(),
});

const responseSchema = z.object({
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

export const config = {
  name: 'CreateSurveySection',
  description: 'Create a new custom section for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/sections',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['survey-section-created'],
  flows: ['survey-sections'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);
  const body = bodySchema.parse(req.body);

  logger.info('Creating survey section', { userId, studyId: params.studyId, name: body.name });

  const supabase = getMotiaSupabaseClient();
  const { data: section, error } = await createSurveySection(supabase, params.studyId, body);

  if (error) {
    logger.error('Failed to create survey section', {
      userId,
      studyId: params.studyId,
      error: error.message,
    });

    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return {
        status: 400,
        body: { error: 'A section with this name already exists' },
      };
    }

    return {
      status: 500,
      body: { error: error.message },
    };
  }

  logger.info('Survey section created successfully', {
    userId,
    studyId: params.studyId,
    sectionId: section?.id,
  });

  enqueue({
    topic: 'survey-section-created',
    data: {
      resourceType: 'survey-section',
      action: 'create',
      userId,
      studyId: params.studyId,
      sectionId: section?.id,
    },
  });

  return {
    status: 201,
    body: section,
  };
};
