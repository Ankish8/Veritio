'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/sonner'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { useValidationHighlightStore } from '@/stores/validation-highlight-store'
import { useStudyValidation } from '@/components/validation'
import type { ValidationResult, ValidationIssue } from '@/lib/validation'
import type { Study } from '@veritio/study-types'
import type { BuilderTabId } from '@/components/builders/shared'
import type { SaveResult } from './use-builder-save'

interface UseBuilderValidationProps {
  studyId: string
  study: Study | null
  projectId: string
  performContentSave: () => Promise<SaveResult>
  launchStudy: () => Promise<void>
  setActiveTab: (tab: BuilderTabId) => void
}

/** Hook for study validation, preview, and launch with auto-save and issue navigation. */
export function useBuilderValidation({
  studyId,
  study,
  projectId,
  performContentSave,
  launchStudy,
  setActiveTab,
}: UseBuilderValidationProps) {
  const router = useRouter()
  const [validationModalOpen, setValidationModalOpen] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationContext, setValidationContext] = useState<'preview' | 'launch'>('preview')
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  const setActiveFlowSection = useStudyFlowBuilderStore((state) => state.setActiveFlowSection)
  const setSelectedQuestionId = useStudyFlowBuilderStore((state) => state.setSelectedQuestionId)
  const setHighlightedItem = useValidationHighlightStore((state) => state.setHighlightedItem)

  const studyType = (study?.study_type || 'card_sort') as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  const { validate } = useStudyValidation({ studyId, studyType })

  // Handle preview click with validation
  const handlePreviewClick = useCallback(async () => {
    let result
    try {
      result = validate()
    } catch (error) {
      toast.error('Validation error', { description: String(error) })
      return
    }

    if (!result.isValid) {
      setValidationContext('preview')
      setValidationResult(result)
      setValidationModalOpen(true)
    } else {
      // Always attempt to save before opening preview to avoid stale closure issues
      // performContentSave() returns whether any data was actually saved
      try {
        toast.loading('Saving changes before preview...', { id: 'preview-save' })
        const saveResult = await performContentSave()
        if (saveResult.saved) {
          toast.success('Changes saved', { id: 'preview-save' })
        } else {
          // Nothing was dirty, dismiss the loading toast silently
          toast.dismiss('preview-save')
        }
      } catch {
        toast.error('Failed to save changes', {
          id: 'preview-save',
          description: 'Please try again.'
        })
        return
      }

      // Open preview in new tab
      // Add timestamp to bust any browser/CDN caching and ensure fresh data
      if (study?.share_code) {
        const previewUrl = `/s/${study.share_code}?preview=true&t=${Date.now()}`
        const newWindow = window.open(previewUrl, '_blank')
        if (!newWindow) {
          toast.error('Preview blocked by browser', {
            description: 'Your browser or an extension blocked the preview popup. Please allow popups for this site, then try again.',
            duration: 10000,
          })
        }
      } else {
        toast.error('Unable to preview study', {
          description: 'Study data could not be loaded. Try refreshing the page or restarting the backend server.',
        })
      }
    }
  }, [validate, study?.share_code, performContentSave])

  // Handle launch click with validation
  const handleLaunchClick = useCallback(async () => {
    const result = validate()
    if (!result.isValid) {
      setValidationContext('launch')
      setValidationResult(result)
      setValidationModalOpen(true)
    } else {
      // Always attempt to save before launch to avoid stale closure issues
      try {
        toast.loading('Saving changes...', { id: 'launch-save' })
        const saveResult = await performContentSave()
        if (saveResult.saved) {
          toast.success('Changes saved', { id: 'launch-save' })
        } else {
          toast.dismiss('launch-save')
        }
      } catch {
        toast.error('Failed to save changes', {
          id: 'launch-save',
          description: 'Please try again.'
        })
        return
      }
      setLaunchDialogOpen(true)
    }
  }, [validate, performContentSave])

  // Handle the actual launch after confirmation
  const handleConfirmLaunch = useCallback(async () => {
    setIsLaunching(true)
    try {
      await launchStudy()

      // Update Zustand meta store so the navigation header immediately
      // reflects the launched state (Recruit/Results links become enabled)
      useStudyMetaStore.setState((state) => ({
        meta: {
          ...state.meta,
          status: 'active' as const,
          launchedAt: new Date().toISOString(),
        },
      }))

      toast.success('Study launched successfully', {
        description: 'Participants can now access your study via the share link.',
      })
      router.push(`/projects/${projectId}/studies/${studyId}/recruit`)
    } catch {
      toast.error('Failed to launch study', {
        description: 'Please try again or contact support if the issue persists.',
      })
    } finally {
      setIsLaunching(false)
    }
  }, [launchStudy, router, projectId, studyId])

  // Handle navigation to a validation issue
  const handleNavigateToIssue = useCallback((issue: ValidationIssue) => {
    const { tab, sectionId, questionId, itemId, itemType, nodeId, taskId } = issue.navigationPath

    // Switch to the correct tab
    setActiveTab(tab as BuilderTabId)

    // If navigating to study-flow tab, set the section and question
    if (tab === 'study-flow' && sectionId) {
      setActiveFlowSection(sectionId)
      if (questionId !== undefined) {
        setSelectedQuestionId(questionId)
        if (questionId) {
          setHighlightedItem(questionId, 'question')
        }
      }
    }

    // Set highlighted item for content/tree/tasks/designs tabs
    if (tab === 'content' && itemId) {
      setHighlightedItem(itemId, itemType || 'card')
    }
    if (tab === 'tree' && nodeId) {
      setHighlightedItem(nodeId, 'node')
    }
    if (tab === 'tasks' && taskId) {
      setHighlightedItem(taskId, 'task')
    }
    // First impression designs - use taskId as designId (reusing field)
    if (tab === 'first-impression-designs' && taskId) {
      setHighlightedItem(taskId, 'design')
    }
    // Live website tasks
    if (tab === 'live-website-tasks' && taskId) {
      setHighlightedItem(taskId, 'task')
    }
  }, [setActiveTab, setActiveFlowSection, setSelectedQuestionId, setHighlightedItem])

  return {
    validationModalOpen, setValidationModalOpen, validationResult, validationContext,
    launchDialogOpen, setLaunchDialogOpen, isLaunching,
    handlePreviewClick, handleLaunchClick, handleConfirmLaunch, handleNavigateToIssue,
  }
}
