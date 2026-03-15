'use client'

import { useEffect, useRef } from 'react'
import { Input } from '@veritio/ui/components/input'
import { CollaborativeInput } from '@veritio/prototype-test/components/yjs/collaborative-input'
import { CollaborativeEditor } from '@veritio/prototype-test/components/yjs/collaborative-editor'
import { RichTextEditor } from '../rich-text-editor'
import { useCollaborativeMode } from './use-collaborative-mode'
import { useRichTextRefine, type RefineSlots } from './rich-text-refine-context'

interface CollaborativeFieldProps {
  id: string
  fieldPath: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}
export function CollaborativeField({
  id,
  fieldPath,
  value,
  onChange,
  placeholder,
  type,
}: CollaborativeFieldProps) {
  const isCollaborative = useCollaborativeMode()

  if (isCollaborative) {
    return (
      <CollaborativeInput
        id={id}
        fieldPath={fieldPath}
        onChange={onChange}
        initialValue={value}
        placeholder={placeholder}
      />
    )
  }

  return (
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

interface CollaborativeRichTextProps {
  fieldPath: string
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  studyId: string
}
export function CollaborativeRichText({
  fieldPath,
  content,
  onChange,
  placeholder,
  minHeight,
  studyId,
}: CollaborativeRichTextProps) {
  const isCollaborative = useCollaborativeMode()
  const RefineWrapper = useRichTextRefine()

  // Capture editor ref to sync external content changes (e.g. "Reset to Default")
  // CollaborativeEditor treats initialContent as a one-time seed — it won't update
  // when the prop changes. We sync manually when content differs from editor state.
  const editorRef = useRef<import('@tiptap/react').Editor | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Skip first run — let Yjs initialization do its thing
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (!isCollaborative) return // RichTextEditor handles its own prop sync
    const ed = editorRef.current
    if (ed && !ed.isDestroyed && ed.isEditable && content !== ed.getHTML()) {
      ed.commands.setContent(content)
    }
  }, [content, isCollaborative])

  const renderEditor = (slots?: RefineSlots) => {
    if (isCollaborative) {
      return (
        <CollaborativeEditor
          fieldPath={fieldPath}
          onChange={onChange}
          initialContent={content}
          placeholder={placeholder}
          minHeight={minHeight}
          allowImageUpload
          studyId={studyId}
          trailingSlot={slots?.trailingSlot}
          overlaySlot={slots?.overlaySlot}
          onEditorCreated={(ed) => {
            editorRef.current = ed
            slots?.onEditorCreated?.(ed)
          }}
        />
      )
    }

    return (
      <RichTextEditor
        content={content}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        allowImageUpload
        studyId={studyId}
        trailingSlot={slots?.trailingSlot}
        overlaySlot={slots?.overlaySlot}
        onEditorCreated={slots?.onEditorCreated}
      />
    )
  }

  if (RefineWrapper) {
    return <RefineWrapper>{(slots) => renderEditor(slots)}</RefineWrapper>
  }

  return renderEditor()
}
