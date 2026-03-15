import type {
  StudyFlowSettings,
  QuestionsSectionSettings,
  SurveyQuestionnaireSettings,
  PaginationSettings,
  TaskFeedbackSettings,
  StudyType,
} from '../types'

export const defaultWelcomeSettings: StudyFlowSettings['welcome'] = {
  enabled: true,
  title: 'Welcome',
  message: '<p>Thank you for taking the time to participate in this study.</p><p>Your feedback will help us improve our information architecture.</p>',
  includeStudyTitle: false,
  includeDescription: false,
  includePurpose: false,
  includeParticipantRequirements: false,
}

export const defaultParticipantAgreementSettings: StudyFlowSettings['participantAgreement'] = {
  enabled: false,
  title: 'Participant Agreement',
  message: 'Before you begin, please read and accept the following agreement:',
  agreementText: '<p>By participating in this study, I understand that:</p><ul><li>My responses will be anonymous and used for research purposes only.</li><li>I can exit the study at any time.</li><li>My data will be stored securely and handled in accordance with data protection regulations.</li></ul>',
  showRejectionMessage: true,
  rejectionTitle: 'Thank You',
  rejectionMessage: 'We respect your decision. Thank you for your time.',
}

export const defaultScreeningSettings: StudyFlowSettings['screening'] = {
  enabled: false,
  introTitle: 'Quick Questions',
  introMessage: 'Please answer these questions to help us determine your eligibility for this study.',
  rejectionTitle: 'Thank You for Your Interest',
  rejectionMessage: "Unfortunately, you don't meet the criteria for this study. We appreciate your willingness to participate.",
  redirectImmediately: false,
  pageMode: 'one_per_page',
}

export const defaultParticipantIdentifierSettings: StudyFlowSettings['participantIdentifier'] = {
  type: 'anonymous',
}

export const defaultPreStudyQuestionsSettings: QuestionsSectionSettings = {
  enabled: false,
  showIntro: true,
  introTitle: 'Before We Begin',
  introMessage: 'Please answer a few questions to help us understand your background.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
  autoAdvance: false,
}

export const defaultActivityInstructionsSettings: StudyFlowSettings['activityInstructions'] = {
  enabled: true,
  title: 'Instructions',
  part1: '<p>You will be presented with a set of items to organize.</p><p>Take your time and group them in a way that makes sense to you.</p>',
}

export const defaultPostStudyQuestionsSettings: QuestionsSectionSettings = {
  enabled: false,
  showIntro: true,
  introTitle: 'Almost Done',
  introMessage: 'Please answer a few final questions about your experience.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
  autoAdvance: false,
}

export const defaultSurveyQuestionnaireSettings: SurveyQuestionnaireSettings = {
  enabled: true,
  showIntro: true,
  introTitle: 'Survey',
  introMessage: 'Please answer the following questions. Your feedback is valuable to us.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
  showProgressBar: true,
  allowSkipQuestions: false,
  autoAdvance: false,
}

export const defaultThankYouSettings: StudyFlowSettings['thankYou'] = {
  enabled: true,
  title: 'Thank You!',
  message: '<p>Your responses have been recorded.</p><p>We greatly appreciate your participation in this study.</p>',
  redirectDelay: 0,
}

export const defaultClosedStudySettings: StudyFlowSettings['closedStudy'] = {
  title: 'Study Closed',
  message: 'This study is no longer accepting responses. Thank you for your interest.',
  redirectImmediately: false,
}

export const defaultPaginationSettings: PaginationSettings = {
  mode: 'one_per_page',
}

export const defaultTaskFeedbackSettings: TaskFeedbackSettings = {
  pageMode: 'one_per_page',
}

export const defaultStudyFlowSettings: StudyFlowSettings = {
  welcome: defaultWelcomeSettings,
  participantAgreement: defaultParticipantAgreementSettings,
  screening: defaultScreeningSettings,
  participantIdentifier: defaultParticipantIdentifierSettings,
  preStudyQuestions: defaultPreStudyQuestionsSettings,
  activityInstructions: defaultActivityInstructionsSettings,
  surveyQuestionnaire: defaultSurveyQuestionnaireSettings,
  postStudyQuestions: defaultPostStudyQuestionsSettings,
  thankYou: defaultThankYouSettings,
  closedStudy: defaultClosedStudySettings,
  pagination: defaultPaginationSettings,
}

export const cardSortInstructions = {
  open: {
    part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You'll see a collection of cards that need to be sorted.</li>
<li>Place each card into a category, or create your own groups.</li>
<li>Name your categories however you like — there are no right or wrong answers.</li>
</ol>
<p><em>Take your time. We're interested in how you naturally organize these items.</em></p>
<p>Let's get started!</p>`,
    part2: undefined,
  },
  closed: {
    part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You'll see a collection of cards and predefined categories.</li>
<li>Place each card into the category where you think it best belongs.</li>
<li>If you're unsure about a card, go with your first instinct.</li>
</ol>
<p><em>Take your time. We're interested in how you naturally organize these items.</em></p>
<p>Let's get started!</p>`,
    part2: undefined,
  },
  hybrid: {
    part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You'll see a collection of cards and some suggested categories.</li>
<li>Place each card into a category, or create new ones if none fit.</li>
<li>Name your custom categories however you like — there are no right or wrong answers.</li>
</ol>
<p><em>Take your time. We're interested in how you naturally organize these items.</em></p>
<p>Let's get started!</p>`,
    part2: undefined,
  },
}

export const treeTestInstructions = {
  part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You will be asked to find a certain item and presented with a list of links.</li>
<li>Click through the list until you arrive at one that you think helps you complete the task.</li>
<li>If you take a wrong turn, you can go back by clicking one of the links above.</li>
</ol>
<p><em>This is not a test of your ability, there are no right or wrong answers.</em></p>
<p>That's it, let's get started!</p>`,
  part2: undefined,
}

export const prototypeTestInstructions = {
  part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You will be given a task to complete using an interactive prototype.</li>
<li>Click through the prototype as if it were a real website or app.</li>
<li>When you think you've completed the task, click the finish button.</li>
</ol>
<p><em>This is not a test of your ability. We're testing the design, not you!</em></p>
<p>Let's get started!</p>`,
  part2: undefined,
}

export const firstClickInstructions = {
  part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You will be shown a design and given a task to complete.</li>
<li>Click where you would first click to accomplish the task.</li>
<li>There are no right or wrong answers \u2013 we want to see your natural instinct.</li>
</ol>
<p><em>This helps us understand how intuitive the design is.</em></p>
<p>Let's get started!</p>`,
  part2: undefined,
}

export const firstImpressionInstructions = {
  part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You will see a design for a brief moment.</li>
<li>Look at the design naturally \u2013 don't try to memorize details.</li>
<li>After the design disappears, you'll answer questions about your first impressions.</li>
</ol>
<p><em>Trust your gut reaction \u2013 there are no right or wrong answers!</em></p>
<p>Ready? Let's begin!</p>`,
  part2: undefined,
}

export const liveWebsiteTestInstructions = {
  part1: `<p><strong>Here's how it works:</strong></p>
<ol>
<li>You will be given tasks to complete on a live website.</li>
<li>Navigate the website as you normally would to accomplish each task.</li>
<li>When you've completed a task, follow the on-screen prompts to continue.</li>
</ol>
<p><em>This is not a test of your ability. We're evaluating the website, not you!</em></p>
<p>Let's get started!</p>`,
  part2: undefined,
}

/** Strip empty-string values so they don't override defaults during merge */
function stripEmpty<T extends object>(obj: T | undefined): Partial<T> {
  if (!obj) return {}
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '')
  ) as Partial<T>
}

export function createStudyFlowSettings(
  overrides?: Partial<StudyFlowSettings>
): StudyFlowSettings {
  let paginationOverride = overrides?.pagination
  if (!paginationOverride && overrides?.surveyQuestionnaire?.pageMode) {
    paginationOverride = {
      mode: overrides.surveyQuestionnaire.pageMode === 'all_on_one' ? 'progressive' : 'one_per_page',
    }
  }

  return {
    ...defaultStudyFlowSettings,
    ...overrides,
    welcome: { ...defaultWelcomeSettings, ...stripEmpty(overrides?.welcome) },
    participantAgreement: { ...defaultParticipantAgreementSettings, ...stripEmpty(overrides?.participantAgreement) },
    screening: { ...defaultScreeningSettings, ...stripEmpty(overrides?.screening) },
    participantIdentifier: { ...defaultParticipantIdentifierSettings, ...overrides?.participantIdentifier },
    preStudyQuestions: { ...defaultPreStudyQuestionsSettings, ...stripEmpty(overrides?.preStudyQuestions) },
    activityInstructions: { ...defaultActivityInstructionsSettings, ...stripEmpty(overrides?.activityInstructions) },
    postStudyQuestions: { ...defaultPostStudyQuestionsSettings, ...stripEmpty(overrides?.postStudyQuestions) },
    surveyQuestionnaire: { ...defaultSurveyQuestionnaireSettings, ...stripEmpty(overrides?.surveyQuestionnaire) },
    thankYou: { ...defaultThankYouSettings, ...stripEmpty(overrides?.thankYou) },
    closedStudy: { ...defaultClosedStudySettings, ...stripEmpty(overrides?.closedStudy) },
    pagination: { ...defaultPaginationSettings, ...paginationOverride },
  }
}

const STUDY_TYPE_INSTRUCTIONS: Record<StudyType, { enabled: boolean; part1: string; part2?: string }> = {
  tree_test: { enabled: true, ...treeTestInstructions },
  card_sort: { enabled: true, ...cardSortInstructions.open },
  prototype_test: { enabled: true, ...prototypeTestInstructions },
  first_click: { enabled: true, ...firstClickInstructions },
  first_impression: { enabled: true, ...firstImpressionInstructions },
  survey: { enabled: false, part1: '' },
  live_website_test: { enabled: true, ...liveWebsiteTestInstructions },
}

export function getDefaultInstructions(studyType: StudyType): StudyFlowSettings['activityInstructions'] {
  const instructions = STUDY_TYPE_INSTRUCTIONS[studyType]
  return { title: 'Instructions', ...instructions }
}

export function createStudyFlowSettingsForType(
  studyType: StudyType,
  overrides?: Partial<StudyFlowSettings>
): StudyFlowSettings {
  const settings = createStudyFlowSettings(overrides)

  if (!overrides?.activityInstructions) {
    settings.activityInstructions = getDefaultInstructions(studyType)
  }

  if (studyType === 'survey') {
    settings.surveyQuestionnaire = {
      ...defaultSurveyQuestionnaireSettings,
      ...overrides?.surveyQuestionnaire,
    }
  }

  return settings
}

export function migrateToStudyFlowSettings(
  welcomeMessage?: string | null,
  thankYouMessage?: string | null,
  existingSettings?: Partial<StudyFlowSettings>,
  studyType?: StudyType
): StudyFlowSettings {
  const settings = createStudyFlowSettings(existingSettings)

  // Only override defaults with DB column values if they contain HTML
  // (meaning the user actually edited them). Plain-text default strings
  // from createStudy should NOT replace the HTML-formatted defaults.
  const hasHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s)

  if (welcomeMessage && hasHtml(welcomeMessage) && !existingSettings?.welcome?.message) {
    settings.welcome.message = welcomeMessage
    settings.welcome.enabled = true
  }

  if (thankYouMessage && hasHtml(thankYouMessage) && !existingSettings?.thankYou?.message) {
    settings.thankYou.message = thankYouMessage
    settings.thankYou.enabled = true
  }

  if (studyType && !existingSettings?.activityInstructions?.part1) {
    settings.activityInstructions = getDefaultInstructions(studyType)
  }

  if (studyType && studyType !== 'survey') {
    settings.activityInstructions.enabled = true
  }

  return settings
}
