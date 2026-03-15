'use client'

import { memo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { Editor } from '@tiptap/react'
import { Label } from '@/components/ui/label'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import {
  CollaborativeInput,
  CollaborativeTextarea,
  useYjsOptional,
} from '@/components/yjs'
import { AiRefineButton, useAiRefineInline } from '@/components/ai-refine'
import type { DetailsTabProps } from '../types'

const CollaborativeEditor = dynamic(
  () => import('@/components/yjs/collaborative-editor').then((m) => ({ default: m.CollaborativeEditor })),
  { ssr: false, loading: () => <div className="h-[120px] animate-pulse rounded-md bg-muted" /> }
)

const RichTextEditor = dynamic(
  () => import('@/components/study-flow/builder/rich-text-editor').then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[120px] animate-pulse rounded-md bg-muted" /> }
)

// Character limits for fields
const TITLE_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

/** Renders CollaborativeEditor or RichTextEditor based on Yjs availability */
function RichField({
  fieldPath,
  content,
  onChange,
  placeholder,
  minHeight,
  isCollaborative,
  isReadOnly,
  ariaLabelledBy,
  trailingSlot,
  overlaySlot,
  onEditorCreated,
}: {
  fieldPath: string
  content: string
  onChange: (html: string | null) => void
  placeholder: { intro: string; bullets?: string[] }
  minHeight: string
  isCollaborative: boolean
  isReadOnly: boolean
  ariaLabelledBy: string
  trailingSlot?: React.ReactNode | ((editor: Editor) => React.ReactNode)
  overlaySlot?: React.ReactNode | ((editor: Editor) => React.ReactNode)
  onEditorCreated?: (editor: Editor) => void
}) {
  if (isCollaborative) {
    return (
      <CollaborativeEditor
        fieldPath={fieldPath}
        onChange={(html) => onChange(html || null)}
        initialContent={content}
        placeholder={placeholder}
        minHeight={minHeight}
        disabled={isReadOnly}
        aria-labelledby={ariaLabelledBy}
        trailingSlot={trailingSlot}
        overlaySlot={overlaySlot}
        onEditorCreated={onEditorCreated}
      />
    )
  }
  return (
    <RichTextEditor
      content={content}
      onChange={(html) => onChange(html || null)}
      placeholder={placeholder}
      minHeight={minHeight}
      disabled={isReadOnly}
      aria-labelledby={ariaLabelledBy}
      trailingSlot={trailingSlot}
      overlaySlot={overlaySlot}
      onEditorCreated={onEditorCreated}
    />
  )
}

/**
 * RichField with inline AI refine wired up.
 * Uses onEditorCreated callback to get the editor instance directly.
 */
function InlineRefineRichField({
  context,
  ...fieldProps
}: Omit<Parameters<typeof RichField>[0], 'trailingSlot' | 'overlaySlot' | 'onEditorCreated'> & { context: string }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const { toolbarButton, overlay } = useAiRefineInline({ editor, context })

  const handleEditorCreated = useCallback((ed: Editor) => {
    setEditor(ed)
  }, [])

  return (
    <RichField
      {...fieldProps}
      trailingSlot={toolbarButton}
      overlaySlot={overlay}
      onEditorCreated={handleEditorCreated}
    />
  )
}

function DetailsTabComponent({ isReadOnly }: DetailsTabProps) {
  const {
    meta,
    setTitle,
    setDescription,
    setPurpose,
    setParticipantRequirements,
  } = useStudyMetaStore()

  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected)

  const titleLength = meta.title?.length || 0
  const descriptionLength = meta.description?.length || 0
  const isTitleNearLimit = titleLength > TITLE_MAX_LENGTH * 0.8
  const isDescriptionNearLimit = descriptionLength > DESCRIPTION_MAX_LENGTH * 0.8

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      {/* Skip link for accessibility */}
      <a
        href="#study-title"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Main Form - Full Width */}
      <main className="space-y-6" role="main" aria-label="Study details form">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="details:title" className="text-base font-semibold">
              Study Title
              <span className="text-destructive ml-1" aria-label="required">*</span>
            </Label>
            <div className="flex items-center gap-1">
              {!isReadOnly && (
                <AiRefineButton
                  value={meta.title || ''}
                  onApply={setTitle}
                  context="Study title for a UX research study"
                />
              )}
              <span
                className={`text-xs ${isTitleNearLimit ? 'text-amber-600' : 'text-muted-foreground'}`}
                aria-live="polite"
              >
                {titleLength}/{TITLE_MAX_LENGTH}
              </span>
            </div>
          </div>
          {isCollaborative ? (
            <CollaborativeInput
              id="details:title"
              fieldPath="meta.title"
              onChange={setTitle}
              initialValue={meta.title}
              placeholder="Enter a descriptive title for your study"
              disabled={isReadOnly}
              maxLength={TITLE_MAX_LENGTH}
              required
              aria-required="true"
              aria-describedby="title-hint"
            />
          ) : (
            <input
              id="details:title"
              value={meta.title || ''}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your study"
              disabled={isReadOnly}
              maxLength={TITLE_MAX_LENGTH}
              required
              aria-required="true"
              aria-describedby="title-hint"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          )}
          <p id="title-hint" className="sr-only">
            Required field. Maximum {TITLE_MAX_LENGTH} characters.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="details:description">
              Description
              <span className="text-muted-foreground text-xs font-normal ml-2">(Optional)</span>
            </Label>
            <div className="flex items-center gap-1">
              {!isReadOnly && (
                <AiRefineButton
                  value={meta.description || ''}
                  onApply={(val) => setDescription(val || null)}
                  context="Internal description for a UX research study"
                />
              )}
              <span
                className={`text-xs ${isDescriptionNearLimit ? 'text-amber-600' : 'text-muted-foreground'}`}
                aria-live="polite"
              >
                {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>
          {isCollaborative ? (
            <CollaborativeTextarea
              id="details:description"
              fieldPath="meta.description"
              onChange={(val) => setDescription(val || null)}
              initialValue={meta.description || ''}
              placeholder="Brief description of the study (internal use only)"
              rows={3}
              disabled={isReadOnly}
              maxLength={DESCRIPTION_MAX_LENGTH}
              aria-describedby="description-hint"
            />
          ) : (
            <textarea
              id="details:description"
              value={meta.description || ''}
              onChange={(e) => setDescription(e.target.value || null)}
              placeholder="Brief description of the study (internal use only)"
              rows={3}
              disabled={isReadOnly}
              maxLength={DESCRIPTION_MAX_LENGTH}
              aria-describedby="description-hint"
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          )}
          <p id="description-hint" className="sr-only">
            Optional field for internal notes. Maximum {DESCRIPTION_MAX_LENGTH} characters.
          </p>
        </div>

        {/* Purpose */}
        <div className="space-y-2">
          <Label id="purpose-label">
            Purpose
            <span className="text-muted-foreground text-xs font-normal ml-2">(Optional)</span>
          </Label>
          {!isReadOnly ? (
            <InlineRefineRichField
              fieldPath="meta.purpose"
              content={meta.purpose || ''}
              onChange={setPurpose}
              placeholder={{
                intro: "e.g. Testing the existing site structure for opportunities to improve in the next financial quarter",
              }}
              minHeight="100px"
              isCollaborative={isCollaborative}
              isReadOnly={false}
              ariaLabelledBy="purpose-label"
              context="Study purpose for a UX research study"
            />
          ) : (
            <RichField
              fieldPath="meta.purpose"
              content={meta.purpose || ''}
              onChange={setPurpose}
              placeholder={{
                intro: "e.g. Testing the existing site structure for opportunities to improve in the next financial quarter",
              }}
              minHeight="100px"
              isCollaborative={isCollaborative}
              isReadOnly
              ariaLabelledBy="purpose-label"
            />
          )}
        </div>

        {/* Participant Requirements */}
        <div className="space-y-2">
          <Label id="requirements-label">
            Participant requirements
            <span className="text-muted-foreground text-xs font-normal ml-2">(Optional)</span>
          </Label>
          {!isReadOnly ? (
            <InlineRefineRichField
              fieldPath="meta.participantRequirements"
              content={meta.participantRequirements || ''}
              onChange={setParticipantRequirements}
              placeholder={{
                intro: "e.g. We need 30 participants who meet the following requirements:",
                bullets: [
                  "Between the ages 30 – 60",
                  "Familiar with technology",
                  "Ideally an even split of desktop and mobile users",
                ],
              }}
              minHeight="120px"
              isCollaborative={isCollaborative}
              isReadOnly={false}
              ariaLabelledBy="requirements-label"
              context="Participant requirements for a UX research study"
            />
          ) : (
            <RichField
              fieldPath="meta.participantRequirements"
              content={meta.participantRequirements || ''}
              onChange={setParticipantRequirements}
              placeholder={{
                intro: "e.g. We need 30 participants who meet the following requirements:",
                bullets: [
                  "Between the ages 30 – 60",
                  "Familiar with technology",
                  "Ideally an even split of desktop and mobile users",
                ],
              }}
              minHeight="120px"
              isCollaborative={isCollaborative}
              isReadOnly
              ariaLabelledBy="requirements-label"
            />
          )}
        </div>
      </main>
    </div>
  )
}

export const DetailsTab = memo(
  DetailsTabComponent,
  (prev, next) =>
    prev.studyId === next.studyId &&
    prev.studyType === next.studyType &&
    prev.isReadOnly === next.isReadOnly &&
    prev.showFileAttachments === next.showFileAttachments &&
    prev.maxFileSize === next.maxFileSize
)
