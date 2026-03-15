import type { DemographicField, DemographicFieldType } from './supabase/study-flow-types'

/**
 * Field label mapping for demographic field types.
 */
const FIELD_LABELS: Record<DemographicFieldType, string> = {
  email: 'Email',
  firstName: 'First Name',
  lastName: 'Last Name',
  gender: 'Gender',
  ageRange: 'Age Range',
  location: 'Location',
  maritalStatus: 'Marital Status',
  householdSize: 'Household Size',
  employmentStatus: 'Employment Status',
  jobTitle: 'Job Title',
  industry: 'Industry',
  companySize: 'Company Size',
  yearsOfExperience: 'Years of Experience',
  department: 'Department / Role',
  primaryDevice: 'Primary Device',
  operatingSystem: 'Operating System',
  browserPreference: 'Primary Browser',
  techProficiency: 'Tech Proficiency Level',
  educationLevel: 'Education Level',
  occupationType: 'Current Occupation',
  locationType: 'Area Type',
  timeZone: 'Time Zone',
  priorExperience: 'Research Experience',
  followUpWillingness: 'Follow-up Interviews',
  researchAvailability: 'Availability',
  contactConsent: 'Contact Preference',
  yearsUsingProduct: 'Years Using Product',
  productUsageFrequency: 'Usage Frequency',
  accessibilityNeeds: 'Accessibility Needs',
  preferredLanguage: 'Preferred Language',
  assistiveTechnology: 'Assistive Technology',
  digitalComfort: 'Digital Comfort Level',
}

/**
 * Get the display label for a demographic field.
 */
export function getFieldLabel(field: DemographicField): string {
  if (field.type === 'custom') {
    return field.questionText || 'Custom Question'
  }
  return field.label || (field.fieldType ? FIELD_LABELS[field.fieldType] : 'Unknown Field')
}

/**
 * Validate email format.
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Check if a field type is a text input field.
 */
export function isTextInputField(fieldType: DemographicFieldType): boolean {
  return ['email', 'firstName', 'lastName', 'jobTitle'].includes(fieldType)
}
