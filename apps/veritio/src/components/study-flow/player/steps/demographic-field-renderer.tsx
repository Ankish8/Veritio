'use client'

import { memo, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getFieldLabel, isTextInputField } from '@/lib/demographic-utils'
import { fieldPlaceholders } from '@veritio/prototype-test/components/study-flow/builder/sections/demographic-field-constants'
import type {
  DemographicField,
  DemographicProfileSettings,
  ParticipantDemographicData,
} from '@veritio/study-types/study-flow-types'

// Lazy-load location field component (includes 8MB country-state-city data)
// Only loaded when a study actually uses location demographic fields
const LocationCascadeField = dynamic(
  () => import('./location-cascade-field').then(mod => ({ default: mod.LocationCascadeField })),
  {
    loading: () => <div className="h-10 animate-pulse bg-muted rounded" />,
    ssr: false, // Location data not needed for SSR
  }
)

export interface DemographicFieldRendererProps {
  field: DemographicField
  config: DemographicProfileSettings
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  /** When true, field is read-only (pre-filled from panel profile) */
  disabled?: boolean
}

export const DemographicFieldRenderer = memo(function DemographicFieldRenderer({
  field,
  config,
  value,
  onChange,
  error,
  disabled,
}: DemographicFieldRendererProps) {
  const label = getFieldLabel(field)
  const fieldWidth = field.width || 'half'
  const containerClassName = fieldWidth === 'full' ? 'md:col-span-2' : ''

  // Select fields - memoize options lookup (must be before any early returns per rules-of-hooks)
  const options = useMemo(() => {
    if (field.type === 'predefined' && field.fieldType) {
      return getFieldOptions(field.fieldType, config)
    }
    return []
  }, [field.type, field.fieldType, config])

  // Label with optional lock icon for pre-filled fields
  const renderLabel = (htmlFor: string) => (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {label}
      {field.required && <span className="text-destructive ml-1">*</span>}
      {disabled && (
        <Lock className="h-3 w-3 text-muted-foreground" />
      )}
    </Label>
  )

  // Custom field (text input)
  if (field.type === 'custom') {
    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {renderLabel(field.id)}
        <Input
          id={field.id}
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
          className={disabled ? 'bg-muted/50' : ''}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  // Predefined fields
  if (field.type === 'predefined' && field.fieldType) {
    // Text input fields
    if (isTextInputField(field.fieldType)) {
      return (
        <div className={`space-y-2 ${containerClassName}`}>
          {renderLabel(field.fieldType)}
          <Input
            id={field.fieldType}
            type={field.fieldType === 'email' ? 'email' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldPlaceholders[field.fieldType]}
            disabled={disabled}
            className={disabled ? 'bg-muted/50' : ''}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )
    }

    // Location field
    if (field.fieldType === 'location') {
      return (
        <LocationCascadeField
          config={field}
          locationConfig={config.locationConfig}
          value={value as ParticipantDemographicData['location']}
          onChange={onChange}
          required={field.required}
          error={error}
        />
      )
    }

    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {renderLabel(field.fieldType)}
        <Select value={(value as string) || ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={field.fieldType} className={`w-full ${disabled ? 'bg-muted/50' : ''}`}>
            <SelectValue placeholder={fieldPlaceholders[field.fieldType]} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return null
})

function getFieldOptions(
  fieldType: string,
  config: DemographicProfileSettings
): string[] {
  switch (fieldType) {
    case 'gender':
      return config.genderOptions.options
    case 'ageRange':
      return config.ageRangeOptions.ranges
    case 'maritalStatus':
      return config.maritalStatusOptions.options
    case 'householdSize':
      return config.householdSizeOptions.options
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
    case 'primaryDevice':
      return config.primaryDeviceOptions.options
    case 'operatingSystem':
      return config.operatingSystemOptions.options
    case 'browserPreference':
      return config.browserPreferenceOptions.options
    case 'techProficiency':
      return config.techProficiencyOptions.options
    case 'educationLevel':
      return config.educationLevelOptions.options
    case 'occupationType':
      return config.occupationTypeOptions.options
    case 'locationType':
      return config.locationTypeOptions.options
    case 'timeZone':
      return config.timeZoneOptions.options
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
