import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, generateStudyClosedEmail, wrapInEmailLayout } from '../../services/email-service'

const inputSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  studyId: z.string().uuid().optional(),
  originalStudyId: z.string().uuid().optional(),
  metadata: z.any().optional(),
})

export const config = {
  name: 'SendNotification',
  description: 'Handle sending notifications to users (email and in-app)',
  triggers: [{
    type: 'queue',
    topic: 'notification',
    input: inputSchema as any,
  }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger }: EventHandlerContext) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Sending notification to user ${data.userId}: ${data.type}`)

  try {
    const { error: insertError } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        study_id: data.studyId || null,
        metadata: data.metadata || {},
        read: false,
      })

    if (insertError) {
      // If notifications table doesn't exist, just log and continue
      if (insertError.code === '42P01') {
        logger.info('Notifications table does not exist, skipping in-app notification')
      } else {
        logger.warn('Failed to store in-app notification', { error: insertError })
      }
    } else {
      logger.info(`In-app notification stored for user ${data.userId}`)
    }

    const emailTypes = ['study-duplication-failed', 'study-auto-closed']
    if (emailTypes.includes(data.type)) {
      const userEmail = await getUserEmail(data.userId)

      if (userEmail) {
        let html: string

        if (data.type === 'study-auto-closed' && data.metadata?.studyTitle) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io'
          const studyUrl = data.studyId
            ? `${baseUrl}/dashboard/studies/${data.studyId}/results`
            : baseUrl
          html = generateStudyClosedEmail(
            data.metadata.studyTitle,
            data.metadata.reason || 'manual',
            data.metadata.totalResponses || 0,
            studyUrl
          )
        } else {
          html = wrapInEmailLayout(
            `<h2>${data.title}</h2><p>${data.message}</p>`,
            data.title
          )
        }

        const result = await sendEmail({
          to: userEmail,
          subject: data.title,
          html,
          studyId: data.studyId,
        })

        if (result.success) {
          logger.info(`Email notification sent for ${data.type}`, { emailId: result.id })
        } else {
          logger.warn(`Failed to send email notification for ${data.type}`, {
            error: result.error,
          })
        }
      } else {
        logger.warn('Could not get user email for notification', { userId: data.userId })
      }
    }
  } catch (error) {
    logger.error('Error sending notification', { error, userId: data.userId, type: data.type })
  }
}
