export type StatusFilter = 'all' | 'included' | 'completed' | 'abandoned' | 'in_progress' | 'excluded'

export interface ResponseData {
  id?: string
  participant_id: string
  card_placements: Record<string, string> | unknown
  custom_categories?: unknown
  total_time_ms?: number | null
}

export interface QuestionOption {
  id: string
  text: string
  type: string
  section: string
  options?: string[]
}

export interface UrlTagOption {
  key: string
  values: string[]
}
