'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@veritio/ui/components/dialog'
import { Button } from '@veritio/ui/components/button'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { Alert, AlertDescription } from '@veritio/ui/components/alert'
import { Label } from '@veritio/ui/components/label'
import { EscapeHint } from '@veritio/ui/components/keyboard-shortcut-hint'
import { AlertTriangle } from 'lucide-react'
import { PageModeSelector, type PageMode } from '../shared/page-mode-selector'
import type { QuestionsSectionSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface SectionAdvancedSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: 'pre_study' | 'post_study'
  settings: QuestionsSectionSettings
  onUpdate: (updates: Partial<QuestionsSectionSettings>) => void
  hasQuestionsWithLogic: boolean
}

/**
 * Section Advanced Settings Modal
 *
 * A dialog for configuring section-level settings for pre/post-study questions:
 * - Page mode: Show one question per page vs all on one page
 * - Randomization: Shuffle question order for each participant
 *
 * Features:
 * - Shows/hides options based on whether questions have display logic
 * - Warning message explains why options are disabled
 * - Auto-disables conflicting settings when logic is added
 */
export function SectionAdvancedSettingsModal({
  open,
  onOpenChange,
  section,
  settings,
  onUpdate,
  hasQuestionsWithLogic,
}: SectionAdvancedSettingsModalProps) {
  const sectionLabel = section === 'pre_study' ? 'Pre-Study' : 'Post-Study'
  const pageMode = settings.pageMode || 'one_per_page'
  const randomizeQuestions = settings.randomizeQuestions || false

  const handlePageModeChange = (mode: PageMode) => {
    onUpdate({ pageMode: mode })
  }

  const handleRandomizeChange = (checked: boolean) => {
    if (checked && hasQuestionsWithLogic) {
      // Don't allow enabling randomization if logic exists
      return
    }
    onUpdate({ randomizeQuestions: checked })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sectionLabel} Questions - Advanced Settings</DialogTitle>
          <DialogDescription>
            Configure how participants experience the questions in this section
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Page Settings - using shared component */}
          <PageModeSelector
            value={pageMode}
            onChange={handlePageModeChange}
            hasQuestionsWithLogic={hasQuestionsWithLogic}
            idPrefix={`${section}-page-mode`}
          />

          {/* Randomization Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Randomization</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="randomize-questions"
                checked={randomizeQuestions}
                onCheckedChange={handleRandomizeChange}
                disabled={hasQuestionsWithLogic}
              />
              <Label
                htmlFor="randomize-questions"
                className={`text-sm font-normal cursor-pointer ${
                  hasQuestionsWithLogic ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Randomize this section's questions
              </Label>
            </div>
          </div>

          {/* Warning for Randomization Logic Conflicts (PageModeSelector shows its own warning) */}
          {hasQuestionsWithLogic && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Note:</strong> "Randomize this section's questions" is disabled because
                one or more questions have display logic. Randomization cannot be used with
                conditional visibility logic.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
            <EscapeHint />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
