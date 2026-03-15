import { mutate as globalMutate } from 'swr'
import { SWR_KEYS } from './config'

export type CacheEvent =
  | 'study:created'
  | 'study:updated'
  | 'study:archived'
  | 'study:unarchived'
  | 'study:deleted'
  | 'study:status-changed'
  | 'study:launched'
  | 'project:created'
  | 'project:updated'
  | 'project:archived'
  | 'project:unarchived'
  | 'project:deleted'
  | 'participant:created'
  | 'participant:updated'
  | 'participant:deleted'
  | 'participant:completed'
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  | 'recording:created'
  | 'recording:updated'
  | 'recording:deleted'
  | 'invitation:created'
  | 'invitation:accepted'
  | 'invitation:deleted'
  | 'organization:created'
  | 'organization:updated'
  | 'organization:member-added'
  | 'organization:member-removed'
  | 'favorite:added'
  | 'favorite:removed'
  | 'note:created'
  | 'note:updated'
  | 'note:deleted'
  | 'panel:participant-created'
  | 'panel:participant-updated'
  | 'panel:segment-created'
  | 'panel:segment-updated'
  | 'response:created'
  | 'response:updated'
  | 'survey-section:created'
  | 'survey-section:updated'
  | 'survey-section:deleted'
  | 'survey-section:reordered'

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

export interface InvalidationRule {
  on: CacheEvent | CacheEvent[]
  invalidate:
    | string
    | string[]
    | ((event: CacheEvent, metadata?: EventMetadata) => string[])
  description?: string
}

class CacheInvalidationOrchestrator {
  private rules: InvalidationRule[] = []
  private debugMode: boolean = false

  enableDebug() {
    this.debugMode = true
    return this
  }

  disableDebug() {
    this.debugMode = false
    return this
  }

  registerRule(rule: InvalidationRule): this {
    this.rules.push(rule)
    return this
  }

  registerRules(rules: InvalidationRule[]): this {
    rules.forEach((rule) => this.registerRule(rule))
    return this
  }

  async trigger(event: CacheEvent, metadata?: EventMetadata): Promise<void> {
    const keysToInvalidate = new Set<string>()

    for (const rule of this.rules) {
      const ruleEvents = Array.isArray(rule.on) ? rule.on : [rule.on]

      if (ruleEvents.includes(event)) {
        let keys: string[]

        if (typeof rule.invalidate === 'function') {
          keys = rule.invalidate(event, metadata)
        } else if (Array.isArray(rule.invalidate)) {
          keys = rule.invalidate
        } else {
          keys = [rule.invalidate]
        }

        keys.forEach((key) => keysToInvalidate.add(key))

      }
    }

    if (keysToInvalidate.size > 0) {
      await Promise.all(Array.from(keysToInvalidate).map((key) => globalMutate(key)))

    }
  }

  getRules(): Readonly<InvalidationRule[]> {
    return this.rules
  }

  clearRules(): this {
    this.rules = []
    return this
  }
}

export const cacheOrchestrator = new CacheInvalidationOrchestrator()

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  cacheOrchestrator.enableDebug()
}

cacheOrchestrator.registerRules([
  {
    on: 'study:created',
    invalidate: (_, metadata) => [
      SWR_KEYS.projects,
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
      SWR_KEYS.dashboard,
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
    ],
    description: 'Invalidate study and archive lists when study is unarchived',
  },
  {
    on: 'study:launched',
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.allStudies(),
      SWR_KEYS.dashboard,
    ],
    description: 'Invalidate study data and dashboard when study is launched',
  },

  {
    on: 'project:created',
    invalidate: [SWR_KEYS.projects, SWR_KEYS.dashboard],
    description: 'Invalidate projects list when project is created',
  },
  {
    on: 'project:updated',
    invalidate: (_, metadata) => [
      SWR_KEYS.projects,
      ...(metadata?.projectId ? [SWR_KEYS.project(metadata.projectId)] : []),
    ],
    description: 'Invalidate project data when project is updated',
  },
  {
    on: 'project:archived',
    invalidate: [SWR_KEYS.projects, SWR_KEYS.archivedProjects],
    description: 'Invalidate project and archive lists when project is archived',
  },
  {
    on: 'project:unarchived',
    invalidate: [SWR_KEYS.projects, SWR_KEYS.archivedProjects],
    description: 'Invalidate project and archive lists when project is unarchived',
  },

  {
    on: ['participant:created', 'participant:updated', 'participant:completed'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
      ...(metadata?.projectId ? [SWR_KEYS.projectStudies(metadata.projectId)] : []),
      SWR_KEYS.dashboard,
    ],
    description: 'Invalidate study data when participant count changes',
  },

  {
    on: ['comment:created', 'comment:updated', 'comment:deleted'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.studyComments(metadata.studyId)] : []),
    ],
    description: 'Invalidate comment list when comments change',
  },

  {
    on: ['recording:created', 'recording:updated', 'recording:deleted'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.studyRecordings(metadata.studyId)] : []),
    ],
    description: 'Invalidate recording list when recordings change',
  },

  {
    on: ['favorite:added', 'favorite:removed'],
    invalidate: (_, metadata) => [
      SWR_KEYS.favorites(10),
      ...(metadata?.studyId ? [SWR_KEYS.study(metadata.studyId)] : []),
    ],
    description: 'Invalidate favorites list when favorites change',
  },

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

  {
    on: ['survey-section:created', 'survey-section:updated', 'survey-section:deleted', 'survey-section:reordered'],
    invalidate: (_, metadata) => [
      ...(metadata?.studyId ? [SWR_KEYS.surveySections(metadata.studyId)] : []),
    ],
    description: 'Invalidate survey sections when they change',
  },

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

  {
    on: ['panel:participant-created', 'panel:participant-updated'],
    invalidate: [SWR_KEYS.dashboard],
    description: 'Invalidate dashboard when panel participants change',
  },
])

export async function invalidateCache(
  event: CacheEvent,
  metadata?: EventMetadata
): Promise<void> {
  return cacheOrchestrator.trigger(event, metadata)
}

export async function invalidateMultiple(
  events: Array<{ event: CacheEvent; metadata?: EventMetadata }>
): Promise<void> {
  await Promise.all(events.map(({ event, metadata }) => cacheOrchestrator.trigger(event, metadata)))
}

export function registerCustomRule(rule: InvalidationRule): void {
  cacheOrchestrator.registerRule(rule)
}
