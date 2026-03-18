'use client'

import { useState } from 'react'
import { Loader2, Layers3, GitBranch, ClipboardList, Frame, MousePointerClick, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  KeyboardShortcutHint,
  EscapeHint,
} from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@veritio/ui'
import { useDialogForm } from '@/hooks/use-dialog-form'
import { cn } from '@/lib/utils'

type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'

interface CreateStudyDialogProps {
  trigger: React.ReactNode
  defaultType?: StudyType
  onSuccess?: (study: { id: string; title: string; study_type: StudyType }) => void
  createStudy: (
    title: string,
    studyType: StudyType,
    description?: string
  ) => Promise<{ id: string; title: string; study_type: StudyType }>
}

const studyTypes = [
  {
    type: 'card_sort' as const,
    name: 'Card Sorting',
    description: 'Discover how users naturally organize and group content',
    icon: Layers3,
  },
  {
    type: 'tree_test' as const,
    name: 'Tree Testing',
    description: 'Validate your navigation structure and findability',
    icon: GitBranch,
  },
  {
    type: 'survey' as const,
    name: 'Survey',
    description: 'Collect feedback and insights with customizable questionnaires',
    icon: ClipboardList,
  },
  {
    type: 'prototype_test' as const,
    name: 'Figma Prototype Test',
    description: 'Test interactive Figma prototypes with real users',
    icon: Frame,
  },
  {
    type: 'first_click' as const,
    name: 'First Click Testing',
    description: 'Discover where users click first on your designs',
    icon: MousePointerClick,
  },
  {
    type: 'first_impression' as const,
    name: 'First Impression Test',
    description: 'Capture immediate reactions to designs shown briefly',
    icon: Eye,
  },
]

const studyTypeNames: Record<StudyType, string> = {
  card_sort: 'Card Sorting',
  tree_test: 'Tree Testing',
  survey: 'Survey',
  prototype_test: 'Figma Prototype Test',
  first_click: 'First Click Testing',
  first_impression: 'First Impression Test',
  live_website_test: 'Web App Test',
}

const studyTypePlaceholders: Record<StudyType, string> = {
  card_sort: 'Navigation Categories Study',
  tree_test: 'Homepage Navigation Test',
  survey: 'User Feedback Survey',
  prototype_test: 'Checkout Flow Usability Test',
  first_click: 'Homepage CTA Click Test',
  first_impression: 'Landing Page First Impression',
  live_website_test: 'Live Website Usability Test',
}

export function CreateStudyDialog({
  trigger,
  defaultType,
  onSuccess,
  createStudy,
}: CreateStudyDialogProps) {
  // Form field state
  const [step, setStep] = useState<'type' | 'details'>(defaultType ? 'details' : 'type')
  const [selectedType, setSelectedType] = useState<StudyType | null>(defaultType || null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Dialog form state management
  const {
    open,
    isLoading,
    error,
    handleOpenChange,
    handleSubmit,
  } = useDialogForm({
    onSubmit: async () => {
      if (!selectedType) {
        throw new Error('Please select a study type')
      }
      if (!title.trim()) {
        throw new Error('Study title is required')
      }
      return createStudy(title.trim(), selectedType, description.trim() || undefined)
    },
    onSuccess,
    onReset: () => {
      setTitle('')
      setDescription('')
      setSelectedType(defaultType || null)
      setStep(defaultType ? 'details' : 'type')
    },
  })

  const handleSelectType = (type: StudyType) => {
    setSelectedType(type)
    setStep('details')
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useKeyboardShortcut({
    enabled: open && step === 'details' && !isLoading && !!title.trim(),
    onCmdEnter: handleSubmit,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'type' ? (
          <>
            <DialogHeader>
              <DialogTitle>Choose Study Type</DialogTitle>
              <DialogDescription>
                Select the type of research you want to conduct.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {studyTypes.map((studyType) => (
                <button
                  key={studyType.type}
                  type="button"
                  onClick={() => handleSelectType(studyType.type)}
                  className={cn(
                    'flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted',
                    selectedType === studyType.type && 'border-border bg-muted'
                  )}
                >
                  <div className="rounded-lg bg-muted p-2.5">
                    <studyType.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">{studyType.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {studyType.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                Create {selectedType ? studyTypeNames[selectedType] : ''} Study
              </DialogTitle>
              <DialogDescription>
                Give your study a name. You can configure the details later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Study Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedType ? studyTypePlaceholders[selectedType] : ''}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="study-description">Description (optional)</Label>
                <Textarea
                  id="study-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you trying to learn from this study?"
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <DialogFooter>
              {!defaultType && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('type')}
                  disabled={isLoading}
                  className="inline-flex items-center"
                >
                  Back
                  <EscapeHint />
                </Button>
              )}
              <Button type="submit" disabled={isLoading || !title.trim()} className="inline-flex items-center">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Study
                    <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
