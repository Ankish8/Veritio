'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Label } from '@veritio/ui/components/label'
import { Input } from '@veritio/ui/components/input'
import { Button } from '@veritio/ui/components/button'
import { Switch } from '@veritio/ui/components/switch'
import { Plus, Trash2, Columns2, RectangleHorizontal, User, Info } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import type { DemographicField, DemographicFieldType, DemographicSection, DemographicProfileSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { fieldLabels, fieldIcons } from './demographic-field-constants'
import { DemographicFieldMegaMenu } from './demographic-field-mega-menu'
import { useYjsOptional } from '@veritio/prototype-test/components/yjs/yjs-provider'
import { CollaborativeInput } from '@veritio/prototype-test/components/yjs/collaborative-input'

// Lazy-load location field config (includes 8MB country-state-city data)
// Only loaded when location field is enabled in a study
const LocationFieldAdvancedConfig = dynamic(
  () => import('./location-field-config').then(mod => ({ default: mod.LocationFieldAdvancedConfig })),
  {
    loading: () => <div className="h-20 animate-pulse bg-muted rounded" />,
    ssr: false, // Location data not needed for SSR
  }
)

interface DemographicSectionEditorProps {
  section: DemographicSection
  demographicProfile: DemographicProfileSettings
}
export function DemographicSectionEditor({
  section,
  demographicProfile,
}: DemographicSectionEditorProps) {
  const {
    updateDemographicField,
    toggleDemographicFieldEnabled,
    addDemographicCustomField,
    updateDemographicSection,
  } = useStudyFlowBuilderStore()

  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected)

  const [showAddCustomField, setShowAddCustomField] = useState(false)
  const [customFieldText, setCustomFieldText] = useState('')
  const [customFieldPlaceholder, setCustomFieldPlaceholder] = useState('')

  const handleAddCustomField = () => {
    if (!customFieldText.trim()) return

    addDemographicCustomField(section.id, {
      questionText: customFieldText,
      placeholder: customFieldPlaceholder,
    })

    setCustomFieldText('')
    setCustomFieldPlaceholder('')
    setShowAddCustomField(false)
  }

  // Filter to only show enabled fields
  const enabledFields = section.fields.filter((field: DemographicField) => field.enabled)

  return (
    <div className="space-y-6">
      {/* Section title and description */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="section-title">Section Title</Label>
          {isCollaborative ? (
            <CollaborativeInput
              id="section-title"
              fieldPath={`flow.demographic.section.${section.id}.title`}
              onChange={(value) => {
                updateDemographicSection(section.id, {
                  title: value,
                  name: value || 'Custom Section', // Update sidebar name too
                })
              }}
              initialValue={section.title || ''}
              placeholder={section.name}
            />
          ) : (
            <Input
              id="section-title"
              value={section.title || ''}
              onChange={(e) => {
                const newTitle = e.target.value
                updateDemographicSection(section.id, {
                  title: newTitle,
                  name: newTitle || 'Custom Section', // Update sidebar name too
                })
              }}
              placeholder={section.name}
            />
          )}
          <p className="text-xs text-muted-foreground">
            This title will be shown to participants and in the sidebar.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="section-description">Description</Label>
          {isCollaborative ? (
            <CollaborativeInput
              id="section-description"
              fieldPath={`flow.demographic.section.${section.id}.description`}
              onChange={(value) => {
                updateDemographicSection(section.id, { description: value })
              }}
              initialValue={section.description || ''}
              placeholder="Optional instructions or context for this section"
            />
          ) : (
            <Input
              id="section-description"
              value={section.description || ''}
              onChange={(e) => {
                updateDemographicSection(section.id, { description: e.target.value })
              }}
              placeholder="Optional instructions or context for this section"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Provide additional context or instructions for participants.
          </p>
        </div>
      </div>

      {/* Section info */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{section.name}</h3>
        <p className="text-sm text-muted-foreground">
          Configure which fields to collect in this section.
        </p>
      </div>

      {/* Fields list - only show enabled fields */}
      <div className="space-y-3">
        {enabledFields.map((field: DemographicField) => {
          // Get icon for predefined fields
          const FieldIcon = field.type === 'predefined' && field.fieldType
            ? fieldIcons[field.fieldType]
            : User

          return (
            <div
              key={field.id}
              className="rounded-lg border bg-muted/20 border-border transition-all"
            >
              <div className="p-3.5">
                <div className="flex items-center gap-3">
                  {/* Field Icon */}
                  <div className="flex h-8 w-8 items-center justify-center rounded shrink-0 bg-muted">
                    <FieldIcon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Field Name */}
                  <div className="text-sm font-medium flex-1 min-w-0 truncate">
                    {field.type === 'predefined' && field.fieldType
                      ? fieldLabels[field.fieldType]
                      : field.questionText || 'Custom Field'}
                  </div>

                  {/* Width Toggle - Subtle icon buttons */}
                  <div className="flex items-center gap-0.5 shrink-0 rounded border border-border/50 p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateDemographicField(section.id, field.id, { width: 'half' })}
                      className={`h-6 w-6 p-0 ${field.width === 'half' || !field.width ? 'bg-muted' : 'hover:bg-muted/50'}`}
                      title="Half width (shares row with another field)"
                    >
                      <Columns2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateDemographicField(section.id, field.id, { width: 'full' })}
                      className={`h-6 w-6 p-0 ${field.width === 'full' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                      title="Full width (takes entire row)"
                    >
                      <RectangleHorizontal className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Required Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Required</span>
                    <Switch
                      checked={field.required}
                      onCheckedChange={() => updateDemographicField(section.id, field.id, { required: !field.required })}
                    />
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDemographicFieldEnabled(section.id, field.id)}
                    className="h-8 w-8 p-0 shrink-0"
                    title="Remove field"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Location Advanced Config */}
              {field.type === 'predefined' && field.fieldType === 'location' && field.enabled && (
                <LocationFieldAdvancedConfig config={demographicProfile} />
              )}
            </div>
          )
        })}
      </div>

      {/* Panel auto-add info banner - show when an email field is enabled in this section */}
      {enabledFields.some((f: DemographicField) => f.fieldType === 'email') && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Participants who provide their email will be automatically added to your Panel when they complete this study.
          </p>
        </div>
      )}

      {/* Add field buttons - side by side */}
      {!showAddCustomField ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Add demographic field */}
          <DemographicFieldMegaMenu
            section={section}
            demographicProfile={demographicProfile}
            onFieldSelect={(fieldType) => {
              // Check if field exists in current section
              const existingField = section.fields.find((f: DemographicField) =>
                f.fieldType === fieldType || f.id === fieldType
              )

              if (existingField) {
                // Field exists, just enable it
                toggleDemographicFieldEnabled(section.id, existingField.id)
              } else {
                // Field doesn't exist in this section, add it
                const newField: DemographicField = {
                  id: fieldType,
                  type: 'predefined',
                  fieldType: fieldType as DemographicFieldType,
                  position: section.fields.length,
                  enabled: true,
                  required: false,
                  mappedToScreeningQuestionId: null,
                }

                // Add field to section using updateDemographicSection
                const { updateDemographicSection } = useStudyFlowBuilderStore.getState()
                updateDemographicSection(section.id, {
                  fields: [...section.fields, newField]
                })
              }
            }}
          />

          {/* Add custom field */}
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowAddCustomField(true)}
            className="justify-start border-2 border-dashed hover:bg-muted/50"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add custom field
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="custom-field-text">Field Question</Label>
            <Input
              id="custom-field-text"
              value={customFieldText}
              onChange={(e) => setCustomFieldText(e.target.value)}
              placeholder="e.g., What is your occupation?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-field-placeholder">Placeholder (optional)</Label>
            <Input
              id="custom-field-placeholder"
              value={customFieldPlaceholder}
              onChange={(e) => setCustomFieldPlaceholder(e.target.value)}
              placeholder="e.g., Enter your occupation"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCustomField}>
              Add Field
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddCustomField(false)
                setCustomFieldText('')
                setCustomFieldPlaceholder('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
