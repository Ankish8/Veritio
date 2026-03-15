import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { executeAction, getComposioConnection, isComposioConfigured } from '../../../services/composio/index'
import { createPanelTagService, createPanelTagAssignmentService } from '../../../services/panel/index'
import type { PanelStudyParticipationInsert } from '../../../lib/supabase/panel-types'
import { errorResponse } from '../../../lib/response-helpers'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const bodySchema = z.object({
  participant_ids: z.array(z.string().uuid()).min(1).max(1000),
  toolkit: z.enum(['gmail', 'outlook']),
  email_subject: z.string().min(1),
  email_body: z.string().min(1),
  tag_name: z.string().optional(),
})

// Map toolkit to Composio action name
const TOOLKIT_SEND_ACTIONS: Record<string, string> = {
  gmail: 'GMAIL_SEND_EMAIL',
  outlook: 'OUTLOOK_SEND_EMAIL',
}

export const config = {
  name: 'SendStudyInvitations',
  description: 'Send email invitations to panel participants via Composio and mark as invited',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/send-invitations',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-participants-invited'],
  flows: ['panel', 'studies'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)

  logger.info('Sending study invitations', {
    userId,
    studyId,
    participantCount: body.participant_ids.length,
    toolkit: body.toolkit,
  })

  const supabase = getMotiaSupabaseClient()

  try {
    // 1. Validate study ownership
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, title, status')
      .eq('id', studyId)
      .eq('user_id', userId)
      .single()

    if (studyError || !study) {
      return errorResponse.notFound('Study not found')
    }

    // 2. Check Composio is configured and user has connection
    if (!isComposioConfigured()) {
      return errorResponse.badRequest('Email integrations are not configured. Please set up Composio.')
    }

    const { data: connection } = await getComposioConnection(supabase, userId, body.toolkit)
    if (!connection) {
      return errorResponse.badRequest(`${body.toolkit} is not connected. Please connect it first.`)
    }

    // 3. Fetch participant details (emails)
    const { data: participants, error: participantsError } = await (supabase as any)
      .from('panel_participants')
      .select('id, email, first_name')
      .eq('user_id', userId)
      .in('id', body.participant_ids)

    if (participantsError) throw participantsError

    const validParticipants = participants || []
    if (validParticipants.length === 0) {
      return errorResponse.badRequest('No valid participants found')
    }

    // 4. Check for already email-invited participants (skip only those who were sent an email invite)
    const { data: existing } = await (supabase as any)
      .from('panel_study_participations')
      .select('panel_participant_id')
      .eq('study_id', studyId)
      .eq('source', 'email')
      .in('panel_participant_id', validParticipants.map((p: any) => p.id))

    const existingIds = new Set(existing?.map((e: any) => e.panel_participant_id) || [])
    const newParticipants = validParticipants.filter((p: any) => !existingIds.has(p.id))

    if (newParticipants.length === 0) {
      return {
        status: 200,
        body: { invited: 0, emailed: 0, failed: 0, skipped: validParticipants.length, errors: [] },
      }
    }

    // 5. Send emails via Composio
    const actionName = TOOLKIT_SEND_ACTIONS[body.toolkit]
    const errors: Array<{ email: string; error: string }> = []
    let emailed = 0

    for (const participant of newParticipants) {
      const email = (participant as any).email
      const firstName = (participant as any).first_name

      // Personalize body - replace {first_name} if present
      const personalizedBody = firstName
        ? body.email_body.replace(/\{first_name\}/g, firstName)
        : body.email_body.replace(/\{first_name\}/g, 'there')

      try {
        const { error: sendError } = await executeAction(
          userId,
          actionName,
          {
            recipient_email: email,
            subject: body.email_subject,
            body: personalizedBody,
          },
          connection.composio_account_id ?? undefined,
        )

        if (sendError) {
          errors.push({ email, error: sendError.message })
          logger.warn('Failed to send email to participant', { email, error: sendError.message })
        } else {
          emailed++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ email, error: msg })
        logger.warn('Failed to send email to participant', { email, error: msg })
      }
    }

    // 6. Insert panel_study_participations for ALL new participants (even if email failed)
    const now = new Date().toISOString()
    const insertData: PanelStudyParticipationInsert[] = newParticipants.map((p: any) => ({
      panel_participant_id: p.id,
      study_id: studyId,
      status: 'invited' as const,
      source: 'email' as const,
    }))

    const { error: insertError } = await (supabase as any)
      .from('panel_study_participations')
      .insert(insertData)
      .select('id')

    if (insertError) {
      logger.error('Failed to insert study participations', { error: insertError.message })
    }

    // Update last_contacted_at
    await (supabase as any)
      .from('panel_participants')
      .update({ last_contacted_at: now })
      .in('id', newParticipants.map((p: any) => p.id))

    // 7. Auto-assign study tag if provided
    if (body.tag_name) {
      try {
        const tagService = createPanelTagService(supabase)
        const tag = await tagService.getOrCreate(userId, body.tag_name, '#8b5cf6')

        const tagAssignmentService = createPanelTagAssignmentService(supabase)
        await tagAssignmentService.bulkAssignTag(
          newParticipants.map((p: any) => p.id),
          tag.id,
          'study',
        )

        logger.info('Auto-assigned study tag', { tagName: body.tag_name, tagId: tag.id, count: newParticipants.length })
      } catch (tagError) {
        logger.warn('Failed to auto-assign study tag', {
          error: tagError instanceof Error ? tagError.message : 'Unknown error',
        })
        // Non-fatal — don't fail the whole request
      }
    }

    // 8. Emit event
    enqueue({
      topic: 'panel-participants-invited',
      data: {
        userId,
        studyId,
        studyTitle: study.title,
        participantIds: newParticipants.map((p: any) => p.id),
        count: newParticipants.length,
        source: 'email',
        emailed,
      },
    }).catch(() => {})

    logger.info('Study invitations sent', {
      userId,
      studyId,
      invited: newParticipants.length,
      emailed,
      failed: errors.length,
      skipped: existingIds.size,
    })

    return {
      status: 200,
      body: {
        invited: newParticipants.length,
        emailed,
        failed: errors.length,
        skipped: existingIds.size,
        errors: errors.length > 0 ? errors : undefined,
      },
    }
  } catch (error) {
    logger.error('Failed to send study invitations', {
      userId,
      studyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to send invitations' },
    }
  }
}
