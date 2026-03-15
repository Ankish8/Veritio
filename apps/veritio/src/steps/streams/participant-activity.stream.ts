import { StreamConfig } from 'motia'
import { z } from 'zod'

export const participantActivitySchema = z.object({
  id: z.string(),
  studyId: z.string(),
  event: z.enum([
    'participant-started',
    'participant-completed',
    'participant-abandoned',
    'participant-disconnected',
    'response-submitted',
    'study-closed',
  ]),
  participantId: z.string().optional(),
  completedCount: z.number().optional(),
  inProgressCount: z.number().optional(),
  abandonedCount: z.number().optional(),
  reason: z.string().optional(),
  timestamp: z.string(),
  metadata: z.any().optional(),
})

export type ParticipantActivity = z.infer<typeof participantActivitySchema>

export const config: StreamConfig = {
  name: 'participantActivity',
  schema: participantActivitySchema as any,
  baseConfig: { storageType: 'default' },

  onJoin: async (_subscription: any, _context: any, authContext: any) => {
    return { unauthorized: !authContext?.userId }
  },

  onLeave: async (subscription: any, context: any, authContext: any) => {
    if (!authContext?.userId) return
    // Broadcast participant disconnect event so dashboard can update in-progress counts
    try {
      await context.streams.participantActivity.send(
        { groupId: subscription.groupId },
        {
          type: 'event',
          data: {
            id: `disconnect-${authContext.userId}-${Date.now()}`,
            studyId: subscription.groupId,
            event: 'participant-disconnected',
            timestamp: new Date().toISOString(),
          },
        }
      )
    } catch {
      // Best-effort: don't fail on disconnect cleanup
    }
  },
}
