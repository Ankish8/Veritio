'use client'

import { Textarea, type TextareaProps } from '@/components/ui/textarea'
import { useYjsOptional } from './yjs-provider'
import { CollaborativeTextarea } from './collaborative-textarea'

interface SmartTextareaProps extends Omit<TextareaProps, 'onChange' | 'value'> {
  fieldPath?: string
  value?: string
  onChange: (value: string) => void
}

export function SmartTextarea({ fieldPath, value = '', onChange, ...props }: SmartTextareaProps) {
  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected && fieldPath)

  if (isCollaborative && fieldPath) {
    return (
      <CollaborativeTextarea
        {...props}
        fieldPath={fieldPath}
        onChange={onChange}
        initialValue={value}
      />
    )
  }

  return (
    <Textarea
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
