/**
 * Widget Loader Constants
 *
 * Static data used by the widget loader script generator.
 */

/** Map border radius option names to pixel values */
export const RADIUS_MAP: Record<string, number> = {
  none: 0,
  small: 4,
  default: 8,
  large: 16,
}

/**
 * Demographic field options - comprehensive list matching study-flow fields.
 * Each field has a label and either options (for select) or type (for text input).
 */
export const DEMOGRAPHIC_OPTIONS: Record<string, { label: string; options?: string[]; type?: string }> = {
  // Basic Demographics
  country: {
    label: 'Country',
    options: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Brazil', 'Other'],
  },
  ageRange: {
    label: 'Age Range',
    options: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  },
  age_range: {
    label: 'Age Range',
    options: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  },
  gender: {
    label: 'Gender',
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  maritalStatus: {
    label: 'Marital Status',
    options: ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'],
  },
  householdSize: {
    label: 'Household Size',
    options: ['1', '2', '3', '4', '5+'],
  },

  // Professional
  industry: {
    label: 'Industry',
    options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Media', 'Government', 'Non-profit', 'Other'],
  },
  companySize: {
    label: 'Company Size',
    options: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
  },
  company_size: {
    label: 'Company Size',
    options: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
  },
  jobTitle: {
    label: 'Job Title',
    type: 'text',
  },
  job_role: {
    label: 'Job Role',
    options: ['Executive', 'Manager', 'Individual Contributor', 'Student', 'Other'],
  },
  employmentStatus: {
    label: 'Employment Status',
    options: ['Full-time', 'Part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired'],
  },
  yearsOfExperience: {
    label: 'Years of Experience',
    options: ['0-2', '3-5', '6-10', '11-15', '15+'],
  },
  department: {
    label: 'Department',
    options: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Other'],
  },

  // Technology
  primaryDevice: {
    label: 'Primary Device',
    options: ['Desktop/Laptop', 'Smartphone', 'Tablet'],
  },
  operatingSystem: {
    label: 'Operating System',
    options: ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Other'],
  },
  browserPreference: {
    label: 'Browser',
    options: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
  },
  techProficiency: {
    label: 'Tech Proficiency',
    options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
  },

  // Education
  educationLevel: {
    label: 'Education Level',
    options: ['High School', 'Some College', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'],
  },

  // Research Participation
  priorExperience: {
    label: 'Prior Research Experience',
    options: ['None', '1-2 studies', '3-5 studies', '6-10 studies', '10+ studies'],
  },
  researchAvailability: {
    label: 'Availability',
    options: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends', 'Flexible'],
  },
  availability: {
    label: 'Availability',
    options: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends', 'Flexible'],
  },
  followUpWillingness: {
    label: 'Follow-up Willingness',
    options: ['Yes', 'Maybe', 'No'],
  },
  contactConsent: {
    label: 'Contact Consent',
    options: ['Yes, contact me for future studies', 'No, one-time only'],
  },
  contactPreference: {
    label: 'Contact Preference',
    options: ['Email', 'Phone', 'SMS', 'No preference'],
  },

  // Accessibility
  accessibilityNeeds: {
    label: 'Accessibility Needs',
    options: ['None', 'Visual', 'Auditory', 'Motor', 'Cognitive', 'Multiple', 'Prefer not to say'],
  },
  preferredLanguage: {
    label: 'Preferred Language',
    options: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Other'],
  },

  // Product Usage
  yearsUsingProduct: {
    label: 'Years Using Product',
    options: ['Less than 1 year', '1-2 years', '3-5 years', '5+ years'],
  },
  productUsageFrequency: {
    label: 'Usage Frequency',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
  },
}

/** Frequency cap time window durations in milliseconds */
export const TIME_WINDOW_MS: Record<string, number> = {
  day: 86400000,
  week: 604800000,
  month: 2592000000,
  forever: Infinity,
}
