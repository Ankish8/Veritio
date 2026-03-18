import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../middlewares/rate-limit/rate-limit.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  generateRenderToken,
  captureMultipleCharts,
  buildCaptureOptions,
  assemblePDF,
  createPDFFilename,
  closeBrowser,
} from '../../../services/pdf/index'
import { getSectionById } from '../../../lib/export/pdf/section-registry'

export const config = {
  name: 'ExportPDF',
  description: 'Generate PDF report for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/export/pdf',
    middleware: [
    authMiddleware,
    rateLimitMiddleware({ tier: 'authenticated-heavy' }),
    requireStudyEditor('studyId'),
    errorHandlerMiddleware,
  ],
  }],
  enqueues: ['pdf-exported'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  sections: z.array(z.string()),
  options: z
    .object({
      includeCoverPage: z.boolean().optional(),
      includeTableOfContents: z.boolean().optional(),
    })
    .optional(),
})

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext
) => {
  try {
    const paramsValidation = validateRequest(paramsSchema, req.pathParams, logger)
    if (!paramsValidation.success) return paramsValidation.response
    const params = paramsValidation.data

    const bodyValidation = validateRequest(bodySchema, req.body, logger)
    if (!bodyValidation.success) return bodyValidation.response
    const body = bodyValidation.data

    // Check auth
    const userId = req.headers['x-user-id'] as string
    if (!userId) {
      return {
        status: 401,
        body: { success: false, error: 'Unauthorized' },
      }
    }

    const supabase = getMotiaSupabaseClient()

    // Get study details
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, title, description, study_type, status')
      .eq('id', params.studyId)
      .single()

    if (studyError || !study) {
      return {
        status: 404,
        body: { success: false, error: 'Study not found' },
      }
    }

    // Get participant stats
    const { count: totalParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', params.studyId)

    const { count: completedParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', params.studyId)
      .eq('status', 'completed')

    const participantCount = totalParticipants || 0
    const completedCount = completedParticipants || 0
    const completionRate =
      participantCount > 0 ? Math.round((completedCount / participantCount) * 100) : 0

    // Generate render token
    const token = await generateRenderToken({
      studyId: params.studyId,
      userId,
      sections: body.sections,
      studyType: study.study_type as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click',
    })

    // Build capture URLs for each section
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
    const captureOptions = await buildSectionCaptureUrls(
      baseUrl,
      params.studyId,
      body.sections,
      token,
      study.study_type as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click',
      supabase
    )

    // Only capture if there are non-overview sections
    let capturedImages: Awaited<ReturnType<typeof captureMultipleCharts>> = []

    if (captureOptions.length > 0) {
      capturedImages = await captureMultipleCharts(captureOptions)
    }

    // Assemble PDF
    const pdfBuffer = await assemblePDF(capturedImages, {
      studyId: params.studyId,
      studyTitle: study.title,
      studyType: study.study_type as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click',
      studyDescription: study.description,
      participantCount,
      completedCount,
      completionRate,
      includeCoverPage: body.options?.includeCoverPage ?? true,
      includeTableOfContents: body.options?.includeTableOfContents ?? true,
      branding: {
        generatedDate: new Date(),
      },
    })

    // Fire-and-forget: don't block response for activity logging
    enqueue({
      topic: 'pdf-exported',
      data: {
        resourceType: 'study',
        action: 'pdf-export',
        studyId: params.studyId,
        sections: body.sections,
      },
    }).catch(() => {})

    return {
      status: 200,
      body: {
        success: true,
        pdf: pdfBuffer.toString('base64'),
        filename: createPDFFilename(study.title),
      },
    }
  } catch (error) {
    console.error('PDF generation failed:', error)
    return {
      status: 500,
      body: {
        success: false,
        error: 'PDF generation failed. Please try again.',
      },
    }
  } finally {
    // Always close the browser
    await closeBrowser()
  }
}

/**
 * Build capture URLs for each section, expanding dynamic sections
 */
async function buildSectionCaptureUrls(
  baseUrl: string,
  studyId: string,
  sections: string[],
  token: string,
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click',
  supabase: ReturnType<typeof getMotiaSupabaseClient>
) {
  const captureOptions: ReturnType<typeof buildCaptureOptions>[] = []

  for (const sectionId of sections) {
    const section = getSectionById(studyType, sectionId)
    if (!section) continue

    // Skip overview - it's rendered directly in PDF, not captured
    if (sectionId === 'overview') continue

    if (section.isDynamic) {
      // Handle dynamic sections
      if (sectionId === 'responses' || sectionId === 'questionnaire') {
        // Get all flow questions
        const { data: questions } = await supabase
          .from('study_flow_questions')
          .select('id')
          .eq('study_id', studyId)

        for (const question of questions || []) {
          captureOptions.push(
            buildCaptureOptions(baseUrl, studyId, `responses/${question.id}`, token)
          )
        }
      } else if (sectionId === 'pietree') {
        // Get all tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('study_id', studyId)

        for (const task of tasks || []) {
          captureOptions.push(
            buildCaptureOptions(baseUrl, studyId, `pietree/${task.id}`, token)
          )
        }
      }
    } else {
      // Static sections - single capture
      captureOptions.push(buildCaptureOptions(baseUrl, studyId, sectionId, token))
    }
  }

  return captureOptions
}
