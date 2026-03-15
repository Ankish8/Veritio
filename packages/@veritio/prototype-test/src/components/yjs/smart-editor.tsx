'use client'
import { RichTextEditor } from '../study-flow/builder/rich-text-editor'
import { useYjsOptional } from './yjs-provider'
import { CollaborativeEditor } from './collaborative-editor'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface SmartEditorProps {
  fieldPath?: string
  studyId?: string
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  enablePiping?: boolean
  availableQuestions?: StudyFlowQuestion[]
  className?: string
  trailingSlot?: React.ReactNode | ((editor: import('@tiptap/react').Editor) => React.ReactNode)
  overlaySlot?: React.ReactNode | ((editor: import('@tiptap/react').Editor) => React.ReactNode)
  onEditorCreated?: (editor: import('@tiptap/react').Editor) => void
}

export function SmartEditor({ fieldPath, studyId, content, onChange, ...props }: SmartEditorProps) {
  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected && fieldPath)

  if (isCollaborative) {
    return (
      <CollaborativeEditor
        fieldPath={fieldPath!}
        studyId={studyId}
        onChange={onChange}
        initialContent={content}
        {...props}
      />
    )
  }

  return (
    <RichTextEditor
      content={content}
      onChange={onChange}
      {...props}
    />
  )
}
