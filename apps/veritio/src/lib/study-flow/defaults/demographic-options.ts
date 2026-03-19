import type { StudyFlowSettings } from '../../supabase/study-flow-types'

type DemographicProfile = StudyFlowSettings['participantIdentifier']['demographicProfile']

/**
 * All predefined options for demographic profile fields.
 * Extracted for clarity; these are the default dropdown/select values.
 */
export const defaultDemographicOptions: Omit<
  NonNullable<DemographicProfile>,
  'title' | 'description' | 'enableAutoPopulation' | 'sections'
> = {
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
}
