
// Question types: enums, configs, question model, response values, helpers
export * from './question-types'

// Display logic & rules: operators, conditions, custom sections
export * from './rules-types'

// Branching logic: screening, survey, advanced, enhanced
export * from './branching-types'

// Variables, piping, A/B testing, resume, first impression designs
export * from './variables-types'

// Study Flow Settings Types

import type { FirstImpressionDisplayMode, FirstImpressionDesignAssignmentMode, FirstImpressionQuestionDisplayMode } from './variables-types'

export interface WelcomeSettings {
  enabled: boolean;
  title: string;
  message: string; // HTML content
  // Include from Details tab toggles
  includeStudyTitle?: boolean;
  includeDescription?: boolean;
  includePurpose?: boolean;
  includeParticipantRequirements?: boolean;
  // Incentive display settings
  showIncentive?: boolean; // Toggle to show incentive card
  incentiveMessage?: string; // Editable message with {incentive} placeholder
}

export interface ParticipantAgreementSettings {
  enabled: boolean;
  title: string;
  message: string; // Intro text
  agreementText: string; // The actual agreement to accept (HTML)
  showRejectionMessage?: boolean; // Whether to show rejection message settings (default: true for backwards compat)
  rejectionTitle: string;
  rejectionMessage: string;
  redirectUrl?: string;
}

export type ParticipantIdentifierType = 'anonymous' | 'demographic_profile';

export type DemographicFieldType =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'ageRange'
  | 'location'
  | 'maritalStatus'
  | 'householdSize'
  | 'employmentStatus'
  | 'jobTitle'
  | 'industry'
  | 'companySize'
  | 'yearsOfExperience'
  | 'department'
  | 'primaryDevice'
  | 'operatingSystem'
  | 'browserPreference'
  | 'techProficiency'
  | 'educationLevel'
  | 'occupationType'
  | 'locationType'
  | 'timeZone'
  | 'priorExperience'
  | 'followUpWillingness'
  | 'researchAvailability'
  | 'contactConsent'
  | 'yearsUsingProduct'
  | 'productUsageFrequency'
  | 'accessibilityNeeds'
  | 'preferredLanguage'
  | 'assistiveTechnology'
  | 'digitalComfort';

export interface DemographicFieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  mappedToScreeningQuestionId?: string | null; // For smart mapping from screening questions
}

export interface GenderOptions {
  options: string[]; // e.g., ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']
}

export interface AgeRangeOptions {
  ranges: string[]; // e.g., ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']
}

export interface LocationFieldConfig {
  startLevel: 'country' | 'state' | 'city'; // Where the cascade begins
  defaultCountry?: string | null; // ISO country code (for state/city start levels)
  defaultState?: string | null; // State ISO code (for city start level)
}

export interface MaritalStatusOptions {
  options: string[]; // e.g., ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Prefer not to say']
}

export interface HouseholdSizeOptions {
  options: string[]; // e.g., ['1', '2', '3', '4', '5', '6+']
}

export interface EmploymentStatusOptions {
  options: string[]; // e.g., ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired', 'Prefer not to say']
}

export interface IndustryOptions {
  options: string[]; // e.g., ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', etc.]
}

export interface CompanySizeOptions {
  options: string[]; // e.g., ['1-10', '11-50', '51-200', '201-1000', '1000+']
}

export interface YearsOfExperienceOptions {
  options: string[]; // e.g., ['0-1', '1-3', '3-5', '5-10', '10-15', '15+']
}

export interface DepartmentOptions {
  options: string[]; // e.g., ['Design', 'Engineering', 'Marketing', 'Sales', 'Product', 'Operations', etc.]
}

export interface PrimaryDeviceOptions {
  options: string[]; // e.g., ['Mobile', 'Desktop', 'Tablet', 'Smart TV', 'Other']
}

export interface OperatingSystemOptions {
  options: string[]; // e.g., ['Windows', 'macOS', 'iOS', 'Android', 'Linux', 'ChromeOS', 'Other']
}

export interface BrowserPreferenceOptions {
  options: string[]; // e.g., ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave', 'Arc', 'Opera', 'Other']
}

export interface TechProficiencyOptions {
  options: string[]; // e.g., ['Beginner', 'Intermediate', 'Advanced', 'Expert']
}

export interface EducationLevelOptions {
  options: string[]; // e.g., ['High school or equivalent', "Bachelor's degree", "Master's degree", etc.]
}

export interface OccupationTypeOptions {
  options: string[]; // e.g., ['Student', 'Full-time employee', 'Freelancer/Contractor', 'Business owner', etc.]
}

export interface LocationTypeOptions {
  options: string[]; // e.g., ['Urban', 'Suburban', 'Rural']
}

export interface TimeZoneOptions {
  options: string[]; // e.g., ['UTC-12:00', 'UTC-11:00', ... 'UTC+14:00', 'Prefer not to say']
}

export interface PriorExperienceOptions {
  options: string[]; // e.g., ['First time participating', 'Participated 1-2 times', 'Regular participant']
}

export interface FollowUpWillingnessOptions {
  options: string[]; // e.g., ['Yes, very interested', 'Yes, possibly', 'Maybe later', 'No thank you']
}

export interface ResearchAvailabilityOptions {
  options: string[]; // e.g., ['Weekday mornings', 'Weekday afternoons', 'Weekends', 'Flexible/Any time']
}

export interface ContactConsentOptions {
  options: string[]; // e.g., ['Yes contact me for future studies', 'Only for this study', 'No do not contact']
}

export interface YearsUsingProductOptions {
  options: string[]; // e.g., ['First time user', 'Less than 6 months', '1-2 years', '5+ years']
}

export interface ProductUsageFrequencyOptions {
  options: string[]; // e.g., ['Multiple times per day', 'Daily', 'Weekly', 'Monthly', 'Rarely']
}

export interface AccessibilityNeedsOptions {
  options: string[]; // e.g., ['None', 'Visual impairment', 'Hearing impairment', 'Motor impairment', etc.]
}

export interface PreferredLanguageOptions {
  options: string[]; // e.g., ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', etc.]
}

export interface AssistiveTechnologyOptions {
  options: string[]; // e.g., ['None', 'Screen reader', 'Voice control', 'Keyboard-only navigation', etc.]
}

export interface DigitalComfortOptions {
  options: string[]; // e.g., ['Very comfortable', 'Comfortable', 'Neutral', 'Uncomfortable', 'Very uncomfortable']
}

export interface DemographicField {
  id: string;
  type: 'predefined' | 'custom';
  position: number;
  enabled: boolean;
  required: boolean;

  // For predefined fields
  fieldType?: DemographicFieldType;
  label?: string; // Optional custom label override

  // For custom fields
  questionText?: string;
  placeholder?: string;

  // Screening question mapping (for smart auto-population)
  mappedToScreeningQuestionId?: string | null;

  // Layout control - how much horizontal space this field should occupy
  width?: 'full' | 'half'; // Default: 'half'
}

export interface DemographicSection {
  id: string;
  name: string;
  position: number;
  fields: DemographicField[];
  title?: string; // Section title shown to participants
  description?: string; // Section description/instructions
}

export interface DemographicProfileSettings {
  sections: DemographicSection[];
  title?: string; // Form heading, default: "Participant Information"
  description?: string; // Brief description shown under the title
  enableAutoPopulation?: boolean; // Global toggle for smart auto-population

  // Options configurations for predefined fields
  genderOptions: GenderOptions;
  ageRangeOptions: AgeRangeOptions;
  locationConfig: LocationFieldConfig;
  maritalStatusOptions: MaritalStatusOptions;
  householdSizeOptions: HouseholdSizeOptions;
  employmentStatusOptions: EmploymentStatusOptions;
  industryOptions: IndustryOptions;
  companySizeOptions: CompanySizeOptions;
  yearsOfExperienceOptions: YearsOfExperienceOptions;
  departmentOptions: DepartmentOptions;
  // Technology & Usage Context
  primaryDeviceOptions: PrimaryDeviceOptions;
  operatingSystemOptions: OperatingSystemOptions;
  browserPreferenceOptions: BrowserPreferenceOptions;
  techProficiencyOptions: TechProficiencyOptions;
  // Education & Background
  educationLevelOptions: EducationLevelOptions;
  occupationTypeOptions: OccupationTypeOptions;
  locationTypeOptions: LocationTypeOptions;
  timeZoneOptions: TimeZoneOptions;
  // Research Participation
  priorExperienceOptions: PriorExperienceOptions;
  followUpWillingnessOptions: FollowUpWillingnessOptions;
  researchAvailabilityOptions: ResearchAvailabilityOptions;
  contactConsentOptions: ContactConsentOptions;
  yearsUsingProductOptions: YearsUsingProductOptions;
  productUsageFrequencyOptions: ProductUsageFrequencyOptions;
  // Accessibility & Inclusivity
  accessibilityNeedsOptions: AccessibilityNeedsOptions;
  preferredLanguageOptions: PreferredLanguageOptions;
  assistiveTechnologyOptions: AssistiveTechnologyOptions;
  digitalComfortOptions: DigitalComfortOptions;
}

export interface ParticipantDemographicData {
  // Basic Demographics
  email?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  ageRange?: string;
  location?: {
    country?: string; // Country name (e.g., "United States")
    countryCode?: string; // ISO code (e.g., "US")
    state?: string; // State name (e.g., "California")
    stateCode?: string; // ISO code (e.g., "CA")
    city?: string; // City name (e.g., "San Francisco")
  };
  maritalStatus?: string; // e.g., "Married"
  householdSize?: string; // e.g., "4"

  // Professional / Work Details
  employmentStatus?: string; // e.g., "Employed"
  jobTitle?: string; // e.g., "Senior Product Designer"
  industry?: string; // e.g., "Technology"
  companySize?: string; // e.g., "51-200"
  yearsOfExperience?: string; // e.g., "5-10"
  department?: string; // e.g., "Engineering"

  // Technology & Usage Context
  primaryDevice?: string; // e.g., "Desktop"
  operatingSystem?: string; // e.g., "macOS"
  browserPreference?: string; // e.g., "Chrome"
  techProficiency?: string; // e.g., "Advanced"

  // Education & Background
  educationLevel?: string; // e.g., "Bachelor's degree"
  occupationType?: string; // e.g., "Full-time employee"
  locationType?: string; // e.g., "Urban"
  timeZone?: string; // e.g., "UTC-08:00 (PST)"

  // Research Participation
  priorExperience?: string; // e.g., "Participated 1-2 times"
  followUpWillingness?: string; // e.g., "Yes, very interested"
  researchAvailability?: string; // e.g., "Weekday evenings"
  contactConsent?: string; // e.g., "Yes contact me for future studies"
  yearsUsingProduct?: string; // e.g., "1-2 years"
  productUsageFrequency?: string; // e.g., "Daily"

  // Accessibility & Inclusivity
  accessibilityNeeds?: string; // e.g., "None"
  preferredLanguage?: string; // e.g., "English"
  assistiveTechnology?: string; // e.g., "Screen reader"
  digitalComfort?: string; // e.g., "Very comfortable"

  // Custom fields (dynamic)
  [key: string]: string | number | boolean | null | undefined | Record<string, string>; // Allow custom field data

  _sources?: Record<string, string>; // Track data provenance (where each field came from)
}

export interface FieldMappingSuggestion {
  screeningQuestionId: string;
  screeningQuestionText: string;
  demographicField: DemographicFieldType;
  confidence: 'high' | 'medium' | 'low';
  reason: string; // Why this mapping was suggested
}

export type ParticipantDisplayField =
  | 'none'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'fullName';

export interface ParticipantDisplaySettings {
  primaryField: ParticipantDisplayField;
  secondaryField: ParticipantDisplayField;
}

export interface ParticipantIdentifierSettings {
  type: ParticipantIdentifierType;
  demographicProfile?: DemographicProfileSettings; // For 'demographic_profile' type
  displaySettings?: ParticipantDisplaySettings;
}

export interface ScreeningSettings {
  enabled: boolean;
  introTitle?: string;
  introMessage?: string;
  rejectionTitle: string;
  rejectionMessage: string;
  redirectUrl?: string;
  redirectImmediately?: boolean;
  pageMode?: 'one_per_page' | 'all_on_one'; // Default: 'one_per_page'
}

export interface QuestionsSectionSettings {
  enabled: boolean;
  showIntro?: boolean; // Default: true - whether to show the intro message
  introTitle?: string;
  introMessage?: string;
  pageMode?: 'one_per_page' | 'all_on_one'; // Default: 'one_per_page'
  randomizeQuestions?: boolean; // Default: false
  autoAdvance?: boolean; // Default: false - auto-advance after selection (only in one_per_page mode)
}

export interface SurveyQuestionnaireSettings {
  enabled: boolean;
  showIntro?: boolean; // Default: true - whether to show the intro message
  introTitle?: string;
  introMessage?: string;
  pageMode?: 'one_per_page' | 'all_on_one'; // Default: 'one_per_page'
  randomizeQuestions?: boolean; // Default: false
  showProgressBar?: boolean; // Default: true
  allowSkipQuestions?: boolean; // Default: false
  autoAdvance?: boolean; // Default: false - auto-advance after selection (only in one_per_page mode)
}

export interface ActivityInstructionsSettings {
  enabled: boolean;
  title: string;
  part1: string; // Instructions shown before first card sorted
  part2?: string; // Instructions shown after first card sorted (optional)
}

export interface ThankYouSettings {
  enabled: boolean;
  title: string;
  message: string;
  redirectUrl?: string;
  redirectDelay?: number; // Seconds before redirect (0 = no redirect)
  // Incentive confirmation settings
  showIncentive?: boolean; // Toggle to show incentive confirmation
  incentiveMessage?: string; // Editable message with {incentive} placeholder
}

export interface ClosedStudySettings {
  title: string;
  message: string;
  redirectUrl?: string;
  redirectImmediately: boolean;
}

export interface PaginationSettings {
  mode: 'progressive' | 'one_per_page';
}
export interface StudyFlowSettings {
  welcome: WelcomeSettings;
  participantAgreement: ParticipantAgreementSettings;
  screening: ScreeningSettings;
  participantIdentifier: ParticipantIdentifierSettings;
  preStudyQuestions: QuestionsSectionSettings;
  activityInstructions: ActivityInstructionsSettings;
  surveyQuestionnaire?: SurveyQuestionnaireSettings; // For survey study type
  postStudyQuestions: QuestionsSectionSettings;
  thankYou: ThankYouSettings;
  closedStudy: ClosedStudySettings;
  pagination?: PaginationSettings; // Survey pagination mode (progressive reveal vs one-per-page)
}

export type ThinkAloudPromptPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface ThinkAloudSettings {
  enabled: boolean
  showEducation: boolean
  silenceThresholdSeconds: number
  audioLevelThreshold: number
  promptPosition: ThinkAloudPromptPosition
  customPrompts?: string[]
}

export interface SessionRecordingSettings {
  enabled: boolean
  captureMode: 'audio' | 'screen_audio' | 'screen_audio_webcam'
  recordingScope: 'session' | 'task'
  privacyNotice?: string[]
  transcriptionLanguage?: string
  thinkAloud?: ThinkAloudSettings
}

export interface ExtendedCardSortSettings {
  // Original card sort settings
  mode: 'open' | 'closed' | 'hybrid';
  randomizeCards: boolean;
  allowSkip: boolean;
  showProgress: boolean;
  maxCategories?: number;

  // Card options (new features from Optimal Workshop)
  showTooltipDescriptions?: boolean;
  allowCardImages?: boolean;
  allowComments?: boolean;
  showCardOrderIndicators?: boolean;
  showUnsortedIndicator?: boolean;
  requireAllCardsSorted?: boolean;
  cardSubset?: number; // Show each participant X cards

  // Category options (for closed/hybrid)
  allowCategoryDescriptions?: boolean;
  addCategoryLimits?: boolean;
  randomizeCategoryOrder?: boolean;
  requireCategoriesNamed?: boolean;

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;

  // Legacy/alias properties for backwards compatibility
  randomizeCategories?: boolean; // Alias for randomizeCategoryOrder
  showCardImages?: boolean; // Alias for allowCardImages
  showCardDescriptions?: boolean; // Alias for showTooltipDescriptions
  showCategoryDescriptions?: boolean; // Alias for allowCategoryDescriptions
  includeUnclearCategory?: boolean; // Include unclear/unsure category
}

export interface TaskFeedbackSettings {
  pageMode: 'one_per_page' | 'all_on_one';
}

export interface ExtendedTreeTestSettings {
  // Original tree test settings
  randomizeTasks: boolean;
  showBreadcrumbs: boolean;
  allowBack: boolean;
  showTaskProgress: boolean;
  allowSkipTasks?: boolean;
  dontRandomizeFirstTask?: boolean;
  answerButtonText?: string;

  // Task feedback settings (applies to all tasks)
  taskFeedback?: TaskFeedbackSettings;

  // Legacy property for backwards compatibility
  taskFeedbackPageMode?: 'one_per_page' | 'all_on_one';

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}

export interface ExtendedSurveySettings {
  // Survey-specific settings
  showOneQuestionPerPage: boolean;  // true = one per page, false = all on one page
  randomizeQuestions: boolean;
  showProgressBar: boolean;
  allowSkipQuestions: boolean;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}

export type PrototypeScaleMode = '100%' | 'fit' | 'fill' | 'width';

export type TaskInstructionPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface ExtendedPrototypeTestSettings {
  // Prototype test settings
  randomizeTasks?: boolean;
  allowSkipTasks?: boolean;
  showTaskProgress?: boolean;
  dontRandomizeFirstTask?: boolean;
  clickableAreaFlashing?: boolean;
  tasksEndAutomatically?: boolean;
  allowFailureResponse?: boolean;
  showEachParticipantTasks?: 'all' | number;
  taskInstructionPosition?: TaskInstructionPosition;
  scalePrototype?: PrototypeScaleMode | boolean;
  trackHesitation?: boolean;
  trackNonClickEvents?: boolean;

  // Task feedback settings (applies to all tasks)
  taskFeedback?: TaskFeedbackSettings;

  // Legacy property for backwards compatibility
  taskFeedbackPageMode?: 'one_per_page' | 'all_on_one';

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}

export type FirstImpressionQuestionMode = 'shared' | 'per_design';

export interface ExtendedFirstImpressionSettings {
  // Exposure settings
  exposureDurationMs: number; // 5000-20000 (5-20 seconds)
  countdownDurationMs: number; // 0-5000 (0-5 seconds)
  showTimerToParticipant: boolean; // Whether to show remaining time
  showProgressIndicator: boolean; // Whether to show design progress (e.g., "1 of 3")

  // Display settings (global - applies to all designs)
  displayMode: FirstImpressionDisplayMode; // How images are scaled/positioned
  backgroundColor: string; // Background color when image doesn't fill screen

  // Question display settings
  questionDisplayMode: FirstImpressionQuestionDisplayMode;
  randomizeQuestions: boolean;
  autoAdvanceQuestions?: boolean;

  // Question scope - shared (default) vs per-design
  questionMode?: FirstImpressionQuestionMode;

  // Design assignment settings
  designAssignmentMode: FirstImpressionDesignAssignmentMode;
  allowPracticeDesign: boolean; // Whether first design can be marked as practice

  // Practice round instructions (shown before the practice design)
  practiceInstructions?: {
    title: string;
    content: string; // HTML content
  };

  // Task feedback settings (applies to per-design questions)
  taskFeedback?: TaskFeedbackSettings;

  // Session recording settings
  sessionRecordingSettings?: SessionRecordingSettings;

  // Study flow configuration
  studyFlow?: StudyFlowSettings;
}

export const DEFAULT_FIRST_IMPRESSION_SETTINGS: ExtendedFirstImpressionSettings = {
  exposureDurationMs: 5000, // 5 seconds
  countdownDurationMs: 3000, // 3 second countdown
  showTimerToParticipant: true,
  showProgressIndicator: true,
  displayMode: 'fit', // Default to fit (contain) mode
  backgroundColor: '#ffffff', // White background
  questionDisplayMode: 'one_per_page',
  randomizeQuestions: false,
  questionMode: 'shared', // Default to shared questions across designs
  designAssignmentMode: 'random_single',
  allowPracticeDesign: false,
};

export const DEFAULT_PRACTICE_INSTRUCTIONS = {
  title: 'Practice Round',
  content: `<p>Before we begin, let's do a quick practice round to help you understand how this works.</p>
<p><strong>Here's what will happen:</strong></p>
<ul>
<li>You'll see a design image for a few seconds</li>
<li>Then you'll answer some questions about your first impressions</li>
<li>Don't worry about memorizing details — just pay attention to how the design makes you feel</li>
</ul>
<p>This practice round <strong>won't count</strong> toward the study results. It's just to help you get comfortable with the task.</p>`,
};

export interface PathwayFrameStep {
  type: 'frame'
  id: string
  frameId: string
  isOptional?: boolean
}
export interface PathwayStateStep {
  type: 'state'
  id: string
  componentNodeId: string
  variantId: string
  componentName?: string
  variantName?: string
  customLabel?: string
  isOptional?: boolean
}

export type PathwayStep = PathwayFrameStep | PathwayStateStep

export function isPathwayFrameStep(step: PathwayStep): step is PathwayFrameStep {
  return step.type === 'frame'
}

export function isPathwayStateStep(step: PathwayStep): step is PathwayStateStep {
  return step.type === 'state'
}

export interface SuccessPath {
  id: string
  name: string
  frames: string[]
  is_primary: boolean
}

export interface SuccessPathV3 {
  id: string
  name: string
  steps: PathwayStep[]
  frames: string[]
  is_primary: boolean
}

export interface SuccessPathwayV3 {
  version: 3
  paths: SuccessPathV3[]
}

export interface SuccessPathwayV2 {
  version: 2
  paths: SuccessPath[]
}

/** Legacy v1 - single path only, auto-migrated to v2 on edit */
export interface SuccessPathwayV1 {
  frames: string[]
  strict: boolean
}

export type SuccessPathway = SuccessPathwayV3 | SuccessPathwayV2 | SuccessPathwayV1 | string[] | null

export function isSuccessPathwayV3(
  pathway: SuccessPathway
): pathway is SuccessPathwayV3 {
  return (
    pathway !== null &&
    typeof pathway === 'object' &&
    !Array.isArray(pathway) &&
    'version' in pathway &&
    pathway.version === 3
  )
}

export function isSuccessPathwayV2(
  pathway: SuccessPathway
): pathway is SuccessPathwayV2 {
  return (
    pathway !== null &&
    typeof pathway === 'object' &&
    !Array.isArray(pathway) &&
    'version' in pathway &&
    pathway.version === 2
  )
}

export function isSuccessPathwayV1(
  pathway: SuccessPathway
): pathway is SuccessPathwayV1 {
  return (
    pathway !== null &&
    typeof pathway === 'object' &&
    !Array.isArray(pathway) &&
    'frames' in pathway &&
    !('version' in pathway)
  )
}

export function isLegacyPathway(
  pathway: SuccessPathway
): pathway is string[] {
  return Array.isArray(pathway)
}

export type {
  Json,
  Task,
  Participant,
  TreeNode,
  Category,
  CardWithImage,
  StudySegment,
  SegmentCondition,
  SegmentConditionType,
  SegmentConditionOperator,
  SegmentConditionGroup,
  SegmentConditionsV2,
  PrototypeTestTask,
  PrototypeTestFrame,
  PrototypeTestFrameInsert,
  PrototypeTestTaskAttempt,
  PrototypeTestTaskInsert,
  PrototypeTestPrototype,
  PrototypeTestPrototypeInsert,
  PostTaskQuestion,
  CardSortSettings,
  TreeTestSettings,
  PrototypeTestSettings,
  FirstClickTask,
  FirstClickImage,
  FirstClickAOI,
  FirstClickTestSettings,
} from '@veritio/core/database'

export { isSegmentConditionsV2 } from '@veritio/core/database'

// Re-export user preferences types
export type {
  UserPreferences,
  UserPreferencesUpdate,
  DeepPartial,
} from './user-preferences-types'
