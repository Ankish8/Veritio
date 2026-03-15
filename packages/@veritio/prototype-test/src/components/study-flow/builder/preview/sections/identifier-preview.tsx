'use client'

import { useState } from 'react'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import { Badge } from '@veritio/ui/components/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@veritio/ui/components/select'
import { PreviewLayout, PreviewButton } from '../preview-layout'
import { defaultParticipantIdentifierSettings } from '@veritio/prototype-test/lib/study-flow/defaults'
import { fieldPlaceholders } from '../../sections/demographic-field-constants'
import type { StudyFlowSettings, DemographicFieldType, DemographicSection, DemographicProfileSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface IdentifierPreviewProps {
  settings: StudyFlowSettings['participantIdentifier']
  selectedSectionId?: string | null // ID of the section currently selected in builder
}

export function IdentifierPreview({ settings, selectedSectionId }: IdentifierPreviewProps) {
  const { type } = settings

  if (type === 'anonymous') {
    return (
      <PreviewLayout centered>
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Anonymous participants - no identifier required
          </p>
        </div>
      </PreviewLayout>
    )
  }

  if (type === 'demographic_profile') {
    return <DemographicProfilePreview settings={settings} selectedSectionId={selectedSectionId} />
  }

  return null
}

// ============================================================================
// Demographic Profile Preview Component
// ============================================================================

function DemographicProfilePreview({ settings, selectedSectionId }: IdentifierPreviewProps) {
  const savedConfig = settings.demographicProfile

  // Merge with defaults to ensure all new field options are present
  const config: DemographicProfileSettings = savedConfig ? {
    ...defaultParticipantIdentifierSettings.demographicProfile!,
    ...savedConfig,
    sections: savedConfig.sections || defaultParticipantIdentifierSettings.demographicProfile!.sections,
    // Merge all options with defaults
    genderOptions: savedConfig.genderOptions || defaultParticipantIdentifierSettings.demographicProfile!.genderOptions,
    ageRangeOptions: savedConfig.ageRangeOptions || defaultParticipantIdentifierSettings.demographicProfile!.ageRangeOptions,
    locationConfig: savedConfig.locationConfig || defaultParticipantIdentifierSettings.demographicProfile!.locationConfig,
    maritalStatusOptions: savedConfig.maritalStatusOptions || defaultParticipantIdentifierSettings.demographicProfile!.maritalStatusOptions,
    householdSizeOptions: savedConfig.householdSizeOptions || defaultParticipantIdentifierSettings.demographicProfile!.householdSizeOptions,
    employmentStatusOptions: savedConfig.employmentStatusOptions || defaultParticipantIdentifierSettings.demographicProfile!.employmentStatusOptions,
    industryOptions: savedConfig.industryOptions || defaultParticipantIdentifierSettings.demographicProfile!.industryOptions,
    companySizeOptions: savedConfig.companySizeOptions || defaultParticipantIdentifierSettings.demographicProfile!.companySizeOptions,
    yearsOfExperienceOptions: savedConfig.yearsOfExperienceOptions || defaultParticipantIdentifierSettings.demographicProfile!.yearsOfExperienceOptions,
    departmentOptions: savedConfig.departmentOptions || defaultParticipantIdentifierSettings.demographicProfile!.departmentOptions,
    // Technology & Usage Context
    primaryDeviceOptions: savedConfig.primaryDeviceOptions || defaultParticipantIdentifierSettings.demographicProfile!.primaryDeviceOptions,
    operatingSystemOptions: savedConfig.operatingSystemOptions || defaultParticipantIdentifierSettings.demographicProfile!.operatingSystemOptions,
    browserPreferenceOptions: savedConfig.browserPreferenceOptions || defaultParticipantIdentifierSettings.demographicProfile!.browserPreferenceOptions,
    techProficiencyOptions: savedConfig.techProficiencyOptions || defaultParticipantIdentifierSettings.demographicProfile!.techProficiencyOptions,
    // Education & Background
    educationLevelOptions: savedConfig.educationLevelOptions || defaultParticipantIdentifierSettings.demographicProfile!.educationLevelOptions,
    occupationTypeOptions: savedConfig.occupationTypeOptions || defaultParticipantIdentifierSettings.demographicProfile!.occupationTypeOptions,
    locationTypeOptions: savedConfig.locationTypeOptions || defaultParticipantIdentifierSettings.demographicProfile!.locationTypeOptions,
    timeZoneOptions: savedConfig.timeZoneOptions || defaultParticipantIdentifierSettings.demographicProfile!.timeZoneOptions,
    // Research Participation
    priorExperienceOptions: savedConfig.priorExperienceOptions || defaultParticipantIdentifierSettings.demographicProfile!.priorExperienceOptions,
    followUpWillingnessOptions: savedConfig.followUpWillingnessOptions || defaultParticipantIdentifierSettings.demographicProfile!.followUpWillingnessOptions,
    researchAvailabilityOptions: savedConfig.researchAvailabilityOptions || defaultParticipantIdentifierSettings.demographicProfile!.researchAvailabilityOptions,
    contactConsentOptions: savedConfig.contactConsentOptions || defaultParticipantIdentifierSettings.demographicProfile!.contactConsentOptions,
    yearsUsingProductOptions: savedConfig.yearsUsingProductOptions || defaultParticipantIdentifierSettings.demographicProfile!.yearsUsingProductOptions,
    productUsageFrequencyOptions: savedConfig.productUsageFrequencyOptions || defaultParticipantIdentifierSettings.demographicProfile!.productUsageFrequencyOptions,
    // Accessibility & Inclusivity
    accessibilityNeedsOptions: savedConfig.accessibilityNeedsOptions || defaultParticipantIdentifierSettings.demographicProfile!.accessibilityNeedsOptions,
    preferredLanguageOptions: savedConfig.preferredLanguageOptions || defaultParticipantIdentifierSettings.demographicProfile!.preferredLanguageOptions,
    assistiveTechnologyOptions: savedConfig.assistiveTechnologyOptions || defaultParticipantIdentifierSettings.demographicProfile!.assistiveTechnologyOptions,
    digitalComfortOptions: savedConfig.digitalComfortOptions || defaultParticipantIdentifierSettings.demographicProfile!.digitalComfortOptions,
  } : defaultParticipantIdentifierSettings.demographicProfile!

  if (!config) return null

  // Get sections with at least one enabled field
  const activeSections = config.sections
    .filter(section => section.fields.some(f => f.enabled))
    .sort((a, b) => a.position - b.position)

  if (activeSections.length === 0) {
    return (
      <PreviewLayout centered>
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No fields enabled</p>
        </div>
      </PreviewLayout>
    )
  }

  // Find the section to preview
  let sectionToPreview: DemographicSection | undefined

  if (selectedSectionId) {
    // Show the selected section if one is selected
    sectionToPreview = activeSections.find(s => s.id === selectedSectionId)
  }

  // Fallback to first active section if no section selected or selected section not found
  if (!sectionToPreview) {
    sectionToPreview = activeSections[0]
  }

  // Get enabled fields for the section to preview
  const fieldsToShow = sectionToPreview.fields
    .filter(f => f.enabled)
    .sort((a, b) => a.position - b.position)

  // Sample values state (dynamic based on fields)
  const [values, setValues] = useState<Record<string, string>>({})

  // Get field label helper
  const getFieldLabel = (field: any): string => {
    if (field.type === 'custom') {
      return field.questionText || 'Custom Question'
    }

    const labels: Record<string, string> = {
      // Basic Demographics
      email: 'Email',
      firstName: 'First Name',
      lastName: 'Last Name',
      gender: 'Gender',
      ageRange: 'Age Range',
      location: 'Location',
      maritalStatus: 'Marital Status',
      householdSize: 'Household Size',
      // Professional / Work Details
      employmentStatus: 'Employment Status',
      jobTitle: 'Job Title',
      industry: 'Industry',
      companySize: 'Company Size',
      yearsOfExperience: 'Years of Experience',
      department: 'Department / Role',
      // Technology & Usage Context
      primaryDevice: 'Primary Device',
      operatingSystem: 'Operating System',
      browserPreference: 'Primary Browser',
      techProficiency: 'Tech Proficiency Level',
      // Education & Background
      educationLevel: 'Education Level',
      occupationType: 'Current Occupation',
      locationType: 'Area Type',
      timeZone: 'Time Zone',
      // Research Participation
      priorExperience: 'Research Experience',
      followUpWillingness: 'Follow-up Interviews',
      researchAvailability: 'Availability',
      contactConsent: 'Contact Preference',
      yearsUsingProduct: 'Years Using Product',
      productUsageFrequency: 'Usage Frequency',
      // Accessibility & Inclusivity
      accessibilityNeeds: 'Accessibility Needs',
      preferredLanguage: 'Preferred Language',
      assistiveTechnology: 'Assistive Technology',
      digitalComfort: 'Digital Comfort Level',
    }

    return field.label || (field.fieldType ? labels[field.fieldType] : 'Unknown Field')
  }

  // Get dropdown options for a field type
  const getFieldOptions = (fieldType: DemographicFieldType): string[] => {
    switch (fieldType) {
      // Basic Demographics
      case 'gender':
        return config.genderOptions.options
      case 'ageRange':
        return config.ageRangeOptions.ranges
      case 'maritalStatus':
        return config.maritalStatusOptions.options
      case 'householdSize':
        return config.householdSizeOptions.options
      // Professional / Work Details
      case 'employmentStatus':
        return config.employmentStatusOptions.options
      case 'industry':
        return config.industryOptions.options
      case 'companySize':
        return config.companySizeOptions.options
      case 'yearsOfExperience':
        return config.yearsOfExperienceOptions.options
      case 'department':
        return config.departmentOptions.options
      // Technology & Usage Context
      case 'primaryDevice':
        return config.primaryDeviceOptions.options
      case 'operatingSystem':
        return config.operatingSystemOptions.options
      case 'browserPreference':
        return config.browserPreferenceOptions.options
      case 'techProficiency':
        return config.techProficiencyOptions.options
      // Education & Background
      case 'educationLevel':
        return config.educationLevelOptions.options
      case 'occupationType':
        return config.occupationTypeOptions.options
      case 'locationType':
        return config.locationTypeOptions.options
      case 'timeZone':
        return config.timeZoneOptions.options
      // Research Participation
      case 'priorExperience':
        return config.priorExperienceOptions.options
      case 'followUpWillingness':
        return config.followUpWillingnessOptions.options
      case 'researchAvailability':
        return config.researchAvailabilityOptions.options
      case 'contactConsent':
        return config.contactConsentOptions.options
      case 'yearsUsingProduct':
        return config.yearsUsingProductOptions.options
      case 'productUsageFrequency':
        return config.productUsageFrequencyOptions.options
      // Accessibility & Inclusivity
      case 'accessibilityNeeds':
        return config.accessibilityNeedsOptions.options
      case 'preferredLanguage':
        return config.preferredLanguageOptions.options
      case 'assistiveTechnology':
        return config.assistiveTechnologyOptions.options
      case 'digitalComfort':
        return config.digitalComfortOptions.options
      default:
        return []
    }
  }

  return (
    <PreviewLayout
      title={config.title || 'Participant Information'}
      subtitle={config.description}
      actions={
        <div className="flex justify-end">
          <PreviewButton>Continue</PreviewButton>
        </div>
      }
    >
      <div className="space-y-6 w-full max-w-2xl">
        {/* Section header with title and subtle progress indicator */}
        <div className="space-y-3">
          {/* Section title */}
          <h2 className="text-xl font-semibold text-foreground">
            {sectionToPreview.title || sectionToPreview.name}
          </h2>

          {/* Section description */}
          {sectionToPreview.description && (
            <p className="text-sm text-muted-foreground">
              {sectionToPreview.description}
            </p>
          )}

          {/* Very subtle progress indicator - only show if multiple sections */}
          {activeSections.length > 1 && (
            <div className="flex items-center gap-1 pt-2">
              {activeSections.map((section, index) => {
                const sectionIndex = activeSections.findIndex(s => s.id === sectionToPreview.id)
                return (
                  <div
                    key={section.id}
                    className={`h-0.5 flex-1 rounded-full transition-all ${
                      index <= sectionIndex
                        ? 'bg-border'
                        : 'bg-muted/40'
                    }`}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Form fields - responsive grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldsToShow.map((field) => {
          // Use field width property (default to 'half' if not set)
          const fieldWidth = field.width || 'half'
          const containerClassName = fieldWidth === 'full' ? 'md:col-span-2' : ''

          return (
            <div key={field.id} className={`space-y-2 ${containerClassName}`}>
              <Label>
                {getFieldLabel(field)}
                {field.required && <span className="text-destructive ml-1">*</span>}
                {field.mappedToScreeningQuestionId && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Auto-filled from screening
                  </Badge>
                )}
              </Label>
              {field.type === 'custom' || field.fieldType === 'email' || field.fieldType === 'firstName' ||
               field.fieldType === 'lastName' || field.fieldType === 'jobTitle' ? (
                <Input
                  type={field.fieldType === 'email' ? 'email' : 'text'}
                  placeholder={field.type === 'custom' ? field.placeholder : (field.fieldType ? fieldPlaceholders[field.fieldType] : '')}
                  value={values[field.id] || ''}
                  onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
                />
              ) : field.fieldType === 'location' ? (
                // Show cascading location selects in preview
                <div className="space-y-3">
                  <Select value={values[`${field.id}_country`] || ''} onValueChange={(v) => setValues({ ...values, [`${field.id}_country`]: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Country..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={values[`${field.id}_state`] || ''} onValueChange={(v) => setValues({ ...values, [`${field.id}_state`]: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="State/Region..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ca">California</SelectItem>
                      <SelectItem value="ny">New York</SelectItem>
                      <SelectItem value="tx">Texas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={values[`${field.id}_city`] || ''} onValueChange={(v) => setValues({ ...values, [`${field.id}_city`]: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="City..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sf">San Francisco</SelectItem>
                      <SelectItem value="la">Los Angeles</SelectItem>
                      <SelectItem value="sd">San Diego</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : field.fieldType ? (
                <Select value={values[field.id] || ''} onValueChange={(v) => setValues({ ...values, [field.id]: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={fieldPlaceholders[field.fieldType]} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFieldOptions(field.fieldType).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          )
        })}
        </div>
      </div>
    </PreviewLayout>
  )
}
