/**
 * Response Tags Type Definitions
 *
 * Types for the response tagging system that allows
 * researchers to categorize and organize responses.
 */

/**
 * A tag that can be applied to responses
 */
export interface ResponseTag {
  id: string
  study_id: string
  name: string
  color: string // Hex color code (e.g., "#22c55e")
  description: string | null
  created_at: string
  created_by: string | null
}

/**
 * Assignment of a tag to a specific response
 */
export interface ResponseTagAssignment {
  id: string
  tag_id: string
  response_id: string
  response_type: 'first_impression' | 'flow_question' | 'questionnaire'
  assigned_at: string
  assigned_by: string | null
}

/**
 * Tag with assignment count for display
 */
export interface ResponseTagWithCount extends ResponseTag {
  assignment_count: number
}

/**
 * Input for creating a new tag
 */
export interface CreateTagInput {
  name: string
  color: string
  description?: string | null
}

/**
 * Input for updating a tag
 */
export interface UpdateTagInput {
  name?: string
  color?: string
  description?: string | null
}

/**
 * Input for assigning a tag to a response
 */
export interface AssignTagInput {
  tag_id: string
  response_id: string
  response_type: 'first_impression' | 'flow_question' | 'questionnaire'
}

/**
 * Bulk tag assignment input
 */
export interface BulkAssignTagInput {
  tag_id: string
  response_ids: string[]
  response_type: 'first_impression' | 'flow_question' | 'questionnaire'
}

/**
 * Pre-built tag suggestions with semantic meaning
 */
export const SUGGESTED_TAGS: Omit<ResponseTag, 'id' | 'study_id' | 'created_at' | 'created_by'>[] = [
  {
    name: 'Positive',
    color: '#22c55e', // green-500
    description: 'Positive sentiment or feedback',
  },
  {
    name: 'Negative',
    color: '#ef4444', // red-500
    description: 'Negative sentiment or feedback',
  },
  {
    name: 'Confused',
    color: '#f97316', // orange-500
    description: 'Participant seemed confused',
  },
  {
    name: 'Clear',
    color: '#3b82f6', // blue-500
    description: 'Clear understanding demonstrated',
  },
  {
    name: 'Brand-aligned',
    color: '#8b5cf6', // violet-500
    description: 'Response aligns with brand messaging',
  },
  {
    name: 'Off-topic',
    color: '#6b7280', // gray-500
    description: 'Response is off-topic or irrelevant',
  },
  {
    name: 'Actionable',
    color: '#06b6d4', // cyan-500
    description: 'Contains actionable insights',
  },
  {
    name: 'Follow-up',
    color: '#ec4899', // pink-500
    description: 'Needs follow-up or further investigation',
  },
]

/**
 * Available tag colors for the color picker
 */
export const TAG_COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#6b7280', // gray
  '#f43f5e', // rose
  '#a855f7', // purple
]
