import type { StepConfig } from 'motia'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import {
  RECORDING_RETENTION_DAYS,
  WARNING_DAYS_BEFORE_DELETE,
  daysSince,
  isStudyInactive,
} from '../../lib/retention-policy'
import { throttledMapSettled } from '../../lib/utils/async'

export const config = {
  name: 'CleanupInactiveRecordings',
  description: 'Delete recordings from inactive studies after retention period',
  triggers: [{ type: 'cron', expression: '0 0 3 * * * *' }],
  enqueues: ['notification', 'recordings-deleted'],
  flows: ['recording-management', 'study-lifecycle'],
} satisfies StepConfig

const STUDY_CONCURRENCY = 5

interface InactiveStudy {
  id: string
  title: string
  user_id: string
  last_response_at: string | null
  last_opened_at: string | null
  retention_warning_sent_at: string | null
  recordings_deleted_at: string | null
}

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

function getR2Bucket(): string {
  return process.env.R2_BUCKET_NAME || 'veritio-recordings'
}

function isStudyInactiveCheck(study: InactiveStudy): boolean {
  return isStudyInactive(study.last_response_at, study.last_opened_at)
}

function getInactivityStartDate(study: InactiveStudy): Date {
  const responseDate = study.last_response_at ? new Date(study.last_response_at) : new Date(0)
  const viewedDate = study.last_opened_at ? new Date(study.last_opened_at) : new Date(0)
  return responseDate > viewedDate ? responseDate : viewedDate
}

function getDaysUntilDeletion(study: InactiveStudy): number {
  const inactivityStart = getInactivityStartDate(study)
  const deletionDate = new Date(inactivityStart)
  deletionDate.setDate(deletionDate.getDate() + RECORDING_RETENTION_DAYS)

  const now = new Date()
  const diffMs = deletionDate.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

async function deleteStudyRecordingsFromR2(
  studyId: string,
  logger: EventHandlerContext['logger']
): Promise<{ deletedCount: number; freedBytes: number }> {
  const client = getR2Client()
  if (!client) {
    logger.warn('R2 not configured, skipping R2 deletion', { studyId })
    return { deletedCount: 0, freedBytes: 0 }
  }

  const bucket = getR2Bucket()
  const prefix = `${studyId}/recordings/`

  let deletedCount = 0
  let freedBytes = 0
  let continuationToken: string | undefined

  try {
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const response = await client.send(listCommand)

      if (response.Contents && response.Contents.length > 0) {
        for (const obj of response.Contents) {
          freedBytes += obj.Size || 0
        }

        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: response.Contents.map((obj) => ({ Key: obj.Key })),
            Quiet: true,
          },
        })

        await client.send(deleteCommand)
        deletedCount += response.Contents.length
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    logger.info('Deleted recordings from R2', { studyId, deletedCount, freedBytes })
  } catch (error) {
    logger.error('Failed to delete recordings from R2', { studyId, error })
    throw error
  }

  return { deletedCount, freedBytes }
}

export const handler = async (_input: unknown, { logger, enqueue }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Starting inactive recordings cleanup')

  try {
    const { data: studies, error: fetchError } = await supabase
      .from('studies')
      .select('id, title, user_id, last_response_at, last_opened_at, retention_warning_sent_at, recordings_deleted_at')
      .is('recordings_deleted_at', null) // Only studies with recordings still present
      .in('status', ['active', 'completed', 'paused']) as unknown as {
        data: InactiveStudy[] | null
        error: Error | null
      }

    if (fetchError) {
      logger.error('Failed to fetch studies', { error: fetchError })
      return
    }

    if (!studies || studies.length === 0) {
      logger.info('No studies to process')
      return
    }

    const studiesToDelete: InactiveStudy[] = []
    const studiesToWarn: InactiveStudy[] = []

    for (const study of studies) {
      if (!isStudyInactiveCheck(study)) {
        continue
      }

      const daysUntilDeletion = getDaysUntilDeletion(study)

      if (daysUntilDeletion <= 0) {
        studiesToDelete.push(study)
      } else if (
        daysUntilDeletion <= WARNING_DAYS_BEFORE_DELETE &&
        !study.retention_warning_sent_at
      ) {
        studiesToWarn.push(study)
      }
    }

    logger.info('Classified studies', {
      toDelete: studiesToDelete.length,
      toWarn: studiesToWarn.length,
    })

    const deletionResults = await throttledMapSettled(
      studiesToDelete,
      async (study) => {
        logger.info('Deleting recordings for inactive study', {
          studyId: study.id,
          title: study.title,
          daysInactive: daysSince(study.last_response_at),
        })

        const { deletedCount, freedBytes } = await deleteStudyRecordingsFromR2(study.id, logger)

        const { error: dbDeleteError } = await supabase
          .from('recordings')
          .delete()
          .eq('study_id', study.id)

        if (dbDeleteError) {
          throw new Error(`Failed to delete from database: ${dbDeleteError.message}`)
        }

        enqueue({
          topic: 'recordings-deleted',
          data: {
            studyId: study.id,
            userId: study.user_id,
            deletedCount,
            freedBytes,
            reason: 'inactive_retention',
          },
        }).catch(() => {})

        enqueue({
          topic: 'notification',
          data: {
            userId: study.user_id,
            type: 'recordings-deleted',
            title: 'Recordings Deleted',
            message: `Session recordings for "${study.title}" have been automatically deleted due to inactivity. Study data and analytics are preserved.`,
            studyId: study.id,
          },
        }).catch(() => {})

        return { studyId: study.id, freedBytes }
      },
      STUDY_CONCURRENCY
    )

    for (const failure of deletionResults.failures) {
      logger.error('Failed to delete study recordings', {
        studyId: failure.item.id,
        error: failure.error.message,
      })
    }

    const deletedStudyIds = deletionResults.successes.map((s) => s.item.id)
    if (deletedStudyIds.length > 0) {
      await supabase
        .from('studies')
        .update({ recordings_deleted_at: new Date().toISOString() } as any)
        .in('id', deletedStudyIds)
    }

    const totalFreedBytes = deletionResults.successes.reduce(
      (sum, s) => sum + s.result.freedBytes,
      0
    )

    const warningResults = await throttledMapSettled(
      studiesToWarn,
      async (study) => {
        const daysUntilDeletion = getDaysUntilDeletion(study)

        logger.info('Sending retention warning', {
          studyId: study.id,
          title: study.title,
          daysUntilDeletion,
        })

        enqueue({
          topic: 'notification',
          data: {
            userId: study.user_id,
            type: 'retention-warning',
            title: 'Recording Deletion Warning',
            message: `Session recordings for "${study.title}" will be automatically deleted in ${daysUntilDeletion} days due to inactivity. View the study to reset the retention timer. Study data and analytics will be preserved.`,
            studyId: study.id,
            urgent: true,
          },
        }).catch(() => {})

        return study.id
      },
      STUDY_CONCURRENCY
    )

    const warnedStudyIds = warningResults.successes.map((s) => s.item.id)
    if (warnedStudyIds.length > 0) {
      await supabase
        .from('studies')
        .update({ retention_warning_sent_at: new Date().toISOString() } as any)
        .in('id', warnedStudyIds)
    }

    logger.info('Inactive recordings cleanup completed', {
      warningsSent: warningResults.successes.length,
      warningsFailed: warningResults.failures.length,
      studiesDeleted: deletionResults.successes.length,
      deletionsFailed: deletionResults.failures.length,
      totalFreedBytes,
      totalFreedMB: (totalFreedBytes / (1024 * 1024)).toFixed(2),
    })
  } catch (error) {
    logger.error('Error in inactive recordings cleanup', { error })
  }
}
