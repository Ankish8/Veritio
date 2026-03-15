/**
 * Veritio AI Assistant — Create Mode Tool Definitions (Token-Optimized)
 */

import type { CreateToolName, DraftToolName } from './types'

interface ToolParameter {
  type: string
  description?: string
  enum?: string[]
  items?: Record<string, unknown>
  properties?: Record<string, ToolParameter>
  required?: string[]
}

interface ToolDefinition {
  type: 'function'
  function: {
    name: CreateToolName | DraftToolName
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameter>
      required?: string[]
    }
  }
}

const STUDY_TYPES = ['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test'] as const

export const CREATE_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_study_types',
      description: 'List available study types with descriptions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'List user projects with names and IDs.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Create a new project.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_draft_basics',
      description: 'Set study type, project, title. Renders interactive details panel. STOP after calling.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          title: { type: 'string' },
          study_type: { type: 'string', enum: [...STUDY_TYPES] },
          description: { type: 'string' },
          sort_mode: { type: 'string', enum: ['open', 'closed', 'hybrid'], description: 'Required for card_sort.' },
          purpose: { type: 'string' },
          participant_requirements: { type: 'string' },
        },
        required: ['project_id', 'title', 'study_type'],
      },
    },
  },
]

const COMMON_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'update_draft_details',
      description: 'Update draft title, description, sort_mode, purpose, or participant_requirements.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          sort_mode: { type: 'string', enum: ['open', 'closed', 'hybrid'] },
          purpose: { type: 'string' },
          participant_requirements: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preview_settings',
      description: 'Preview and configure study settings with interactive toggles.',
      parameters: {
        type: 'object',
        properties: {
          settings: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['open', 'closed', 'hybrid'] },
              randomizeCards: { type: 'boolean' },
              randomizeCategories: { type: 'boolean' },
              showProgress: { type: 'boolean' },
              allowSkip: { type: 'boolean' },
              includeUnclearCategory: { type: 'boolean' },
              showCardDescriptions: { type: 'boolean' },
              showCategoryDescriptions: { type: 'boolean' },
              allowNewCategories: { type: 'boolean' },
              allowMultipleCategories: { type: 'boolean' },
            },
          },
        },
        required: ['settings'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_draft_state',
      description: 'Get current draft with user edits. Call before re-proposing content.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_complete_study',
      description: 'Create study from draft. Writes everything to DB.',
      parameters: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Must be true.' },
        },
        required: ['confirm'],
      },
    },
  },
]

const CARD_SORT_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_cards',
      description: 'Preview editable card list.',
      parameters: {
        type: 'object',
        properties: {
          cards: {
            type: 'array',
            items: { type: 'object', properties: { label: { type: 'string' }, description: { type: 'string' } }, required: ['label'] },
          },
        },
        required: ['cards'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preview_categories',
      description: 'Preview editable category list for closed/hybrid sort.',
      parameters: {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            items: { type: 'object', properties: { label: { type: 'string' }, description: { type: 'string' } }, required: ['label'] },
          },
        },
        required: ['categories'],
      },
    },
  },
]

const TREE_TEST_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_tree_nodes',
      description: 'Preview editable tree hierarchy.',
      parameters: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                temp_id: { type: 'string' },
                label: { type: 'string' },
                parent_temp_id: { type: 'string' },
              },
              required: ['temp_id', 'label'],
            },
          },
        },
        required: ['nodes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preview_tree_tasks',
      description: 'Preview editable tree test tasks.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                correct_node_temp_id: { type: 'string' },
              },
              required: ['question'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
]

const SURVEY_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_survey_questions',
      description: 'Preview editable survey questions.',
      parameters: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question_type: { type: 'string', enum: ['single_line_text', 'multi_line_text', 'multiple_choice', 'yes_no', 'opinion_scale', 'nps', 'slider', 'ranking', 'matrix'] },
                question_text: { type: 'string' },
                description: { type: 'string' },
                is_required: { type: 'boolean' },
                config: { type: 'object' },
              },
              required: ['question_type', 'question_text'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },
]

const FIRST_CLICK_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_first_click_tasks',
      description: 'Preview first click tasks.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instruction: { type: 'string' },
                image_url: { type: 'string' },
              },
              required: ['instruction'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
]

const FIRST_IMPRESSION_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_first_impression_designs',
      description: 'Preview first impression designs.',
      parameters: {
        type: 'object',
        properties: {
          designs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                image_url: { type: 'string' },
                is_practice: { type: 'boolean' },
              },
              required: ['name'],
            },
          },
        },
        required: ['designs'],
      },
    },
  },
]

const PROTOTYPE_TEST_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_prototype_tasks',
      description: 'Preview prototype test tasks.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['title'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
]

const LIVE_WEBSITE_TEST_DRAFT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'preview_live_website_tasks',
      description: 'Preview live website tasks with URL fields.',
      parameters: {
        type: 'object',
        properties: {
          website_url: { type: 'string' },
          mode: { type: 'string', enum: ['url_only', 'reverse_proxy', 'snippet'] },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                instructions: { type: 'string' },
                target_url: { type: 'string' },
                success_url: { type: 'string' },
                success_criteria_type: { type: 'string', enum: ['self_reported', 'url_match'] },
                time_limit_seconds: { type: 'number' },
              },
              required: ['title', 'target_url'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
]

const STUDY_TYPE_DRAFT_TOOLS: Record<string, ToolDefinition[]> = {
  card_sort: CARD_SORT_DRAFT_TOOLS,
  tree_test: TREE_TEST_DRAFT_TOOLS,
  survey: SURVEY_DRAFT_TOOLS,
  first_click: FIRST_CLICK_DRAFT_TOOLS,
  first_impression: FIRST_IMPRESSION_DRAFT_TOOLS,
  prototype_test: PROTOTYPE_TEST_DRAFT_TOOLS,
  live_website_test: LIVE_WEBSITE_TEST_DRAFT_TOOLS,
}

export function getCreateTools(): ToolDefinition[] {
  return CREATE_TOOLS
}

const BUILDER_ONLY_TYPES = new Set(['prototype_test', 'first_click', 'first_impression'])

export function getDraftTools(studyType?: string): ToolDefinition[] {
  if (studyType && BUILDER_ONLY_TYPES.has(studyType)) {
    return [...COMMON_DRAFT_TOOLS]
  }
  if (studyType && STUDY_TYPE_DRAFT_TOOLS[studyType]) {
    return [...COMMON_DRAFT_TOOLS, ...STUDY_TYPE_DRAFT_TOOLS[studyType]]
  }
  return [...COMMON_DRAFT_TOOLS, ...Object.values(STUDY_TYPE_DRAFT_TOOLS).flat()]
}
