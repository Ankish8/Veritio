/**
 * The canonical, validated per-study-type settings union.
 *
 * This did not exist before. `createStudySchema` accepts `initial_settings` as
 * `z.record(z.unknown())` and `updateStudySchema.settings` is `z.any()`, so a
 * malformed settings object has always produced a silently mis-configured
 * study rather than an error. That is tolerable when a human is clicking
 * through the builder UI and can see the result; it is not tolerable when an
 * agent is writing settings blind.
 *
 * Sources reconciled here:
 *   - `study-flow-types.ts` L1163+  Extended{CardSort,TreeTest,Survey,
 *                                   PrototypeTest,FirstImpression}Settings
 *   - `study-types/src/index.ts`    FirstClickTestSettings
 *   - `stores/study-builder/live-website-builder.ts:72`  LiveWebsiteSettings,
 *     which is the widest of the three competing declarations (the other two
 *     are in the player and a results component) and is the one the builder
 *     actually writes.
 *   - `study-service.ts:343`        the per-type defaults applied on create
 *
 * Every field is optional because settings writes are deep merges. Each schema
 * is `.strict()`: an invented field is the failure mode worth catching, and a
 * named error beats a silently dropped key. If a legitimate field is missing
 * here, add it — do not loosen the schema.
 *
 * Deliberately NOT modelled: `studyFlow` and `sessionRecordingSettings`. The
 * flow surface is large and has its own tool (`study_flow_set`); recording
 * settings have their own column. Both are passed through untouched.
 */

import { z } from 'zod4'

const taskFeedback = z
  .object({ pageMode: z.enum(['one_per_page', 'all_on_one']) })
  .strict()
  .describe('How post-task questions are paginated.')

const showEachParticipantTasks = z
  .union([z.literal('all'), z.number().int().positive()])
  .describe('"all", or a number to show each participant a random subset of that many tasks.')

const taskInstructionPosition = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
])

export const cardSortSettings = z
  .object({
    mode: z
      .enum(['open', 'closed', 'hybrid'])
      .describe('open: participants name their own categories. closed: they use yours. hybrid: both.'),
    randomizeCards: z.boolean(),
    allowSkip: z.boolean(),
    showProgress: z.boolean(),
    maxCategories: z.number().int().positive().describe('Cap on categories a participant may create.'),
    cardSubset: z.number().int().positive().describe('Show each participant this many cards at random.'),
    requireAllCardsSorted: z.boolean(),
    showTooltipDescriptions: z.boolean(),
    allowCardImages: z.boolean(),
    allowComments: z.boolean(),
    showCardOrderIndicators: z.boolean(),
    showUnsortedIndicator: z.boolean(),
    includeUnclearCategory: z.boolean().describe('Adds an "I am not sure" bucket.'),
    // Closed / hybrid only.
    allowCategoryDescriptions: z.boolean(),
    addCategoryLimits: z.boolean(),
    randomizeCategoryOrder: z.boolean(),
    requireCategoriesNamed: z.boolean(),
  })
  .partial()
  .strict()

export const treeTestSettings = z
  .object({
    randomizeTasks: z.boolean(),
    dontRandomizeFirstTask: z.boolean(),
    showBreadcrumbs: z.boolean(),
    allowBack: z.boolean(),
    showTaskProgress: z.boolean(),
    allowSkipTasks: z.boolean(),
    answerButtonText: z.string().max(60),
    taskFeedback,
  })
  .partial()
  .strict()

export const surveySettings = z
  .object({
    showOneQuestionPerPage: z.boolean().describe('false shows the whole survey on one page.'),
    randomizeQuestions: z.boolean(),
    showProgressBar: z.boolean(),
    allowSkipQuestions: z.boolean(),
  })
  .partial()
  .strict()

export const prototypeTestSettings = z
  .object({
    randomizeTasks: z.boolean(),
    dontRandomizeFirstTask: z.boolean(),
    allowSkipTasks: z.boolean(),
    showTaskProgress: z.boolean(),
    clickableAreaFlashing: z.boolean().describe('Briefly highlights hotspots when a participant is stuck.'),
    tasksEndAutomatically: z.boolean(),
    allowFailureResponse: z.boolean().describe('Lets participants declare they could not finish.'),
    showEachParticipantTasks,
    taskInstructionPosition,
    scalePrototype: z.union([z.enum(['100%', 'fit', 'fill', 'width']), z.boolean()]),
    trackHesitation: z.boolean(),
    trackNonClickEvents: z.boolean(),
    taskFeedback,
  })
  .partial()
  .strict()

export const firstClickSettings = z
  .object({
    allowSkipTasks: z.boolean(),
    startTasksImmediately: z.boolean(),
    randomizeTasks: z.boolean(),
    dontRandomizeFirstTask: z.boolean(),
    showEachParticipantTasks,
    showTaskProgress: z.boolean(),
    imageScaling: z.enum(['fit', 'scale_on_small', 'always_scale', 'never_scale']),
    taskInstructionPosition,
    taskFeedbackPageMode: z.enum(['one_per_page', 'all_on_one']),
  })
  .partial()
  .strict()

export const firstImpressionSettings = z
  .object({
    exposureDurationMs: z
      .number()
      .int()
      .min(1000)
      .max(20000)
      .describe('How long the design is shown, 1000-20000ms. The classic value is 5000.'),
    countdownDurationMs: z.number().int().min(0).max(5000),
    showTimerToParticipant: z.boolean(),
    showProgressIndicator: z.boolean(),
    displayMode: z.enum(['fit', 'fill', 'actual', 'hidpi']),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'six-digit hex colour, e.g. #ffffff'),
    questionDisplayMode: z.enum(['one_per_page', 'all_on_page']),
    randomizeQuestions: z.boolean(),
    autoAdvanceQuestions: z.boolean(),
    questionMode: z.enum(['shared', 'per_design']).describe('shared asks the same questions about every design.'),
    designAssignmentMode: z
      .enum(['random_single', 'sequential_all'])
      .describe('random_single shows one design per participant; sequential_all shows every design.'),
    allowPracticeDesign: z.boolean(),
    practiceInstructions: z.object({ title: z.string(), content: z.string() }).strict(),
    taskFeedback,
  })
  .partial()
  .strict()

export const liveWebsiteSettings = z
  .object({
    websiteUrl: z.string().url(),
    mode: z
      .enum(['url_only', 'snippet', 'reverse_proxy'])
      .describe(
        'url_only opens the site directly. snippet requires the Veritio script installed on the site. ' +
          'reverse_proxy routes through the Veritio proxy worker.',
      ),
    snippetId: z.string().nullable(),
    snippetVerified: z.boolean(),
    recordScreen: z.boolean(),
    recordWebcam: z.boolean(),
    recordMicrophone: z.boolean(),
    trackClickEvents: z.boolean(),
    trackScrollDepth: z.boolean(),
    allowMobile: z.boolean(),
    allowSkipTasks: z.boolean(),
    showTaskProgress: z.boolean(),
    defaultTimeLimitSeconds: z.number().int().positive().nullable(),
    authInstructions: z.string().describe('Shown to participants if the site needs a login.'),
    widgetPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
    blockBeforeStart: z.boolean(),
    abTestingEnabled: z.boolean(),
    completionButtonText: z.string().max(60),
  })
  .partial()
  .strict()

export const SETTINGS_BY_TYPE = {
  card_sort: cardSortSettings,
  tree_test: treeTestSettings,
  survey: surveySettings,
  prototype_test: prototypeTestSettings,
  first_click: firstClickSettings,
  first_impression: firstImpressionSettings,
  live_website_test: liveWebsiteSettings,
} as const

export type SettingsStudyType = keyof typeof SETTINGS_BY_TYPE

/**
 * Validate a settings patch against the schema for a study's actual type.
 *
 * Kept as a runtime dispatch rather than a zod discriminated union because the
 * study type comes from the database, not from the caller — an agent must not
 * be able to pick which schema its input is checked against.
 */
export function validateSettingsFor(
  studyType: string,
  patch: unknown,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: string[] } {
  const schema = SETTINGS_BY_TYPE[studyType as SettingsStudyType]
  if (!schema) return { ok: false, errors: [`Unknown study type "${studyType}".`] }

  const result = schema.safeParse(patch)
  if (result.success) return { ok: true, value: result.data as Record<string, unknown> }

  return {
    ok: false,
    errors: result.error.issues.map((i) => {
      const path = i.path.join('.')
      return path ? `${path}: ${i.message}` : i.message
    }),
  }
}

/** The settings field names valid for a study type, for error hints. */
export function settingsKeysFor(studyType: string): string[] {
  const schema = SETTINGS_BY_TYPE[studyType as SettingsStudyType]
  if (!schema) return []
  return Object.keys(schema.shape).sort()
}
