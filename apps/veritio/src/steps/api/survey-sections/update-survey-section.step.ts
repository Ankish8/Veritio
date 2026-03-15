import type { StepConfig } from 'motia';
import { z } from 'zod';
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware';
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client';
import { updateSurveySection } from '../../../services/survey-sections-service';

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  sectionId: z.string().uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  position: z.number().optional(),
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
  name: 'UpdateSurveySection',
  description: 'Update a custom section',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/sections/:sectionId',
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
  enqueues: ['survey-section-updated'],
  flows: ['survey-sections'],
} satisfies StepConfig;

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string;
  const params = paramsSchema.parse(req.pathParams);
  const body = bodySchema.parse(req.body);

  logger.info('Updating survey section', {
    userId,
    studyId: params.studyId,
    sectionId: params.sectionId,
  });

  const supabase = getMotiaSupabaseClient();
  const { data: section, error } = await updateSurveySection(supabase, params.sectionId, body);

  if (error) {
    logger.error('Failed to update survey section', {
      userId,
      studyId: params.studyId,
      sectionId: params.sectionId,
      error: error.message,
    });

    if (error.message.includes('not found') || error.message.includes('No rows')) {
      return {
        status: 404,
        body: { error: 'Section not found' },
      };
    }

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

  logger.info('Survey section updated successfully', {
    userId,
    studyId: params.studyId,
    sectionId: params.sectionId,
  });

  enqueue({
    topic: 'survey-section-updated',
    data: {
      resourceType: 'survey-section',
      action: 'update',
      userId,
      studyId: params.studyId,
      sectionId: params.sectionId,
    },
  });

  return {
    status: 200,
    body: section,
  };
};
