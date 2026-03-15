'use client'

import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { ValidationSectionGroup } from './validation-section-group'
import type { ValidationResult, ValidationIssue, ValidationSectionId } from '@/lib/validation'

interface ValidationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  validationResult: ValidationResult | null
  onNavigateToIssue: (issue: ValidationIssue) => void
  context: 'preview' | 'launch'
}

// Order sections should appear in the modal
const SECTION_ORDER: ValidationSectionId[] = [
  'welcome',        // Welcome screen
  'agreement',
  'screening',
  'pre_study',
  'instructions',
  'survey_content', // Survey study - minimum question count check
  'survey',         // Survey study - individual question validation
  'post_study',
  'thank_you',
  'card_sort_content',
  'tree_test_content',
  'prototype_test_content',
  'first_click_content',
  'first_impression_content',
  'live_website_content',
]

export function ValidationModal({
  open,
  onOpenChange,
  validationResult,
  onNavigateToIssue,
  context,
}: ValidationModalProps) {
  if (!validationResult) return null

  const { bySection, issueCount } = validationResult

  // Handle navigation - close modal first then navigate
  const handleNavigate = (issue: ValidationIssue) => {
    onOpenChange(false)
    // Small delay to let modal close animation complete
    setTimeout(() => {
      onNavigateToIssue(issue)
    }, 150)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {context === 'preview' ? 'Cannot Preview Study' : 'Cannot Launch Study'}
          </DialogTitle>
          <DialogDescription>
            There {issueCount === 1 ? 'is' : 'are'}{' '}
            <span className="font-medium text-destructive">{issueCount} {issueCount === 1 ? 'issue' : 'issues'}</span>{' '}
            that must be fixed before you can {context === 'preview' ? 'preview' : 'launch'} your study.
            Click on an issue to navigate and fix it.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] -mx-4 px-4">
          <div className="space-y-2">
            {SECTION_ORDER.map((sectionId) => {
              const sectionIssues = bySection[sectionId]
              if (!sectionIssues || sectionIssues.length === 0) return null

              return (
                <ValidationSectionGroup
                  key={sectionId}
                  sectionId={sectionId}
                  issues={sectionIssues}
                  onNavigate={handleNavigate}
                />
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Fix Issues
            <EscapeHint variant="dark" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
