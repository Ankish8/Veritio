'use client'
import { BlurSaveInput, type BlurSaveInputProps } from '@veritio/ui'
import { useYjsOptional } from './yjs-provider'
import { CollaborativeInput } from './collaborative-input'

interface SmartBlurSaveInputProps extends Omit<BlurSaveInputProps, 'onValueChange' | 'value'> {
  fieldPath?: string
  value?: string
  onValueChange: (value: string) => void
}

export function SmartBlurSaveInput({ fieldPath, value = '', onValueChange, ...props }: SmartBlurSaveInputProps) {
  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected && fieldPath)

  if (isCollaborative && fieldPath) {
    return (
      <CollaborativeInput
        {...props}
        fieldPath={fieldPath}
        onChange={onValueChange}
        initialValue={value}
      />
    )
  }

  return (
    <BlurSaveInput
      {...props}
      value={value}
      onValueChange={onValueChange}
    />
  )
}
