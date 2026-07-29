import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * DENY-BY-DEFAULT AUTHORIZATION GUARDRAIL
 *
 * The backend uses the Supabase service_role key, which BYPASSES RLS — so
 * per-endpoint middleware is the only authorization gate. This test fails if any
 * API step whose route contains a resource-id segment lacks an authorization
 * decision. To satisfy it, an endpoint must either:
 *   1. attach a permission middleware (the requireStudy / requireProject / requireOrg /
 *      requireResponse families, requirePanelAccess, or requireSuperadmin), OR
 *   2. run on the participant/public lane (sessionAuthMiddleware / rateLimitMiddleware), OR
 *   3. be listed in REVIEWED_NO_MIDDLEWARE below with a justification (used for
 *      endpoints that enforce access in their service layer or self-scope to the
 *      caller's own user_id).
 *
 * A new id-in-path endpoint that does none of these is a likely IDOR and fails here.
 */

// Resolve the steps/api dir robustly whether vitest runs from the app dir
// (apps/veritio) or the monorepo root.
function resolveApiDir(): string {
  const candidates = [
    join(process.cwd(), 'src', 'steps', 'api'),
    join(process.cwd(), 'apps', 'veritio', 'src', 'steps', 'api'),
  ]
  for (const c of candidates) {
    try {
      if (statSync(c).isDirectory()) return c
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Cannot locate steps/api from cwd ${process.cwd()}`)
}
const API_DIR = resolveApiDir()

const ID_RE =
  /:(studyId|projectId|orgId|organizationId|responseId|noteId|tagId|questionId|commentId|snippetId|recordingId|clipId|segmentId|sectionId|participantId|invitationId|inviteId|reportId|linkId|shareId|categoryId|cardId|nodeId|taskId|abTestId|ruleId|userId|id)\b/
const PROTECTED_RE =
  /require(Org|Project|Study|Response)(Viewer|Editor|Manager|Admin|Owner)|requireSuperadmin|requirePanelAccess/
const PUBLIC_LANE_RE = /sessionAuthMiddleware|rateLimitMiddleware|publicRateLimit/

// Reviewed endpoints that intentionally carry no permission middleware because
// authorization is enforced in their service layer (B), they self-scope to the
// caller's own user_id (A), or they are public participant endpoints keyed by a
// capability (PUBLIC). Verified during the 2026-07 open-source authz audit.
const REVIEWED_NO_MIDDLEWARE = new Set<string>([
  // --- Organizations / invitations / projects / search: service enforces org/project role ---
  'organizations/add-member.step.ts',
  'organizations/delete-organization.step.ts',
  'organizations/get-organization.step.ts',
  'organizations/update-organization.step.ts',
  'organizations/list-members.step.ts',
  'organizations/remove-member.step.ts',
  'organizations/update-member-role.step.ts',
  'invitations/create-invitation.step.ts',
  'invitations/list-invitations.step.ts',
  'invitations/revoke-invitation.step.ts',
  'projects/archive-project.step.ts',
  'projects/get-project.step.ts',
  'projects/restore-project.step.ts',
  'projects/update-project.step.ts',
  'search/quick-search.step.ts',
  'search/search-studies.step.ts',
  // --- Study-scoped resources: service calls getStudyPermission before acting ---
  'studies/get-study.step.ts',
  'studies/generate-public-results-token.step.ts',
  'studies/list-studies.step.ts',
  'study-tags/create-study-tag.step.ts',
  'study-tags/delete-study-tag.step.ts',
  'study-tags/get-study-tags.step.ts',
  'study-tags/list-study-tags.step.ts',
  'study-tags/set-study-tags.step.ts',
  'study-tags/update-study-tag.step.ts',
  'comments/create-comment.step.ts',
  'comments/delete-comment.step.ts',
  'comments/list-comments.step.ts',
  'comments/update-comment.step.ts',
  'share-links/create-share-link.step.ts',
  'share-links/list-share-links.step.ts',
  'share-links/revoke-share-link.step.ts',
  'analytics/get-link-analytics.step.ts',
  'section-notes/delete-section-note.step.ts',
  'question-notes/delete-question-note.step.ts',
  // --- Self-scoped to the caller's own user_id (cross-user access impossible) ---
  'assistant/delete-conversation.step.ts',
  'assistant/messages.step.ts',
  'analytics/get-widget-analytics.step.ts',
  'studies/get-panel-participations.step.ts',
  'studies/invite-participants.step.ts',
  'studies/send-invitations.step.ts',
  'studies/update-standardizations.step.ts',
  // --- Public participant endpoints (keyed by a snippet/recording capability) ---
  'snippet/get-snippet-tasks.step.ts',
  'live-website/serve-snippet.step.ts',
  'recordings/finalize-beacon.step.ts',
])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (entry.endsWith('.step.ts')) out.push(p)
  }
  return out
}

interface StepInfo {
  rel: string
  path: string
  protected: boolean
  publicLane: boolean
  allowlisted: boolean
}

function collectIdInPathSteps(): StepInfo[] {
  const steps: StepInfo[] = []
  for (const file of walk(API_DIR)) {
    const src = readFileSync(file, 'utf8')
    if (!/type:\s*['"]http['"]/.test(src)) continue
    const pathMatch = src.match(/path:\s*['"]([^'"]+)['"]/)
    if (!pathMatch || !ID_RE.test(pathMatch[1])) continue
    const rel = file.slice(API_DIR.length + 1)
    steps.push({
      rel,
      path: pathMatch[1],
      protected: PROTECTED_RE.test(src),
      publicLane: PUBLIC_LANE_RE.test(src),
      allowlisted: REVIEWED_NO_MIDDLEWARE.has(rel),
    })
  }
  return steps
}

describe('authorization guardrail', () => {
  const steps = collectIdInPathSteps()

  it('finds resource-id API endpoints to check', () => {
    expect(steps.length).toBeGreaterThan(50)
  })

  it('every resource-id endpoint has an authorization decision (middleware, public lane, or reviewed allowlist)', () => {
    const unaccounted = steps
      .filter((s) => !s.protected && !s.publicLane && !s.allowlisted)
      .map((s) => `${s.rel}  (path: ${s.path})`)
    expect(
      unaccounted,
      `\nThese id-in-path endpoints have no permission middleware and are not on the reviewed allowlist.\n` +
        `Add a require*/requirePanelAccess middleware, or (if access is enforced in the service layer or ` +
        `the endpoint is public) add the file to REVIEWED_NO_MIDDLEWARE with a justification:\n  ` +
        unaccounted.join('\n  '),
    ).toEqual([])
  })
})
