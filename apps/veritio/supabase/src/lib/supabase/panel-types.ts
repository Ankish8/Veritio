/**
 * Panel Participant Types  
 * Minimal types for panel management system
 */

export interface PanelParticipant {
  id: string
  user_id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  status: 'active' | 'inactive' | 'blacklisted'
  source: 'manual' | 'import' | 'widget' | 'api'
  demographics: Record<string, unknown>
  custom_attributes: Record<string, unknown>
  source_details: Record<string, unknown>
  last_active_at?: string | null
  created_at: string
  updated_at?: string
}

export type PanelParticipantInsert = Omit<PanelParticipant, 'id' | 'created_at' | 'updated_at'>
export type PanelParticipantUpdate = Partial<Omit<PanelParticipant, 'id' | 'user_id' | 'created_at'>>

export interface PanelTag {
  id: string
  user_id: string
  name: string
  color?: string | null
  created_at: string
}

export interface PanelParticipantWithTags extends PanelParticipant {
  tags: PanelTag[]
  study_count?: number
}

export interface PanelParticipantWithDetails extends PanelParticipantWithTags {
  completion_rate: number
  total_incentives_earned: number
}

export interface PanelParticipantFilters {
  status?: string | string[]
  source?: string | string[]
  search?: string
  last_active_after?: string
  last_active_before?: string
  created_after?: string
  created_before?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ImportedParticipant {
  email: string
  first_name?: string
  last_name?: string
  demographics?: Record<string, unknown>
  custom_attributes?: Record<string, unknown>
  tags?: string[]
}

export interface ImportResult {
  total: number
  created: number
  updated: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
}

export type ImportDuplicateHandling = 'skip' | 'update' | 'merge'
