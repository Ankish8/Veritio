/**
 * Study Tags Type Definitions
 *
 * Types for the organization-scoped study tags system that allows
 * teams to classify studies by metadata (product area, team, methodology, etc.)
 *
 * Note: This is distinct from response_tags which are study-scoped
 * and used for thematic coding during analysis.
 */

/**
 * Tag group categories for organizing tags in the UI
 */
export type StudyTagGroup =
  | 'product_area'  // e.g., Mobile App, Web App, Dashboard
  | 'team'          // e.g., Design, Product, Engineering
  | 'methodology'   // e.g., Discovery, Validation, Iteration
  | 'status'        // e.g., High Priority, In Review
  | 'custom'        // User-defined

/**
 * A tag that can be applied to studies within an organization
 */
export interface StudyTag {
  id: string
  organization_id: string
  name: string
  color: string // Hex color code (e.g., "#22c55e")
  description: string | null
  tag_group: StudyTagGroup
  position: number
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Tag with study count for display
 */
export interface StudyTagWithCount extends StudyTag {
  study_count: number
}

/**
 * Assignment of a tag to a study
 */
export interface StudyTagAssignment {
  id: string
  study_id: string
  tag_id: string
  assigned_at: string
  assigned_by_user_id: string | null
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for creating a new study tag
 */
export interface CreateStudyTagInput {
  name: string
  color?: string
  description?: string | null
  tag_group?: StudyTagGroup
  position?: number
}

/**
 * Input for updating a study tag
 */
export interface UpdateStudyTagInput {
  name?: string
  color?: string
  description?: string | null
  tag_group?: StudyTagGroup
  position?: number
}

/**
 * Bulk tag assignment input
 */
export interface SetStudyTagsInput {
  study_id: string
  tag_ids: string[]
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Cross-study search filters
 */
export interface CrossStudySearchFilters {
  query?: string // Text search in title, description
  tag_ids?: string[] // Filter by study tags
  project_ids?: string[] // Filter by projects
  study_types?: Array<
    | 'card_sort'
    | 'tree_test'
    | 'survey'
    | 'prototype_test'
    | 'first_click'
    | 'first_impression'
    | 'live_website_test'
  >
  statuses?: Array<'draft' | 'active' | 'paused' | 'completed'>
  date_range?: {
    start?: string // ISO date
    end?: string // ISO date
  }
  has_participants?: boolean // Filter studies with at least 1 response
  min_participants?: number
}

/**
 * Cross-study search result item
 */
export interface CrossStudySearchResult {
  id: string
  title: string
  description: string | null
  study_type: string
  status: string
  project_id: string
  project_name: string
  participant_count: number
  created_at: string
  updated_at: string
  tags: StudyTag[]
}

/**
 * Search facets for filtering UI
 */
export interface SearchFacets {
  tag_counts: Array<{ tag_id: string; tag_name: string; count: number }>
  type_counts: Array<{ type: string; count: number }>
  status_counts: Array<{ status: string; count: number }>
  project_counts: Array<{ project_id: string; project_name: string; count: number }>
}

/**
 * Paginated search response
 */
export interface CrossStudySearchResponse {
  results: CrossStudySearchResult[]
  total: number
  cursor?: string // For cursor-based pagination
  has_more: boolean
  facets?: SearchFacets
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Tag group options for UI
 */
export const TAG_GROUPS: Array<{
  value: StudyTagGroup
  label: string
  description: string
}> = [
  {
    value: 'product_area',
    label: 'Product Area',
    description: 'Categorize by product or feature area',
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Categorize by team or department',
  },
  {
    value: 'methodology',
    label: 'Methodology',
    description: 'Categorize by research phase or approach',
  },
  {
    value: 'status',
    label: 'Status',
    description: 'Custom status or priority indicators',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'User-defined tag category',
  },
]

/**
 * Suggested tags for each group
 */
export const SUGGESTED_STUDY_TAGS: Record<
  StudyTagGroup,
  Array<{ name: string; color: string; description: string }>
> = {
  product_area: [
    { name: 'Mobile App', color: '#3b82f6', description: 'Mobile application research' },
    { name: 'Web App', color: '#8b5cf6', description: 'Web application research' },
    { name: 'Dashboard', color: '#06b6d4', description: 'Dashboard and analytics' },
    { name: 'Onboarding', color: '#22c55e', description: 'User onboarding flows' },
    { name: 'Checkout', color: '#f97316', description: 'E-commerce checkout' },
    { name: 'Settings', color: '#6b7280', description: 'Settings and preferences' },
  ],
  team: [
    { name: 'Design', color: '#ec4899', description: 'Design team studies' },
    { name: 'Product', color: '#f97316', description: 'Product team studies' },
    { name: 'Engineering', color: '#6366f1', description: 'Engineering team studies' },
    { name: 'Marketing', color: '#14b8a6', description: 'Marketing team studies' },
    { name: 'Growth', color: '#22c55e', description: 'Growth team studies' },
  ],
  methodology: [
    { name: 'Discovery', color: '#a855f7', description: 'Early-stage discovery research' },
    { name: 'Validation', color: '#22c55e', description: 'Concept or design validation' },
    { name: 'Iteration', color: '#f59e0b', description: 'Iterative improvement testing' },
    { name: 'Benchmark', color: '#64748b', description: 'Baseline or benchmark studies' },
    { name: 'Competitive', color: '#ef4444', description: 'Competitive analysis' },
  ],
  status: [
    { name: 'High Priority', color: '#ef4444', description: 'Urgent or high-priority' },
    { name: 'In Review', color: '#f97316', description: 'Currently being reviewed' },
    { name: 'Insights Ready', color: '#22c55e', description: 'Insights have been synthesized' },
    { name: 'Archived', color: '#6b7280', description: 'Archived or completed' },
  ],
  custom: [],
}

/**
 * Available tag colors (matches response-tags.ts)
 */
export const STUDY_TAG_COLORS = [
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
  '#6366f1', // indigo
  '#0ea5e9', // sky
]

// Aliases for naming consistency with components
export const STUDY_TAG_GROUPS = TAG_GROUPS
export const TAG_COLORS = STUDY_TAG_COLORS
