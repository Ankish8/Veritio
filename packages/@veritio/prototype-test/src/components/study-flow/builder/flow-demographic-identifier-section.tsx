'use client'

import { useState } from 'react'
import { Switch } from '@veritio/ui/components/switch'
import { cn } from '@veritio/ui'
import { ChevronRight, Plus, User, UserX, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DemographicSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui/components/alert-dialog'

interface FlowDemographicIdentifierSectionProps {
  title: string
  description: string
  isActive: boolean
  icon?: LucideIcon
  isAnonymous: boolean
  onSelectAnonymous: () => void
  onSelectDemographic: () => void
  demographicSections: DemographicSection[]
  selectedSectionId: string | null
  onSelectSection: (sectionId: string | null) => void
  onAddSection: () => void
  onRemoveSection: (sectionId: string) => void
}
export function FlowDemographicIdentifierSection({
  title,
  description,
  isActive,
  icon: Icon,
  isAnonymous,
  onSelectAnonymous,
  onSelectDemographic,
  demographicSections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onRemoveSection,
}: FlowDemographicIdentifierSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [sectionToDelete, setSectionToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleClick = () => {
    onSelectSection(null) // Select the main identifier section (not a specific demographic section)
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        isActive
          ? 'border-border bg-muted/40'
          : 'border-border/50 bg-muted/20 hover:border-border'
      )}
    >
      {/* Section header */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        className="w-full text-left px-4 py-2.5 transition-all cursor-pointer"
        aria-current={isActive ? 'step' : undefined}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform text-muted-foreground shrink-0 self-start mt-0.5',
                isExpanded && 'rotate-90'
              )}
            />
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm font-medium block',
                  isActive ? 'text-foreground' : 'text-foreground/80'
                )}
              >
                {title}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nested options */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 overflow-hidden w-full max-w-full">
          {/* Radio option: Anonymous */}
          <div
            className={cn(
              'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
              isAnonymous && selectedSectionId === null
                ? 'bg-primary/5 border-primary/30'
                : 'bg-background border-border/50 hover:border-border hover:bg-muted/30'
            )}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSelectAnonymous()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectAnonymous()
              }
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
              <UserX className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">Anonymous</span>
              <span className="text-xs text-muted-foreground">No participant identification</span>
            </div>
            {/* Radio indicator */}
            <div
              className={cn(
                'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                isAnonymous
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/30 bg-background'
              )}
            >
              {isAnonymous && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
            </div>
          </div>

          {/* Radio option: Participant Details */}
          <div
            className={cn(
              'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
              !isAnonymous && selectedSectionId === null
                ? 'bg-primary/5 border-primary/30'
                : 'bg-background border-border/50 hover:border-border hover:bg-muted/30'
            )}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSelectDemographic()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectDemographic()
              }
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">Participant Details</span>
              <span className="text-xs text-muted-foreground">Collect demographic information</span>
            </div>
            {/* Radio indicator */}
            <div
              className={cn(
                'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                !isAnonymous
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/30 bg-background'
              )}
            >
              {!isAnonymous && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
            </div>
          </div>

          {/* Nested demographic sections (only show when Participant Details is selected) */}
          {!isAnonymous && (
            <div className="ml-4 mt-2 space-y-1.5 border-l-2 border-border/40 pl-3">
              {demographicSections.map((section) => {
                const isBasicDemo = section.id === 'basic-demographics'
                const isSelected = selectedSectionId === section.id

                return (
                  <div
                    key={section.id}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all cursor-pointer',
                      isSelected
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-background border-border/40 hover:border-border hover:bg-muted/20'
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectSection(section.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectSection(section.id)
                      }
                    }}
                  >
                    {/* Section name */}
                    <span className="font-medium text-sm truncate flex-1">{section.name}</span>

                    {/* Delete button (only for non-basic sections) */}
                    {!isBasicDemo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSectionToDelete({ id: section.id, name: section.name })
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted shrink-0"
                        aria-label={`Delete ${section.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add section button */}
              <button
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSection()
                }}
              >
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2.5 py-2 text-sm text-primary hover:border-primary hover:bg-primary/10 transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>Add section</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{sectionToDelete?.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (sectionToDelete) {
                  onRemoveSection(sectionToDelete.id)
                  setSectionToDelete(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
