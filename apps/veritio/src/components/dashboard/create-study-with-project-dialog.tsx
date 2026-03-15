'use client'

import { useState, useCallback, useEffect, cloneElement, isValidElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  FolderPlus,
} from 'lucide-react'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { useProjects } from '@/hooks/use-projects'
import { getAuthFetchInstance } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import type { UseCaseDefinition } from '@/lib/plugins/study-type-icons'

interface CreateStudyWithProjectDialogProps {
  trigger: React.ReactNode
  useCase: UseCaseDefinition
}

const STUDY_TYPE_PLACEHOLDERS: Record<string, string> = {
  card_sort: 'Navigation Categories Study',
  tree_test: 'Homepage Navigation Test',
  survey: 'User Feedback Survey',
  prototype_test: 'Checkout Flow Usability Test',
  first_click: 'Homepage CTA Click Test',
  first_impression: 'Landing Page First Impression',
  live_website_test: 'Live Website Usability Test',
}

const CREATE_NEW_PROJECT = '__create_new__'

export function CreateStudyWithProjectDialog({
  trigger,
  useCase,
}: CreateStudyWithProjectDialogProps) {
  const router = useRouter()
  const { projects, isLoading: projectsLoading, createProject } = useProjects()

  const studyType = useCase.studyType
  const displayName = useCase.name

  // Clone trigger with suppressHydrationWarning to prevent Radix aria-controls ID mismatch
  const triggerWithHydrationFix = isValidElement(trigger)
    ? cloneElement(trigger, { suppressHydrationWarning: true } as React.Attributes)
    : trigger

  // Dialog state
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState('')
  const [studyTitle, setStudyTitle] = useState('')
  const [studyDescription, setStudyDescription] = useState('')

  const placeholder = STUDY_TYPE_PLACEHOLDERS[studyType] || 'My Study'
  const isCreatingNewProject = selectedProjectId === CREATE_NEW_PROJECT

  // Auto-select first project when projects load
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const resetForm = useCallback(() => {
    setSelectedProjectId(projects?.[0]?.id || '')
    setNewProjectName('')
    setStudyTitle('')
    setStudyDescription('')
    setError(null)
    setIsLoading(false)
  }, [projects])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Delay reset to allow close animation
      setTimeout(resetForm, 150)
    }
  }, [resetForm])

  const canSubmit =
    studyTitle.trim() &&
    (isCreatingNewProject ? newProjectName.trim() : selectedProjectId)

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setIsLoading(true)
    setError(null)

    try {
      let projectId = selectedProjectId

      // Create new project if needed
      if (isCreatingNewProject) {
        const project = await createProject(newProjectName.trim())
        projectId = project.id
      }

      // Create the study
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/projects/${projectId}/studies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: studyTitle.trim(),
          study_type: studyType,
          description: studyDescription.trim() || undefined,
          ...(useCase.defaultSettings && { initial_settings: useCase.defaultSettings }),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create study')
      }

      const study = await response.json()

      // Invalidate caches to ensure dashboard and project lists update immediately
      await invalidateCache('study:created', { studyId: study.id, projectId })

      setOpen(false)
      router.push(`/projects/${projectId}/studies/${study.id}/builder`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create study')
      setIsLoading(false)
    }
  }, [canSubmit, selectedProjectId, isCreatingNewProject, newProjectName, studyTitle, studyType, studyDescription, useCase.defaultSettings, createProject, router])

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useKeyboardShortcut({
    enabled: open && !isLoading && !!canSubmit,
    onCmdEnter: handleSubmit,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerWithHydrationFix}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <DialogHeader>
            <DialogTitle>Create {displayName} Study</DialogTitle>
            <DialogDescription>
              Set up your new study. You can configure more details in the builder.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Project Selection */}
            <div className="grid gap-2">
              <Label htmlFor="project">Project</Label>
              {projectsLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading projects...</span>
                </div>
              ) : (
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={isLoading}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={CREATE_NEW_PROJECT}>
                      <span className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4" />
                        Create new project
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* New Project Name (conditional) */}
            {isCreatingNewProject && (
              <div className="grid gap-2">
                <Label htmlFor="new-project-name">New Project Name</Label>
                <Input
                  id="new-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Research Project"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}

            {/* Study Title */}
            <div className="grid gap-2">
              <Label htmlFor="study-title">Study Title</Label>
              <Input
                id="study-title"
                value={studyTitle}
                onChange={(e) => setStudyTitle(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                autoFocus={!isCreatingNewProject}
              />
            </div>

            {/* Study Description */}
            <div className="grid gap-2">
              <Label htmlFor="study-description">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="study-description"
                value={studyDescription}
                onChange={(e) => setStudyDescription(e.target.value)}
                placeholder="What are you trying to learn from this study?"
                disabled={isLoading}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="inline-flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create
                  <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
