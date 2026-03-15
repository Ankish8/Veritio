/**
 * Migration utility to convert old demographic profile structure to new sectioned format
 *
 * Run this via: npx tsx src/lib/migrations/migrate-demographic-sections.ts
 * Or import and use programmatically
 */

import type {
  DemographicProfileSettings,
  DemographicSection,
  DemographicField,
  DemographicFieldType,
} from '../supabase/study-flow-types'
import { defaultParticipantIdentifierSettings } from '../study-flow/defaults'

/**
 * Old structure (before migration) - for reference
 */
interface OldDemographicProfileSettings {
  fields: Record<DemographicFieldType, {
    enabled: boolean
    required: boolean
    label?: string
    mappedToScreeningQuestionId?: string | null
  }>
  genderOptions: { options: string[] }
  ageRangeOptions: { ranges: string[] }
  locationConfig: any
  maritalStatusOptions: { options: string[] }
  householdSizeOptions: { options: string[] }
  title?: string
  enableAutoPopulation?: boolean
}
export function migrateDemographicProfile(
  oldConfig: any
): DemographicProfileSettings {
  // Check if already migrated (has sections property)
  if (oldConfig && oldConfig.sections) {
    // Already in new format, just ensure all option configs exist
    return {
      ...defaultParticipantIdentifierSettings.demographicProfile!,
      ...oldConfig,
    }
  }

  // Check if old format (has fields property)
  if (!oldConfig || !oldConfig.fields) {
    // No config at all, return defaults
    return defaultParticipantIdentifierSettings.demographicProfile!
  }

  // Migrate from old format
  const oldFields = oldConfig.fields as OldDemographicProfileSettings['fields']

  // Create Basic Demographics section from old fields
  const basicDemographicsFields: DemographicField[] = [
    'email',
    'firstName',
    'lastName',
    'gender',
    'ageRange',
    'location',
    'maritalStatus',
    'householdSize',
  ].map((fieldType, index) => {
    const oldField = oldFields[fieldType as DemographicFieldType]
    return {
      id: fieldType,
      type: 'predefined' as const,
      fieldType: fieldType as DemographicFieldType,
      position: index,
      enabled: oldField?.enabled || false,
      required: oldField?.required || false,
      label: oldField?.label,
      mappedToScreeningQuestionId: oldField?.mappedToScreeningQuestionId || null,
    }
  })

  // Create Professional Details section with defaults (all disabled for migrated studies)
  const professionalDetailsFields: DemographicField[] = [
    'employmentStatus',
    'jobTitle',
    'industry',
    'companySize',
    'yearsOfExperience',
    'department',
  ].map((fieldType, index) => ({
    id: fieldType,
    type: 'predefined' as const,
    fieldType: fieldType as DemographicFieldType,
    position: index,
    enabled: false, // Disabled by default for migrated studies
    required: false,
    mappedToScreeningQuestionId: null,
  }))

  const sections: DemographicSection[] = [
    {
      id: 'basic-demographics',
      name: 'Basic Demographics',
      position: 0,
      fields: basicDemographicsFields,
    },
    {
      id: 'professional-details',
      name: 'Professional / Work Details',
      position: 1,
      fields: professionalDetailsFields,
    },
  ]

  // Build new config
  const newConfig: DemographicProfileSettings = {
    sections,
    title: oldConfig.title || 'Participant Information',
    enableAutoPopulation: oldConfig.enableAutoPopulation || false,
    genderOptions: oldConfig.genderOptions || defaultParticipantIdentifierSettings.demographicProfile!.genderOptions,
    ageRangeOptions: oldConfig.ageRangeOptions || defaultParticipantIdentifierSettings.demographicProfile!.ageRangeOptions,
    locationConfig: oldConfig.locationConfig || defaultParticipantIdentifierSettings.demographicProfile!.locationConfig,
    maritalStatusOptions: oldConfig.maritalStatusOptions || defaultParticipantIdentifierSettings.demographicProfile!.maritalStatusOptions,
    householdSizeOptions: oldConfig.householdSizeOptions || defaultParticipantIdentifierSettings.demographicProfile!.householdSizeOptions,
    employmentStatusOptions: defaultParticipantIdentifierSettings.demographicProfile!.employmentStatusOptions,
    industryOptions: defaultParticipantIdentifierSettings.demographicProfile!.industryOptions,
    companySizeOptions: defaultParticipantIdentifierSettings.demographicProfile!.companySizeOptions,
    yearsOfExperienceOptions: defaultParticipantIdentifierSettings.demographicProfile!.yearsOfExperienceOptions,
    departmentOptions: defaultParticipantIdentifierSettings.demographicProfile!.departmentOptions,
    // Technology & Usage Context
    primaryDeviceOptions: defaultParticipantIdentifierSettings.demographicProfile!.primaryDeviceOptions,
    operatingSystemOptions: defaultParticipantIdentifierSettings.demographicProfile!.operatingSystemOptions,
    browserPreferenceOptions: defaultParticipantIdentifierSettings.demographicProfile!.browserPreferenceOptions,
    techProficiencyOptions: defaultParticipantIdentifierSettings.demographicProfile!.techProficiencyOptions,
    // Education & Background
    educationLevelOptions: defaultParticipantIdentifierSettings.demographicProfile!.educationLevelOptions,
    occupationTypeOptions: defaultParticipantIdentifierSettings.demographicProfile!.occupationTypeOptions,
    locationTypeOptions: defaultParticipantIdentifierSettings.demographicProfile!.locationTypeOptions,
    timeZoneOptions: defaultParticipantIdentifierSettings.demographicProfile!.timeZoneOptions,
    // Research Participation
    priorExperienceOptions: defaultParticipantIdentifierSettings.demographicProfile!.priorExperienceOptions,
    followUpWillingnessOptions: defaultParticipantIdentifierSettings.demographicProfile!.followUpWillingnessOptions,
    researchAvailabilityOptions: defaultParticipantIdentifierSettings.demographicProfile!.researchAvailabilityOptions,
    contactConsentOptions: defaultParticipantIdentifierSettings.demographicProfile!.contactConsentOptions,
    yearsUsingProductOptions: defaultParticipantIdentifierSettings.demographicProfile!.yearsUsingProductOptions,
    productUsageFrequencyOptions: defaultParticipantIdentifierSettings.demographicProfile!.productUsageFrequencyOptions,
    // Accessibility & Inclusivity
    accessibilityNeedsOptions: defaultParticipantIdentifierSettings.demographicProfile!.accessibilityNeedsOptions,
    preferredLanguageOptions: defaultParticipantIdentifierSettings.demographicProfile!.preferredLanguageOptions,
    assistiveTechnologyOptions: defaultParticipantIdentifierSettings.demographicProfile!.assistiveTechnologyOptions,
    digitalComfortOptions: defaultParticipantIdentifierSettings.demographicProfile!.digitalComfortOptions,
  }

  return newConfig
}

/**
 * CLI usage information
 *
 * To manually migrate all studies in the database, you can:
 *
 * 1. **Automatic migration (recommended for dev):**
 *    - The app will automatically migrate old configs when they're loaded
 *    - No action needed - migration happens on-the-fly
 *
 * 2. **Database migration (for production):**
 *    - Run this SQL to update all studies:
 *
 *    UPDATE studies
 *    SET flow_settings = jsonb_set(
 *      flow_settings,
 *      '{participantIdentifier,demographicProfile}',
 *      <new_config>
 *    )
 *    WHERE
 *      flow_settings->'participantIdentifier'->>'type' = 'demographic_profile'
 *      AND flow_settings->'participantIdentifier'->'demographicProfile'->'fields' IS NOT NULL
 *      AND flow_settings->'participantIdentifier'->'demographicProfile'->'sections' IS NULL;
 *
 * 3. **Or flush the database (dev only):**
 *    - All new studies will use the new format
 */
