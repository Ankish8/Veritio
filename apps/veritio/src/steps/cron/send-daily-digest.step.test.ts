import { beforeEach, describe, expect, it, vi } from 'vitest'

interface DigestRow {
  id: string
  study_id: string
  user_id: string | null
  responses_count: number
}

interface StudyRow {
  id: string
  title: string
  project_id: string | null
  user_id: string | null
  email_notification_settings: unknown
}

let digestRows: DigestRow[] = []
let studyRows: StudyRow[] = []
let completedCounts: Record<string, number> = {}
let deletedIds: string[] = []

vi.mock('../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => ({
    from(table: string) {
      if (table === 'study_digest_queue') {
        return {
          select: () => ({
            gt: async () => ({ data: digestRows, error: null }),
          }),
          delete: () => ({
            in: async (_column: string, ids: string[]) => {
              deletedIds.push(...ids)
              return { error: null }
            },
          }),
        }
      }

      if (table === 'studies') {
        return {
          select: () => ({
            in: async (_column: string, ids: string[]) => ({
              data: studyRows.filter((study) => ids.includes(study.id)),
              error: null,
            }),
          }),
        }
      }

      if (table === 'participants') {
        return {
          select: () => ({
            eq: (_column: string, studyId: string) => ({
              eq: async () => ({ count: completedCounts[studyId] ?? 0 }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }),
}))

const getUserEmail = vi.fn()
vi.mock('../../services/user-service', () => ({
  getUserEmail: (userId: string) => getUserEmail(userId),
}))

const sendEmail = vi.fn()
vi.mock('../../services/email-service', () => ({
  sendEmail: (options: unknown) => sendEmail(options),
  generateDailyDigestEmail: (studies: unknown) => JSON.stringify(studies),
  generateStudyClosedEmail: () => '<html></html>',
}))

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const digestOn = {
  enabled: true,
  triggers: { dailyDigest: true },
}

const digestOff = {
  enabled: true,
  triggers: { dailyDigest: false },
}

async function runCron() {
  const { handler } = await import('./send-daily-digest.step')
  await handler(undefined, { logger } as never)
}

describe('daily digest cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deletedIds = []
    digestRows = []
    studyRows = []
    completedCounts = {}
    sendEmail.mockResolvedValue({ success: true, id: 'email-1' })
    getUserEmail.mockResolvedValue('researcher@example.com')
  })

  it('sends one email per researcher covering all of their studies', async () => {
    digestRows = [
      { id: 'row-a', study_id: 'study-a', user_id: 'user-1', responses_count: 3 },
      { id: 'row-b', study_id: 'study-b', user_id: 'user-1', responses_count: 7 },
    ]
    studyRows = [
      { id: 'study-a', title: 'Study A', project_id: 'proj-1', user_id: 'user-1', email_notification_settings: digestOn },
      { id: 'study-b', title: 'Study B', project_id: 'proj-1', user_id: 'user-1', email_notification_settings: digestOn },
    ]
    completedCounts = { 'study-a': 30, 'study-b': 70 }

    await runCron()

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [options] = sendEmail.mock.calls[0]
    expect(options.to).toBe('researcher@example.com')
    // No studyId: the digest must not compete for a single study's hourly budget.
    expect(options.studyId).toBeUndefined()
    expect(JSON.parse(options.html)).toEqual([
      {
        title: 'Study A',
        newResponses: 3,
        totalResponses: 30,
        url: expect.stringContaining('/projects/proj-1/studies/study-a/results'),
      },
      {
        title: 'Study B',
        newResponses: 7,
        totalResponses: 70,
        url: expect.stringContaining('/projects/proj-1/studies/study-b/results'),
      },
    ])
    expect(deletedIds.sort()).toEqual(['row-a', 'row-b'])
  })

  it('drops queued rows whose digest toggle was turned off, without emailing', async () => {
    digestRows = [{ id: 'row-a', study_id: 'study-a', user_id: 'user-1', responses_count: 3 }]
    studyRows = [
      { id: 'study-a', title: 'Study A', project_id: 'proj-1', user_id: 'user-1', email_notification_settings: digestOff },
    ]

    await runCron()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(deletedIds).toEqual(['row-a'])
  })

  it('drops rows whose study no longer exists', async () => {
    digestRows = [{ id: 'row-gone', study_id: 'study-gone', user_id: 'user-1', responses_count: 2 }]
    studyRows = []

    await runCron()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(deletedIds).toEqual(['row-gone'])
  })

  it('keeps rows queued when the send fails so the next run retries', async () => {
    sendEmail.mockResolvedValue({ success: false, error: 'Resend down' })
    digestRows = [{ id: 'row-a', study_id: 'study-a', user_id: 'user-1', responses_count: 3 }]
    studyRows = [
      { id: 'study-a', title: 'Study A', project_id: 'proj-1', user_id: 'user-1', email_notification_settings: digestOn },
    ]

    await runCron()

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(deletedIds).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith('Failed to send daily digest', {
      userId: 'user-1',
      error: 'Resend down',
    })
  })

  it('separates recipients so one researcher never sees another study', async () => {
    digestRows = [
      { id: 'row-a', study_id: 'study-a', user_id: 'user-1', responses_count: 1 },
      { id: 'row-b', study_id: 'study-b', user_id: 'user-2', responses_count: 4 },
    ]
    studyRows = [
      { id: 'study-a', title: 'Study A', project_id: 'proj-1', user_id: 'user-1', email_notification_settings: digestOn },
      { id: 'study-b', title: 'Study B', project_id: 'proj-2', user_id: 'user-2', email_notification_settings: digestOn },
    ]

    await runCron()

    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(getUserEmail.mock.calls.map(([userId]) => userId)).toEqual(['user-1', 'user-2'])
    for (const [options] of sendEmail.mock.calls) {
      expect(JSON.parse(options.html)).toHaveLength(1)
    }
  })
})
