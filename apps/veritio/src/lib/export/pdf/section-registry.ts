/**
 * Section Registry
 *
 * Defines available PDF sections for each study type.
 * Each section specifies what charts to capture and how to render them.
 */

import type { SectionDefinition, StudyType } from './types'

// ============================================================================
// Card Sort Sections
// ============================================================================

export const CARD_SORT_SECTIONS: SectionDefinition[] = [
  {
    id: 'overview',
    title: 'Study Overview',
    description: 'Participant statistics, completion rates, and study metadata',
    category: 'overview',
    isDefault: true,
    requiresData: ['stats'],
    chartElements: [
      {
        id: 'overview-stats',
        domSelector: '[data-pdf-chart="overview-stats"]',
        title: 'Participation Overview',
      },
    ],
  },
  {
    id: 'dendrogram',
    title: 'Dendrogram',
    description: 'Hierarchical clustering visualization showing card groupings',
    category: 'analysis',
    isDefault: true,
    requiresData: ['analysis.dendrogram'],
    chartElements: [
      {
        id: 'dendrogram',
        domSelector: '[data-pdf-chart="dendrogram"]',
        title: 'Hierarchical Clustering Dendrogram',
      },
    ],
  },
  {
    id: 'similarity-matrix',
    title: 'Similarity Matrix',
    description: 'Heatmap showing card-to-card similarity scores',
    category: 'analysis',
    isDefault: true,
    requiresData: ['analysis.similarityMatrix'],
    chartElements: [
      {
        id: 'similarity-matrix',
        domSelector: '[data-pdf-chart="similarity-matrix"]',
        title: 'Card Similarity Matrix',
      },
    ],
  },
  {
    id: 'results-matrix',
    title: 'Results Matrix',
    description: 'Card-to-category placement visualization',
    category: 'analysis',
    isDefault: true,
    requiresData: ['categories', 'responses'],
    chartElements: [
      {
        id: 'results-matrix',
        domSelector: '[data-pdf-chart="results-matrix"]',
        title: 'Card Placement Results',
      },
    ],
  },
  {
    id: 'category-agreement',
    title: 'Category Agreement',
    description: 'How participants agreed on card categorization',
    category: 'analysis',
    isDefault: false,
    requiresData: ['analysis.categoryAgreement'],
    chartElements: [
      {
        id: 'category-agreement',
        domSelector: '[data-pdf-chart="category-agreement"]',
        title: 'Category Agreement Analysis',
      },
    ],
  },
  {
    id: 'questionnaire',
    title: 'Questionnaire Responses',
    description: 'Pre and post study questionnaire visualizations',
    category: 'questionnaire',
    isDefault: true,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [], // Dynamic - populated at runtime
    isDynamic: true,
  },
]

// ============================================================================
// Tree Test Sections
// ============================================================================

export const TREE_TEST_SECTIONS: SectionDefinition[] = [
  {
    id: 'overview',
    title: 'Study Overview',
    description: 'Participant statistics, completion rates, and overall metrics',
    category: 'overview',
    isDefault: true,
    requiresData: ['metrics'],
    chartElements: [
      {
        id: 'overview-stats',
        domSelector: '[data-pdf-chart="overview-stats"]',
        title: 'Participation Overview',
      },
    ],
  },
  {
    id: 'task-performance',
    title: 'Task Performance',
    description: 'Success and failure rates for each task',
    category: 'analysis',
    isDefault: true,
    requiresData: ['responses', 'tasks'],
    chartElements: [
      {
        id: 'task-performance',
        domSelector: '[data-pdf-chart="task-performance"]',
        title: 'Task Success Rates',
      },
    ],
  },
  {
    id: 'pietree',
    title: 'Navigation Flow',
    description: 'Pietree visualization showing navigation patterns',
    category: 'analysis',
    isDefault: true,
    requiresData: ['responses', 'nodes'],
    chartElements: [
      {
        id: 'pietree',
        domSelector: '[data-pdf-chart="pietree"]',
        title: 'Navigation Flow Visualization',
      },
    ],
  },
  {
    id: 'first-click',
    title: 'First Click Analysis',
    description: 'First click patterns for each task',
    category: 'analysis',
    isDefault: false,
    requiresData: ['responses'],
    chartElements: [
      {
        id: 'first-click',
        domSelector: '[data-pdf-chart="first-click"]',
        title: 'First Click Distribution',
      },
    ],
  },
  {
    id: 'time-analysis',
    title: 'Time Analysis',
    description: 'Task completion time statistics',
    category: 'analysis',
    isDefault: false,
    requiresData: ['responses'],
    chartElements: [
      {
        id: 'time-analysis',
        domSelector: '[data-pdf-chart="time-analysis"]',
        title: 'Time Distribution',
      },
    ],
  },
  {
    id: 'questionnaire',
    title: 'Questionnaire Responses',
    description: 'Pre and post study questionnaire visualizations',
    category: 'questionnaire',
    isDefault: true,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [],
    isDynamic: true,
  },
]

// ============================================================================
// Survey Sections
// ============================================================================

export const SURVEY_SECTIONS: SectionDefinition[] = [
  {
    id: 'overview',
    title: 'Study Overview',
    description: 'Participant statistics and completion rates',
    category: 'overview',
    isDefault: true,
    requiresData: ['stats'],
    chartElements: [
      {
        id: 'overview-stats',
        domSelector: '[data-pdf-chart="overview-stats"]',
        title: 'Participation Overview',
      },
    ],
  },
  {
    id: 'responses',
    title: 'Response Distributions',
    description: 'Per-question response visualizations',
    category: 'analysis',
    isDefault: true,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [], // Dynamic - one per question
    isDynamic: true,
  },
  {
    id: 'correlation',
    title: 'Correlation Matrix',
    description: 'Question-to-question correlation analysis',
    category: 'analysis',
    isDefault: false,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [
      {
        id: 'correlation-matrix',
        domSelector: '[data-pdf-chart="correlation-matrix"]',
        title: 'Response Correlation Matrix',
      },
    ],
  },
  {
    id: 'cross-tabulation',
    title: 'Cross-Tabulation',
    description: 'Cross-tabulation analysis between questions',
    category: 'analysis',
    isDefault: false,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [
      {
        id: 'cross-tabulation',
        domSelector: '[data-pdf-chart="cross-tabulation"]',
        title: 'Cross-Tabulation Results',
      },
    ],
  },
  {
    id: 'nps',
    title: 'NPS Analysis',
    description: 'Net Promoter Score analysis (if NPS questions exist)',
    category: 'analysis',
    isDefault: true,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [
      {
        id: 'nps-analysis',
        domSelector: '[data-pdf-chart="nps-analysis"]',
        title: 'Net Promoter Score',
      },
    ],
  },
]

// ============================================================================
// Prototype Test Sections
// ============================================================================

export const PROTOTYPE_TEST_SECTIONS: SectionDefinition[] = [
  {
    id: 'overview',
    title: 'Study Overview',
    description: 'Participant statistics, completion rates, and task performance metrics',
    category: 'overview',
    isDefault: true,
    requiresData: ['metrics'],
    chartElements: [
      {
        id: 'overview-stats',
        domSelector: '[data-pdf-chart="overview-stats"]',
        title: 'Participation Overview',
      },
    ],
  },
  {
    id: 'task-performance',
    title: 'Task Performance',
    description: 'Success, failure, skip, and abandon rates for each task',
    category: 'analysis',
    isDefault: true,
    requiresData: ['taskAttempts', 'tasks'],
    chartElements: [
      {
        id: 'task-performance',
        domSelector: '[data-pdf-chart="task-performance"]',
        title: 'Task Performance Chart',
      },
    ],
  },
  {
    id: 'questionnaire',
    title: 'Questionnaire Responses',
    description: 'Pre and post study questionnaire visualizations',
    category: 'questionnaire',
    isDefault: true,
    requiresData: ['flowQuestions', 'flowResponses'],
    chartElements: [],
    isDynamic: true,
  },
]

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Get sections for a study type
 */
export function getSectionsForStudyType(studyType: StudyType): SectionDefinition[] {
  switch (studyType) {
    case 'card_sort':
      return CARD_SORT_SECTIONS
    case 'tree_test':
      return TREE_TEST_SECTIONS
    case 'survey':
      return SURVEY_SECTIONS
    case 'prototype_test':
      return PROTOTYPE_TEST_SECTIONS
    default:
      return []
  }
}

/**
 * Get default selected sections for a study type
 */
export function getDefaultSections(studyType: StudyType): string[] {
  const sections = getSectionsForStudyType(studyType)
  return sections.filter((s) => s.isDefault).map((s) => s.id)
}

/**
 * Get section by ID
 */
export function getSectionById(
  studyType: StudyType,
  sectionId: string
): SectionDefinition | undefined {
  const sections = getSectionsForStudyType(studyType)
  return sections.find((s) => s.id === sectionId)
}

/**
 * Check if data dependencies are met for a section
 */
export function checkSectionDataAvailability(
  section: SectionDefinition,
  data: Record<string, unknown>
): boolean {
  return section.requiresData.every((path) => {
    const parts = path.split('.')
    let current: unknown = data

    for (const part of parts) {
      if (current === null || current === undefined) return false
      if (typeof current !== 'object') return false
      current = (current as Record<string, unknown>)[part]
    }

    // Check if the value is truthy and not empty
    if (current === null || current === undefined) return false
    if (Array.isArray(current) && current.length === 0) return false
    if (typeof current === 'object' && Object.keys(current).length === 0) return false

    return true
  })
}

/**
 * Get sections with data availability status
 */
export function getSectionsWithAvailability(
  studyType: StudyType,
  data: Record<string, unknown>
): Array<SectionDefinition & { hasData: boolean }> {
  const sections = getSectionsForStudyType(studyType)

  return sections.map((section) => ({
    ...section,
    hasData: checkSectionDataAvailability(section, data),
  }))
}
