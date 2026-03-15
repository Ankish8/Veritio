import type { EntityConfig } from '../types'
import { cacheTTL } from '../../cache/memory-cache'

/**
 * Segment condition type
 */
export interface SegmentCondition {
  id: string
  type: 'status' | 'url_tag' | 'question_response' | 'categories_created' | 'time_taken' | 'participant_id'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: string | number | string[] | [number, number]
  questionId?: string
  questionText?: string
  tagKey?: string
}

/**
 * Segment row type from database
 */
export interface Segment {
  id: string
  study_id: string
  user_id: string
  name: string
  description: string | null
  conditions: SegmentCondition[]
  participant_count: number
  created_at: string
  updated_at: string
}

/**
 * Input type for creating a segment
 */
export interface SegmentCreateInput {
  name: string
  description?: string | null
  conditions: SegmentCondition[]
  participantCount?: number
}

/**
 * Input type for bulk updating segments
 */
export interface SegmentBulkItem {
  id: string
  name?: string
  description?: string | null
  conditions?: SegmentCondition[]
  participant_count?: number
}

/**
 * Segments entity configuration
 */
export const segmentsConfig: EntityConfig<Segment, SegmentCreateInput, SegmentBulkItem> = {
  tableName: 'study_segments',
  entityName: 'Segment',

  cache: {
    keyGenerator: (studyId) => `segments:${studyId}`,
    ttl: cacheTTL.medium,
  },

  selects: {
    list: 'id, study_id, user_id, name, description, conditions, participant_count, created_at, updated_at',
    listWithOwnership:
      'id, study_id, user_id, name, description, conditions, participant_count, created_at, updated_at, studies!inner(id)',
    get: '*',
    create: '*',
    update: '*',
    bulkUpdate: 'id, study_id, user_id, name, description, conditions, participant_count, created_at, updated_at',
  },

  orderBy: {
    column: 'created_at',
    ascending: false, // Most recent first
  },

  fieldTransformers: {
    update: (input) => {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name.trim()
      if (input.description !== undefined) updates.description = input.description?.trim() || null
      if (input.conditions !== undefined) updates.conditions = input.conditions as unknown as any
      // No participant_count in update input
      return updates
    },
  },

  errorHandlers: [
    {
      pattern: 'already exists',
      message: 'A segment with this name already exists',
    },
  ],

  upsertStrategy: 'parallel',

  buildInsertData: (studyId, input) => ({
    study_id: studyId,
    // user_id will be added by the service layer
    name: input.name.trim(),
    description: input.description?.trim() || null,
    conditions: input.conditions as unknown as any, // JSON column
    participant_count: input.participantCount ?? 0,
  }),

  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    // user_id will be added by the service layer
    name: item.name ?? '',
    description: item.description ?? null,
    conditions: (item.conditions as unknown as any) ?? [],
    participant_count: item.participant_count ?? 0,
  }),
}
