import type { StudyFlowSettings, TaskFeedbackSettings } from '../supabase/study-flow-types'
import {
  cardSortInstructions,
  treeTestInstructions,
  prototypeTestInstructions,
  firstClickInstructions,
  firstImpressionInstructions,
  liveWebsiteTestInstructions,
} from '@veritio/study-flow'

export const defaultWelcomeSettings: StudyFlowSettings['welcome'] = {
  enabled: true,
  title: 'Welcome',
  message: '<p>Thank you for taking the time to participate in this study.</p><p>Your feedback will help us improve our information architecture.</p>',
  // Include from Details tab - all disabled by default
  includeStudyTitle: false,
  includeDescription: false,
  includePurpose: false,
  includeParticipantRequirements: false,
  // Incentive display - disabled by default
  showIncentive: false,
  incentiveMessage: 'Complete this study and receive {incentive}',
}

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

export const defaultParticipantIdentifierSettings: StudyFlowSettings['participantIdentifier'] = {
  type: 'anonymous',
  demographicProfile: {
    title: 'Participant Information',
    description: 'Help us understand you better. This information will be kept confidential and used only for research purposes.',
    enableAutoPopulation: false, // Simple mode by default - no screening mapping
    sections: [
      // Basic Demographics Section - Contains ALL demographic fields
      {
        id: 'basic-demographics',
        name: 'Basic Demographics',
        position: 0,
        fields: [
          // Contact & Identity (enabled by default)
          {
            id: 'email',
            type: 'predefined',
            fieldType: 'email',
            position: 0,
            enabled: true,
            required: true,
            mappedToScreeningQuestionId: null,
            width: 'full', // Email addresses can be long
          },
          {
            id: 'firstName',
            type: 'predefined',
            fieldType: 'firstName',
            position: 1,
            enabled: true,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Pairs with lastName
          },
          {
            id: 'lastName',
            type: 'predefined',
            fieldType: 'lastName',
            position: 2,
            enabled: true,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Pairs with firstName
          },
          // Basic Demographics (disabled by default, add via mega menu)
          {
            id: 'gender',
            type: 'predefined',
            fieldType: 'gender',
            position: 3,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'ageRange',
            type: 'predefined',
            fieldType: 'ageRange',
            position: 4,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'location',
            type: 'predefined',
            fieldType: 'location',
            position: 5,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'full', // Cascading selects need space
          },
          {
            id: 'maritalStatus',
            type: 'predefined',
            fieldType: 'maritalStatus',
            position: 6,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'householdSize',
            type: 'predefined',
            fieldType: 'householdSize',
            position: 7,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          // Professional / Work Details (disabled by default, add via mega menu)
          {
            id: 'employmentStatus',
            type: 'predefined',
            fieldType: 'employmentStatus',
            position: 8,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'jobTitle',
            type: 'predefined',
            fieldType: 'jobTitle',
            position: 9,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'full', // Job titles can be long
          },
          {
            id: 'industry',
            type: 'predefined',
            fieldType: 'industry',
            position: 10,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'companySize',
            type: 'predefined',
            fieldType: 'companySize',
            position: 11,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'yearsOfExperience',
            type: 'predefined',
            fieldType: 'yearsOfExperience',
            position: 12,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          {
            id: 'department',
            type: 'predefined',
            fieldType: 'department',
            position: 13,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half', // Compact select
          },
          // Technology & Usage Context
          {
            id: 'primaryDevice',
            type: 'predefined',
            fieldType: 'primaryDevice',
            position: 14,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'operatingSystem',
            type: 'predefined',
            fieldType: 'operatingSystem',
            position: 15,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'browserPreference',
            type: 'predefined',
            fieldType: 'browserPreference',
            position: 16,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'techProficiency',
            type: 'predefined',
            fieldType: 'techProficiency',
            position: 17,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          // Education & Background
          {
            id: 'educationLevel',
            type: 'predefined',
            fieldType: 'educationLevel',
            position: 18,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'occupationType',
            type: 'predefined',
            fieldType: 'occupationType',
            position: 19,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'locationType',
            type: 'predefined',
            fieldType: 'locationType',
            position: 20,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'timeZone',
            type: 'predefined',
            fieldType: 'timeZone',
            position: 21,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          // Research Participation
          {
            id: 'priorExperience',
            type: 'predefined',
            fieldType: 'priorExperience',
            position: 22,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'followUpWillingness',
            type: 'predefined',
            fieldType: 'followUpWillingness',
            position: 23,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'researchAvailability',
            type: 'predefined',
            fieldType: 'researchAvailability',
            position: 24,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'contactConsent',
            type: 'predefined',
            fieldType: 'contactConsent',
            position: 25,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'full', // Full width for better readability of privacy options
          },
          {
            id: 'yearsUsingProduct',
            type: 'predefined',
            fieldType: 'yearsUsingProduct',
            position: 26,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'productUsageFrequency',
            type: 'predefined',
            fieldType: 'productUsageFrequency',
            position: 27,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          // Accessibility & Inclusivity
          {
            id: 'accessibilityNeeds',
            type: 'predefined',
            fieldType: 'accessibilityNeeds',
            position: 28,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'preferredLanguage',
            type: 'predefined',
            fieldType: 'preferredLanguage',
            position: 29,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'assistiveTechnology',
            type: 'predefined',
            fieldType: 'assistiveTechnology',
            position: 30,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
          {
            id: 'digitalComfort',
            type: 'predefined',
            fieldType: 'digitalComfort',
            position: 31,
            enabled: false,
            required: false,
            mappedToScreeningQuestionId: null,
            width: 'half',
          },
        ],
      },
    ],
    // Options configurations for all predefined fields
    genderOptions: {
      options: ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'],
    },
    ageRangeOptions: {
      ranges: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
    },
    locationConfig: {
      startLevel: 'country',
      defaultCountry: null,
      defaultState: null,
    },
    maritalStatusOptions: {
      options: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Prefer not to say'],
    },
    householdSizeOptions: {
      options: ['1', '2', '3', '4', '5', '6+'],
    },
    employmentStatusOptions: {
      options: ['Student', 'Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Retired', 'Prefer not to say'],
    },
    industryOptions: {
      options: [
        'Technology',
        'Healthcare',
        'Finance & Banking',
        'Education',
        'Retail & E-commerce',
        'Manufacturing',
        'Consulting',
        'Marketing & Advertising',
        'Real Estate',
        'Hospitality & Tourism',
        'Government & Public Sector',
        'Non-profit',
        'Other',
      ],
    },
    companySizeOptions: {
      options: ['1-10', '11-50', '51-200', '201-1000', '1000-5000', '5000+'],
    },
    yearsOfExperienceOptions: {
      options: ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10-15 years', '15+ years'],
    },
    departmentOptions: {
      options: [
        'Design (UX/UI/Product)',
        'Engineering (Software/Hardware)',
        'Product Management',
        'Marketing',
        'Sales',
        'Customer Success',
        'Operations',
        'Human Resources',
        'Finance & Accounting',
        'Executive/Leadership',
        'Other',
      ],
    },
    // Technology & Usage Context
    primaryDeviceOptions: {
      options: ['Mobile', 'Desktop', 'Tablet', 'Smart TV', 'Other'],
    },
    operatingSystemOptions: {
      options: ['Windows', 'macOS', 'iOS', 'Android', 'Linux', 'ChromeOS', 'Other'],
    },
    browserPreferenceOptions: {
      options: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave', 'Arc', 'Opera', 'Other'],
    },
    techProficiencyOptions: {
      options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    },
    // Education & Background
    educationLevelOptions: {
      options: [
        'High school or equivalent',
        'Some college',
        'Associate degree',
        "Bachelor's degree",
        "Master's degree",
        'Doctorate or higher',
        'Trade/Vocational certification',
        'Prefer not to say',
      ],
    },
    occupationTypeOptions: {
      options: [
        'Student',
        'Full-time employee',
        'Part-time employee',
        'Freelancer/Contractor',
        'Business owner',
        'Retired',
        'Unemployed/Between jobs',
        'Homemaker',
        'Prefer not to say',
      ],
    },
    locationTypeOptions: {
      options: ['Urban', 'Suburban', 'Rural'],
    },
    timeZoneOptions: {
      options: [
        'UTC-12:00 (Baker Island)',
        'UTC-11:00 (American Samoa)',
        'UTC-10:00 (Hawaii)',
        'UTC-09:00 (Alaska)',
        'UTC-08:00 (Pacific Time)',
        'UTC-07:00 (Mountain Time)',
        'UTC-06:00 (Central Time)',
        'UTC-05:00 (Eastern Time)',
        'UTC-04:00 (Atlantic Time)',
        'UTC-03:00 (Buenos Aires, São Paulo)',
        'UTC-02:00 (Mid-Atlantic)',
        'UTC-01:00 (Azores)',
        'UTC+00:00 (London, Dublin)',
        'UTC+01:00 (Paris, Berlin, Rome)',
        'UTC+02:00 (Cairo, Athens)',
        'UTC+03:00 (Moscow, Istanbul)',
        'UTC+04:00 (Dubai)',
        'UTC+05:00 (Pakistan)',
        'UTC+05:30 (India, Sri Lanka)',
        'UTC+06:00 (Bangladesh)',
        'UTC+07:00 (Bangkok, Jakarta)',
        'UTC+08:00 (Singapore, Beijing)',
        'UTC+09:00 (Tokyo, Seoul)',
        'UTC+10:00 (Sydney, Melbourne)',
        'UTC+11:00 (Solomon Islands)',
        'UTC+12:00 (New Zealand)',
        'UTC+13:00 (Samoa)',
        'UTC+14:00 (Line Islands)',
        'Prefer not to say',
      ],
    },
    // Research Participation
    priorExperienceOptions: {
      options: [
        'First time participating',
        'Participated 1-2 times',
        'Participated 3-5 times',
        'Participated more than 5 times',
        'Regular participant',
      ],
    },
    followUpWillingnessOptions: {
      options: ['Yes, very interested', 'Yes, possibly', 'Maybe later', 'No thank you'],
    },
    researchAvailabilityOptions: {
      options: [
        'Weekday mornings',
        'Weekday afternoons',
        'Weekday evenings',
        'Weekends',
        'Flexible/Any time',
        'Not available',
      ],
    },
    contactConsentOptions: {
      options: ['Yes contact me for future studies', 'Only for this study', 'No do not contact'],
    },
    yearsUsingProductOptions: {
      options: [
        'First time user',
        'Less than 6 months',
        '6 months - 1 year',
        '1-2 years',
        '2-5 years',
        '5+ years',
        'Not applicable',
      ],
    },
    productUsageFrequencyOptions: {
      options: [
        'Multiple times per day',
        'Daily',
        'Weekly',
        'Monthly',
        'Rarely',
        'First time using',
        'Not applicable',
      ],
    },
    // Accessibility & Inclusivity
    accessibilityNeedsOptions: {
      options: [
        'None',
        'Visual impairment',
        'Hearing impairment',
        'Motor impairment',
        'Cognitive impairment',
        'Multiple needs',
        'Prefer not to say',
      ],
    },
    preferredLanguageOptions: {
      options: [
        'English',
        'Spanish',
        'French',
        'German',
        'Mandarin',
        'Japanese',
        'Portuguese',
        'Hindi',
        'Arabic',
        'Korean',
        'Other',
      ],
    },
    assistiveTechnologyOptions: {
      options: [
        'None',
        'Screen reader',
        'Voice control',
        'Keyboard-only navigation',
        'Screen magnification',
        'Switch control',
        'Other assistive tools',
        'Prefer not to say',
      ],
    },
    digitalComfortOptions: {
      options: ['Very comfortable', 'Comfortable', 'Neutral', 'Uncomfortable', 'Very uncomfortable'],
    },
  },
  // Display settings for how participants appear in analysis views
  displaySettings: {
    primaryField: 'fullName',
    secondaryField: 'email',
  },
}

export const defaultPreStudyQuestionsSettings: StudyFlowSettings['preStudyQuestions'] = {
  enabled: false,
  introTitle: 'Before We Begin',
  introMessage: 'Please answer a few questions to help us understand your background.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
}

export const defaultActivityInstructionsSettings: StudyFlowSettings['activityInstructions'] = {
  enabled: true,
  title: 'Instructions',
  part1: '<p>You will be presented with a set of items to organize.</p><p>Take your time and group them in a way that makes sense to you.</p>',
  part2: undefined,
}

export const defaultPostStudyQuestionsSettings: StudyFlowSettings['postStudyQuestions'] = {
  enabled: false,
  introTitle: 'Almost Done',
  introMessage: 'Please answer a few final questions about your experience.',
  pageMode: 'one_per_page',
  randomizeQuestions: false,
}

export const defaultSurveyQuestionnaireSettings: NonNullable<StudyFlowSettings['surveyQuestionnaire']> = {
  enabled: true,
  showIntro: true,
  introTitle: 'Survey',
  introMessage: 'Please answer the following questions. Your feedback is valuable to us.',
  pageMode: 'one_per_page', // Legacy - use pagination.mode instead
  randomizeQuestions: false,
  showProgressBar: true,
  allowSkipQuestions: false,
}

export const defaultPaginationSettings: NonNullable<StudyFlowSettings['pagination']> = {
  mode: 'one_per_page', // Default: traditional pagination
}
export const defaultTaskFeedbackSettings: TaskFeedbackSettings = {
  pageMode: 'one_per_page',
}

export const defaultThankYouSettings: StudyFlowSettings['thankYou'] = {
  enabled: true,
  title: 'Thank You!',
  message: '<p>Your responses have been recorded.</p><p>We greatly appreciate your participation in this study.</p>',
  redirectUrl: undefined,
  redirectDelay: 0,
  // Incentive confirmation - disabled by default
  showIncentive: false,
  incentiveMessage: 'Your {incentive} will be sent to you soon',
}

export const defaultClosedStudySettings: StudyFlowSettings['closedStudy'] = {
  title: 'Study Closed',
  message: 'This study is no longer accepting responses. Thank you for your interest.',
  redirectUrl: undefined,
  redirectImmediately: false,
}
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
  // Handle legacy pageMode migration
  let paginationOverride = overrides?.pagination
  if (!paginationOverride && overrides?.surveyQuestionnaire?.pageMode) {
    // Migrate legacy pageMode to new pagination setting
    paginationOverride = {
      mode: overrides.surveyQuestionnaire.pageMode === 'all_on_one' ? 'progressive' : 'one_per_page',
    }
  }

  return {
    ...defaultStudyFlowSettings,
    ...overrides,
    // Deep merge each section — stripEmpty prevents '' from overriding defaults
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
// Re-export study-type instruction defaults — single source of truth: @veritio/study-flow
export {
  cardSortInstructions,
  treeTestInstructions,
  prototypeTestInstructions,
  firstClickInstructions,
  firstImpressionInstructions,
  liveWebsiteTestInstructions,
}

/**
 * Migrates legacy welcome/thank you messages to new study flow format
 * Used for backward compatibility with existing studies
 * Now also applies study-type-specific instruction defaults
 */
export function migrateToStudyFlowSettings(
  welcomeMessage?: string | null,
  thankYouMessage?: string | null,
  existingSettings?: Partial<StudyFlowSettings>,
  studyType?: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
): StudyFlowSettings {
  const settings = createStudyFlowSettings(existingSettings)

  // Migrate welcome message if it exists and settings don't have custom welcome
  if (welcomeMessage && !existingSettings?.welcome?.message) {
    settings.welcome.message = welcomeMessage
    settings.welcome.enabled = true
  }

  // Migrate thank you message if it exists and settings don't have custom thank you
  if (thankYouMessage && !existingSettings?.thankYou?.message) {
    settings.thankYou.message = thankYouMessage
    settings.thankYou.enabled = true
  }

  // Apply study-type-specific instruction defaults if not already customized
  if (!existingSettings?.activityInstructions?.part1) {
    if (studyType === 'tree_test') {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = treeTestInstructions.part1
      settings.activityInstructions.part2 = treeTestInstructions.part2
    } else if (studyType === 'card_sort') {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = cardSortInstructions.open.part1
      settings.activityInstructions.part2 = cardSortInstructions.open.part2
    } else if (studyType === 'prototype_test') {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = prototypeTestInstructions.part1
      settings.activityInstructions.part2 = prototypeTestInstructions.part2
    } else if (studyType === 'first_click') {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = firstClickInstructions.part1
      settings.activityInstructions.part2 = firstClickInstructions.part2
    } else if (studyType === 'first_impression') {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = firstImpressionInstructions.part1
      settings.activityInstructions.part2 = firstImpressionInstructions.part2
    } else if (studyType === 'live_website_test') {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = liveWebsiteTestInstructions.part1
      settings.activityInstructions.part2 = liveWebsiteTestInstructions.part2
    }
  }

  // For activity-based study types, always ensure instructions are enabled
  if (studyType && studyType !== 'survey') {
    settings.activityInstructions.enabled = true
  }

  return settings
}
