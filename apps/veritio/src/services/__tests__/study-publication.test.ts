import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const capture = vi.hoisted(() => vi.fn())

vi.mock('../permission-service', () => ({
  checkStudyPermission: vi.fn(async () => ({ allowed: true, userRole: 'owner', error: null })),
  getStudyPermission: vi.fn(),
  getStudyPermissionsBatch: vi.fn(),
  checkProjectPermission: vi.fn(),
  permissionDeniedError: vi.fn(() => new Error('Permission denied')),
}))

vi.mock('../entitlements-service', () => ({
  assertCanActivateStudy: vi.fn(async () => undefined),
}))

vi.mock('../../lib/posthog', () => ({
  getPostHogClient: () => ({ capture }),
}))

import { publishStudy, updateStudy, type StudyPublicationSource } from '../study-service'

function createSupabase() {
  const row: Record<string, unknown> = {
    id: 'study-1',
    project_id: 'project-1',
    organization_id: null,
    user_id: 'user-1',
    study_type: 'survey',
    title: 'First study',
    status: 'draft',
    launched_at: null,
  }

  function executeUpdate(updates: Record<string, unknown>, requireUnpublished: boolean) {
    if (requireUnpublished && row.launched_at !== null) {
      return { data: null, error: null }
    }
    Object.assign(row, updates)
    return { data: { ...row }, error: null }
  }

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { ...row }, error: null })),
        })),
      })),
      update: vi.fn((updates: Record<string, unknown>) => {
        const afterEq = {
          is: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => executeUpdate(updates, true)),
            })),
          })),
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => executeUpdate(updates, false)),
            single: vi.fn(async () => executeUpdate(updates, false)),
          })),
        }
        return { eq: vi.fn(() => afterEq) }
      }),
    })),
    row,
  }
}

describe('study first publication', () => {
  beforeEach(() => capture.mockClear())

  it.each<StudyPublicationSource>(['dashboard', 'rest_api', 'mcp'])(
    'emits once for the first %s publication and never for a resume',
    async (source) => {
      const supabase = createSupabase()

      const first = await publishStudy(supabase as never, 'study-1', 'user-1', source)
      expect(first.error).toBeNull()
      expect(first.firstPublished).toBe(true)
      expect(capture).toHaveBeenCalledTimes(1)
      expect(capture).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'study_first_published',
          properties: expect.objectContaining({
            $insert_id: 'study-first-published:study-1',
            source,
          }),
        }),
      )

      await updateStudy(supabase as never, 'study-1', 'user-1', { status: 'paused' })
      const resumed = await publishStudy(supabase as never, 'study-1', 'user-1', source)
      expect(resumed.firstPublished).toBe(false)
      expect(capture).toHaveBeenCalledTimes(1)
      expect(supabase.row.launched_at).toEqual(expect.any(String))
    },
  )

  it('routes each external launch transport through the publication operation', async () => {
    const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const [dashboard, rest, mcp] = await Promise.all([
      readFile(join(sourceRoot, 'steps/api/studies/update-study.step.ts'), 'utf8'),
      readFile(join(sourceRoot, 'api/v1/routes/studies.ts'), 'utf8'),
      readFile(join(sourceRoot, 'mcp/tools/studies.ts'), 'utf8'),
    ])

    expect(dashboard).toContain("publishStudy(supabase, studyId, userId, 'dashboard')")
    expect(rest).toContain('publishStudy(ctx.supabase as never, id, ctx.userId, "rest_api")')
    expect(mcp).toContain("'mcp',")
  })
})
