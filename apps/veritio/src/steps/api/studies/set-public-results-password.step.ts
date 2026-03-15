import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import bcrypt from 'bcryptjs'

const bodySchema = z.object({
  password: z.string().nullable(),
})

export const config = {
  name: 'SetPublicResultsPassword',
  description: 'Set or clear password protection for public results sharing',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/public-results/password',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>, { studyId: string }>,
  { logger }: ApiHandlerContext,
) => {
  const { studyId } = req.pathParams
  const { password } = bodySchema.parse(req.body)

  const supabase = getMotiaSupabaseClient()

  // Fetch current sharing_settings
  const { data: study, error: fetchError } = await supabase
    .from('studies')
    .select('sharing_settings')
    .eq('id', studyId)
    .single()

  if (fetchError || !study) {
    logger.error('Failed to fetch study', { studyId, error: fetchError?.message })
    return { status: 404, body: { error: 'Study not found' } }
  }

  const sharingSettings = (study.sharing_settings as Record<string, any>) || {}
  const publicResults = sharingSettings.publicResults || {}

  // Hash password or clear it
  let passwordHash: string | null = null
  if (password) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  // Update sharing_settings: set passwordHash, clear plain password
  const updatedPublicResults = {
    ...publicResults,
    passwordHash,
    password: undefined,
  }
  // Remove the undefined password key
  delete updatedPublicResults.password

  const updatedSharingSettings = {
    ...sharingSettings,
    publicResults: updatedPublicResults,
  }

  const { error: updateError } = await supabase
    .from('studies')
    .update({ sharing_settings: updatedSharingSettings })
    .eq('id', studyId)

  if (updateError) {
    logger.error('Failed to update password', { studyId, error: updateError.message })
    return { status: 500, body: { error: 'Failed to update password' } }
  }

  logger.info('Public results password updated', {
    studyId,
    hasPassword: !!password,
  })

  return { status: 200, body: { success: true } }
}
