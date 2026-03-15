/**
 * Cache Invalidation Orchestrator
 *
 * Centralizes cache invalidation logic to prevent bugs from missed invalidations.
 * Uses event-driven approach: trigger events, orchestrator invalidates related caches.
 *
 * Benefits:
 * - Single source of truth for cache invalidation rules
 * - Easy to debug (all invalidations logged)
 * - Prevents forgetting to invalidate related caches
 * - Can add analytics/monitoring hooks
 *
 * @example
 * ```typescript
 * // In a hook or service:
 * await createStudy(data)
 * await cacheOrchestrator.trigger('study:created', { projectId, studyId })
 *
 * // Orchestrator automatically invalidates:
 * // - /api/projects
 * // - /api/projects/${projectId}/studies
 * // - /api/studies
 * ```
 */

import { mutate as globalMutate } from 'swr'
import { SWR_KEYS } from './config'

// =============================================================================
// PATTERN-BASED INVALIDATION HELPERS
// =============================================================================

/**
 * Special symbols for pattern-based cache invalidation.
 * These are used instead of raw SWR_KEYS functions to invalidate ALL matching cache entries.
 */
const INVALIDATE_PATTERNS = {
  /**
   * Invalidates ALL dashboard stats caches (any organizationId).
   * Pattern: /api/dashboard/stats*
   */
  DASHBOARD_ALL: Symbol('invalidate:dashboard:all'),

  /**
   * Invalidates ALL projects caches (any organizationId).
   * Pattern: /api/projects*
   */
  PROJECTS_ALL: Symbol('invalidate:projects:all'),
} as const

/**
 * Pattern matchers for SWR cache keys.
 * These functions are used with globalMutate to invalidate all matching keys.
 */
const patternMatchers: Record<symbol, (key: unknown) => boolean> = {
  [INVALIDATE_PATTERNS.DASHBOARD_ALL]: (key) =>
    typeof key === 'string' && key.startsWith('/api/dashboard/stats'),

  [INVALIDATE_PATTERNS.PROJECTS_ALL]: (key) =>
    typeof key === 'string' &&
    key.startsWith('/api/projects') &&
    !key.includes('/studies') &&
    !key.includes('/archive'),
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cache events that trigger invalidations.
 * Add new events as needed for your application.
 */
export type CacheEvent =
  // Study events
  | 'study:created'
  | 'study:updated'
  | 'study:archived'
  | 'study:unarchived'
  | 'study:deleted'
  | 'study:status-changed'
  | 'study:launched'
  // Project events
  | 'project:created'
  | 'project:updated'
  | 'project:archived'
  | 'project:unarchived'
  | 'project:deleted'
  // Participant events
  | 'participant:created'
  | 'participant:updated'
  | 'participant:deleted'
  | 'participant:completed'
  // Comment events
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  // Recording events
  | 'recording:created'
  | 'recording:updated'
  | 'recording:deleted'
  // Invitation events
  | 'invitation:created'
  | 'invitation:accepted'
  | 'invitation:deleted'
  // Organization events
  | 'organization:created'
  | 'organization:updated'
  | 'organization:member-added'
  | 'organization:member-removed'
  // Favorites
  | 'favorite:added'
  | 'favorite:removed'
  // Notes
  | 'note:created'
  | 'note:updated'
  | 'note:deleted'
  // Panel events
  | 'panel:participant-created'
  | 'panel:participant-updated'
  | 'panel:segment-created'
  | 'panel:segment-updated'
  // Response events
  | 'response:created'
  | 'response:updated'
  // Survey sections
  | 'survey-section:created'
  | 'survey-section:updated'
  | 'survey-section:deleted'
  | 'survey-section:reordered'

/**
 * Event metadata passed when triggering cache invalidation.
 * Provides context for dynamic cache key generation.
 */
export interface EventMetadata {
  studyId?: string
  projectId?: string
  participantId?: string
  recordingId?: string
  commentId?: string
  organizationId?: string
  sectionId?: string
  questionId?: string
  [key: string]: string | number | boolean | undefined
}

/**
 * Cache invalidation rule definition.
 * Maps events to cache keys that should be invalidated.
 */
export interface InvalidationRule {
  /**
   * Event(s) that trigger this rule.
   * Can be single event or array of events.
   */
  on: CacheEvent | CacheEvent[]

  /**
   * Cache key(s) to invalidate.
   * Can be:
   * - Static string: '/api/projects'
   * - Array of strings: ['/api/projects', '/api/dashboard/stats']
   * - Function: (event, metadata) => string[]
   */
  invalidate:
    | string
    | (string | symbol)[]
    | ((event: CacheEvent, metadata?: EventMetadata) => (string | symbol)[])

  /**
   * Optional description for debugging
   */
  description?: string
}

// =============================================================================
// ORCHESTRATOR
// =============================================================================

/**
 * Cache Invalidation Orchestrator
 *
 * Manages cache invalidation rules and triggers invalidations.
 */
class CacheInvalidationOrchestrator {
  private rules: InvalidationRule[] = []
  private debugMode: boolean = false

  /**
   * Enable debug mode to log all invalidations to console
   */
  enableDebug() {
    this.debugMode = true
    return this
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debugMode = false
    return this
  }

  /**
   * Register a cache invalidation rule.
   * Rules are applied when matching events are triggered.
   *
   * @example
   * ```typescript
   * cacheOrchestrator.registerRule({
   *   on: 'study:created',
   *   invalidate: (event, data) => [
   *     INVALIDATE_PATTERNS.PROJECTS_ALL,
   *     SWR_KEYS.projectStudies(data.projectId),
   *     SWR_KEYS.allStudies()
   *   ],
   *   description: 'Invalidate project and study lists when study is created'
   * })
   * ```
   */
  registerRule(rule: InvalidationRule): this {
    this.rules.push(rule)
    return this
  }

  /**
   * Register multiple rules at once
   */
  registerRules(rules: InvalidationRule[]): this {
    rules.forEach((rule) => this.registerRule(rule))
    return this
  }

  /**
   * Trigger cache invalidation for an event.
   * Applies all matching rules and invalidates related caches.
   *
   * @param event - The cache event that occurred
   * @param metadata - Optional metadata for dynamic cache key generation
   *
   * @example
   * ```typescript
   * await cacheOrchestrator.trigger('study:created', {
   *   projectId: 'proj-123',
   *   studyId: 'study-456'
   * })
   * ```
   */
  async trigger(event: CacheEvent, metadata?: EventMetadata): Promise<void> {
    const keysToInvalidate = new Set<string | symbol>()

    // Find all matching rules
    for (const rule of this.rules) {
      const ruleEvents = Array.isArray(rule.on) ? rule.on : [rule.on]

      if (ruleEvents.includes(event)) {
        // Get cache keys to invalidate
        let keys: (string | symbol)[]

        if (typeof rule.invalidate === 'function') {
          keys = rule.invalidate(event, metadata) as (string | symbol)[]
        } else if (Array.isArray(rule.invalidate)) {
          keys = rule.invalidate as (string | symbol)[]
        } else {
          keys = [rule.invalidate as string | symbol]
        }

        // Add to set (prevents duplicate invalidations)
        keys.forEach((key) => keysToInvalidate.add(key))

      }
    }

    // Invalidate all collected keys
    if (keysToInvalidate.size > 0) {
      const invalidationPromises = Array.from(keysToInvalidate).map((key) => {
        // Handle pattern-based invalidation (symbols)
        if (typeof key === 'symbol' && patternMatchers[key]) {
          // Don't pass `undefined` as data — it clears the cache and causes skeleton flash.
          // Just trigger a background revalidation.
          return globalMutate(patternMatchers[key])
        }
        // Handle regular string keys
        return globalMutate(key as string)
      })

      await Promise.all(invalidationPromises)

    }
  }

  /**
   * Get all registered rules (for debugging/introspection)
   */
  getRules(): Readonly<InvalidationRule[]> {
    return this.rules
  }

  /**
   * Clear all rules (useful for testing)
   */
  clearRules(): this {
    this.rules = []
    return this
  }
}

// =============================================================================
// GLOBAL INSTANCE & RULES
// =============================================================================

/**
 * Global cache orchestrator instance.
 * Import and use this throughout your application.
 */
export const cacheOrchestrator = new CacheInvalidationOrchestrator()

// Enable debug mode in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  cacheOrchestrator.enableDebug()
}

// =============================================================================
// DEFAULT INVALIDATION RULES
// =============================================================================

/**
 * Register default invalidation rules for common operations.
 * These cover the most common cache invalidation patterns.
 */
cacheOrchestrator.registerRules([
  // ---------------------------------------------------------------------------
  // STUDY EVENTS
  // ---------------------------------------------------------------------------
  {
    on: 'study:created',
    invalidate: (_, metadata) => [
      INVALIDATE_PATTERNS.PROJECTS_ALL, // Projects list (shows study count)
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(), // All studies list
      INVALIDATE_PATTERNS.DASHBOARD_ALL, // Dashboard stats
    ],
    description: 'Invalidate project and study lists when study is created',
  },
  {
    on: ['study:updated', 'study:status-changed'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
    ],
    description: 'Invalidate study data when study is updated',
  },
  {
    on: 'study:archived',
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
      SWR_KEYS.archivedStudies,
      INVALIDATE_PATTERNS.DASHBOARD_ALL, // Dashboard shows active study count
    ],
    description: 'Invalidate study and archive lists when study is archived',
  },
  {
    on: 'study:unarchived',
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
      SWR_KEYS.archivedStudies,
      INVALIDATE_PATTERNS.DASHBOARD_ALL, // Dashboard shows active study count
    ],
    description: 'Invalidate study and archive lists when study is unarchived',
  },
  {
    on: 'study:launched',
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
      INVALIDATE_PATTERNS.DASHBOARD_ALL,
    ],
    description: 'Invalidate study data and dashboard when study is launched',
  },
  {
    on: 'study:deleted',
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
      INVALIDATE_PATTERNS.DASHBOARD_ALL,
      INVALIDATE_PATTERNS.PROJECTS_ALL, // Projects list shows study counts
    ],
    description: 'Invalidate study and project data when study is deleted',
  },

  // ---------------------------------------------------------------------------
  // PROJECT EVENTS
  // ---------------------------------------------------------------------------
  {
    on: 'project:created',
    invalidate: [INVALIDATE_PATTERNS.PROJECTS_ALL, INVALIDATE_PATTERNS.DASHBOARD_ALL],
    description: 'Invalidate projects list when project is created',
  },
  {
    on: 'project:updated',
    invalidate: (_, metadata) => [
      INVALIDATE_PATTERNS.PROJECTS_ALL,
      ...(metadata?.projectId ? [SWR_KEYS.project(metadata.projectId)] : []),
    ],
    description: 'Invalidate project data when project is updated',
  },
  {
    on: 'project:archived',
    invalidate: [INVALIDATE_PATTERNS.PROJECTS_ALL, SWR_KEYS.archivedProjects(), INVALIDATE_PATTERNS.DASHBOARD_ALL],
    description: 'Invalidate project and archive lists when project is archived',
  },
  {
    on: 'project:unarchived',
    invalidate: [INVALIDATE_PATTERNS.PROJECTS_ALL, SWR_KEYS.archivedProjects(), INVALIDATE_PATTERNS.DASHBOARD_ALL],
    description: 'Invalidate project and archive lists when project is unarchived',
  },
  {
    on: 'project:deleted',
    invalidate: [INVALIDATE_PATTERNS.PROJECTS_ALL, INVALIDATE_PATTERNS.DASHBOARD_ALL],
    description: 'Invalidate projects list and dashboard when project is deleted',
  },

  // ---------------------------------------------------------------------------
  // PARTICIPANT EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['participant:created', 'participant:updated', 'participant:completed'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      INVALIDATE_PATTERNS.DASHBOARD_ALL,
    ],
    description: 'Invalidate study data when participant count changes',
  },

  // ---------------------------------------------------------------------------
  // COMMENT EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['comment:created', 'comment:updated', 'comment:deleted'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.studyComments(metadata.studyId)] : []),
    ],
    description: 'Invalidate comment list when comments change',
  },

  // ---------------------------------------------------------------------------
  // RECORDING EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['recording:created', 'recording:updated', 'recording:deleted'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.studyRecordings(metadata.studyId)] : []),
    ],
    description: 'Invalidate recording list when recordings change',
  },

  // ---------------------------------------------------------------------------
  // FAVORITE EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['favorite:added', 'favorite:removed'],
    invalidate: (_, metadata) => [
      SWR_KEYS.favorites(10), // Default limit
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
    ],
    description: 'Invalidate favorites list when favorites change',
  },

  // ---------------------------------------------------------------------------
  // NOTE EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['note:created', 'note:updated', 'note:deleted'],
    invalidate: (_, metadata) => {
      const keys = []
      if (metadata?.studyId && metadata?.questionId) {
        keys.push(SWR_KEYS.questionNotes(metadata.studyId, metadata.questionId))
      }
      if (metadata?.studyId && metadata?.section) {
        keys.push(SWR_KEYS.sectionNotes(metadata.studyId, metadata.section as string))
      }
      if (metadata?.studyId) {
        keys.push(SWR_KEYS.allStudyNotes(metadata.studyId))
      }
      return keys
    },
    description: 'Invalidate note lists when notes change',
  },

  // ---------------------------------------------------------------------------
  // SURVEY SECTION EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['survey-section:created', 'survey-section:updated', 'survey-section:deleted', 'survey-section:reordered'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.surveySections(metadata.studyId)] : []),
    ],
    description: 'Invalidate survey sections when they change',
  },

  // ---------------------------------------------------------------------------
  // INVITATION EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['invitation:created', 'invitation:accepted', 'invitation:deleted'],
    invalidate: (_, metadata) => [
      ...(metadata?.organizationId
        ? [SWR_KEYS.organizationInvitations(metadata.organizationId)]
        : []),
      SWR_KEYS.organizations,
    ],
    description: 'Invalidate invitations when they change',
  },

  // ---------------------------------------------------------------------------
  // ORGANIZATION EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['organization:member-added', 'organization:member-removed'],
    invalidate: (_, metadata) => [
      ...(metadata?.organizationId
        ? [
            SWR_KEYS.organization(metadata.organizationId),
            SWR_KEYS.organizationMembers(metadata.organizationId),
          ]
        : []),
      SWR_KEYS.organizations,
    ],
    description: 'Invalidate organization data when members change',
  },

  // ---------------------------------------------------------------------------
  // PANEL EVENTS
  // ---------------------------------------------------------------------------
  {
    on: ['panel:participant-created', 'panel:participant-updated'],
    invalidate: [INVALIDATE_PATTERNS.DASHBOARD_ALL],
    description: 'Invalidate dashboard when panel participants change',
  },
])

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convenience function to trigger cache invalidation.
 * Alias for cacheOrchestrator.trigger()
 *
 * @example
 * ```typescript
 * import { invalidateCache } from '@/lib/swr/cache-invalidation'
 *
 * await createStudy(data)
 * await invalidateCache('study:created', { projectId, studyId })
 * ```
 */
export async function invalidateCache(
  event: CacheEvent,
  metadata?: EventMetadata
): Promise<void> {
  return cacheOrchestrator.trigger(event, metadata)
}

/**
 * Trigger multiple cache events at once.
 * Useful when one operation affects multiple entities.
 *
 * @example
 * ```typescript
 * await invalidateMultiple([
 *   { event: 'study:created', metadata: { projectId, studyId } },
 *   { event: 'participant:created', metadata: { studyId } }
 * ])
 * ```
 */
export async function invalidateMultiple(
  events: Array<{ event: CacheEvent; metadata?: EventMetadata }>
): Promise<void> {
  await Promise.all(events.map(({ event, metadata }) => cacheOrchestrator.trigger(event, metadata)))
}

/**
 * Create a custom invalidation rule on the fly.
 * Useful for one-off invalidations or feature-specific rules.
 *
 * @example
 * ```typescript
 * // Register custom rule for a new feature
 * registerCustomRule({
 *   on: 'study:cloned',
 *   invalidate: (_, data) => [
 *     SWR_KEYS.projectStudies(data.sourceProjectId),
 *     SWR_KEYS.projectStudies(data.targetProjectId),
 *     SWR_KEYS.allStudies()
 *   ]
 * })
 * ```
 */
export function registerCustomRule(rule: InvalidationRule): void {
  cacheOrchestrator.registerRule(rule)
}
