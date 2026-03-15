import type { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
  name: 'assistantChat',
  schema: z.object({
    type: z.string(),
    content: z.string().optional(),
    toolName: z.string().optional(),
    description: z.string().optional(),
    result: z.unknown().optional(),
    messageId: z.string().optional(),
    conversationId: z.string().optional(),
    metadata: z.unknown().optional(),
    message: z.string().optional(),
    toolkit: z.string().optional(),
    info: z.unknown().optional(),
    refined: z.string().optional(),
    rationale: z.string().optional(),
  }).passthrough() as any,
  baseConfig: { storageType: 'default' },

  // Auth is enforced at the HTTP layer (authMiddleware on chat/refine endpoints).
  // The WS subscription uses a random ephemeral streamId only known to the
  // authenticated HTTP client, so no additional auth check is needed here.
  onJoin: async () => {
    return { unauthorized: false }
  },

  onLeave: async (subscription: any, context: any) => {
    // Set cancellation flag so in-flight LLM generation can bail out early
    try {
      await context.state.set('assistant-cancel', subscription.groupId, { cancelled: true, at: Date.now() })
    } catch {
      // Best-effort: don't fail on disconnect cleanup
    }
  },
}
