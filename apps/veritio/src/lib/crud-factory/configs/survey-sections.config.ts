import type { EntityConfig } from '../types'
import { cacheTTL } from '../../cache/memory-cache'

/**
 * Survey section row type from database
 */
export interface SurveyCustomSection {
  id: string
  study_id: string
  name: string
  description: string | null
  position: number
  parent_section: 'survey' | 'pre_study' | 'post_study'
  is_visible: boolean
  created_at: string
  updated_at: string
}

/**
 * Input type for creating a survey section
 */
export interface SurveySectionCreateInput {
  name: string
  description?: string | null
  position?: number
  parent_section?: 'survey' | 'pre_study' | 'post_study'
  is_visible?: boolean
}

/**
 * Input type for bulk updating survey sections
 */
export interface SurveySectionBulkItem {
  id: string
  name?: string
  description?: string | null
  position?: number
  parent_section?: 'survey' | 'pre_study' | 'post_study'
  is_visible?: boolean
}

/**
 * Survey sections entity configuration
 */
export const surveySectionsConfig: EntityConfig<
  SurveyCustomSection,
  SurveySectionCreateInput,
  SurveySectionBulkItem
> = {
  tableName: 'survey_custom_sections',
  entityName: 'SurveySection',

  cache: {
    keyGenerator: (studyId) => `survey-sections:${studyId}`,
    ttl: cacheTTL.medium,
  },

  selects: {
    list: 'id, study_id, name, description, position, parent_section, is_visible, created_at, updated_at',
    listWithOwnership:
      'id, study_id, name, description, position, parent_section, is_visible, created_at, updated_at, studies!inner(id)',
    get: '*',
    create: '*',
    update: '*',
    bulkUpdate: 'id, study_id, name, description, position, parent_section, is_visible, created_at, updated_at',
  },

  orderBy: {
    column: 'position',
    ascending: true,
  },

  fieldTransformers: {
    update: (input) => {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name.trim()
      if (input.description !== undefined) updates.description = input.description?.trim() || null
      if (input.position !== undefined) updates.position = input.position
      if (input.parent_section !== undefined) updates.parent_section = input.parent_section
      if (input.is_visible !== undefined) updates.is_visible = input.is_visible
      return updates
    },
  },

  errorHandlers: [
    {
      pattern: 'unique',
      message: 'A section with this name already exists',
    },
  ],

  upsertStrategy: 'batch',

  buildInsertData: (studyId, input) => ({
    study_id: studyId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    position: input.position ?? 0,
    parent_section: input.parent_section || 'survey',
    is_visible: input.is_visible ?? true,
  }),

  buildUpsertData: (studyId, item) => ({
    id: item.id,
    study_id: studyId,
    name: item.name ?? '',
    description: item.description ?? null,
    position: item.position ?? 0,
    parent_section: item.parent_section ?? 'survey',
    is_visible: item.is_visible ?? true,
  }),
}
