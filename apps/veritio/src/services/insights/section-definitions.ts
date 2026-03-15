/**
 * Section registry — defines which report sections apply per study type
 * and what data each section needs from the results service.
 */

export interface SectionDefinition {
  id: string
  title: string
  /** Which LLM call group this section belongs to (sections in the same group are batched) */
  group: 'overview' | 'deep_analysis' | 'questionnaire' | 'synthesis'
  /** Brief description for the LLM prompt */
  description: string
}

const COMPLETION_OVERVIEW: SectionDefinition = {
  id: 'completion_overview',
  title: 'Completion Overview',
  group: 'overview',
  description: 'Participant completion rates, abandonment, average time, device breakdown',
}

const QUESTIONNAIRE_INSIGHTS: SectionDefinition = {
  id: 'questionnaire_insights',
  title: 'Questionnaire Insights',
  group: 'questionnaire',
  description: 'Analysis of pre-study and post-study questionnaire responses',
}

// ---------------------------------------------------------------------------
// Per-study-type section registries
// ---------------------------------------------------------------------------

const CARD_SORT_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'category_analysis',
    title: 'Category Analysis',
    group: 'deep_analysis',
    description: 'How participants grouped cards into categories, agreement levels, most/least agreed-upon placements',
  },
  {
    id: 'similarity_patterns',
    title: 'Similarity Patterns',
    group: 'deep_analysis',
    description: 'Card-to-card similarity scores, natural clusters, top similar pairs',
  },
  {
    id: 'problematic_cards',
    title: 'Problematic Cards',
    group: 'deep_analysis',
    description: 'Cards with low agreement or scattered across many categories',
  },
  QUESTIONNAIRE_INSIGHTS,
]

const TREE_TEST_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'task_performance',
    title: 'Task Performance',
    group: 'deep_analysis',
    description: 'Per-task success rates, directness scores, time-to-complete',
  },
  {
    id: 'navigation_patterns',
    title: 'Navigation Patterns',
    group: 'deep_analysis',
    description: 'Common navigation paths, first-click accuracy, backtracking frequency',
  },
  {
    id: 'time_analysis',
    title: 'Time Analysis',
    group: 'deep_analysis',
    description: 'Time distribution across tasks, outliers, fast vs slow completers',
  },
  {
    id: 'problematic_tasks',
    title: 'Problematic Tasks',
    group: 'deep_analysis',
    description: 'Tasks with low success or high abandonment rates',
  },
  QUESTIONNAIRE_INSIGHTS,
]

const SURVEY_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'response_distributions',
    title: 'Response Distributions',
    group: 'deep_analysis',
    description: 'Per-question response distributions, most/least selected options, scale averages',
  },
  {
    id: 'open_text_themes',
    title: 'Open Text Themes',
    group: 'deep_analysis',
    description: 'Common themes and patterns in open-ended text responses',
  },
  {
    id: 'cross_tabulation_insights',
    title: 'Cross-Tabulation Insights',
    group: 'deep_analysis',
    description: 'Interesting correlations between question responses',
  },
  QUESTIONNAIRE_INSIGHTS,
]

const PROTOTYPE_TEST_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'task_performance',
    title: 'Task Performance',
    group: 'deep_analysis',
    description: 'Per-task success rates, average time, completion vs abandonment',
  },
  {
    id: 'misclick_analysis',
    title: 'Misclick Analysis',
    group: 'deep_analysis',
    description: 'Average misclicks per task, common misclick areas',
  },
  {
    id: 'navigation_efficiency',
    title: 'Navigation Efficiency',
    group: 'deep_analysis',
    description: 'Path lengths, backtracking, direct vs indirect success',
  },
  QUESTIONNAIRE_INSIGHTS,
]

const FIRST_CLICK_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'click_accuracy',
    title: 'Click Accuracy',
    group: 'deep_analysis',
    description: 'Per-task success rates, AOI hit rates, misclick categories',
  },
  {
    id: 'time_to_click',
    title: 'Time to Click',
    group: 'deep_analysis',
    description: 'Average and median time to first click, time distributions across tasks',
  },
  QUESTIONNAIRE_INSIGHTS,
]

const FIRST_IMPRESSION_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'keyword_analysis',
    title: 'Keyword Analysis',
    group: 'deep_analysis',
    description: 'Most frequent keywords and themes from text responses per design',
  },
  {
    id: 'rating_distributions',
    title: 'Rating Distributions',
    group: 'deep_analysis',
    description: 'Scale/rating question distributions, average ratings per design',
  },
  {
    id: 'design_comparison',
    title: 'Design Comparison',
    group: 'deep_analysis',
    description: 'Side-by-side comparison of metrics across designs',
  },
  QUESTIONNAIRE_INSIGHTS,
]

const LIVE_WEBSITE_SECTIONS: SectionDefinition[] = [
  COMPLETION_OVERVIEW,
  {
    id: 'task_success_analysis',
    title: 'Task Success Analysis',
    group: 'deep_analysis',
    description: 'Per-task success rates (direct, indirect, self-reported), abandonment',
  },
  {
    id: 'usability_score',
    title: 'Usability Score',
    group: 'deep_analysis',
    description: 'Overall usability score breakdown, time efficiency, error avoidance',
  },
  {
    id: 'event_analysis',
    title: 'Event Analysis',
    group: 'deep_analysis',
    description: 'Click patterns, rage clicks, page navigation depth',
  },
  QUESTIONNAIRE_INSIGHTS,
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const SECTION_MAP: Record<string, SectionDefinition[]> = {
  card_sort: CARD_SORT_SECTIONS,
  tree_test: TREE_TEST_SECTIONS,
  survey: SURVEY_SECTIONS,
  prototype_test: PROTOTYPE_TEST_SECTIONS,
  first_click: FIRST_CLICK_SECTIONS,
  first_impression: FIRST_IMPRESSION_SECTIONS,
  live_website_test: LIVE_WEBSITE_SECTIONS,
}

export function getSectionsForStudyType(studyType: string): SectionDefinition[] {
  return SECTION_MAP[studyType] ?? []
}

export function getSectionGroups(studyType: string): Map<string, SectionDefinition[]> {
  const sections = getSectionsForStudyType(studyType)
  const groups = new Map<string, SectionDefinition[]>()

  for (const section of sections) {
    const group = groups.get(section.group) ?? []
    group.push(section)
    groups.set(section.group, group)
  }

  return groups
}
