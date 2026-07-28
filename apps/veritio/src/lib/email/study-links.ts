/**
 * Canonical app links used in outbound email.
 *
 * Study results live at /projects/:projectId/studies/:studyId/results. The
 * "(dashboard)" folder is a Next.js route group, so it never appears in the
 * URL: emails that linked to /dashboard/studies/:studyId/results resolved to
 * the not-found page. Build every emailed link through here.
 */

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io').replace(/\/+$/, '')
}

export function buildStudyResultsUrl(
  projectId: string | null | undefined,
  studyId: string
): string {
  const baseUrl = getAppBaseUrl()

  // A study row without a project can't produce a results URL. Send the
  // recipient to their studies list rather than to a link that 404s.
  if (!projectId) return `${baseUrl}/studies`

  return `${baseUrl}/projects/${projectId}/studies/${studyId}/results`
}
