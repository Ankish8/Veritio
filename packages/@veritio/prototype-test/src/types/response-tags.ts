export interface ResponseTag {
  id: string
  study_id: string
  name: string
  color: string
  description: string | null
  created_at: string
  created_by: string | null
}

export interface ResponseTagAssignment {
  id: string
  tag_id: string
  response_id: string
  response_type: 'first_impression' | 'flow_question' | 'questionnaire'
  assigned_at: string
  assigned_by: string | null
}

export interface ResponseTagWithCount extends ResponseTag {
  assignment_count: number
}

export interface CreateTagInput {
  name: string
  color: string
  description?: string | null
}

export interface UpdateTagInput {
  name?: string
  color?: string
  description?: string | null
}

export interface AssignTagInput {
  tag_id: string
  response_id: string
  response_type: 'first_impression' | 'flow_question' | 'questionnaire'
}

export interface BulkAssignTagInput {
  tag_id: string
  response_ids: string[]
  response_type: 'first_impression' | 'flow_question' | 'questionnaire'
}

export const SUGGESTED_TAGS: Omit<ResponseTag, 'id' | 'study_id' | 'created_at' | 'created_by'>[] = [
  {
    name: 'Positive',
    color: '#22c55e',
    description: 'Positive sentiment or feedback',
  },
  {
    name: 'Negative',
    color: '#ef4444',
    description: 'Negative sentiment or feedback',
  },
  {
    name: 'Confused',
    color: '#f97316',
    description: 'Participant seemed confused',
  },
  {
    name: 'Clear',
    color: '#3b82f6',
    description: 'Clear understanding demonstrated',
  },
  {
    name: 'Brand-aligned',
    color: '#8b5cf6',
    description: 'Response aligns with brand messaging',
  },
  {
    name: 'Off-topic',
    color: '#6b7280',
    description: 'Response is off-topic or irrelevant',
  },
  {
    name: 'Actionable',
    color: '#06b6d4',
    description: 'Contains actionable insights',
  },
  {
    name: 'Follow-up',
    color: '#ec4899',
    description: 'Needs follow-up or further investigation',
  },
]

export const TAG_COLORS = [
  '#22c55e',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#6b7280',
  '#f43f5e',
  '#a855f7',
]
