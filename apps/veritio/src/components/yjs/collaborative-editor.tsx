'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Collaboration } from '@tiptap/extension-collaboration'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type ErrorInfo } from 'react'
import * as Y from 'yjs'
import { createPipingReferenceExtension } from '@/lib/tiptap/piping-reference'
import { PipingReferenceNodeView } from '@/components/study-flow/builder/piping-reference-node-view'
import { RichTextMenuBar } from '@/components/study-flow/builder/rich-text-menu-bar'
import { useYjsOptional } from './yjs-provider'
import { useCollaborativePresence, getUserInitials } from '@veritio/yjs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StudyFlowQuestion } from '@veritio/study-types/study-flow-types'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class CollaborativeEditorErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CollaborativeEditor] Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

/** Check whether a Yjs fragment is valid and belongs to the expected doc. */
function isFragmentValid(fragment: Y.XmlFragment | null, doc: Y.Doc | null): boolean {
  if (!fragment || !doc) return false
  try {
    return !!fragment.doc && fragment.doc === doc
  } catch {
    return false
  }
}

interface PlaceholderConfig {
  intro: string
  bullets?: string[]
}

interface CollaborativeEditorProps {
  fieldPath: string
  onChange?: (html: string) => void
  placeholder?: string | PlaceholderConfig
  className?: string
  minHeight?: string
  disabled?: boolean
  'aria-labelledby'?: string
  'aria-label'?: string
  allowImageUpload?: boolean
  studyId?: string
  enablePiping?: boolean
  availableQuestions?: StudyFlowQuestion[]
  initialContent?: string
  showPresence?: boolean
  lockWhenOthersEditing?: boolean
  trailingSlot?: React.ReactNode | ((editor: import('@tiptap/react').Editor) => React.ReactNode)
  overlaySlot?: React.ReactNode | ((editor: import('@tiptap/react').Editor) => React.ReactNode)
  /** Called once when the TipTap editor instance is created */
  onEditorCreated?: (editor: import('@tiptap/react').Editor) => void
}

export function CollaborativeEditor(props: CollaborativeEditorProps) {
  // Use optional hook to gracefully handle missing context
  const yjs = useYjsOptional()
  const { className, minHeight = '120px' } = props

  // Track if component has mounted (for SSR safety)
  const [hasMounted, setHasMounted] = useState(false)

  // Extract values safely - all will be null/false if context not available
  const doc = yjs?.doc ?? null
  const provider = yjs?.provider ?? null
  const isConnected = yjs?.isConnected ?? false

  // Use state for fragment to ensure proper cleanup and re-initialization
  const [fragment, setFragment] = useState<Y.XmlFragment | null>(null)
  const [isFragmentReady, setIsFragmentReady] = useState(false)

  // Set mounted flag after first render (client-only)
  useEffect(() => {
    setHasMounted(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  // Initialize fragment when doc becomes available
  useEffect(() => {
    if (!doc || !provider) {
      setFragment(null) // eslint-disable-line react-hooks/set-state-in-effect
      setIsFragmentReady(false)
      return
    }

    try {
      const newFragment = doc.getXmlFragment(props.fieldPath)
      if (isFragmentValid(newFragment, doc)) {
        setFragment(newFragment)
        setIsFragmentReady(true)
      } else {
        setFragment(null)
        setIsFragmentReady(false)
      }
    } catch {
      setFragment(null)
      setIsFragmentReady(false)
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      setFragment(null)
      setIsFragmentReady(false)
    }
  }, [doc, provider, props.fieldPath])

  // Loading skeleton
  const skeleton = (
    <div
      className={cn(
        'rounded-xl overflow-hidden animate-pulse',
        className
      )}
      style={{
        backgroundColor: 'var(--style-input-bg, var(--muted))',
        border: '1px solid var(--style-input-border, var(--border))',
        minHeight,
      }}
    />
  )

  // Show skeleton until everything is ready (including client-side mount)
  if (!hasMounted || !doc || !provider || !isConnected || !isFragmentReady || !fragment) {
    return skeleton
  }

  // Final safety check - catches race conditions where doc becomes invalid between renders
  if (!isFragmentValid(fragment, doc)) {
    return skeleton
  }

  // Render the actual editor wrapped in error boundary
  return (
    <CollaborativeEditorErrorBoundary fallback={skeleton}>
      <CollaborativeEditorInner
        {...props}
        fragment={fragment}
        isConnected={isConnected}
      />
    </CollaborativeEditorErrorBoundary>
  )
}

interface CollaborativeEditorInnerProps extends CollaborativeEditorProps {
  fragment: Y.XmlFragment
  isConnected: boolean
}

function CollaborativeEditorInner({
  fieldPath,
  onChange,
  placeholder = 'Enter your text here...',
  className,
  minHeight = '120px',
  disabled = false,
  'aria-labelledby': ariaLabelledby,
  'aria-label': ariaLabel,
  allowImageUpload = false,
  studyId,
  enablePiping = false,
  availableQuestions = [],
  initialContent,
  fragment,
  isConnected,
  showPresence = true,
  lockWhenOthersEditing = true,
  trailingSlot,
  overlaySlot,
  onEditorCreated,
}: CollaborativeEditorInnerProps) {
  const yjs = useYjsOptional()
  const isSynced = yjs?.isSynced ?? false
  const setLocation = yjs?.setLocation ?? (() => {})
  const setTyping = yjs?.setTyping ?? (() => {})
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track stable mount - waits for React Strict Mode double-invoke to complete.
  // This prevents errors from stale fragment references during effect cleanup/remount.
  const [isStableMount, setIsStableMount] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsStableMount(true), 0)
    return () => clearTimeout(timer)
  }, [])

  const { primaryUser, usersAtLocation } = useCollaborativePresence(fieldPath)

  // Memoize presence info for badge
  const presenceInfo = useMemo(() => {
    if (!primaryUser) return null
    return {
      initials: getUserInitials(primaryUser.name, primaryUser.email),
      otherCount: usersAtLocation.length - 1,
    }
  }, [primaryUser, usersAtLocation.length])

  const hasPresence = showPresence && primaryUser
  // Lock the editor when another user is editing (prevents conflicts)
  const isLockedByOther = lockWhenOthersEditing && !!primaryUser
  const isDisabled = disabled || isLockedByOther

  // Store onChange in a ref to avoid infinite loops
  // (parent may pass new function reference on each render)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Create the PipingReference extension (stable reference)
  const PipingReferenceExtension = useMemo(
    () => createPipingReferenceExtension(PipingReferenceNodeView),
    []
  )

  // Build extensions array. Only add Collaboration after stable mount with valid fragment
  // to prevent errors during React Strict Mode's cleanup/remount cycle.
  const canUseCollaboration = isStableMount && isFragmentValid(fragment, yjs?.doc ?? null)

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      code: false,
      blockquote: false,
      horizontalRule: false,
      link: false,
      undoRedo: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline hover:text-primary/80',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'rounded-lg max-w-full h-auto my-4',
      },
    }),
    Table.configure({
      resizable: false,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4',
      },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class:
          'border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-left font-medium',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-slate-300 dark:border-slate-600 px-3 py-2',
      },
    }),
    PipingReferenceExtension,
    ...(canUseCollaboration ? [Collaboration.configure({ fragment })] : []),
  ], [canUseCollaboration, PipingReferenceExtension, fragment])

  const editor = useEditor(
    {
      extensions,
      editable: !isDisabled,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2',
            'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
            '[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4',
            '[&_table]:border-collapse [&_table]:w-full [&_table]:my-4',
            '[&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium',
            '[&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2',
            '[&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4'
          ),
          style: `min-height: ${minHeight}`,
          role: 'textbox',
          'aria-multiline': 'true',
          ...(ariaLabelledby && { 'aria-labelledby': ariaLabelledby }),
          ...(ariaLabel && { 'aria-label': ariaLabel }),
        },
      },
      onUpdate: ({ editor }) => {
        // Only sync to store after initialization is complete and editor is editable.
        // During initialization, TipTap may fire onUpdate with empty <p></p> before
        // initialContent is applied -- we must not sync that empty content back.
        if (hasInitializedRef.current && isStableMount && editor.isEditable) {
          const textContent = editor.getText().trim()
          if (shouldSyncToStoreRef.current || textContent.length > 0) {
            shouldSyncToStoreRef.current = true
            onChangeRef.current?.(editor.getHTML())
          }
        }

        setTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false)
          typingTimeoutRef.current = null
        }, 1000)
      },
      onFocus: () => {
        setLocation(fieldPath)
      },
      onBlur: () => {
        setLocation(null)
        setTyping(false)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
      },
    },
    [extensions] // Add extensions as dependency to recreate editor when they change
  )

  // Notify parent when editor instance is created
  useEffect(() => {
    if (editor && onEditorCreated) {
      onEditorCreated(editor)
    }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps -- only fire when editor changes

  // Track if we've already initialized to prevent duplication
  const hasInitializedRef = useRef(false)
  // Track whether we should sync changes to the store (prevents empty Yjs from overwriting store)
  const shouldSyncToStoreRef = useRef(false)

  // Initialize if fragment/editor is effectively empty and we have initialContent.
  // CRITICAL: Wait for isStableMount so the Collaboration extension is active,
  // otherwise setContent() updates the editor but doesn't sync to Yjs fragment.
  //
  // We use editor.getText().trim() instead of editor.isEmpty because TipTap reports
  // non-empty for structure-only content like <p></p>. This handles cases where
  // Yjs has stale empty nodes but the database has real content.
  //
  // Dependencies intentionally exclude `initialContent` to prevent re-initialization
  // when the store updates during reconnection.
  useEffect(() => {
    if (!isStableMount || !fragment || hasInitializedRef.current) return
    if (!editor || editor.isDestroyed) return

    hasInitializedRef.current = true

    const hasEditorText = editor.getText().trim().length > 0
    const hasInitialText = (initialContent?.replace(/<[^>]*>/g, '').trim() || '').length > 0

    // Only push initialContent when editor is empty but store has real text
    if (!hasEditorText && hasInitialText) {
      editor.commands.setContent(initialContent!)
    } else {
      shouldSyncToStoreRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStableMount, fragment, editor, fieldPath, isSynced])

  // Detect external store changes (e.g., AI writes) and sync to TipTap/Yjs.
  // Only sync if actual text content differs (ignoring HTML structure differences).
  useEffect(() => {
    if (!editor || editor.isDestroyed || !hasInitializedRef.current) return
    if (initialContent == null) return

    const currentText = editor.getText().trim()
    const newText = initialContent.replace(/<[^>]*>/g, '').trim()
    if (newText && newText !== currentText) {
      editor.commands.setContent(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exclude editor to avoid sync loops
  }, [initialContent])

  useEffect(() => {
    if (editor) editor.setEditable(!isDisabled)
  }, [isDisabled, editor])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const isEmpty = !editor?.getText()?.trim()

  const placeholderConfig = useMemo((): PlaceholderConfig | null => {
    if (!placeholder) return null
    if (typeof placeholder === 'string') return { intro: placeholder }
    return placeholder
  }, [placeholder])

  return (
    <div className="relative">
      {/* Presence ring overlay - separate element to avoid clipping */}
      {hasPresence && (
        <div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{
            border: `2px solid ${primaryUser.color}`,
          }}
        />
      )}

      {/* Presence badge with typing indicator - on outer wrapper to avoid overflow:hidden clipping */}
      {hasPresence && presenceInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-2 -right-2 flex items-center gap-1 z-20">
                {/* Avatar badge */}
                <div
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm border-2 border-white cursor-default transition-transform hover:scale-110',
                    primaryUser.typing && 'animate-pulse'
                  )}
                  style={{ backgroundColor: primaryUser.color }}
                >
                  {primaryUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={primaryUser.avatarUrl}
                      alt={primaryUser.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    presenceInfo.initials
                  )}
                </div>
                {/* Typing indicator */}
                {primaryUser.typing && (
                  <span
                    className="text-[12px] font-medium px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap animate-pulse"
                    style={{ backgroundColor: primaryUser.color, color: 'white' }}
                  >
                    typing...
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">
                {primaryUser.name || primaryUser.email} {primaryUser.typing ? 'is typing...' : 'is editing'}
              </p>
              {presenceInfo.otherCount > 0 && (
                <p className="text-muted-foreground">
                  +{presenceInfo.otherCount} other{presenceInfo.otherCount > 1 ? 's' : ''}
                </p>
              )}
              {isLockedByOther && (
                <p className="text-muted-foreground mt-1 text-[12px]">
                  Field locked until they finish
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div
        className={cn(
          'rounded-xl overflow-hidden relative',
          'transition-all duration-200',
          isDisabled && 'cursor-not-allowed',
          isLockedByOther && 'opacity-70',
          disabled && 'opacity-60',
          !isConnected && 'ring-1 ring-yellow-500/50',
          className
        )}
        style={{
          backgroundColor: 'var(--style-input-bg, var(--muted))',
          border: '1px solid var(--style-input-border, var(--border))',
        }}
      >
      <div className="w-full">
        <div className="flex items-center px-2 py-1">
          <RichTextMenuBar
            editor={editor}
            allowImageUpload={allowImageUpload}
            studyId={studyId}
            enablePiping={enablePiping}
            availableQuestions={availableQuestions}
            trailingSlot={trailingSlot}
          />
          {/* Sync indicator */}
          {!isSynced && isConnected && (
            <span className="ml-auto text-xs text-muted-foreground">Syncing...</span>
          )}
        </div>

        <div className="h-px bg-border/50" />

        <div className="relative">
          <EditorContent
            editor={editor}
            className={cn('cursor-text', isDisabled && 'pointer-events-none')}
          />
          {isEmpty && placeholderConfig && (
            <div
              className="pointer-events-none absolute inset-0 px-3 py-2 text-muted-foreground/70"
              aria-hidden="true"
            >
              <p className="text-sm my-1">{placeholderConfig.intro}</p>
              {placeholderConfig.bullets && placeholderConfig.bullets.length > 0 && (
                <ul className="text-sm my-1 list-disc ml-4 space-y-0.5">
                  {placeholderConfig.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {overlaySlot && (
          typeof overlaySlot === 'function'
            ? (editor ? overlaySlot(editor) : null)
            : overlaySlot
        )}
      </div>
      </div>
    </div>
  )
}
