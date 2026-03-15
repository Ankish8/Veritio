/**
 * E2E Test Configuration
 *
 * Centralized configuration for test environment, timeouts, and URLs
 */

export const config = {
  // Base URLs
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:4001',
  apiUrl: process.env.E2E_API_URL || 'http://localhost:4000',

  // Timeouts
  defaultTimeout: 30000,
  navigationTimeout: 60000,
  actionTimeout: 10000,

  // Test user credentials (for dev/test environment)
  testUser: {
    email: process.env.E2E_TEST_EMAIL || 'test@example.com',
    password: process.env.E2E_TEST_PASSWORD || 'test-password',
    name: 'Test User',
  },

  // Session names for isolation
  sessions: {
    default: 'e2e-default',
    auth: 'e2e-auth',
    builder: 'e2e-builder',
    player: 'e2e-player',
  },

  // Viewport sizes
  viewports: {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
  },

  // Routes
  routes: {
    // Auth
    signIn: '/sign-in',
    signUp: '/sign-up',

    // Dashboard
    dashboard: '/',
    projects: '/projects',
    studies: '/studies',
    archive: '/archive',
    settings: '/settings',

    // Panel
    panel: '/panel',
    panelParticipants: '/panel/participants',
    panelSegments: '/panel/segments',
    panelLinks: '/panel/links',
    panelWidget: '/panel/widget',
    panelIncentives: '/panel/incentives',

    // Study routes (templates)
    project: (projectId: string) => `/projects/${projectId}`,
    study: (projectId: string, studyId: string) => `/projects/${projectId}/studies/${studyId}`,
    builder: (projectId: string, studyId: string) => `/projects/${projectId}/studies/${studyId}/builder`,
    results: (projectId: string, studyId: string) => `/projects/${projectId}/studies/${studyId}/results`,
    preview: (projectId: string, studyId: string) => `/projects/${projectId}/studies/${studyId}/preview`,
    recruit: (projectId: string, studyId: string) => `/projects/${projectId}/studies/${studyId}/recruit`,

    // Participant
    player: (studyCode: string) => `/s/${studyCode}`,
    complete: (studyCode: string) => `/s/${studyCode}/complete`,
  },

  // Study types
  studyTypes: ['card-sort', 'tree-test', 'survey', 'prototype-test', 'first-click'] as const,

  // Screenshot directory
  screenshotDir: './e2e/screenshots',
}

export type StudyType = (typeof config.studyTypes)[number]

/**
 * Get full URL for a route
 */
export function getFullUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${config.baseUrl}${path}`
}

/**
 * Wait helper that respects configured timeouts
 */
export function getTimeout(type: 'default' | 'navigation' | 'action' = 'default'): number {
  switch (type) {
    case 'navigation':
      return config.navigationTimeout
    case 'action':
      return config.actionTimeout
    default:
      return config.defaultTimeout
  }
}
