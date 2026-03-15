'use client'

import React, { useState } from 'react'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import { Plus, ChevronRight, User, UserCheck } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import type { DemographicField, DemographicFieldType, DemographicSection, DemographicProfileSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import {
  fieldLabels,
  fieldIcons,
  BASIC_FIELD_TYPES,
  PROFESSIONAL_FIELD_TYPES,
  TECHNOLOGY_FIELD_TYPES,
  EDUCATION_FIELD_TYPES,
  RESEARCH_FIELD_TYPES,
  ACCESSIBILITY_FIELD_TYPES,
} from './demographic-field-constants'

type CategoryType = 'basic' | 'professional' | 'technology' | 'education' | 'research' | 'accessibility'
type MenuField = Pick<DemographicField, 'id' | 'fieldType' | 'type' | 'enabled'>

interface DemographicFieldMegaMenuProps {
  section: DemographicSection
  demographicProfile: DemographicProfileSettings
  onFieldSelect: (fieldId: string) => void
}
export function DemographicFieldMegaMenu({
  section,
  demographicProfile,
  onFieldSelect,
}: DemographicFieldMegaMenuProps) {
  const { flowSettings } = useStudyFlowBuilderStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showAbove, setShowAbove] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, bottom: 0, left: 0, width: 0 })
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>('basic')
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Get all currently enabled field IDs across ALL sections to filter them out
  const allEnabledFieldTypes = new Set<DemographicFieldType>()
  flowSettings.participantIdentifier.demographicProfile?.sections.forEach((s) => {
    s.fields.forEach((f) => {
      if (f.enabled && f.type === 'predefined' && f.fieldType) {
        allEnabledFieldTypes.add(f.fieldType)
      }
    })
  })

  // Get available (not yet enabled) fields from current section
  const availableFieldsInSection = section.fields.filter(
    (field: DemographicField) => !field.enabled && field.type === 'predefined'
  )

  // Create field objects for fields that don't exist in current section but are available
  const createFieldsForMissingTypes = (types: DemographicFieldType[]) => {
    return types
      .filter(type => !allEnabledFieldTypes.has(type)) // Not enabled anywhere
      .filter(type => !availableFieldsInSection.some((f: DemographicField) => f.fieldType === type)) // Not in current section
      .map(type => ({
        id: type,
        fieldType: type,
        type: 'predefined' as const,
        enabled: false,
      }))
  }

  // Combine fields from current section with missing fields for each category
  const getFieldsForCategory = (types: DemographicFieldType[]) => [
    ...availableFieldsInSection.filter((field: DemographicField) =>
      field.fieldType && types.includes(field.fieldType)
    ),
    ...createFieldsForMissingTypes(types)
  ]

  const basicDemographicsFields = getFieldsForCategory(BASIC_FIELD_TYPES)
  const professionalFields = getFieldsForCategory(PROFESSIONAL_FIELD_TYPES)
  const technologyFields = getFieldsForCategory(TECHNOLOGY_FIELD_TYPES)
  const educationFields = getFieldsForCategory(EDUCATION_FIELD_TYPES)
  const researchFields = getFieldsForCategory(RESEARCH_FIELD_TYPES)
  const accessibilityFields = getFieldsForCategory(ACCESSIBILITY_FIELD_TYPES)

  // Filter fields based on search query
  const filterFields = (fields: MenuField[]) => {
    if (!searchQuery.trim()) return fields
    const query = searchQuery.toLowerCase()
    return fields.filter(field => {
      const label = field.fieldType ? fieldLabels[field.fieldType].toLowerCase() : ''
      return label.includes(query)
    })
  }

  const filteredBasicFields = filterFields(basicDemographicsFields)
  const filteredProfessionalFields = filterFields(professionalFields)
  const filteredTechnologyFields = filterFields(technologyFields)
  const filteredEducationFields = filterFields(educationFields)
  const filteredResearchFields = filterFields(researchFields)
  const filteredAccessibilityFields = filterFields(accessibilityFields)

  // Don't show the menu if no fields are available
  const totalAvailableFields =
    basicDemographicsFields.length +
    professionalFields.length +
    technologyFields.length +
    educationFields.length +
    researchFields.length +
    accessibilityFields.length

  // Check available space and position menu accordingly
  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 400 // Approximate max height of menu

      setButtonPosition({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width
      })

      // If not enough space below, show above
      setShowAbove(spaceBelow < menuHeight && rect.top > menuHeight)
    }
  }, [isOpen])

  // Always show the button - we'll display a message if no fields are available
  const noFieldsAvailable = totalAvailableFields === 0

  const handleFieldSelect = (fieldId: string) => {
    onFieldSelect(fieldId)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Render a list of field buttons
  const renderFieldList = (fields: MenuField[]) => (
    <div className="space-y-1">
      {fields.map((field) => {
        const FieldIcon = field.fieldType ? fieldIcons[field.fieldType] : User
        return (
          <button
            key={field.id}
            onClick={() => handleFieldSelect(field.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-muted transition-colors text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded bg-muted/50 shrink-0">
              <FieldIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">
              {field.fieldType ? fieldLabels[field.fieldType] : 'Field'}
            </span>
          </button>
        )
      })}
    </div>
  )

  // Category button component
  const CategoryButton = ({
    category,
    label,
    fields
  }: {
    category: CategoryType
    label: string
    fields: MenuField[]
  }) => {
    if (fields.length === 0) return null
    return (
      <button
        onClick={() => setSelectedCategory(category)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          selectedCategory === category
            ? 'bg-primary/10 border-l-2 border-l-primary text-primary font-medium'
            : 'hover:bg-muted/50'
        }`}
      >
        <span className="text-sm">{label}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    )
  }

  const hasNoResults =
    filteredBasicFields.length === 0 &&
    filteredProfessionalFields.length === 0 &&
    filteredTechnologyFields.length === 0 &&
    filteredEducationFields.length === 0 &&
    filteredResearchFields.length === 0 &&
    filteredAccessibilityFields.length === 0 &&
    searchQuery

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="default"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary font-medium"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add demographic field
      </Button>

      {isOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />

          {/* Mega menu dropdown - smart positioning - TWO COLUMN LAYOUT */}
          <div
            className="fixed z-[101] rounded-lg border-2 border-border bg-white dark:bg-gray-950 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden"
            style={{
              left: `${buttonPosition.left}px`,
              width: `${buttonPosition.width}px`,
              top: showAbove ? 'auto' : `${buttonPosition.bottom + 8}px`,
              bottom: showAbove ? `${window.innerHeight - buttonPosition.top + 8}px` : 'auto'
            }}
          >
            {/* Search bar */}
            <div className="p-3 border-b">
              <Input
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
                autoFocus
              />
            </div>

            {/* Show message when no fields available, otherwise show two-column layout */}
            {noFieldsAvailable ? (
              <div className="p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="rounded-full bg-muted p-3">
                    <UserCheck className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">All fields added</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  All available demographic fields have been added. Remove a field to make it available again.
                </p>
              </div>
            ) : (
              <div className="flex max-h-80">
                {/* Left Column - Categories */}
                <div className="w-48 border-r bg-muted/20">
                  <CategoryButton category="basic" label="Basic Demographics" fields={filteredBasicFields} />
                  <CategoryButton category="professional" label="Professional Details" fields={filteredProfessionalFields} />
                  <CategoryButton category="technology" label="Technology & Usage" fields={filteredTechnologyFields} />
                  <CategoryButton category="education" label="Education & Background" fields={filteredEducationFields} />
                  <CategoryButton category="research" label="Research Participation" fields={filteredResearchFields} />
                  <CategoryButton category="accessibility" label="Accessibility & Inclusivity" fields={filteredAccessibilityFields} />
                </div>

                {/* Right Column - Fields for selected category */}
                <div className="flex-1 overflow-y-auto p-2">
                  {selectedCategory === 'basic' && filteredBasicFields.length > 0 && renderFieldList(filteredBasicFields)}
                  {selectedCategory === 'professional' && filteredProfessionalFields.length > 0 && renderFieldList(filteredProfessionalFields)}
                  {selectedCategory === 'technology' && filteredTechnologyFields.length > 0 && renderFieldList(filteredTechnologyFields)}
                  {selectedCategory === 'education' && filteredEducationFields.length > 0 && renderFieldList(filteredEducationFields)}
                  {selectedCategory === 'research' && filteredResearchFields.length > 0 && renderFieldList(filteredResearchFields)}
                  {selectedCategory === 'accessibility' && filteredAccessibilityFields.length > 0 && renderFieldList(filteredAccessibilityFields)}

                  {/* No results message */}
                  {hasNoResults && (
                    <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                      No fields found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
