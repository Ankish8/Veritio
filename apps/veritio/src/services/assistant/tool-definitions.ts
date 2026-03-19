/**
 * Veritio AI Assistant — Tool Definitions (Token-Optimized)
 *
 * Ultra-compact tool definitions to minimize input token usage.
 * Descriptions are terse — schemas define the shape.
 */

import type { StudyDataToolName, BuilderToolName, BuilderWriteToolName } from './types'
import type { ToolParameter, ToolDefinition } from './tool-definition-types'
import { QUESTION_TYPE_ENUM } from './shared-constants'
export { getCreateTools, getDraftTools } from './create-tool-definitions'

/** Tool names specific to create mode (study creation workflow) */
export const CREATE_TOOL_NAMES = new Set(['list_study_types', 'list_projects', 'create_project', 'create_study', 'set_draft_basics'])

/** Tool names specific to draft mode (after set_draft_basics) */
export const DRAFT_TOOL_NAMES = new Set([
  'set_draft_basics', 'update_draft_details', 'preview_cards', 'preview_categories', 'preview_settings',
  'preview_tree_nodes', 'preview_tree_tasks', 'preview_survey_questions',
  'preview_first_click_tasks', 'preview_first_impression_designs',
  'preview_prototype_tasks', 'preview_live_website_tasks',
  'get_draft_state', 'create_complete_study',
])

type StudyDataToolDef = ToolDefinition<StudyDataToolName>
type BuilderToolDef = ToolDefinition<BuilderToolName>
type BuilderWriteToolDef = ToolDefinition<BuilderWriteToolName>

export const STUDY_DATA_TOOLS: StudyDataToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'get_study_overview',
      description: 'Get study metadata, settings, participant count, and completion rate.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task_metrics',
      description: 'Per-task metrics: success rate, avg time, directness. For tree/prototype/first-click.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Optional task ID. Omit for all.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_responses',
      description: 'Raw participant responses with answers and timing.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max responses. Default 50.' },
          status: { type: 'string', enum: ['completed', 'in_progress', 'all'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_participant_list',
      description: 'Participants with status, timing, and device info.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['completed', 'in_progress', 'abandoned', 'all'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_card_sort_results',
      description: 'Card sort: categories, agreement matrix, similarity scores.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tree_test_results',
      description: 'Tree test: path analysis, first-click correctness, findability.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_prototype_test_results',
      description: 'Prototype test: completion rates, misclicks, navigation paths.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_first_click_results',
      description: 'First click: coordinates, accuracy, time to click.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_first_impression_results',
      description: 'First impression: ratings, keywords, questionnaire responses.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_survey_results',
      description: 'Survey: question-by-question analysis and distributions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_live_website_results',
      description: 'Live website: task success, completion times, click/scroll events.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_study_data',
      description: 'Export study data as sheets. Returns dataRef for write_export_to_integration.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_export_job',
      description: 'Async export for 100+ participants only. Use export_study_data for normal exports.',
      parameters: {
        type: 'object',
        properties: {
          integration: { type: 'string', description: 'Target toolkit or "csv_download".' },
          format: { type: 'string', enum: ['raw', 'summary', 'both'] },
        },
        required: ['integration'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_insights_report',
      description: 'Generate AI insights report (PDF). Check Downloads tab for progress.',
      parameters: {
        type: 'object',
        properties: {
          regenerate: { type: 'boolean' },
        },
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Builder tool definitions
// ---------------------------------------------------------------------------

// Core builder tools — always available
export const BUILDER_TOOLS: BuilderToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'get_study_config',
      description: 'Get full study config: title, type, settings, flow steps, tasks.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_best_practices',
      description: 'UX methodology best practices for this study type.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_study_flow_reference',
      description: 'Field reference for study flow sections. Call before modifying flow sections.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['welcome', 'participantAgreement', 'screening', 'participantIdentifier', 'preStudyQuestions', 'activityInstructions', 'postStudyQuestions', 'surveyQuestionnaire', 'thankYou', 'closedStudy'],
          },
        },
      },
    },
  },
]

// On-demand builder tools — added only when user mentions relevant keywords
export const BUILDER_ONDEMAND_TOOLS: BuilderToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'validate_study_setup',
      description: 'Validate study setup for issues.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task_list',
      description: 'Get task list with full details.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_launch_readiness',
      description: 'Launch readiness checklist.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ---------------------------------------------------------------------------
// Builder write tool definitions
// ---------------------------------------------------------------------------

const ACTION_PARAM: ToolParameter = {
  type: 'string',
  enum: ['add', 'update', 'remove', 'replace_all'],
  description: 'add/update/remove/replace_all. remove requires user confirmation.',
}

const COMMON_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'update_study',
      description: 'Update study metadata: title, description, purpose, participant_requirements, language, password, url_slug.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          purpose: { type: 'string', description: 'HTML supported' },
          participant_requirements: { type: 'string', description: 'HTML supported' },
          language: { type: 'string' },
          password: { type: 'string' },
          url_slug: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_study_settings',
      description: 'Deep-merge settings. Flow sections under "studyFlow" key. Type-specific settings at top level.',
      parameters: {
        type: 'object',
        properties: {
          settings: { type: 'object', description: 'Partial settings to merge. Flow sections: studyFlow.welcome, studyFlow.thankYou, etc.' },
          closing_rules: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['none', 'date', 'participant_count', 'both'] },
              closeDate: { type: 'string' },
              maxParticipants: { type: 'number' },
            },
          },
          branding: { type: 'object', description: '{primaryColor, backgroundColor, stylePreset, radiusOption, themeMode}' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_flow_questions',
      description: 'Manage screening/pre-study/post-study questions. Screening MUST have branching_logic with rejection rules.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          section: { type: 'string', enum: ['screening', 'pre_study', 'post_study'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question_type: { type: 'string', enum: ['single_line_text', 'multi_line_text', 'multiple_choice', 'yes_no', 'opinion_scale', 'nps', 'slider', 'ranking', 'matrix', 'constant_sum', 'semantic_differential', 'image_choice'] },
                question_text: { type: 'string' },
                description: { type: 'string' },
                is_required: { type: 'boolean' },
                config: { type: 'object', description: 'Type config. multiple_choice: {mode,options:[{label}]}. opinion_scale: {scalePoints,leftLabel,rightLabel}. Use meaningful labels.' },
                display_logic: { type: 'object', description: '{conditions:[{questionId,operator,value}],logicOperator:"and"|"or"}' },
                branching_logic: { type: 'object', description: 'Screening only. {rules:[{optionId,target:"next"|"reject"}],defaultTarget:"next"}' },
                custom_section_id: { type: 'string' },
              },
            },
          },
        },
        required: ['action', 'section', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_ab_tests',
      description: 'A/B test questions. Variant A = current, you provide variant B.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'update', 'remove', 'list'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question_id: { type: 'string' },
                variant_b_content: { type: 'object', description: '{question_text?, description?, config?}' },
                split_percentage: { type: 'number', description: '% seeing variant A. Default 50.' },
                is_enabled: { type: 'boolean' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'configure_flow_section',
      description: 'Configure a flow section with interactive preview.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: ['welcome', 'agreement', 'thank_you', 'instructions'] },
          enabled: { type: 'boolean' },
          title: { type: 'string' },
          message: { type: 'string', description: 'Plain text' },
          includeStudyTitle: { type: 'boolean' },
          includeDescription: { type: 'boolean' },
          includePurpose: { type: 'boolean' },
          includeParticipantRequirements: { type: 'boolean' },
          showIncentive: { type: 'boolean' },
          agreementText: { type: 'string' },
          rejectionTitle: { type: 'string' },
          rejectionMessage: { type: 'string' },
          redirectUrl: { type: 'string' },
          redirectDelay: { type: 'number' },
          part1: { type: 'string' },
          part2: { type: 'string' },
        },
        required: ['section'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'configure_flow_questions',
      description: 'Configure flow questions with interactive preview.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: ['screening', 'pre_study', 'post_study'] },
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
                branching_logic: { type: 'object' },
              },
              required: ['question_type', 'question_text'],
            },
          },
        },
        required: ['section', 'questions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'configure_participant_id',
      description: 'Configure participant identification: anonymous or demographic_profile.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['anonymous', 'demographic_profile'] },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fieldType: { type: 'string', enum: ['name', 'email', 'phone', 'age', 'gender', 'country', 'company', 'job_title', 'department', 'industry', 'experience_level', 'device_type', 'browser', 'os', 'education_level', 'field_of_study'] },
                enabled: { type: 'boolean' },
                required: { type: 'boolean' },
              },
              required: ['fieldType'],
            },
          },
        },
        required: ['type'],
      },
    },
  },
]

// -- Card Sort tools --

const CARD_SORT_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_cards',
      description: 'Manage cards. Each has label, optional description and image ({url} from attachments).',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'object', properties: { url: { type: 'string' }, alt: { type: 'string' } }, required: ['url'] },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_categories',
      description: 'Manage categories for closed/hybrid card sort.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// -- Tree Test tools --

const TREE_TEST_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_tree_nodes',
      description: 'Manage tree nodes. Set parent_id for nesting. Use temp_id for replace_all parent refs.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                temp_id: { type: 'string' },
                label: { type: 'string' },
                parent_id: { type: 'string', description: 'Parent node ID or temp_id. Null for root.' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_tree_test_tasks',
      description: 'Manage tree test tasks. Each has title and optional correct_node_id.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                correct_node_id: { type: 'string' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// -- Survey tools --

const SURVEY_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_survey_questions',
      description: 'Manage survey questions. Same schema as manage_flow_questions items. Use meaningful option labels.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question_type: { type: 'string', enum: ['single_line_text', 'multi_line_text', 'multiple_choice', 'yes_no', 'opinion_scale', 'nps', 'slider', 'ranking', 'matrix', 'constant_sum', 'semantic_differential', 'image_choice', 'audio_response'] },
                question_text: { type: 'string' },
                description: { type: 'string' },
                is_required: { type: 'boolean' },
                config: { type: 'object', description: 'Type config. multiple_choice:{mode,options:[{label}]}. opinion_scale:{scalePoints,leftLabel,rightLabel}. ranking:{items:[{label}]}. matrix:{rows:[{label}],columns:[{label}]}.' },
                display_logic: { type: 'object' },
                survey_branching_logic: { type: 'object', description: 'Choice:{rules:[{optionId,target,targetId?}]}. Scale:{type:"numeric",rules:[{comparison,value,target,targetId?}]}' },
                custom_section_id: { type: 'string' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_survey_rules',
      description: 'Global survey rules for cross-question flow control.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'update', 'remove', 'list'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                is_enabled: { type: 'boolean' },
                trigger_type: { type: 'string', enum: ['on_answer', 'on_question', 'on_section_complete'] },
                trigger_config: { type: 'object' },
                action_type: { type: 'string', enum: ['skip_to_question', 'skip_to_section', 'skip_to_custom_section', 'end_survey', 'show_section', 'hide_section', 'show_custom_section', 'hide_custom_section'] },
                action_config: { type: 'object' },
                conditions: { type: 'object', description: '{groups:[{id,conditions:[{id,source:"question",questionId,operator,values}],matchAll}]}' },
              },
            },
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_custom_sections',
      description: 'Manage custom survey sections. Assign questions via custom_section_id.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                is_visible: { type: 'boolean' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// -- Prototype Test tools --

const PROTOTYPE_TEST_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_prototype_tasks',
      description: 'Manage prototype test tasks. Success criteria require Figma frame selection in UI.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'update', 'remove'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// -- First Click tools --

const FIRST_CLICK_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_first_click_tasks',
      description: 'Manage first click tasks. Set image from user attachments.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'update', 'remove'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                instruction: { type: 'string' },
                image: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// -- First Impression tools --

const FIRST_IMPRESSION_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_first_impression_designs',
      description: 'Manage first impression designs. Set image from user attachments.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'update', 'remove'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                image: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
                is_practice: { type: 'boolean' },
                questions: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// -- Live Website Test tools --

const LIVE_WEBSITE_WRITE_TOOLS: BuilderWriteToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'manage_live_website_tasks',
      description: 'Manage live website tasks with target_url and success criteria.',
      parameters: {
        type: 'object',
        properties: {
          action: ACTION_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                instructions: { type: 'string' },
                target_url: { type: 'string' },
                success_url: { type: 'string' },
                success_criteria_type: { type: 'string', enum: ['self_reported', 'url_match', 'exact_path'] },
                time_limit_seconds: { type: 'number' },
                post_task_questions: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        required: ['action', 'items'],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function getBuilderTools(): BuilderToolDefinition[] {
  return BUILDER_TOOLS
}

export function getBuilderOndemandTools(): BuilderToolDefinition[] {
  return BUILDER_ONDEMAND_TOOLS
}

export function getBuilderWriteToolsForStudyType(studyType: string): BuilderWriteToolDef[] {
  const typeToolMap: Record<string, BuilderWriteToolDef[]> = {
    card_sort: CARD_SORT_WRITE_TOOLS,
    tree_test: TREE_TEST_WRITE_TOOLS,
    survey: SURVEY_WRITE_TOOLS,
    prototype_test: PROTOTYPE_TEST_WRITE_TOOLS,
    first_click: FIRST_CLICK_WRITE_TOOLS,
    first_impression: FIRST_IMPRESSION_WRITE_TOOLS,
    live_website_test: LIVE_WEBSITE_WRITE_TOOLS,
  }

  return [...COMMON_WRITE_TOOLS, ...(typeToolMap[studyType] ?? [])]
}

export function getToolsForStudyType(studyType: string): ToolDefinition[] {
  const studyTypeToolMap: Record<string, StudyDataToolName[]> = {
    card_sort: ['get_card_sort_results'],
    tree_test: ['get_tree_test_results'],
    prototype_test: ['get_prototype_test_results'],
    first_click: ['get_first_click_results'],
    first_impression: ['get_first_impression_results'],
    survey: ['get_survey_results'],
    live_website_test: ['get_live_website_results'],
  }

  // get_study_overview is preloaded into system prompt — no need to call it
  // Export tools + generate_insights_report excluded by default —
  // only added when user explicitly requests them
  const commonTools: StudyDataToolName[] = [
    'get_task_metrics',
    'get_responses',
    'get_participant_list',
  ]

  const studySpecificTools = studyTypeToolMap[studyType] ?? []
  const allowedTools = new Set([...commonTools, ...studySpecificTools])

  return STUDY_DATA_TOOLS.filter((t) => allowedTools.has(t.function.name))
}

/** Export tools — added when user mentions export/download */
export function getExportTools(): ToolDefinition[] {
  const exportToolNames: StudyDataToolName[] = ['export_study_data', 'create_export_job']
  return STUDY_DATA_TOOLS.filter((t) => exportToolNames.includes(t.function.name))
}

/** Report tool — added when user mentions report/insights */
export function getReportTools(): ToolDefinition[] {
  return STUDY_DATA_TOOLS.filter((t) => t.function.name === 'generate_insights_report')
}
