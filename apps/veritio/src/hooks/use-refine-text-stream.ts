'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useAuthFetch } from './use-auth-fetch'
import type { RefineAction } from './use-refine-text'

export type RefineStreamPhase = 'idle' | 'streaming' | 'complete' | 'error'

interface UseRefineTextStreamOptions {
  editor: Editor | null
  context?: string
}

/** Toggle a CSS class on the editor's wrapper element for visual feedback */
function toggleEditorClass(editor: Editor | null, className: string, active: boolean): void {
  if (!editor || editor.isDestroyed) return
  const wrapper = editor.view.dom.closest('.ProseMirror')?.parentElement
  if (wrapper) {
    wrapper.classList.toggle(className, active)
  }
}

export function useRefineTextStream({ editor, context }: UseRefineTextStreamOptions) {
  const authFetch = useAuthFetch()
  const [phase, setPhase] = useState<RefineStreamPhase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const originalContentRef = useRef<string>('')
  const abortRef = useRef<AbortController | null>(null)

  // Keep editor in a ref so callbacks always see the latest instance
  const editorRef = useRef<Editor | null>(editor)
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Sync guard — prevents double-invocation without waiting for React state
  const streamingRef = useRef(false)

  const cleanup = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    streamingRef.current = false
  }, [])

  const startRefine = useCallback(
    async (action: RefineAction) => {
      const ed = editorRef.current
      if (!ed || ed.isDestroyed || streamingRef.current) return

      // Lock immediately (sync) to prevent double calls
      streamingRef.current = true

      // Save original content for discard
      originalContentRef.current = ed.getHTML()
      setErrorMessage(null)
      setPhase('streaming')

      // Lock editor and show visual feedback
      ed.setEditable(false)
      toggleEditorClass(ed, 'ai-refining', true)
      toggleEditorClass(ed, 'ai-suggestion', true)

      const capturedEditor = ed

      const restoreEditor = () => {
        if (!capturedEditor || capturedEditor.isDestroyed) return
        capturedEditor.setEditable(true)
        capturedEditor.commands.setContent(originalContentRef.current, { emitUpdate: true })
        toggleEditorClass(capturedEditor, 'ai-refining', false)
        toggleEditorClass(capturedEditor, 'ai-suggestion', false)
      }

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const text = originalContentRef.current
        const response = await authFetch('/api/assistant/refine-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            action,
            format: 'html',
            context,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${response.status})`)
        }

        const data = await response.json()
        const refined = data.refined || ''

        if (capturedEditor && !capturedEditor.isDestroyed) {
          capturedEditor.commands.setContent(refined, { emitUpdate: true })
          toggleEditorClass(capturedEditor, 'ai-refining', false)
        }

        streamingRef.current = false
        setPhase('complete')
      } catch (err: any) {
        if (err.name === 'AbortError') return
        cleanup()
        setErrorMessage(err.message || 'Failed to refine text')
        setPhase('error')
        restoreEditor()
      }
    },
    [authFetch, context, cleanup],
  )

  const cancel = useCallback(() => {
    cleanup()
    const ed = editorRef.current
    if (ed && !ed.isDestroyed) {
      ed.setEditable(true)
      ed.commands.setContent(originalContentRef.current, { emitUpdate: true })
      toggleEditorClass(ed, 'ai-refining', false)
      toggleEditorClass(ed, 'ai-suggestion', false)
    }
    setPhase('idle')
  }, [cleanup])

  const apply = useCallback(() => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    toggleEditorClass(ed, 'ai-suggestion', false)
    // Re-enable editing, then trigger onChange so the store picks up the new content
    ed.setEditable(true)
    const html = ed.getHTML()
    ed.commands.setContent(html, { emitUpdate: true })
    setPhase('idle')
  }, [])

  const discard = useCallback(() => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    toggleEditorClass(ed, 'ai-suggestion', false)
    ed.setEditable(true)
    ed.commands.setContent(originalContentRef.current, { emitUpdate: true })
    setPhase('idle')
  }, [])

  return { phase, errorMessage, startRefine, cancel, apply, discard }
}
