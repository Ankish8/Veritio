'use client'

import { useRef, useEffect, useMemo } from 'react'
import { Label } from '@veritio/ui/components/label'
import { Input } from '@veritio/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { UserX, Info, Eye } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { DemographicSectionEditor } from './demographic-section-editor'
import type { ParticipantDisplayField } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { resolveParticipantDisplay } from '@veritio/prototype-test/lib/utils/participant-display'
const DISPLAY_FIELD_OPTIONS: { value: ParticipantDisplayField; label: string }[] = [
  { value: 'fullName', label: 'Full Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
]
const SECONDARY_FIELD_OPTIONS: { value: ParticipantDisplayField; label: string }[] = [
  ...DISPLAY_FIELD_OPTIONS,
  { value: 'none', label: 'None' },
]
function DisplaySettingsCard() {
  const { flowSettings, updateIdentifierSettings } = useStudyFlowBuilderStore()
  const { participantIdentifier } = flowSettings

  // Get current display settings with defaults
  const displaySettings = participantIdentifier.displaySettings || {
    primaryField: 'fullName' as ParticipantDisplayField,
    secondaryField: 'email' as ParticipantDisplayField,
  }

  const updateDisplayField = (
    field: 'primaryField' | 'secondaryField',
    value: ParticipantDisplayField
  ) => {
    updateIdentifierSettings({
      displaySettings: {
        ...displaySettings,
        [field]: value,
      },
    })
  }

  // Generate preview based on current settings
  const preview = useMemo(() => {
    return resolveParticipantDisplay(displaySettings, {
      index: 1,
      demographics: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
      },
    })
  }, [displaySettings])

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-base font-medium">Display Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how participants appear in your results and analysis views.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary-field">Primary Identifier</Label>
          <Select
            value={displaySettings.primaryField}
            onValueChange={(value) =>
              updateDisplayField('primaryField', value as ParticipantDisplayField)
            }
          >
            <SelectTrigger id="primary-field">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_FIELD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Main identifier shown for each participant.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary-field">Secondary Identifier</Label>
          <Select
            value={displaySettings.secondaryField}
            onValueChange={(value) =>
              updateDisplayField('secondaryField', value as ParticipantDisplayField)
            }
          >
            <SelectTrigger id="secondary-field">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {SECONDARY_FIELD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Shown below the primary identifier.
          </p>
        </div>
      </div>

      {/* Live Preview */}
      <div className="rounded-md bg-muted/40 p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Eye className="h-3 w-3" />
          <span>Preview</span>
        </div>
        <p className="font-medium text-sm">{preview.primary}</p>
        {preview.secondary && (
          <p className="text-sm text-muted-foreground">{preview.secondary}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        If the selected fields are empty for a participant, the display will fall back to
        &quot;P1&quot;, &quot;P2&quot;, etc.
      </p>
    </div>
  )
}

interface IdentifierSectionProps {
  selectedSectionId?: string | null
}
export function IdentifierSection({ selectedSectionId = null }: IdentifierSectionProps) {
  const {
    flowSettings,
    updateIdentifierSettings,
    addDemographicSection,
    setSelectedDemographicSectionId,
  } = useStudyFlowBuilderStore()
  const { participantIdentifier } = flowSettings

  const isAnonymous = participantIdentifier.type === 'anonymous'
  const demographicProfile = participantIdentifier.demographicProfile

  const hasEmailField = useMemo(
    () => demographicProfile?.sections?.some((s) =>
      s.fields?.some((f) => f.fieldType === 'email' && f.enabled)
    ) ?? false,
    [demographicProfile]
  )

  const hasCreatedRef = useRef(false)
  useEffect(() => {
    if (selectedSectionId === 'add-section' && demographicProfile && !hasCreatedRef.current) {
      hasCreatedRef.current = true
      const newSectionId = addDemographicSection('custom')
      if (newSectionId) {
        // Automatically select the newly created section
        setSelectedDemographicSectionId(newSectionId)
      }
    }

    // Reset flag when not in add-section mode
    if (selectedSectionId !== 'add-section') {
      hasCreatedRef.current = false
    }
  }, [selectedSectionId, demographicProfile, addDemographicSection, setSelectedDemographicSectionId])

  // Show anonymous explanation when Anonymous is selected
  if (isAnonymous) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-medium">Anonymous Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Participants will remain completely anonymous. Each response will be assigned a unique random ID for tracking purposes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show demographic section editor when a specific section is selected
  if (selectedSectionId && demographicProfile) {
    const section = demographicProfile.sections.find((s) => s.id === selectedSectionId)
    if (!section) return null

    return (
      <DemographicSectionEditor
        section={section}
        demographicProfile={demographicProfile}
      />
    )
  }

  // Show main participant details explanation (default view)
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-medium">Participant Details</h3>
          <p className="text-sm text-muted-foreground">
            Collect demographic and professional information from participants. Use the sections in the sidebar to configure which fields to collect.
          </p>
        </div>

        {/* Profile Title and Description */}
        {demographicProfile && (
          <>
            <div className="space-y-2">
              <Label htmlFor="profile-title">Form Title</Label>
              <Input
                id="profile-title"
                value={demographicProfile.title || 'Participant Information'}
                onChange={(e) => {
                  updateIdentifierSettings({
                    demographicProfile: {
                      ...demographicProfile,
                      title: e.target.value,
                    },
                  })
                }}
                placeholder="e.g., Tell us about yourself"
              />
              <p className="text-xs text-muted-foreground">
                This title will be shown to participants at the top of the form.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-description">Form Description</Label>
              <Input
                id="profile-description"
                value={demographicProfile.description || ''}
                onChange={(e) => {
                  updateIdentifierSettings({
                    demographicProfile: {
                      ...demographicProfile,
                      description: e.target.value,
                    },
                  })
                }}
                placeholder="e.g., Help us understand you better..."
              />
              <p className="text-xs text-muted-foreground">
                Brief description shown under the title. Keep it concise and welcoming.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Panel auto-add info banner - show when email field is enabled */}
      {hasEmailField && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Participants who provide their email will be automatically added to your Panel when they complete this study.
          </p>
        </div>
      )}

      {/* Display Settings - How participants appear in results */}
      <DisplaySettingsCard />

      {/* Instructions */}
      <div className="rounded-lg bg-muted/30 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">How to configure</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Select a section from the sidebar to configure its fields</li>
              <li>Toggle fields on/off and mark them as required</li>
              <li>Add custom text fields to any section</li>
              <li>Click "+ Add section" to add additional demographic sections</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
