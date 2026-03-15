/**
 * Rule Templates
 *
 * Pre-built rule configurations for common survey logic patterns.
 * Users select a template, fill in placeholders, and get a complete rule.
 */

import type {
  RuleTemplate,
  TemplatePlaceholder,
  SurveyRuleInsert,
  RuleConditions,
  ConditionGroup,
  RuleCondition,
} from '../supabase/survey-rules-types';
import type { FlowSection } from '../supabase/study-flow-types';
// Template Definitions

export const RULE_TEMPLATES: RuleTemplate[] = [
  // 1. Skip if Not Buyer
  {
    id: 'skip-if-not-buyer',
    name: 'Skip Section for Non-Buyers',
    description: 'Skip a section when participant selects "No" to a purchase intent question',
    category: 'screening',
    icon: 'ArrowRight',
    placeholders: [
      {
        id: 'triggerQuestion',
        label: 'Trigger Question',
        description: 'The question about purchase intent (e.g., "Have you purchased this product?")',
        type: 'question',
        required: true,
      },
      {
        id: 'noOptionValue',
        label: '"No" Option Value',
        description: 'The option ID or value that represents "No"',
        type: 'text',
        required: true,
        defaultValue: 'no',
      },
      {
        id: 'targetSection',
        label: 'Section to Skip',
        description: 'The section to skip to when "No" is selected',
        type: 'section',
        required: true,
      },
    ],
    createRule: (values) => ({
      name: 'Skip for non-buyers',
      description: 'Skips to a different section when participant has not purchased',
      is_enabled: true,
      conditions: createConditions([
        {
          source: { type: 'question', questionId: String(values.triggerQuestion) },
          operator: 'equals',
          values: [String(values.noOptionValue)],
        },
      ]),
      action_type: 'skip_to_section',
      action_config: { section: values.targetSection as FlowSection },
      trigger_type: 'on_answer',
      trigger_config: {},
    }),
  },
  // 2. End Survey for Disqualified
  {
    id: 'end-for-disqualified',
    name: 'End Survey for Disqualified',
    description: 'End the survey early when participant fails a screening question',
    category: 'screening',
    icon: 'XCircle',
    placeholders: [
      {
        id: 'screeningQuestion',
        label: 'Screening Question',
        description: 'The question used to screen participants',
        type: 'question',
        required: true,
      },
      {
        id: 'disqualifyValue',
        label: 'Disqualifying Answer',
        description: 'The answer that disqualifies the participant',
        type: 'text',
        required: true,
      },
      {
        id: 'endTitle',
        label: 'End Screen Title',
        description: 'Title shown to disqualified participants',
        type: 'text',
        required: true,
        defaultValue: 'Thank you for your interest',
      },
      {
        id: 'endMessage',
        label: 'End Screen Message',
        description: 'Message explaining why they cannot continue',
        type: 'text',
        required: true,
        defaultValue: 'Unfortunately, you do not meet the criteria for this study.',
      },
    ],
    createRule: (values) => ({
      name: 'End for disqualified',
      description: 'Ends survey when participant fails screening criteria',
      is_enabled: true,
      conditions: createConditions([
        {
          source: { type: 'question', questionId: String(values.screeningQuestion) },
          operator: 'equals',
          values: [String(values.disqualifyValue)],
        },
      ]),
      action_type: 'end_survey',
      action_config: {
        title: String(values.endTitle),
        message: String(values.endMessage),
      },
      trigger_type: 'on_answer',
      trigger_config: {},
    }),
  },
  // 3. Show Follow-up Section
  {
    id: 'show-followup-section',
    name: 'Show Follow-up Section',
    description: 'Show a hidden section when participant expresses interest',
    category: 'visibility',
    icon: 'Eye',
    placeholders: [
      {
        id: 'interestQuestion',
        label: 'Interest Question',
        description: 'Question that determines if follow-up is needed',
        type: 'question',
        required: true,
      },
      {
        id: 'interestValue',
        label: 'Interest Answer',
        description: 'The answer that indicates interest',
        type: 'text',
        required: true,
        defaultValue: 'yes',
      },
      {
        id: 'sectionToShow',
        label: 'Section to Show',
        description: 'The initially hidden section to reveal',
        type: 'section',
        required: true,
      },
    ],
    createRule: (values) => ({
      name: 'Show follow-up section',
      description: 'Shows additional questions when participant expresses interest',
      is_enabled: true,
      conditions: createConditions([
        {
          source: { type: 'question', questionId: String(values.interestQuestion) },
          operator: 'equals',
          values: [String(values.interestValue)],
        },
      ]),
      action_type: 'show_section',
      action_config: { section: values.sectionToShow as FlowSection },
      trigger_type: 'on_answer',
      trigger_config: {},
    }),
  },
  // 4. Score-Based Branching
  {
    id: 'score-based-branching',
    name: 'Score-Based Branching',
    description: 'Route participants to different paths based on a calculated score',
    category: 'scoring',
    icon: 'Calculator',
    placeholders: [
      {
        id: 'scoreVariable',
        label: 'Score Variable',
        description: 'The score variable to evaluate',
        type: 'variable',
        required: true,
      },
      {
        id: 'threshold',
        label: 'Score Threshold',
        description: 'Minimum score to qualify for the branch',
        type: 'number',
        required: true,
        defaultValue: 50,
      },
      {
        id: 'highScoreSection',
        label: 'High Score Section',
        description: 'Section for participants meeting the threshold',
        type: 'section',
        required: true,
      },
    ],
    createRule: (values) => ({
      name: 'High score path',
      description: `Routes participants with score >= ${values.threshold} to a specific section`,
      is_enabled: true,
      conditions: createConditions([
        {
          source: { type: 'variable', variableName: String(values.scoreVariable) },
          operator: 'greater_than_or_equals',
          values: [Number(values.threshold)],
        },
      ]),
      action_type: 'skip_to_section',
      action_config: { section: values.highScoreSection as FlowSection },
      trigger_type: 'on_section_complete',
      trigger_config: { section: 'screening' as FlowSection }, // Default, user may want to change
    }),
  },
];
// Helpers
function createConditions(conditions: Omit<RuleCondition, 'id'>[]): RuleConditions {
  const group: ConditionGroup = {
    id: crypto.randomUUID(),
    conditions: conditions.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
    })),
    matchAll: true,
  };

  return { groups: [group] };
}
export function getTemplatesByCategory(category: RuleTemplate['category']): RuleTemplate[] {
  return RULE_TEMPLATES.filter((t) => t.category === category);
}
export function getTemplateById(id: string): RuleTemplate | undefined {
  return RULE_TEMPLATES.find((t) => t.id === id);
}
export const TEMPLATE_CATEGORIES = [
  { id: 'screening', label: 'Screening', description: 'Filter and qualify participants' },
  { id: 'branching', label: 'Branching', description: 'Route to different paths' },
  { id: 'visibility', label: 'Visibility', description: 'Show or hide sections' },
  { id: 'scoring', label: 'Scoring', description: 'Use calculated scores' },
] as const;
