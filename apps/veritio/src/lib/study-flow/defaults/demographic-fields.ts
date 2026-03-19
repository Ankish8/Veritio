import type { DemographicField } from '../../supabase/study-flow-types'
import { makePredefinedField } from './factory'

/**
 * All predefined demographic fields with their default configurations.
 * Fields are grouped by category for readability.
 */
export function createDefaultDemographicFields(): DemographicField[] {
  return [
    // Contact & Identity (enabled by default)
    makePredefinedField('email', 'email', 0, 'full', true, true),
    makePredefinedField('firstName', 'firstName', 1, 'half', true, false),
    makePredefinedField('lastName', 'lastName', 2, 'half', true, false),

    // Basic Demographics
    makePredefinedField('gender', 'gender', 3, 'half'),
    makePredefinedField('ageRange', 'ageRange', 4, 'half'),
    makePredefinedField('location', 'location', 5, 'full'),
    makePredefinedField('maritalStatus', 'maritalStatus', 6, 'half'),
    makePredefinedField('householdSize', 'householdSize', 7, 'half'),

    // Professional / Work Details
    makePredefinedField('employmentStatus', 'employmentStatus', 8, 'half'),
    makePredefinedField('jobTitle', 'jobTitle', 9, 'full'),
    makePredefinedField('industry', 'industry', 10, 'half'),
    makePredefinedField('companySize', 'companySize', 11, 'half'),
    makePredefinedField('yearsOfExperience', 'yearsOfExperience', 12, 'half'),
    makePredefinedField('department', 'department', 13, 'half'),

    // Technology & Usage Context
    makePredefinedField('primaryDevice', 'primaryDevice', 14, 'half'),
    makePredefinedField('operatingSystem', 'operatingSystem', 15, 'half'),
    makePredefinedField('browserPreference', 'browserPreference', 16, 'half'),
    makePredefinedField('techProficiency', 'techProficiency', 17, 'half'),

    // Education & Background
    makePredefinedField('educationLevel', 'educationLevel', 18, 'half'),
    makePredefinedField('occupationType', 'occupationType', 19, 'half'),
    makePredefinedField('locationType', 'locationType', 20, 'half'),
    makePredefinedField('timeZone', 'timeZone', 21, 'half'),

    // Research Participation
    makePredefinedField('priorExperience', 'priorExperience', 22, 'half'),
    makePredefinedField('followUpWillingness', 'followUpWillingness', 23, 'half'),
    makePredefinedField('researchAvailability', 'researchAvailability', 24, 'half'),
    makePredefinedField('contactConsent', 'contactConsent', 25, 'full'),
    makePredefinedField('yearsUsingProduct', 'yearsUsingProduct', 26, 'half'),
    makePredefinedField('productUsageFrequency', 'productUsageFrequency', 27, 'half'),

    // Accessibility & Inclusivity
    makePredefinedField('accessibilityNeeds', 'accessibilityNeeds', 28, 'half'),
    makePredefinedField('preferredLanguage', 'preferredLanguage', 29, 'half'),
    makePredefinedField('assistiveTechnology', 'assistiveTechnology', 30, 'half'),
    makePredefinedField('digitalComfort', 'digitalComfort', 31, 'half'),
  ]
}
