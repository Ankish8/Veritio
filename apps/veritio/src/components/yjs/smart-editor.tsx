'use client'

import dynamic from 'next/dynamic'
import { useYjsOptional } from './yjs-provider'
import type { StudyFlowQuestion } from '@veritio/study-types/study-flow-types'

const RichTextEditor = dynamic(
  () => import('@/components/study-flow/builder/rich-text-editor').then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[120px] animate-pulse rounded-md bg-muted" /> }
)

const CollaborativeEditor = dynamic(
  () => import('./collaborative-editor').then((m) => ({ default: m.CollaborativeEditor })),
  { ssr: false, loading: () => <div className="h-[120px] animate-pulse rounded-md bg-muted" /> }
)

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
        placeholder={props.placeholder}
        minHeight={props.minHeight}
        className={props.className}
        trailingSlot={props.trailingSlot}
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
