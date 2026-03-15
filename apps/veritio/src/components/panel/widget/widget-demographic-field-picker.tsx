'use client'

import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Plus,
  ChevronRight,
  Trash2,
  GripVertical,
  Columns2,
  RectangleHorizontal,
  UserCheck,
  Info,
} from 'lucide-react'
import type { DemographicFieldType } from '@veritio/study-types/study-flow-types'
import type { WidgetDemographicField, WidgetStyle } from '@/lib/supabase/panel-types'
import {
  fieldLabels,
  fieldIcons,
} from '@veritio/prototype-test/components/study-flow/builder/sections/demographic-field-constants'

// Maximum number of demographic fields for widget forms
const MAX_DEMOGRAPHIC_FIELDS = 6

// Auto-detectable fields (captured automatically from browser, excluded from picker)
// These are collected via BrowserDataDetector in the widget script
const AUTO_DETECTED_FIELDS: DemographicFieldType[] = [
  'operatingSystem',    // Detected from navigator.userAgent
  'browserPreference',  // Detected from navigator.userAgent
  'timeZone',           // Detected from Intl.DateTimeFormat
  'preferredLanguage',  // Detected from navigator.language
  'primaryDevice',      // Detected from user agent (mobile/tablet/desktop)
  'location',           // Detected via IP geolocation
  'locationType',       // Detected via IP geolocation (urban/suburban/rural)
]

// Irrelevant fields for quick widget forms (excluded from picker)
const IRRELEVANT_WIDGET_FIELDS: DemographicFieldType[] = [
  'accessibilityNeeds',   // Too personal for quick widget
  'assistiveTechnology',  // Too complex for quick forms
  'digitalComfort',       // Not relevant for widget context
  'priorExperience',      // Research-specific
  'followUpWillingness',  // Redundant with contactConsent
  'researchAvailability', // Too specific for quick forms
  'maritalStatus',        // Too personal for widget
  'techProficiency',      // Less relevant for quick forms
]

// All excluded fields (auto-detected + irrelevant)
const EXCLUDED_WIDGET_FIELDS = new Set([...AUTO_DETECTED_FIELDS, ...IRRELEVANT_WIDGET_FIELDS])

// Widget-specific field categories (only relevant fields)
const WIDGET_BASIC_FIELDS: DemographicFieldType[] = ['gender', 'ageRange', 'householdSize']
const WIDGET_PROFESSIONAL_FIELDS: DemographicFieldType[] = ['employmentStatus', 'jobTitle', 'industry', 'companySize', 'yearsOfExperience', 'department', 'occupationType']
const WIDGET_EDUCATION_FIELDS: DemographicFieldType[] = ['educationLevel']
const WIDGET_RESEARCH_FIELDS: DemographicFieldType[] = ['contactConsent', 'yearsUsingProduct', 'productUsageFrequency']

interface WidgetDemographicFieldPickerProps {
  fields: WidgetDemographicField[]
  widgetStyle?: WidgetStyle
  onChange: (fields: WidgetDemographicField[]) => void
}

// Simplified categories for widget (no technology/accessibility - those are auto-detected or irrelevant)
type CategoryType = 'basic' | 'professional' | 'education' | 'research'

interface FieldListItemProps {
  field: WidgetDemographicField
  onToggleRequired: (id: string) => void
  onToggleWidth: (id: string) => void
  onRemove: (id: string) => void
}

const FieldListItem = memo(function FieldListItem({
  field,
  onToggleRequired,
  onToggleWidth,
  onRemove,
}: FieldListItemProps) {
  const FieldIcon = fieldIcons[field.fieldType]
  const label = field.label || fieldLabels[field.fieldType]

  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group">
      {/* Drag handle (visual only for now) */}
      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />

      {/* Icon + Label */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-muted/50 shrink-0">
          <FieldIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium truncate">{label}</span>
      </div>

      {/* Width toggle */}
      <button
        type="button"
        onClick={() => onToggleWidth(field.id)}
        className="p-1.5 rounded hover:bg-muted transition-colors"
        title={field.width === 'full' ? 'Full width' : 'Half width'}
      >
        {field.width === 'full' ? (
          <RectangleHorizontal className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Columns2 className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Required toggle */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Required</span>
        <Switch
          checked={field.required}
          onCheckedChange={() => onToggleRequired(field.id)}
          className="scale-75"
        />
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        className="p-1.5 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </button>
    </div>
  )
})

interface FieldMegaMenuProps {
  enabledFieldTypes: Set<DemographicFieldType>
  onSelect: (fieldType: DemographicFieldType) => void
  onClose: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
}

// Category button component (moved outside to avoid "create components during render" error)
function CategoryButton({
  category,
  label,
  count,
  selectedCategory,
  setSelectedCategory,
}: {
  category: CategoryType
  label: string
  count: number
  selectedCategory: CategoryType
  setSelectedCategory: (category: CategoryType) => void
}) {
  if (count === 0) return null
  return (
    <button
      onClick={() => setSelectedCategory(category)}
      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
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

const FieldMegaMenu = memo(function FieldMegaMenu({
  enabledFieldTypes,
  onSelect,
  onClose,
  buttonRef,
}: FieldMegaMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('basic')
  const [showAbove, setShowAbove] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, bottom: 0, left: 0, width: 0 })

  // Calculate position
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 360

      setButtonPosition({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
      })

      setShowAbove(spaceBelow < menuHeight && rect.top > menuHeight)
    }
  }, [buttonRef])

  // Get available fields (not yet added, not excluded)
  const getAvailableFields = (types: DemographicFieldType[]) =>
    types.filter((type) => !enabledFieldTypes.has(type) && !EXCLUDED_WIDGET_FIELDS.has(type))

  // Use widget-specific field categories (excludes auto-detected and irrelevant fields)
  const basicFields = getAvailableFields(WIDGET_BASIC_FIELDS)
  const professionalFields = getAvailableFields(WIDGET_PROFESSIONAL_FIELDS)
  const educationFields = getAvailableFields(WIDGET_EDUCATION_FIELDS)
  const researchFields = getAvailableFields(WIDGET_RESEARCH_FIELDS)

  // Filter by search
  const filterBySearch = (types: DemographicFieldType[]) => {
    if (!searchQuery.trim()) return types
    const query = searchQuery.toLowerCase()
    return types.filter((type) => fieldLabels[type].toLowerCase().includes(query))
  }

  const filteredBasic = filterBySearch(basicFields)
  const filteredProfessional = filterBySearch(professionalFields)
  const filteredEducation = filterBySearch(educationFields)
  const filteredResearch = filterBySearch(researchFields)

  const totalAvailable =
    basicFields.length +
    professionalFields.length +
    educationFields.length +
    researchFields.length

  const noFieldsAvailable = totalAvailable === 0

  const handleSelect = (fieldType: DemographicFieldType) => {
    onSelect(fieldType)
    onClose()
  }

  // Render field buttons
  const renderFieldList = (types: DemographicFieldType[]) => (
    <div className="space-y-1">
      {types.map((type) => {
        const Icon = fieldIcons[type]
        return (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted/50 shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">{fieldLabels[type]}</span>
          </button>
        )
      })}
    </div>
  )

  const hasNoResults =
    filteredBasic.length === 0 &&
    filteredProfessional.length === 0 &&
    filteredEducation.length === 0 &&
    filteredResearch.length === 0 &&
    searchQuery

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100]" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed z-[101] rounded-lg border-2 border-border bg-white dark:bg-gray-950 shadow-lg overflow-hidden"
        style={{
          left: `${buttonPosition.left}px`,
          width: `${Math.max(buttonPosition.width, 400)}px`,
          top: showAbove ? 'auto' : `${buttonPosition.bottom + 8}px`,
          bottom: showAbove ? `${window.innerHeight - buttonPosition.top + 8}px` : 'auto',
        }}
      >
        {/* Search */}
        <div className="p-3 border-b">
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>

        {noFieldsAvailable ? (
          <div className="p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="rounded-full bg-muted p-3">
                <UserCheck className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm font-medium mb-1">All fields added</p>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
              All available demographic fields have been added.
            </p>
          </div>
        ) : (
          <div className="flex max-h-72">
            {/* Categories (simplified for widget - no tech/accessibility) */}
            <div className="w-44 border-r bg-muted/20 shrink-0">
              <CategoryButton category="basic" label="Basic Demographics" count={filteredBasic.length} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
              <CategoryButton category="professional" label="Professional" count={filteredProfessional.length} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
              <CategoryButton category="education" label="Education" count={filteredEducation.length} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
              <CategoryButton category="research" label="Research" count={filteredResearch.length} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto p-2">
              {selectedCategory === 'basic' && filteredBasic.length > 0 && renderFieldList(filteredBasic)}
              {selectedCategory === 'professional' && filteredProfessional.length > 0 && renderFieldList(filteredProfessional)}
              {selectedCategory === 'education' && filteredEducation.length > 0 && renderFieldList(filteredEducation)}
              {selectedCategory === 'research' && filteredResearch.length > 0 && renderFieldList(filteredResearch)}

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
  )
})

export function WidgetDemographicFieldPicker({
  fields,
  widgetStyle,
  onChange,
}: WidgetDemographicFieldPickerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Get set of enabled field types for the menu
  const enabledFieldTypes = new Set(fields.filter((f) => f.enabled).map((f) => f.fieldType))

  // Check if demographics form is available for this widget style
  const supportsFullDemographics = widgetStyle === 'drawer'

  // Handlers
  const handleAddField = useCallback(
    (fieldType: DemographicFieldType) => {
      const newField: WidgetDemographicField = {
        id: fieldType,
        fieldType,
        position: fields.length,
        enabled: true,
        required: false,
        width: 'half',
      }
      onChange([...fields, newField])
    },
    [fields, onChange]
  )

  const handleToggleRequired = useCallback(
    (id: string) => {
      onChange(fields.map((f) => (f.id === id ? { ...f, required: !f.required } : f)))
    },
    [fields, onChange]
  )

  const handleToggleWidth = useCallback(
    (id: string) => {
      onChange(fields.map((f) => (f.id === id ? { ...f, width: f.width === 'full' ? 'half' : 'full' } : f)))
    },
    [fields, onChange]
  )

  const handleRemoveField = useCallback(
    (id: string) => {
      onChange(fields.filter((f) => f.id !== id))
    },
    [fields, onChange]
  )

  const enabledFields = fields.filter((f) => f.enabled)
  const hasReachedLimit = enabledFields.length >= MAX_DEMOGRAPHIC_FIELDS

  return (
    <div className="space-y-3">
      {/* Info banner - max limit reached */}
      {hasReachedLimit && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Maximum {MAX_DEMOGRAPHIC_FIELDS} fields allowed. Remove a field to add a different one.
          </p>
        </div>
      )}

      {/* Info banner for non-drawer templates with many fields */}
      {!supportsFullDemographics && enabledFields.length > 4 && !hasReachedLimit && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            You have {enabledFields.length} fields. Consider using the <strong>Drawer</strong> template for longer forms.
          </p>
        </div>
      )}

      {/* Field list */}
      {enabledFields.length > 0 && (
        <div className="border rounded-md divide-y">
          {enabledFields.map((field) => (
            <FieldListItem
              key={field.id}
              field={field}
              onToggleRequired={handleToggleRequired}
              onToggleWidth={handleToggleWidth}
              onRemove={handleRemoveField}
            />
          ))}
        </div>
      )}

      {/* Add field button - disabled when max reached */}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsMenuOpen(true)}
        disabled={hasReachedLimit}
        className={cn(
          "w-full justify-start border-2 border-dashed",
          hasReachedLimit
            ? "border-muted text-muted-foreground cursor-not-allowed"
            : "border-primary/40 hover:border-primary hover:bg-primary/5 text-primary"
        )}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add demographic field
      </Button>

      {/* Mega menu */}
      {isMenuOpen && (
        <FieldMegaMenu
          enabledFieldTypes={enabledFieldTypes}
          onSelect={handleAddField}
          onClose={() => setIsMenuOpen(false)}
          buttonRef={buttonRef}
        />
      )}
    </div>
  )
}
