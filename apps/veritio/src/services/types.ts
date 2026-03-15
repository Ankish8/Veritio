import { z } from 'zod'

// Re-export database types for convenience
export type {
  Project,
  Study,
  Card,
  CardImage,
  CardWithImage,
  Category,
  TreeNode,
  Task,
  Participant,
  CardSortResponse,
  TreeTestResponse,
  ProjectInsert,
  StudyInsert,
  CardInsert,
  CategoryInsert,
  TreeNodeInsert,
  TaskInsert,
  ParticipantInsert,
  ProjectUpdate,
  StudyUpdate,
  // Prototype test types
  PrototypeTestPrototype,
  PrototypeTestFrame,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  PrototypeTestSettings,
  PrototypeTestPrototypeInsert,
  PrototypeTestFrameInsert,
  PrototypeTestTaskInsert,
} from '@veritio/study-types'

// Zod schemas for validation
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  organizationId: z.string().uuid('Organization ID is required'),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
})

export const createStudySchema = z.object({
  study_type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
  title: z.string().min(1, 'Study title is required').max(255),
  description: z.string().max(2000).nullable().optional(),
  initial_settings: z.record(z.unknown()).optional(),
})

// Closing rule schema for auto-close functionality
// Accepts both new format (type: none/date/participant_count/both)
// and legacy format (type: responses, enabled, maxResponses)
export const closingRuleSchema = z.object({
  type: z.string(), // Accept any string for backwards compatibility
  closeDate: z.string().nullable().optional(),
  maxParticipants: z.number().int().min(1).max(20000).nullable().optional(),
  closeMessage: z.string().nullable().optional(),
  // Legacy fields
  enabled: z.boolean().optional(),
  maxResponses: z.number().int().optional(),
}).passthrough() // Allow any additional fields

// Branding schema for logo, colors, and button customization
export const brandingSchema = z.object({
  logo: z.object({
    url: z.string(),
    filename: z.string(),
    size: z.number().optional(),
  }).optional(),
  logoSize: z.number().min(24).max(80).optional(), // Logo height in pixels
  socialImage: z.object({
    url: z.string(),
    filename: z.string(),
  }).optional(),
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  buttonText: z.object({
    continue: z.string().optional(),
    finished: z.string().optional(),
  }).optional(),
  cardSortInstructions: z.string().optional(),
  // Style customization fields
  stylePreset: z.enum(['default', 'vega', 'nova', 'maia', 'lyra', 'mira']).optional(),
  radiusOption: z.enum(['none', 'small', 'default', 'large']).optional(),
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
})

// Response prevention settings schema
export const responsePreventionSettingsSchema = z.object({
  level: z.enum(['none', 'relaxed', 'moderate', 'strict']),
}).passthrough()

// Think-aloud settings schema for session recordings
export const thinkAloudSettingsSchema = z.object({
  enabled: z.boolean(),
  showEducation: z.boolean(),
  silenceThresholdSeconds: z.number().min(5).max(60),
  audioLevelThreshold: z.number().min(0).max(1),
  promptPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  customPrompts: z.array(z.string().max(200)).max(10).optional(),
})

// Session recording settings schema
export const sessionRecordingSettingsSchema = z.object({
  enabled: z.boolean(),
  captureMode: z.enum(['audio', 'screen_and_audio', 'video_and_audio']),
  recordingScope: z.enum(['session', 'task']),
  privacyNotice: z.array(z.string().max(500)).max(10).optional(),
  transcriptionLanguage: z.string().max(10).optional(),
  thinkAloud: thinkAloudSettingsSchema.optional(),
})

// Email notification settings schema
export const emailNotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  triggers: z.object({
    everyResponse: z.boolean().optional(),
    milestones: z.object({
      enabled: z.boolean(),
      values: z.array(z.number()),
    }).optional(),
    dailyDigest: z.boolean().optional(),
    onClose: z.boolean().optional(),
  }).optional(),
  maxEmailsPerHour: z.number().optional(),
  milestonesReached: z.array(z.number()).optional(),
}).passthrough()

// File attachment schema
export const fileAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
})

// Sharing settings schema
export const interceptScreeningQuestionSchema = z.object({
  question: z.string().max(500),
  options: z.array(z.string().max(200)).min(2).max(5),
  correctOption: z.number().int().min(0).optional(),
})

// Phase 1: Frequency capping and targeting schemas
export const frequencyCappingSettingsSchema = z.object({
  enabled: z.boolean(),
  maxImpressions: z.number().int().min(1).max(100),
  timeWindow: z.enum(['day', 'week', 'month', 'forever']),
  hideAfterParticipation: z.boolean(),
})

export const targetingSettingsSchema = z.object({
  newVisitors: z.boolean(),
  returningVisitors: z.boolean(),
  excludeParticipants: z.boolean(),
})

// Advanced Triggers
const triggerRuleSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['time_delay', 'scroll_percentage', 'exit_intent', 'page_visits', 'time_on_page', 'url_pattern', 'element_visible']),
  value: z.union([z.number(), z.string()]),
  operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'matches']).optional(),
})

const advancedTriggersSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(triggerRuleSchema),
  logic: z.enum(['AND', 'OR']),
})

// Widget Metadata
const widgetMetadataSchema = z.object({
  showEstimatedTime: z.boolean(),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
  estimatedIcon: z.enum(['clock', 'timer', 'hourglass']).optional(),
  showIncentive: z.boolean(),
  incentiveText: z.string().max(100).optional(),
  incentiveIcon: z.enum(['gift', 'dollar', 'star', 'trophy']).optional(),
})

// Scheduling
const businessHoursSchema = z.object({
  start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
})

const dateRangeSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
})

const schedulingSettingsSchema = z.object({
  enabled: z.boolean(),
  businessHoursOnly: z.boolean(),
  businessHours: businessHoursSchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  dateRange: dateRangeSchema,
  timezone: z.enum(['user', 'fixed']),
  fixedTimezone: z.string().optional(),
})

// Copy Personalization
const personalizationRuleSchema = z.object({
  id: z.string().uuid(),
  trigger: z.enum(['url_contains', 'referrer_contains', 'scroll_depth_gt', 'time_on_site_gt']),
  value: z.union([z.string(), z.number()]),
  customTitle: z.string().max(100).optional(),
  customDescription: z.string().max(500).optional(),
  customButtonText: z.string().max(50).optional(),
})

const copyPersonalizationSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(personalizationRuleSchema),
  variables: z.object({
    enabled: z.boolean(),
    customVariables: z.record(z.string()).optional(),
  }),
})

// Placement
const customCSSSchema = z.object({
  top: z.string().optional(),
  right: z.string().optional(),
  bottom: z.string().optional(),
  left: z.string().optional(),
  transform: z.string().optional(),
})

const placementSettingsSchema = z.object({
  mode: z.enum(['fixed', 'inline', 'sticky', 'after_element', 'custom']),
  cssSelector: z.string().max(200).optional(),
  customCSS: customCSSSchema.optional(),
})

// Privacy
const cookieConsentSettingsSchema = z.object({
  enabled: z.boolean(),
  framework: z.enum(['onetrust', 'cookiebot', 'custom']),
  customCheckFunction: z.string().max(500).optional(),
})

const privacySettingsSchema = z.object({
  showPrivacyLink: z.boolean(),
  privacyLinkUrl: z.string().url().max(2000).optional(),
  privacyLinkText: z.string().max(100).optional(),
  requireConsent: z.boolean(),
  respectDoNotTrack: z.boolean(),
  cookieConsent: cookieConsentSettingsSchema,
})

export const interceptWidgetSettingsSchema = z.object({
  enabled: z.boolean(),
  position: z.enum(['bottom-left', 'bottom-right', 'top-left', 'top-right']),
  triggerType: z.enum(['time_delay', 'scroll_percentage', 'exit_intent']),
  triggerValue: z.number().int().min(0).max(100).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  buttonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  buttonText: z.string().max(50).optional(),
  screeningQuestion: interceptScreeningQuestionSchema.optional(),

  // Phase 1: Frequency capping and targeting
  frequencyCapping: frequencyCappingSettingsSchema.optional(),
  targeting: targetingSettingsSchema.optional(),

  // Phase 3: Advanced features
  advancedTriggers: advancedTriggersSchema.optional(),
  widgetStyle: z.enum(['popup', 'banner', 'modal', 'drawer', 'badge']).optional(),
  bannerPosition: z.enum(['top', 'bottom']).optional(),
  slideDirection: z.enum(['left', 'right', 'top', 'bottom']).optional(),
  badgePosition: z.enum(['left', 'right']).optional(),
  animation: z.enum(['fade', 'slide', 'zoom', 'bounce']).optional(),
  metadata: widgetMetadataSchema.optional(),
  scheduling: schedulingSettingsSchema.optional(),
  copyPersonalization: copyPersonalizationSchema.optional(),
  placement: placementSettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
})

export const redirectSettingsSchema = z.object({
  completionUrl: z.string().url().max(2000).nullable().optional(),
  screenoutUrl: z.string().url().max(2000).nullable().optional(),
  quotaFullUrl: z.string().url().max(2000).nullable().optional(),
  redirectDelay: z.number().int().min(1).max(30).optional(),
})

export const sharedMetricsSchema = z.object({
  overview: z.boolean(),
  participants: z.boolean(),
  analysis: z.boolean(),
  questionnaire: z.boolean(),
  aiInsights: z.boolean().optional(),
}).passthrough()

export const publicResultsSettingsSchema = z.object({
  enabled: z.boolean(),
  password: z.string().max(100).nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  viewCount: z.number().optional(),
  lastViewedAt: z.string().optional(),
  sharedMetrics: sharedMetricsSchema.optional(),
}).passthrough()

export const sharingSettingsSchema = z.object({
  redirects: redirectSettingsSchema.optional(),
  intercept: interceptWidgetSettingsSchema.optional(),
  publicResults: publicResultsSettingsSchema.optional(),
  autoAddToPanel: z.boolean().optional(),
})

export const updateStudySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  settings: z.any().optional(),
  welcome_message: z.string().nullable().optional(),
  thank_you_message: z.string().nullable().optional(),
  // Details tab fields
  purpose: z.string().nullable().optional(),
  participant_requirements: z.string().nullable().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  file_attachments: z.array(fileAttachmentSchema).nullable().optional(),
  // Settings tab fields
  url_slug: z.string().regex(/^[a-z0-9-]*$/, 'URL slug must contain only lowercase letters, numbers, and hyphens').max(100).nullable().optional(),
  language: z.string().max(10).optional(),
  password: z.string().max(100).nullable().optional(),
  session_recording_settings: sessionRecordingSettingsSchema.nullable().optional(),
  closing_rule: closingRuleSchema.optional(),
  response_prevention_settings: responsePreventionSettingsSchema.nullable().optional(),
  email_notification_settings: emailNotificationSettingsSchema.nullable().optional(),
  // Branding tab fields
  branding: brandingSchema.optional(),
  // Sharing tab fields
  sharing_settings: sharingSettingsSchema.optional(),
})

export const createCardSchema = z.object({
  label: z.string().min(1, 'Card label is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

// Card image schema
export const cardImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  filename: z.string().optional(),
}).nullable()

export const updateCardSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  image: cardImageSchema.optional(),
})

export const bulkUpdateCardsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
    position: z.number().int().min(0).optional(),
    image: cardImageSchema.optional(),
  })
)

export const createCategorySchema = z.object({
  label: z.string().min(1, 'Category label is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export const updateCategorySchema = z.object({
  label: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export const bulkUpdateCategoriesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
)

export const createTreeNodeSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  label: z.string().min(1, 'Node label is required').max(255),
  position: z.number().int().min(0).optional(),
})

export const createTaskSchema = z.object({
  question: z.string().min(1, 'Task question is required').max(1000),
  correct_node_id: z.string().uuid().nullable().optional(),
  correct_node_ids: z.array(z.string().uuid()).optional().default([]),
  position: z.number().int().min(0).optional(),
})

export const updateTreeNodeSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export const bulkUpdateTreeNodesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(255),
    parent_id: z.string().uuid().nullable().optional(),
    position: z.number().int().min(0),
  })
)

export const updateTaskSchema = z.object({
  question: z.string().min(1).max(1000).optional(),
  correct_node_id: z.string().uuid().nullable().optional(),
  correct_node_ids: z.array(z.string().uuid()).optional(),
  position: z.number().int().min(0).optional(),
})

export const bulkUpdateTasksSchema = z.array(
  z.object({
    id: z.string().uuid(),
    question: z.string().min(1).max(1000),
    correct_node_id: z.string().uuid().nullable().optional(),
    correct_node_ids: z.array(z.string().uuid()).optional(),
    position: z.number().int().min(0),
  })
)

// Flow question schemas
export const flowQuestionSectionSchema = z.enum(['screening', 'pre_study', 'post_study', 'survey'])
export const questionTypeSchema = z.enum([
  'single_line_text',
  'multi_line_text',
  'multiple_choice',  // NEW: replaces radio + checkbox
  'image_choice',     // NEW: visual image selection in grid
  'dropdown',
  'opinion_scale',    // NEW: replaces likert
  'yes_no',           // NEW: binary choice
  'nps',
  'matrix',
  'ranking',
  'slider',           // NEW: continuous numeric scale
  'semantic_differential', // NEW: bipolar adjective rating scales
  'constant_sum',     // NEW: distribute points across items
  'audio_response',   // NEW: verbal response with transcription
  // DEPRECATED - kept for backwards compatibility
  'radio',
  'checkbox',
  'likert',
])

// Base flow question fields shared by create, update, and bulk schemas
const flowQuestionBaseFields = {
  section: flowQuestionSectionSchema,
  question_type: questionTypeSchema,
  question_text: z.string().min(1, 'Question text is required').max(2000),
  question_text_html: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_required: z.boolean().optional(),
  config: z.any().optional(),
  display_logic: z.any().nullable().optional(),
  branching_logic: z.any().nullable().optional(),
  survey_branching_logic: z.any().nullable().optional(),
  position: z.number().int().min(0).optional(),
} as const

export const createFlowQuestionSchema = z.object(flowQuestionBaseFields)

export const updateFlowQuestionSchema = createFlowQuestionSchema.partial()

// Schema for individual question in bulk update (requires id, position, and section)
export const bulkFlowQuestionSchema = z.object({
  ...flowQuestionBaseFields,
  id: z.string().uuid(),
  position: z.number().int().min(0),
  custom_section_id: z.string().uuid().nullable().optional(),
})

// Browser data schema for participant demographics
export const browserDataSchema = z.object({
  browser: z.string(),
  operatingSystem: z.string(),
  deviceType: z.enum(['Desktop', 'Mobile', 'Tablet']),
  language: z.string(),
  timeZone: z.string(),
  screenResolution: z.string(),
})

// Participant submission schemas
export const createParticipantSchema = z.object({
  identifierType: z.enum(['anonymous', 'email', 'custom', 'demographic_profile']).optional(),
  identifierValue: z.string().nullable().optional(),
  urlTags: z.record(z.string(), z.string()).nullable().optional(),
  // Client-side browser data for demographics
  browserData: browserDataSchema.nullable().optional(),
})

// Common fingerprint fields for duplicate response prevention
const fingerprintFields = {
  cookieId: z.string().nullable().optional(),
  fingerprintHash: z.string().nullable().optional(),
  fingerprintConfidence: z.number().nullable().optional(),
}

export const submitCardSortSchema = z.object({
  sessionToken: z.string().min(1, 'Session token required'),
  cardPlacements: z.unknown(), // Record<categoryId, cardId[]>
  customCategories: z.array(z.string()).nullable().optional(),
  totalTimeMs: z.number().int().min(0).nullable().optional(),
  demographicData: z.any().nullable().optional(), // Participant demographic data to save
  // Fingerprint fields for duplicate prevention
  ...fingerprintFields,
})

// Schema for post-task question responses
const postTaskQuestionResponseSchema = z.object({
  questionId: z.string(),
  value: z.unknown(), // ResponseValue - string | number | boolean | string[] | Record<string, string>
})

export const submitTreeTestSchema = z.object({
  sessionToken: z.string().min(1, 'Session token required'),
  responses: z.array(
    z.object({
      taskId: z.string().uuid(),
      pathTaken: z.array(z.string()),
      selectedNodeId: z.string().uuid().nullable(),
      timeToFirstClickMs: z.number().int().min(0).nullable().optional(),
      totalTimeMs: z.number().int().min(0).nullable().optional(),
      skipped: z.boolean().optional(), // True if participant skipped this task
      postTaskResponses: z.array(postTaskQuestionResponseSchema).optional(), // Post-task question responses
    })
  ),
  demographicData: z.any().nullable().optional(), // Participant demographic data to save
  // Fingerprint fields for duplicate prevention
  ...fingerprintFields,
})

export const completeSurveySchema = z.object({
  sessionToken: z.string().min(1, 'Session token required'),
  totalTimeMs: z.number().int().min(0).nullable().optional(),
  demographicData: z.any().nullable().optional(), // Participant demographic data to save
  // Fingerprint fields for duplicate prevention
  ...fingerprintFields,
})

// Prototype test schemas
export const createPrototypeSchema = z.object({
  figma_url: z.string().url('Invalid Figma URL'),
  name: z.string().max(255).optional(),
  password: z.string().max(255).nullable().optional(),
})

// Schema for updating prototype (password only, since URL/name change requires re-import)
export const updatePrototypeSchema = z.object({
  password: z.string().max(255).nullable().optional(),
  starting_frame_id: z.string().uuid().nullable().optional(),
})

export const createPrototypeTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  instruction: z.string().max(2000).nullable().optional(),
  start_frame_id: z.string().uuid().nullable().optional(),
  success_criteria_type: z.enum(['destination', 'pathway', 'component_state']).default('destination'),
  success_frame_ids: z.array(z.string().uuid()).optional(),
  success_pathway: z.object({
    frames: z.array(z.string().uuid()).optional().default([]),
    strict: z.boolean().optional().default(false),
  }).nullable().optional(),
  enable_interactive_components: z.boolean().optional(),
  success_component_states: z.array(
    z.object({
      componentNodeId: z.string(),
      variantId: z.string(),
      variantName: z.string().optional(),
    })
  ).nullable().optional(),
  time_limit_ms: z.number().int().min(0).nullable().optional(),
  post_task_questions: z.array(z.any()).optional(),
  position: z.number().int().min(0).optional(),
})

export const updatePrototypeTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  instruction: z.string().max(2000).nullable().optional(),
  start_frame_id: z.string().uuid().nullable().optional(),
  success_criteria_type: z.enum(['destination', 'pathway', 'component_state']).optional(),
  success_frame_ids: z.array(z.string().uuid()).optional(),
  success_pathway: z.object({
    frames: z.array(z.string().uuid()).optional().default([]),
    strict: z.boolean().optional().default(false),
  }).nullable().optional(),
  enable_interactive_components: z.boolean().optional(),
  success_component_states: z.array(
    z.object({
      componentNodeId: z.string(),
      variantId: z.string(),
      variantName: z.string().optional(),
    })
  ).nullable().optional(),
  time_limit_ms: z.number().int().min(0).nullable().optional(),
  post_task_questions: z.array(z.any()).optional(),
  position: z.number().int().min(0).optional(),
})

export const bulkUpdatePrototypeTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(500),
      instruction: z.string().max(2000).nullable().optional(),
      start_frame_id: z.string().uuid().nullable().optional(),
      // Accept null from database (service defaults to 'task_flow')
      flow_type: z.enum(['task_flow', 'free_flow']).nullable().optional(),
      // Accept null from database (service defaults to 'destination')
      success_criteria_type: z.enum(['destination', 'pathway', 'component_state']).nullable().optional(),
      // Accept null or array from database/frontend (null→[] handled in service layer)
      success_frame_ids: z.array(z.string().uuid()).nullable().optional(),
      // Accept pathway in v1, v2, v3, or legacy array format
      // IMPORTANT: V1 uses .strict() to prevent it from silently matching V3/V2 data
      // (z.object() strips unknown keys by default, so V1 would match ANY object
      //  and return { frames: [], strict: false } — causing silent V3 data loss)
      success_pathway: z.union([
        // v3 format: { version: 3, paths: [{ steps, frames }] }
        z.object({
          version: z.literal(3),
          paths: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              steps: z.array(
                z.discriminatedUnion('type', [
                  // Frame navigation step
                  z.object({
                    type: z.literal('frame'),
                    id: z.string(),
                    frameId: z.string(),
                    isOptional: z.boolean().nullish(),
                  }).passthrough(),
                  // Component state change step
                  z.object({
                    type: z.literal('state'),
                    id: z.string(),
                    componentNodeId: z.string(),
                    variantId: z.string(),
                    componentName: z.string().nullish(),
                    variantName: z.string().nullish(),
                    customLabel: z.string().nullish(),
                    isOptional: z.boolean().nullish(),
                  }).passthrough(),
                ])
              ),
              frames: z.array(z.string().uuid()),
              is_primary: z.boolean().optional().default(false),
            }).passthrough()
          ),
        }),
        // v2 format: { version: 2, paths: [...] }
        z.object({
          version: z.literal(2),
          paths: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              frames: z.array(z.string().uuid()),
              is_primary: z.boolean().optional().default(false),
            })
          ),
        }),
        // v1 format: { frames: [...], strict: boolean }
        // .strict() rejects unknown keys — prevents matching V3/V2 objects
        z.object({
          frames: z.array(z.string().uuid()).optional().default([]),
          strict: z.boolean().optional().default(false),
        }).strict(),
        // Legacy array format
        z.array(z.string().uuid()),
      ]).nullable().optional(),
      enable_interactive_components: z.boolean().nullable().optional(),
      success_component_states: z.array(
        z.object({
          componentNodeId: z.string(),
          variantId: z.string(),
          variantName: z.string().optional(),
        })
      ).nullable().optional(),
      // State-based success criteria for component_state type
      state_success_criteria: z.object({
        states: z.array(z.any()),
        logic: z.enum(['AND', 'OR']),
      }).nullable().optional(),
      time_limit_ms: z.number().int().min(0).nullable().optional(),
      post_task_questions: z.array(z.any()).optional(),
      position: z.number().int().min(0),
    })
  ),
})

export const submitPrototypeTestSchema = z.object({
  sessionToken: z.string().min(1, 'Session token required'),
  taskAttempts: z.array(
    z.object({
      taskId: z.string().uuid(),
      outcome: z.enum(['success', 'failure', 'skipped']),
      pathTaken: z.array(z.string()),
      isDirect: z.boolean().optional(),
      totalTimeMs: z.number().int().min(0).optional(),
      timeToFirstClickMs: z.number().int().min(0).optional(),
      clickCount: z.number().int().min(0).optional(),
      misclickCount: z.number().int().min(0).optional(),
      backtrackCount: z.number().int().min(0).optional(),
      postTaskResponses: z.any().nullable().optional(),
      successPathway: z.any().nullable().optional(),
    })
  ),
  clickEvents: z.array(
    z.object({
      taskId: z.string().uuid(),
      frameId: z.string().uuid(),
      timestamp: z.string(),
      x: z.number().int(),
      y: z.number().int(),
      viewportX: z.number().int().optional(),
      viewportY: z.number().int().optional(),
      wasHotspot: z.boolean().optional(),
      hotspotId: z.string().optional(),
      triggeredTransition: z.boolean().optional(),
      timeSinceFrameLoadMs: z.number().int().optional(),
      componentStates: z.record(z.string()).optional(),
    })
  ).optional(),
  navigationEvents: z.array(
    z.object({
      taskId: z.string().uuid(),
      fromFrameId: z.string().uuid().nullable(),
      toFrameId: z.string().uuid(),
      triggeredBy: z.enum(['click', 'back_button', 'task_start', 'timeout']),
      clickEventId: z.string().uuid().optional(),
      timeOnFromFrameMs: z.number().int().optional(),
      sequenceNumber: z.number().int(),
      timestamp: z.string(),
    })
  ).optional(),
  componentStateEvents: z.array(
    z.object({
      taskId: z.string().uuid(),
      frameId: z.string().uuid().nullable(),
      componentNodeId: z.string(),
      fromVariantId: z.string().nullable(),
      toVariantId: z.string(),
      isTimedChange: z.boolean(),
      sequenceNumber: z.number().int(),
      timestamp: z.string(),
    })
  ).optional(),
  demographicData: z.any().nullable().optional(), // Participant demographic data to save
  // Fingerprint fields for duplicate prevention
  ...fingerprintFields,
})

// Type inference from schemas
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateStudyInput = z.infer<typeof createStudySchema>
export type UpdateStudyInput = z.infer<typeof updateStudySchema>
export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type BulkUpdateCardsInput = z.infer<typeof bulkUpdateCardsSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type BulkUpdateCategoriesInput = z.infer<typeof bulkUpdateCategoriesSchema>
export type CreateTreeNodeInput = z.infer<typeof createTreeNodeSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type FlowQuestionSection = z.infer<typeof flowQuestionSectionSchema>
export type CreateFlowQuestionInput = z.infer<typeof createFlowQuestionSchema>
export type UpdateFlowQuestionInput = z.infer<typeof updateFlowQuestionSchema>
export type BulkFlowQuestionInput = z.infer<typeof bulkFlowQuestionSchema>
export type CreatePrototypeInput = z.infer<typeof createPrototypeSchema>
export type CreatePrototypeTaskInput = z.infer<typeof createPrototypeTaskSchema>
export type UpdatePrototypeTaskInput = z.infer<typeof updatePrototypeTaskSchema>
export type BulkUpdatePrototypeTasksInput = z.infer<typeof bulkUpdatePrototypeTasksSchema>
export type SubmitPrototypeTestInput = z.infer<typeof submitPrototypeTestSchema>
