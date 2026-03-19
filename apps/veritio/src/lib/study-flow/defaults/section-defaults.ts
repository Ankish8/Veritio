import type { StudyFlowSettings, TaskFeedbackSettings } from '../../supabase/study-flow-types'
import { createDefaultDemographicFields } from './demographic-fields'
import { defaultDemographicOptions } from './demographic-options'

/**
 * Default welcome section settings
 */
export const defaultWelcomeSettings: StudyFlowSettings['welcome'] = {
  enabled: true,
  title: 'Welcome',
  message: '<p>Thank you for taking the time to participate in this study.</p><p>Your feedback will help us improve our information architecture.</p>',
  includeStudyTitle: false,
  includeDescription: false,
  includePurpose: false,
  includeParticipantRequirements: false,
  showIncentive: false,
  incentiveMessage: 'Complete this study and receive {incentive}',
}

/**
 * Default participant agreement settings
 */
export const defaultParticipantAgreementSettings: StudyFlowSettings['participantAgreement'] = {
  enabled: false,
  title: 'Participant Agreement',
  message: 'Before you begin, please read and accept the following agreement:',
  agreementText: '<p>By participating in this study, I understand that:</p><ul><li>My responses will be anonymous and used for research purposes only.</li><li>I can exit the study at any time.</li><li>My data will be stored securely and handled in accordance with data protection regulations.</li></ul>',
  showRejectionMessage: true,
  rejectionTitle: 'Thank You',
  rejectionMessage: 'We respect your decision. Thank you for your time.',
  redirectUrl: undefined,
}

/**
 * Default screening section settings
 */
export const defaultScreeningSettings: StudyFlowSettings['screening'] = {
  enabled: false,
  introTitle: 'Quick Questions',
  introMessage: 'Please answer these questions to help us determine your eligibility for this study.',
  rejectionTitle: 'Thank You for Your Interest',
  rejectionMessage: "Unfortunately, you don't meet the criteria for this study. We appreciate your willingness to participate.",
  redirectUrl: undefined,
  redirectImmediately: false,
  pageMode: 'one_per_page',
}

/**
 * Default participant identifier settings.
 * Note: participantIdentifier intentionally does NOT strip empty strings during merge,
 * because empty strings in nested demographic profile options are meaningful.
 */
export const defaultParticipantIdentifierSettings: StudyFlowSettings['participantIdentifier'] = {
  type: 'anonymous',
  demographicProfile: {
    title: 'Participant Information',
    description: 'Help us understand you better. This information will be kept confidential and used only for research purposes.',
    enableAutoPopulation: false,
    sections: [
      {
        id: 'basic-demographics',
        name: 'Basic Demographics',
        position: 0,
        fields: createDefaultDemographicFields(),
      },
    ],
    ...defaultDemographicOptions,
  },
  displaySettings: {
    primaryField: 'fullName',
    secondaryField: 'email',
  },
}

/**
 * Default pre-study questions section settings
 */
export const defaultPreStudyQuestionsSettings: StudyFlowSettings['preStudyQuestions'] = {
  enabled: false,
  introTitle: 'Before We Begin',
  introMessage: 'Please answer a few questions to help us understand your background.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
}

/**
 * Default activity instructions settings
 */
export const defaultActivityInstructionsSettings: StudyFlowSettings['activityInstructions'] = {
  enabled: true,
  title: 'Instructions',
  part1: '<p>You will be presented with a set of items to organize.</p><p>Take your time and group them in a way that makes sense to you.</p>',
  part2: undefined,
}

/**
 * Default post-study questions section settings
 */
export const defaultPostStudyQuestionsSettings: StudyFlowSettings['postStudyQuestions'] = {
  enabled: false,
  introTitle: 'Almost Done',
  introMessage: 'Please answer a few final questions about your experience.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
}

/**
 * Default survey questionnaire settings
 */
export const defaultSurveyQuestionnaireSettings: NonNullable<StudyFlowSettings['surveyQuestionnaire']> = {
  enabled: true,
  showIntro: true,
  introTitle: 'Survey',
  introMessage: 'Please answer the following questions. Your feedback is valuable to us.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
  showProgressBar: true,
  allowSkipQuestions: false,
}

/**
 * Default pagination settings for survey participant experience
 */
export const defaultPaginationSettings: NonNullable<StudyFlowSettings['pagination']> = {
  mode: 'one_per_page',
}

/**
 * Default task feedback settings for activity-based studies
 */
export const defaultTaskFeedbackSettings: TaskFeedbackSettings = {
  pageMode: 'one_per_page',
}

/**
 * Default thank you section settings
 */
export const defaultThankYouSettings: StudyFlowSettings['thankYou'] = {
  enabled: true,
  title: 'Thank You!',
  message: '<p>Your responses have been recorded.</p><p>We greatly appreciate your participation in this study.</p>',
  redirectUrl: undefined,
  redirectDelay: 0,
  showIncentive: false,
  incentiveMessage: 'Your {incentive} will be sent to you soon',
}

/**
 * Default closed study message settings
 */
export const defaultClosedStudySettings: StudyFlowSettings['closedStudy'] = {
  title: 'Study Closed',
  message: 'This study is no longer accepting responses. Thank you for your interest.',
  redirectUrl: undefined,
  redirectImmediately: false,
}

/**
 * Complete default study flow settings
 */
export const defaultStudyFlowSettings: StudyFlowSettings = {
  welcome: defaultWelcomeSettings,
  participantAgreement: defaultParticipantAgreementSettings,
  screening: defaultScreeningSettings,
  participantIdentifier: defaultParticipantIdentifierSettings,
  preStudyQuestions: defaultPreStudyQuestionsSettings,
  activityInstructions: defaultActivityInstructionsSettings,
  postStudyQuestions: defaultPostStudyQuestionsSettings,
  surveyQuestionnaire: defaultSurveyQuestionnaireSettings,
  thankYou: defaultThankYouSettings,
  closedStudy: defaultClosedStudySettings,
  pagination: defaultPaginationSettings,
}

/** Old card sort defaults -- used by runtime correction to detect stale defaults */
export const OLD_CARD_SORT_DEFAULTS = [
  '<p>You will see a set of cards. Please organize these cards into groups that make sense to you.</p><p>You can create your own categories and name them however you like.</p>',
  '<p>You will see a set of cards and predefined categories. Please place each card into the category where you think it belongs best.</p>',
  '<p>You will see a set of cards and some suggested categories. Place each card into an existing category, or create new categories if needed.</p>',
]
