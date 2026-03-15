export const SWR_KEYS_CORE = {
  projects: (organizationId?: string | null) =>
    organizationId ? `/api/projects?organizationId=${organizationId}` : '/api/projects',
  archivedProjects: (organizationId?: string | null) =>
    organizationId ? `/api/projects?archived=true&organizationId=${organizationId}` : '/api/projects?archived=true',
  project: (id: string) => `/api/projects/${id}`,

  projectStudies: (projectId: string) => `/api/projects/${projectId}/studies`,
  study: (id: string) => `/api/studies/${id}`,
  recentStudies: '/api/studies?limit=5',

  dashboard: (organizationId?: string | null) =>
    organizationId ? `/api/dashboard/stats?organizationId=${organizationId}` : '/api/dashboard/stats',
} as const

export type SWRCacheKey = typeof SWR_KEYS_CORE[keyof typeof SWR_KEYS_CORE]
